from rest_framework import serializers
from .models import User, UserProfile, LoginAttempts

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model (read-only).
    """
    win_rate = serializers.ReadOnlyField()
    net_profit = serializers.ReadOnlyField()

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


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with profile data.
    """
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'phone_number', 'is_active', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating User account information (username, email, full_name, and phone_number).
    """
    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'phone_number']

    def validate_username(self, value):
        """Ensure username is unique (excluding current user)"""
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

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'full_name', 'phone_number', 'password', 'password_confirm', 'avatar']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
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
