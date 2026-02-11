from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed
from decimal import Decimal
from django.core.files.storage import default_storage
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import os
from .models import User, UserProfile, LoginAttempts
from .serializers import UserSerializer, UserRegistrationSerializer, UserProfileUpdateSerializer, UserUpdateSerializer, LoginAttemptsSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    """
    List all users.
    GET /api/users/
    """
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_profile(request, username):
    """
    Get a specific user's profile by username.
    GET /api/users/profile/<username>/
    """
    try:
        user = User.objects.get(username=username)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def create_profile(request):
    """
    Register a new user.
    POST /api/users/create/

    Expected JSON body:
    {
        "username": "string",
        "email": "string",
        "password": "string (min 8 chars)",
        "password_confirm": "string"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user_data = UserSerializer(user).data

        if create_login_attempts(user):
            return Response(user_data, status=status.HTTP_201_CREATED)
        user.delete()
        return Response({'error': 'Failed to create login attempts record.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def create_login_attempts(user):
    try:
        LoginAttempts.objects.create(
            user=user,
            login_attempts=0,
            locked_status=False,
            unlocks_on=None
        )
        return True
    except Exception:
        return False


MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom login view that wraps simplejwt's TokenObtainPairView
    with login attempt tracking and account locking.

    Flow:
    1. Look up the user by username
    2. Check if account is locked (and auto-unlock if lockout expired)
    3. Let simplejwt validate credentials via super().post()
    4. On success: reset attempts to 0, return tokens
    5. On failure: increment attempts, lock if limit reached
    """

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')

        # Step 1: Find the user
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Don't reveal whether the user exists — just return generic error
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Step 2: Get or create login attempts record
        login_attempt, _ = LoginAttempts.objects.get_or_create(user=user)

        # Step 3: Check if account is locked
        if login_attempt.locked_status:
            if login_attempt.unlocks_on and timezone.now() >= login_attempt.unlocks_on:
                # Lockout expired — unlock the account
                login_attempt.locked_status = False
                login_attempt.login_attempts = 0
                login_attempt.unlocks_on = None
                login_attempt.save()
            else:
                return Response(
                    {'error': 'Account is locked. Try again later.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Step 4: Let simplejwt handle the actual authentication
        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            # Failed — increment attempts
            login_attempt.login_attempts += 1

            if login_attempt.login_attempts >= MAX_LOGIN_ATTEMPTS:
                login_attempt.locked_status = True
                login_attempt.unlocks_on = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)

            login_attempt.save()

            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Step 5: Success — reset attempts
        login_attempt.login_attempts = 0
        login_attempt.locked_status = False
        login_attempt.unlocks_on = None
        login_attempt.save()

        return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout endpoint (JWT tokens are stateless).
    POST /api/users/logout/

    Note: With JWT, logout is handled client-side by deleting the token.
    Server-side blacklisting can be added later if needed.
    """
    return Response({
        'message': 'Logout successful. Delete your token on the client side.'
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get the currently logged-in user's information.
    GET /api/users/me/

    Requires: Authorization header with valid JWT token
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update the current user's profile.
    PATCH /api/users/profile/update/

    Allowed fields: bio, avatar, favorite_umamusume
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        # Create profile if it doesn't exist (shouldn't happen due to signals)
        profile = UserProfile.objects.create(user=request.user)

    serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        # Return full user data with updated profile
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_account(request):
    """
    Update the current user's account information (username, email, full_name, and phone_number).
    PATCH /api/users/account/update/

    Allowed fields: username, email, full_name, phone_number
    """
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        # Return full user data with updated info
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_balance(request):
    """
    Add coins to user's balance.
    POST /api/users/balance/add/

    Body: { "amount": 100.00 }
    """
    amount = request.data.get('amount')

    if not amount:
        return Response(
            {'error': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount = Decimal(str(amount))
        if amount <= 0:
            return Response(
                {'error': 'Amount must be positive'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'error': 'Invalid amount'},
            status=status.HTTP_400_BAD_REQUEST
        )

    profile = request.user.profile
    profile.balance += amount
    profile.save()

    user_serializer = UserSerializer(request.user)
    return Response(user_serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deduct_balance(request):
    """
    Deduct coins from user's balance.
    POST /api/users/balance/deduct/

    Body: { "amount": 50.00 }
    """
    amount = request.data.get('amount')

    if not amount:
        return Response(
            {'error': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amount = Decimal(str(amount))
        if amount <= 0:
            return Response(
                {'error': 'Amount must be positive'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'error': 'Invalid amount'},
            status=status.HTTP_400_BAD_REQUEST
        )

    profile = request.user.profile

    if profile.balance < amount:
        return Response(
            {'error': 'Insufficient balance'},
            status=status.HTTP_400_BAD_REQUEST
        )

    profile.balance -= amount
    profile.save()

    user_serializer = UserSerializer(request.user)
    return Response(user_serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    Upload a profile picture for the current user.
    POST /api/users/avatar/upload/

    Expected: multipart/form-data with 'avatar' file
    Returns: Full user data with updated avatar
    """
    if 'avatar' not in request.FILES:
        return Response(
            {'error': 'No file provided. Include "avatar" in form data.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    avatar_file = request.FILES['avatar']

    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(avatar_file.name)[1].lower()

    if file_extension not in allowed_extensions:
        return Response(
            {'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file size (5MB max)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if avatar_file.size > max_size:
        return Response(
            {'error': 'File too large. Maximum size is 5MB.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        profile = request.user.profile

        # Delete old avatar if it exists
        if profile.avatar:
            profile.avatar.delete(save=False)

        # Save the new avatar (ImageField handles the upload automatically)
        profile.avatar = avatar_file
        profile.save()

        # Return updated user data
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)

    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to upload avatar: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
