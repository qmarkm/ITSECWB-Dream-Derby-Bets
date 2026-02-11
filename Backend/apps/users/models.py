from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None):
        if not username:
            raise ValueError('Users must have a username.')
        if not email:
            raise ValueError('Users must have an email address.')
        
        user = self.model(
            username=username,
            email=self.normalize_email(email),
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, email, password=None):
        user = self.create_user(
            username=username,
            email=email,
            password=password,
        )
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username
    
    def has_perm(self, perm, obj=None):
        return self.is_superuser
    
    def has_module_perms(self, app_label):
        return self.is_superuser

class LoginAttempts(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_id')
    login_attempts = models.IntegerField(default=0)
    locked_status = models.BooleanField(default=False)
    unlocks_on = models.DateTimeField(null=True)

    class Meta:
        db_table = 'user_login_attempts'
    
    def __str__(self):
        return f"{self.user.username}'s login attempts"

class UserProfile(models.Model):
    """
    Extended user profile for storing additional user data.
    Automatically created when a User is created.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Financial data
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=5000.00)

    # Statistics
    total_bets_placed = models.IntegerField(default=0)
    total_bets_won = models.IntegerField(default=0)
    total_bets_lost = models.IntegerField(default=0)
    total_winnings = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_losses = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Profile customization
    bio = models.TextField(blank=True, null=True, max_length=500)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    favorite_umamusume = models.CharField(max_length=100, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username}'s profile"

    @property
    def win_rate(self):
        """Calculate win percentage"""
        if self.total_bets_placed == 0:
            return 0.0
        return (self.total_bets_won / self.total_bets_placed) * 100

    @property
    def net_profit(self):
        """Calculate net profit/loss"""
        return self.total_winnings - self.total_losses

    @property
    def avatar_url(self):
        """
        Convenience property to expose the avatar URL to the API.
        """
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        return None


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create a UserProfile when a User is created.
    This is called via Django signals.
    """
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save the UserProfile when the User is saved.
    """
    if hasattr(instance, 'profile'):
        instance.profile.save()