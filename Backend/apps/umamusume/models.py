from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator
from django.utils.translation import gettext_lazy as _

class Umas(models.Model):
    name = models.CharField(max_length=100)
    avatar_url = models.URLField(blank=True)
    class Meta:
        db_table = 'umas'

    def __str__(self):
        return self.name
    
class Skill(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    is_unique = models.BooleanField(default=True)
    uma = models.ForeignKey(Umas, on_delete=models.CASCADE, related_name='unique_skill', null=True)

    class Meta:
        db_table = 'skills'
    
    def __str__(self):
        return self.name

class Umamusume(models.Model):
    # Basic Information
    uma = models.ForeignKey(Umas, on_delete=models.CASCADE, related_name='umamusume', null=True)
    name = models.CharField(max_length=100)
    avatar_url = models.URLField(blank=True, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='umamusumes')

    # Statistics
    speed = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1200)])
    stamina = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1200)])
    power = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1200)])
    guts = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1200)])
    wit = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(1200)])

    # Skills
    skills = models.ManyToManyField(Skill, related_name='learned_by', db_table='uma_skills')

    # Logs
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'umamusume'

    def __str__(self):
        return self.name

class Aptitude(models.Model):
    class Rank(models.TextChoices):
        S = 'S', _('S')
        A = 'A', _('A')
        B = 'B', _('B')
        C = 'C', _('C')
        D = 'D', _('D')
        E = 'E', _('E')
        F = 'F', _('F')
        G = 'G', _('G')

    umamusume = models.OneToOneField(Umamusume, on_delete=models.CASCADE, related_name='aptitudes')

    # Surface
    turf = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    dirt = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)

    # Distance
    short = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    mile = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    medium = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    long = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)

    # Strategy
    front = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    pace = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    late = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)
    end = models.CharField(max_length=1, choices=Rank.choices, default=Rank.G)

    class Meta:
        db_table = 'aptitudes'
    
    def __str__(self):
        return f"{self.umamusume.name}'s Aptitudes"