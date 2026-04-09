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
from rest_framework_simplejwt.tokens import RefreshToken

security_log = logging.getLogger('security')


def _apply_syslog_config(host: str, port: int) -> None:
    """
    Hot-reload the syslog handler on the 'security' logger without a restart.
    Removes any existing SysLogHandler first, then adds a new one if host is set.
    """
    import logging.handlers as _lh

    logger = logging.getLogger('security')

    # Remove existing remote syslog handlers
    for handler in list(logger.handlers):
        if isinstance(handler, _lh.SysLogHandler):
            handler.close()
            logger.removeHandler(handler)

    if host:
        formatter = logging.Formatter('derby-bets: %(levelname)s | %(message)s')
        syslog_handler = _lh.SysLogHandler(address=(host, port), facility=_lh.SysLogHandler.LOG_LOCAL0)
        syslog_handler.setFormatter(formatter)
        logger.addHandler(syslog_handler)


def _get_client_ip(request):
    """Extract real client IP.

    Priority:
    1. CF-Connecting-IP — set by Cloudflare, cannot be spoofed by the client.
    2. REMOTE_ADDR — the direct upstream (Nginx); always trustworthy when
       Cloudflare is not in the chain (e.g. local/staging).

    We intentionally ignore X-Forwarded-For because its leftmost value is
    client-controlled and can be forged, making log entries unreliable.
    """
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip.strip()
    return request.META.get('REMOTE_ADDR', 'unknown')

from .models import LoginAttempts, User, UserProfile, SystemSettings
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
        logger.warning(
            "Rejected admin user create by user_id=%s: validation errors=%s",
            request.user.pk,
            serializer.errors,
        )
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

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
        logger.warning(
            "Rejected registration request: validation errors=%s",
            serializer.errors,
        )
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

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
        ip = _get_client_ip(request)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            security_log.warning(
                'LOGIN_USER_NOT_FOUND | user=%s ip=%s', username, ip
            )
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            login_attempt, _ = LoginAttempts.objects.get_or_create(user=user)

            if login_attempt.locked_status:
                if login_attempt.unlocks_on and timezone.now() >= login_attempt.unlocks_on:
                    login_attempt.locked_status = False
                    login_attempt.login_attempts = 0
                    login_attempt.unlocks_on = None
                    login_attempt.save()
                    security_log.info(
                        'AUTO_UNLOCKED | user=%s ip=%s', username, ip
                    )
                else:
                    security_log.warning(
                        'LOGIN_BLOCKED_LOCKED | user=%s ip=%s unlocks_at=%s',
                        username, ip,
                        login_attempt.unlocks_on.strftime('%Y-%m-%dT%H:%M:%S%z') if login_attempt.unlocks_on else 'unknown',
                    )
                    return Response({'error': 'Account is locked. Try again later.'}, status=status.HTTP_403_FORBIDDEN)

            try:
                response = super().post(request, *args, **kwargs)
            except AuthenticationFailed:
                login_attempt.login_attempts += 1
                if login_attempt.login_attempts >= MAX_LOGIN_ATTEMPTS:
                    login_attempt.locked_status = True
                    login_attempt.unlocks_on = timezone.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
                    login_attempt.save()
                    security_log.error(
                        'ACCOUNT_LOCKED | user=%s ip=%s attempts=%d unlocks_at=%s',
                        username, ip, login_attempt.login_attempts,
                        login_attempt.unlocks_on.strftime('%Y-%m-%dT%H:%M:%S%z'),
                    )
                else:
                    login_attempt.save()
                    security_log.warning(
                        'LOGIN_FAILED | user=%s ip=%s attempts=%d/%d',
                        username, ip, login_attempt.login_attempts, MAX_LOGIN_ATTEMPTS,
                    )
                return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

            login_attempt.login_attempts = 0
            login_attempt.locked_status = False
            login_attempt.unlocks_on = None
            login_attempt.save()
            security_log.info(
                'LOGIN_SUCCESS | user=%s ip=%s user_id=%d', username, ip, user.pk
            )
            return response

        except Exception:
            security_log.exception(
                'LOGIN_ERROR | user=%s ip=%s', username, ip
            )
            return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        security_log.info(
            'LOGOUT | user=%s ip=%s user_id=%d',
            request.user.username, _get_client_ip(request), request.user.pk,
        )
        return Response({'message': 'Logout successful.'}, status=status.HTTP_200_OK)
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
        logger.warning(
            "Rejected profile update by user_id=%s: validation errors=%s",
            request.user.pk,
            serializer.errors,
        )
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

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
        logger.warning(
            "Rejected account update by user_id=%s: validation errors=%s",
            request.user.pk,
            serializer.errors,
        )
        return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

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


@api_view(['GET'])
@permission_classes([AllowAny])
def get_session_settings(request):
    """Get session timeout settings (public endpoint for frontend)"""
    try:
        timeout_minutes = int(SystemSettings.get_setting('SESSION_TIMEOUT_MINUTES', 30))
        warning_minutes = int(SystemSettings.get_setting('SESSION_WARNING_MINUTES', 5))

        return Response({
            'timeout_minutes': timeout_minutes,
            'warning_minutes': warning_minutes,
        })
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_system_settings(request):
    """Admin endpoint to view and update system settings"""
    try:
        if not _ensure_admin(request.user):
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'GET':
            settings_list = SystemSettings.objects.all().values(
                'setting_key', 'setting_value', 'description', 'updated_at'
            )
            return Response({'settings': list(settings_list)})

        elif request.method == 'POST':
            timeout_minutes = request.data.get('timeout_minutes')
            warning_minutes = request.data.get('warning_minutes')
            syslog_host = request.data.get('syslog_host')
            syslog_port = request.data.get('syslog_port')

            if timeout_minutes is not None:
                try:
                    timeout_val = int(timeout_minutes)
                    if timeout_val < 1 or timeout_val > 60:
                        return Response(
                            {'error': 'Timeout must be between 1 and 60 minutes'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    SystemSettings.set_setting(
                        'SESSION_TIMEOUT_MINUTES',
                        timeout_val,
                        user=request.user,
                        description='Inactivity timeout in minutes (1-60)'
                    )
                except ValueError:
                    return Response(
                        {'error': 'Invalid timeout value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if warning_minutes is not None:
                try:
                    warning_val = int(warning_minutes)
                    if warning_val < 1 or warning_val > 10:
                        return Response(
                            {'error': 'Warning time must be between 1 and 10 minutes'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    current_timeout = int(SystemSettings.get_setting('SESSION_TIMEOUT_MINUTES', 30))
                    if warning_val >= current_timeout:
                        return Response(
                            {'error': 'Warning time must be less than timeout duration'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    SystemSettings.set_setting(
                        'SESSION_WARNING_MINUTES',
                        warning_val,
                        user=request.user,
                        description='Warning display before timeout in minutes (1-10)'
                    )
                except ValueError:
                    return Response(
                        {'error': 'Invalid warning value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if syslog_host is not None:
                host_val = str(syslog_host).strip()
                SystemSettings.set_setting(
                    'SYSLOG_HOST',
                    host_val,
                    user=request.user,
                    description='Remote syslog server IP or hostname (leave empty to disable remote logging)'
                )

            if syslog_port is not None:
                try:
                    port_val = int(syslog_port)
                    if port_val < 1 or port_val > 65535:
                        return Response(
                            {'error': 'Port must be between 1 and 65535'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    SystemSettings.set_setting(
                        'SYSLOG_PORT',
                        port_val,
                        user=request.user,
                        description='Remote syslog server UDP port (default: 514)'
                    )
                except ValueError:
                    return Response(
                        {'error': 'Invalid port value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if syslog_host is not None or syslog_port is not None:
                _apply_syslog_config(
                    host=str(SystemSettings.get_setting('SYSLOG_HOST', '')).strip(),
                    port=int(SystemSettings.get_setting('SYSLOG_PORT', 514)),
                )

            return Response({
                'message': 'Settings updated successfully',
                'timeout_minutes': int(SystemSettings.get_setting('SESSION_TIMEOUT_MINUTES', 30)),
                'warning_minutes': int(SystemSettings.get_setting('SESSION_WARNING_MINUTES', 5)),
                'syslog_host': SystemSettings.get_setting('SYSLOG_HOST', ''),
                'syslog_port': int(SystemSettings.get_setting('SYSLOG_PORT', 514)),
            })

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


REMOTE_LOG_PATH = '/var/log/derby-bets/security.log'
REMOTE_LOG_USER = 'kali'
SSH_KEY_PATH = os.path.expanduser('~/.ssh/id_ed25519')


def _ssh_connect():
    """Return an authenticated paramiko SSHClient to the syslog server."""
    import paramiko
    host = settings.SYSLOG_HOST
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=REMOTE_LOG_USER,
        key_filename=SSH_KEY_PATH,
        timeout=8,
    )
    return client


def _read_remote_log_lines():
    """SSH into the logging server and return all lines of security.log."""
    client = _ssh_connect()
    try:
        _, stdout, _ = client.exec_command(f'cat {REMOTE_LOG_PATH} 2>/dev/null || true')
        return stdout.read().decode('utf-8', errors='replace').splitlines(keepends=True)
    finally:
        client.close()


def _write_remote_log_lines(lines):
    """Overwrite the remote security.log with the given lines via sudo tee."""
    import paramiko
    client = _ssh_connect()
    try:
        sftp = client.open_sftp()
        import io
        content = ''.join(lines).encode('utf-8')
        with sftp.open(REMOTE_LOG_PATH, 'w') as f:
            f.write(content)
        sftp.close()
    finally:
        client.close()


def _parse_log_lines(lines):
    """Parse raw log lines into dicts with timestamp, level, message.

    Handles both local format:
      2026-04-09T12:00:00+0000 | LEVEL | name | message
    And rsyslog remote format:
      2026-04-09T12:00:00.123-04:00 192.168.1.8 derby-bets: LEVEL | message
    """
    entries = []
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Try remote rsyslog format first: "TIMESTAMP HOST derby-bets: LEVEL | message"
        if 'derby-bets:' in line:
            try:
                # Split off timestamp and host prefix
                rest = line.split('derby-bets: ', 1)[1]  # "LEVEL | message"
                ts_host = line.split('derby-bets:')[0].strip()
                parts_ts = ts_host.split(' ')
                timestamp = parts_ts[0] if parts_ts else ''
                msg_parts = rest.split(' | ', 1)
                level = msg_parts[0].strip()
                message = msg_parts[1].strip() if len(msg_parts) > 1 else rest
                entries.append({
                    'timestamp': timestamp,
                    'level': level,
                    'message': message,
                    '_raw': line,
                })
                continue
            except Exception:
                pass

        # Local format: "TIMESTAMP | LEVEL | name | message"
        parts = line.split(' | ', 3)
        if len(parts) == 4:
            entries.append({
                'timestamp': parts[0],
                'level': parts[1].strip(),
                'message': parts[3],
                '_raw': line,
            })
        else:
            entries.append({'timestamp': '', 'level': 'INFO', 'message': line, '_raw': line})
    return entries


def _get_log_lines():
    """Return raw log lines — from Kali if SYSLOG_HOST is set, else local."""
    if settings.SYSLOG_HOST:
        return _read_remote_log_lines()
    log_path = os.path.join(settings.LOG_DIR, 'security.log')
    if not os.path.exists(log_path):
        return []
    with open(log_path, 'r', encoding='utf-8') as f:
        return f.readlines()


def _write_log_lines(lines):
    """Write log lines — to Kali if SYSLOG_HOST is set, else local."""
    if settings.SYSLOG_HOST:
        _write_remote_log_lines(lines)
    else:
        log_path = os.path.join(settings.LOG_DIR, 'security.log')
        with open(log_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_security_logs(request):
    """Admin endpoint — returns the last N lines of security.log.
    Reads from the remote Kali logging server when SYSLOG_HOST is configured.
    """
    try:
        if not _ensure_admin(request.user):
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        limit = min(int(request.query_params.get('limit', 100)), 500)
        lines = _get_log_lines()

        entries = [
            {k: v for k, v in e.items() if k != '_raw'}
            for e in reversed(_parse_log_lines(lines[-limit:]))
        ]

        source = 'remote' if settings.SYSLOG_HOST else 'local'
        return Response({'logs': entries, 'total': len(lines), 'source': source})

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_security_logs(request):
    """Admin endpoint — delete log entries matching optional filters.

    Query params:
      level     — delete only entries matching this level (e.g. WARNING)
      date_from — ISO date string YYYY-MM-DD, delete entries on/after this date
      date_to   — ISO date string YYYY-MM-DD, delete entries on/before this date

    If no filters are provided, the entire log file is cleared.
    Operates on the remote Kali server when SYSLOG_HOST is configured.
    """
    try:
        if not _ensure_admin(request.user):
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        level_filter = request.query_params.get('level', '').strip().upper()
        date_from = request.query_params.get('date_from', '').strip()
        date_to = request.query_params.get('date_to', '').strip()

        lines = _get_log_lines()
        parsed = _parse_log_lines(lines)
        no_filters = not level_filter and not date_from and not date_to

        if no_filters:
            _write_log_lines([])
            security_log.warning(
                'LOG_CLEARED | user=%s ip=%s deleted=%d source=%s',
                request.user.username, _get_client_ip(request),
                len(parsed), 'remote' if settings.SYSLOG_HOST else 'local',
            )
            return Response({'deleted': len(parsed), 'remaining': 0})

        kept = []
        deleted = 0
        for entry in parsed:
            should_delete = True

            if level_filter and entry['level'] != level_filter:
                should_delete = False

            if date_from and entry['timestamp']:
                try:
                    if entry['timestamp'][:10] < date_from:
                        should_delete = False
                except Exception:
                    should_delete = False

            if date_to and entry['timestamp']:
                try:
                    if entry['timestamp'][:10] > date_to:
                        should_delete = False
                except Exception:
                    should_delete = False

            if should_delete:
                deleted += 1
            else:
                kept.append(entry['_raw'] + '\n')

        _write_log_lines(kept)

        security_log.warning(
            'LOG_PARTIAL_DELETE | user=%s ip=%s filters="level=%s date_from=%s date_to=%s" deleted=%d remaining=%d source=%s',
            request.user.username, _get_client_ip(request),
            level_filter or 'any', date_from or 'any', date_to or 'any',
            deleted, len(kept), 'remote' if settings.SYSLOG_HOST else 'local',
        )

        return Response({'deleted': deleted, 'remaining': len(kept)})

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass
