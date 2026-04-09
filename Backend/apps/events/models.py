from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from ..users.models import User
from ..umamusume.models import Umamusume

class Track(models.Model):
    class DistanceCategory(models.TextChoices):
        sprint = 'Sprint', _('Sprint')
        mile = 'Mile', _('Mile')
        medium = 'Medium', _('Medium')
        long = 'Long', _('Long')

    class Direction(models.TextChoices):
        left = 'left', _('left')
        right = 'right', _('right')
        straight = 'straight', _('straight')

    class TrackType(models.TextChoices):
        turf = 'turf', _('turf')
        dirt = 'dirt', _('dirt')

    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='track_images/', blank=True, null=True)
    distance = models.CharField(max_length=10)
    dist_category = models.CharField(max_length=10, choices=DistanceCategory.choices, default=DistanceCategory.sprint)
    direction = models.CharField(max_length=10, choices=Direction.choices, default=Direction.right)
    track_type = models.CharField(max_length=10, choices=TrackType.choices, default=TrackType.turf)

    class Meta:
        db_table = 'tracks'

    def __str__(self):
        return self.name
    
class RaceEvent(models.Model):
    class Status(models.TextChoices):
        scheduled = 'scheduled', _('scheduled')
        open = 'open', _('open')
        active = 'active', _('active')
        race_ongoing = 'race_ongoing', _('race_ongoing')
        completed = 'completed', _('completed')

    created_at = models.DateTimeField(auto_now_add=True)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='races')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.scheduled)

    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name='race_event', null=True, blank=True)

    opening_dt = models.DateTimeField(null=True)
    is_published = models.BooleanField(default=False)

    active_dt = models.DateTimeField(null=True)

    race_start_dt = models.DateTimeField(null=True)
    race_end_dt = models.DateTimeField(null=True)

    class Meta:
        db_table = 'race_event'

    def __str__(self):
        tid = self.track_id or '-'
        return f"Race #{self.pk} ({self.status}, track={tid})"

class Results(models.Model):
    race_event = models.ForeignKey(RaceEvent, on_delete=models.CASCADE, related_name='results')
    umamusume = models.ForeignKey(Umamusume, on_delete=models.CASCADE, related_name='results')
    place = models.IntegerField(default=1, validators=[MinValueValidator(1)], null=True)

    class Meta:
        db_table = 'race_results'

    def __str__(self):
        return f"Result #{self.pk} (race={self.race_event_id}, place={self.place})"

class Bids(models.Model):
    race_event = models.ForeignKey(RaceEvent, on_delete=models.CASCADE, related_name='bids')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bids')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=5000.00)
    created_at = models.DateTimeField(auto_now_add=True)
    # Nullable so existing rows can be migrated without a default
    uma = models.ForeignKey(Results, on_delete=models.CASCADE, related_name='bids', null=True, blank=True)

    class Meta:
        db_table = 'race_bids'

    def __str__(self):
        return f"Bid #{self.pk} ({self.amount} on race {self.race_event_id})"