from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from decimal import Decimal
from django.core.files.storage import default_storage
from django.conf import settings
import os
from .models import User, UserProfile
from .serializers import UserSerializer, UserRegistrationSerializer, UserProfileUpdateSerializer, UserUpdateSerializer

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
        return Response(user_data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login endpoint (for reference - JWT handles this in urls).
    POST /api/users/login/

    Note: You should use /api/auth/token/ instead for JWT login.
    This is here just as a placeholder/redirect.
    """
    return Response({
        'message': 'Use /api/auth/token/ for login with JWT',
        'endpoint': '/api/auth/token/',
        'method': 'POST',
        'body': {
            'username': 'your_username',
            'password': 'your_password'
        }
    })

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

    Allowed fields: bio, avatar_url, favorite_umamusume
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
    Update the current user's account information (username and email).
    PATCH /api/users/account/update/

    Allowed fields: username, email
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
    Returns: Full user data with updated avatar_url
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
        if profile.avatar_url:
            old_path = profile.avatar_url.replace(settings.MEDIA_URL, '')
            old_file_path = os.path.join(settings.MEDIA_ROOT, old_path)
            if os.path.exists(old_file_path):
                os.remove(old_file_path)

        # Create unique filename: avatars/user_{id}_{timestamp}{extension}
        import time
        timestamp = int(time.time())
        filename = f"user_{request.user.id}_{timestamp}{file_extension}"
        filepath = os.path.join('avatars', filename)

        # Save the file
        saved_path = default_storage.save(filepath, avatar_file)

        # Update profile with new avatar URL
        avatar_url = f"{settings.MEDIA_URL}{saved_path}"
        profile.avatar_url = avatar_url
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
