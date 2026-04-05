import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, UserProfile, LoginAttempts

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model (read-only).
    """
    win_rate = serializers.ReadOnlyField()
    net_profit = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        if obj.avatar and hasattr(obj.avatar, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    class Meta:
        model = UserProfile
        fields = [
            'balance',
            'total_bets_placed',
            'total_bets_won',
            'total_bets_lost',
            'total_winnings',
            'total_losses',
            'bio',
            'avatar',
            'avatar_url',
            'favorite_umamusume',
            'win_rate',
            'net_profit',
        ]
        read_only_fields = [
            'balance',  # Balance should only be updated through specific endpoints
            'total_bets_placed',
            'total_bets_won',
            'total_bets_lost',
            'total_winnings',
            'total_losses',
            'win_rate',
            'net_profit',
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating UserProfile (only editable fields).
    """
    class Meta:
        model = UserProfile
        fields = [
            'bio',
            'avatar',
            'favorite_umamusume',
        ]

    def validate_bio(self, value):
        if value:
            # Strip HTML tags to prevent XSS
            value = re.sub(r'<[^>]+>', '', value)
            if len(value) > 500:
                raise serializers.ValidationError("Bio must be at most 500 characters.")
        return value.strip() if value else value

    def validate_favorite_umamusume(self, value):
        if value and not re.match(r'^[a-zA-Z0-9\s\-\.\']+$', value):
            raise serializers.ValidationError("Favorite umamusume can only contain letters, numbers, spaces, hyphens, dots, and apostrophes.")
        return value.strip() if value else value


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with profile data.
    """
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'phone_number',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'profile',
        ]
        read_only_fields = ['id', 'date_joined']


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating User account information (username, email, full_name, and phone_number).
    """
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'phone_number']

    def validate_username(self, value):
        """Ensure username is unique and valid format (excluding current user)"""
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        if len(value) > 30:
            raise serializers.ValidationError("Username must be at most 30 characters.")
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        """Ensure email is unique (excluding current user)"""
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_full_name(self, value):
        if value and not re.match(r'^[a-zA-Z\s\-\.\']+$', value):
            raise serializers.ValidationError("Full name can only contain letters, spaces, hyphens, dots, and apostrophes.")
        return value.strip() if value else value

    def validate_phone_number(self, value):
        if value and not re.match(r'^\+?[0-9\s\-\(\)]{7,20}$', value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'phone_number', 'password', 'password_confirm', 'avatar']

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        if len(value) > 30:
            raise serializers.ValidationError("Username must be at most 30 characters.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_full_name(self, value):
        if value and not re.match(r'^[a-zA-Z\s\-\.\']+$', value):
            raise serializers.ValidationError("Full name can only contain letters, spaces, hyphens, dots, and apostrophes.")
        return value.strip() if value else value

    def validate_phone_number(self, value):
        if value and not re.match(r'^\+?[0-9\s\-\(\)]{7,20}$', value):
            raise serializers.ValidationError("Enter a valid phone number (digits, spaces, hyphens, and parentheses allowed).")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Enforce Django's password validators (common password, numeric-only, similarity, etc.)
        try:
            validate_password(data['password'])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        avatar = validated_data.pop('avatar', None)

        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            full_name=validated_data.get('full_name', ''),
            phone_number=validated_data.get('phone_number', ''),
        )

        user.set_password(validated_data['password'])
        user.save()

        # Update profile with avatar if provided
        if avatar:
            user.profile.avatar = avatar
            user.profile.save()

        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for admin-level updates to a user, including staff/superuser flags.
    """
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'full_name',
            'phone_number',
            'is_active',
            'is_staff',
            'is_superuser',
        ]

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        if len(value) > 30:
            raise serializers.ValidationError("Username must be at most 30 characters.")
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_full_name(self, value):
        if value and not re.match(r'^[a-zA-Z\s\-\.\']+$', value):
            raise serializers.ValidationError("Full name can only contain letters, spaces, hyphens, dots, and apostrophes.")
        return value.strip() if value else value

    def validate_phone_number(self, value):
        if value and not re.match(r'^\+?[0-9\s\-\(\)]{7,20}$', value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value


class LoginAttemptsSerializer(serializers.ModelSerializer):

    class Meta:
        model = LoginAttempts
        fields = ['id', 'login_attempts', 'locked_status', 'unlocks_on']
        read_only_fields = ['id', 'login_attempts', 'locked_status', 'unlocks_on']

    def validate_login_attempts(self, value):
        if not isinstance(value, int) or value < 0:
            raise serializers.ValidationError("login_attempts must be a non-negative integer.")
        return value

    def validate_unlocks_on(self, value):
        if value is not None:
            from django.utils import timezone
            if value < timezone.now():
                raise serializers.ValidationError("unlocks_on cannot be in the past.")
        return value
