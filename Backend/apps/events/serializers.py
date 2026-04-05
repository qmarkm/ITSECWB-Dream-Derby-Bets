import re
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from .models import Track, RaceEvent, Results, Bids
from ..umamusume.serializers import UmamusumeSerializer

# Align with users app balance transaction cap
MAX_BID_AMOUNT = Decimal('1000000')

_RACE_STATUS_ORDER = (
    RaceEvent.Status.scheduled,
    RaceEvent.Status.open,
    RaceEvent.Status.active,
    RaceEvent.Status.race_ongoing,
    RaceEvent.Status.completed,
)


def _race_status_index(status):
    try:
        return _RACE_STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _validate_race_datetimes(*, opening_dt, active_dt, race_start_dt, race_end_dt):
    sequence = [opening_dt, active_dt, race_start_dt, race_end_dt]
    present = [dt for dt in sequence if dt is not None]
    for i in range(len(present) - 1):
        if present[i] > present[i + 1]:
            raise serializers.ValidationError(
                'Race datetimes must be non-decreasing in this order: '
                'opening_dt → active_dt → race_start_dt → race_end_dt.'
            )


_HTML_PATTERN = re.compile(r'<[^>]+>')
_XSS_PATTERN = re.compile(r'(?i)(javascript\s*:|on\w+\s*=|<script)', re.IGNORECASE)
_VALID_URL_SCHEMES = ('http://', 'https://')


class TrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = ['id', 'name', 'image', 'distance', 'dist_category', 'direction', 'track_type']
        read_only_fields = ['id']


class TrackWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = ['name', 'image', 'distance', 'dist_category', 'direction', 'track_type']
        extra_kwargs = {
            'image': {'required': False, 'allow_blank': True, 'allow_null': True},
            'distance': {'required': False, 'allow_blank': True},
        }

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        if len(value) > 100:
            raise serializers.ValidationError("Name cannot exceed 100 characters.")
        if _HTML_PATTERN.search(value):
            raise serializers.ValidationError("Name must not contain HTML tags.")
        if _XSS_PATTERN.search(value):
            raise serializers.ValidationError("Name contains invalid content.")
        return value

    def validate_image(self, value):
        if not value:
            return value
        if not value.startswith(_VALID_URL_SCHEMES):
            raise serializers.ValidationError("Image URL must use http or https.")
        if _XSS_PATTERN.search(value):
            raise serializers.ValidationError("Image URL contains invalid content.")
        return value

    def validate_distance(self, value):
        if not value:
            return value
        value = value.strip()
        if len(value) > 10:
            raise serializers.ValidationError("Distance cannot exceed 10 characters.")
        if _HTML_PATTERN.search(value):
            raise serializers.ValidationError("Distance must not contain HTML tags.")
        if _XSS_PATTERN.search(value):
            raise serializers.ValidationError("Distance contains invalid content.")
        return value


class ResultsWithUmaSerializer(serializers.ModelSerializer):
    """
    Results entry with umamusume data.
    Used to expose race participants with their result IDs so the frontend
    can reference them when placing a bet (Bids.uma FK → Results).
    """
    umamusume_data = UmamusumeSerializer(source='umamusume', read_only=True)

    class Meta:
        model = Results
        fields = ['id', 'umamusume', 'umamusume_data', 'place']


class RaceEventSerializer(serializers.ModelSerializer):
    umas = serializers.SerializerMethodField()
    bid_count = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    track_name = serializers.CharField(source='track.name', read_only=True, allow_null=True)
    host_username = serializers.CharField(source='host.username', read_only=True)

    class Meta:
        model = RaceEvent
        fields = [
            'id', 'created_at', 'host', 'host_username', 'status',
            'opening_dt', 'is_published', 'active_dt',
            'race_start_dt', 'race_end_dt',
            'umas', 'bid_count', 'track', 'track_name', 'participants',
        ]
        read_only_fields = ['id']

    def get_umas(self, obj):
        if obj.status == RaceEvent.Status.completed:
            winner = obj.results.filter(place=1).first()
            if winner:
                return UmamusumeSerializer(winner.umamusume).data
            return None
        else:
            results = obj.results.all()
            if results.exists():
                umas = [result.umamusume for result in results]
                return UmamusumeSerializer(umas, many=True).data
            return None

    def get_bid_count(self, obj):
        return obj.bids.count()

    def get_participants(self, obj):
        """
        Returns all enrolled umamusume with their Results IDs.
        Clients use result IDs as the `uma` value when placing a bid.
        """
        results = obj.results.all()
        return ResultsWithUmaSerializer(results, many=True).data


class RaceEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaceEvent
        fields = ['track', 'opening_dt', 'is_published', 'active_dt',
                  'race_start_dt', 'race_end_dt']
        extra_kwargs = {
            'track': {'required': False, 'allow_null': True},
            'opening_dt': {'required': False, 'allow_null': True},
            'active_dt': {'required': False, 'allow_null': True},
            'race_start_dt': {'required': False, 'allow_null': True},
            'race_end_dt': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        _validate_race_datetimes(
            opening_dt=data.get('opening_dt'),
            active_dt=data.get('active_dt'),
            race_start_dt=data.get('race_start_dt'),
            race_end_dt=data.get('race_end_dt'),
        )
        return data

    def create(self, validated_data):
        validated_data['host'] = self.context['request'].user
        validated_data.setdefault('status', RaceEvent.Status.scheduled)
        return super().create(validated_data)


class RaceEventUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaceEvent
        fields = ['status', 'track', 'opening_dt', 'is_published',
                  'active_dt', 'race_start_dt', 'race_end_dt']
        extra_kwargs = {
            'status': {'required': False},
            'track': {'required': False, 'allow_null': True},
            'opening_dt': {'required': False, 'allow_null': True},
            'is_published': {'required': False},
            'active_dt': {'required': False, 'allow_null': True},
            'race_start_dt': {'required': False, 'allow_null': True},
            'race_end_dt': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        inst = self.instance
        opening_dt = data.get('opening_dt', inst.opening_dt)
        active_dt = data.get('active_dt', inst.active_dt)
        race_start_dt = data.get('race_start_dt', inst.race_start_dt)
        race_end_dt = data.get('race_end_dt', inst.race_end_dt)
        _validate_race_datetimes(
            opening_dt=opening_dt,
            active_dt=active_dt,
            race_start_dt=race_start_dt,
            race_end_dt=race_end_dt,
        )

        if 'status' in data and data['status'] != inst.status:
            old_status = inst.status
            new_status = data['status']
            if old_status == RaceEvent.Status.completed:
                raise serializers.ValidationError({
                    'status': 'Cannot change status of a completed race.',
                })
            if _race_status_index(new_status) < _race_status_index(old_status):
                raise serializers.ValidationError({
                    'status': 'Cannot revert race status to an earlier phase.',
                })
        return data


class RaceResultInputSerializer(serializers.Serializer):
    result_id = serializers.IntegerField(min_value=1)
    place = serializers.IntegerField(min_value=1)


class ResultsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Results
        fields = ['id', 'race_event', 'umamusume', 'place']
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# Bids serializers
# ---------------------------------------------------------------------------

class BidsSerializer(serializers.ModelSerializer):
    """Read serializer — used for all bid responses."""
    bidder_username = serializers.CharField(source='bidder.username', read_only=True)
    race_event_status = serializers.CharField(source='race_event.status', read_only=True)
    race_track_name = serializers.SerializerMethodField()
    umamusume_name = serializers.SerializerMethodField()

    class Meta:
        model = Bids
        fields = [
            'id', 'race_event', 'race_event_status', 'race_track_name',
            'bidder', 'bidder_username',
            'amount', 'uma', 'umamusume_name', 'created_at',
        ]
        read_only_fields = [
            'id', 'bidder', 'bidder_username',
            'race_event', 'race_event_status', 'race_track_name',
            'umamusume_name', 'created_at',
        ]

    def get_race_track_name(self, obj):
        try:
            return obj.race_event.track.name if obj.race_event.track else None
        except Exception:
            return None

    def get_umamusume_name(self, obj):
        try:
            return obj.uma.umamusume.name if obj.uma else None
        except Exception:
            return None


class BidsCreateSerializer(serializers.ModelSerializer):
    """
    Used when a regular user places a new bet.
    Validates event status, balance, and duplicate bids.
    On success, deducts the bet amount from the user's balance.
    """

    class Meta:
        model = Bids
        fields = ['amount', 'uma']
        extra_kwargs = {
            'uma': {'required': False, 'allow_null': True},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bet amount must be greater than zero.")
        if value > MAX_BID_AMOUNT:
            raise serializers.ValidationError(
                f"Bet amount cannot exceed {MAX_BID_AMOUNT} coins."
            )
        return value

    def validate(self, data):
        request = self.context['request']
        race_event = self.context['race_event']

        if race_event.status != RaceEvent.Status.open:
            raise serializers.ValidationError(
                "This race event is not currently accepting bets."
            )

        profile = request.user.profile
        if profile.balance < data['amount']:
            raise serializers.ValidationError({"amount": "Insufficient balance."})

        if Bids.objects.filter(race_event=race_event, bidder=request.user).exists():
            raise serializers.ValidationError(
                "You have already placed a bid on this race."
            )

        uma = data.get('uma')
        participant_count = race_event.results.count()
        if participant_count > 0 and uma is None:
            raise serializers.ValidationError(
                {"uma": "Select a runner to bet on."}
            )
        if uma is not None and uma.race_event != race_event:
            raise serializers.ValidationError(
                {"uma": "The selected umamusume is not participating in this race."}
            )

        return data

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        race_event = self.context['race_event']

        profile = request.user.profile
        profile.balance -= validated_data['amount']
        profile.save()

        return Bids.objects.create(
            race_event=race_event,
            bidder=request.user,
            **validated_data,
        )


class BidsUpdateSerializer(serializers.ModelSerializer):
    """
    Used when a regular user changes the amount of an existing bet.
    Only allowed while the race event is still 'open'.
    Adjusts the user's balance for the difference.
    """

    class Meta:
        model = Bids
        fields = ['amount']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bet amount must be greater than zero.")
        if value > MAX_BID_AMOUNT:
            raise serializers.ValidationError(
                f"Bet amount cannot exceed {MAX_BID_AMOUNT} coins."
            )
        return value

    def validate(self, data):
        bid = self.instance
        if bid.race_event.status != RaceEvent.Status.open:
            raise serializers.ValidationError(
                "This race is no longer accepting bet changes."
            )

        if 'amount' in data:
            new_amount = data['amount']
            old_amount = bid.amount
            difference = new_amount - old_amount
            if difference > 0:
                request = self.context['request']
                profile = request.user.profile
                if profile.balance < difference:
                    raise serializers.ValidationError(
                        {"amount": "Insufficient balance for this bet increase."}
                    )

        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        if 'amount' in validated_data:
            new_amount = validated_data['amount']
            old_amount = instance.amount
            difference = new_amount - old_amount

            request = self.context['request']
            profile = request.user.profile
            profile.balance -= difference   # negative diff = refund, positive = deduct
            profile.save()

        return super().update(instance, validated_data)
