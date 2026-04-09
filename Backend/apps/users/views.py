import os
import logging
from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import LoginAttempts, User, UserProfile
from .serializers import (
    AdminUserReadSerializer,
    AdminUserUpdateSerializer,
    CurrentUserSerializer,
    PublicUserSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
MAX_TRANSACTION_AMOUNT = Decimal('1000000')
logger = logging.getLogger('django.request')


def _ensure_admin(user):
    return user.is_staff and user.is_superuser


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


@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    try:
        users = User.objects.all()
        serializer = PublicUserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_user_list(request):
    try:
        if not _ensure_admin(request.user):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            users = User.objects.all()
            serializer = AdminUserReadSerializer(users, many=True, context={'request': request})
            return Response(serializer.data)

        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            create_login_attempts(user)
            return Response(AdminUserReadSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_profile(request, username):
    try:
        user = User.objects.get(username=username)
        serializer = PublicUserSerializer(user, context={'request': request})
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([AllowAny])
def create_profile(request):
    try:
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if create_login_attempts(user):
                return Response(CurrentUserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)
            user.delete()
            return Response({'error': 'Registration failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id):
    try:
        if not _ensure_admin(request.user):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        user = User.objects.get(pk=user_id)

        if request.method == 'GET':
            serializer = AdminUserReadSerializer(user, context={'request': request})
            return Response(serializer.data)

        # Prevent admins from modifying or deleting their own account via this endpoint
        if user.pk == request.user.pk:
            logger.warning(
                "Rejected self-admin action by user_id=%s on admin endpoint for target_user_id=%s.",
                request.user.pk,
                user.pk,
            )
            return Response(
                {'error': 'Invalid request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'PATCH':
            serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                # Enforce role hierarchy: revoking staff always revokes superuser.
                if serializer.validated_data.get('is_staff') is False:
                    serializer.validated_data['is_superuser'] = False

                # Prevent granting is_superuser without also granting is_staff
                if serializer.validated_data.get('is_superuser') and not serializer.validated_data.get('is_staff', user.is_staff):
                    logger.warning(
                        "Rejected admin flag update by user_id=%s for target_user_id=%s: "
                        "cannot grant is_superuser without is_staff.",
                        request.user.pk,
                        user.pk,
                    )
                    return Response(
                        {'error': 'Invalid request.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Prevent removing admin privileges from the last privileged account.
                target_is_staff = serializer.validated_data.get('is_staff', user.is_staff)
                target_is_superuser = serializer.validated_data.get('is_superuser', user.is_superuser)
                if user.is_staff and user.is_superuser and not (target_is_staff and target_is_superuser):
                    privileged_count = User.objects.filter(is_staff=True, is_superuser=True).count()
                    if privileged_count <= 1:
                        logger.warning(
                            "Rejected admin flag update by user_id=%s for target_user_id=%s: "
                            "attempted to remove privileges from last admin account.",
                            request.user.pk,
                            user.pk,
                        )
                        return Response(
                            {'error': 'Invalid request.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                serializer.save()
                return Response(AdminUserReadSerializer(user, context={'request': request}).data)
            logger.warning(
                "Rejected admin user patch by user_id=%s for target_user_id=%s: validation errors=%s",
                request.user.pk,
                user.pk,
                serializer.errors,
            )
            return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

        # DELETE
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            login_attempt, _ = LoginAttempts.objects.get_or_create(user=user)

            if login_attempt.locked_status:
                if login_attempt.unlocks_on and timezone.now() >= login_attempt.unlocks_on:
                    login_attempt.locked_status = False
                    login_attempt.login_attempts = 0
                    login_attempt.unlocks_on = None
                    login_attempt.save()
                else:
                    return Response({'error': 'Account is locked. Try again later.'}, status=status.HTTP_403_FORBIDDEN)

            try:
                response = super().post(request, *args, **kwargs)
            except AuthenticationFailed:
                login_attempt.login_attempts += 1
                if login_attempt.login_attempts >= MAX_LOGIN_ATTEMPTS:
                    login_attempt.locked_status = True
                    login_attempt.unlocks_on = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                login_attempt.save()
                return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

            login_attempt.login_attempts = 0
            login_attempt.locked_status = False
            login_attempt.unlocks_on = None
            login_attempt.save()
            return response

        except Exception:
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        return Response({'message': 'Logout successful.'})
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    try:
        serializer = CurrentUserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    try:
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)

        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CurrentUserSerializer(request.user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_account(request):
    try:
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CurrentUserSerializer(request.user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_balance(request):
    try:
        amount = request.data.get('amount')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount > MAX_TRANSACTION_AMOUNT:
            return Response(
                {'error': f'Transaction amount cannot exceed {MAX_TRANSACTION_AMOUNT} coins.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = request.user.profile
        profile.balance += amount
        profile.save()
        return Response(CurrentUserSerializer(request.user, context={'request': request}).data)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deduct_balance(request):
    try:
        amount = request.data.get('amount')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount > MAX_TRANSACTION_AMOUNT:
            return Response(
                {'error': f'Transaction amount cannot exceed {MAX_TRANSACTION_AMOUNT} coins.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile = request.user.profile
        if profile.balance < amount:
            return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.balance -= amount
        profile.save()
        return Response(CurrentUserSerializer(request.user, context={'request': request}).data)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    avatar_file = None
    try:
        if 'avatar' not in request.FILES:
            return Response({'error': 'No file provided. Include "avatar" in form data.'}, status=status.HTTP_400_BAD_REQUEST)

        avatar_file = request.FILES['avatar']
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_extension = os.path.splitext(avatar_file.name)[1].lower()

        if file_extension not in allowed_extensions:
            return Response({'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'}, status=status.HTTP_400_BAD_REQUEST)

        max_size = 5 * 1024 * 1024
        if avatar_file.size > max_size:
            return Response({'error': 'File too large. Maximum size is 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile

        if profile.avatar:
            profile.avatar.delete(save=False)

        profile.avatar = avatar_file
        profile.save()
        return Response(CurrentUserSerializer(request.user, context={'request': request}).data)

    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        if avatar_file:
            avatar_file.close()
