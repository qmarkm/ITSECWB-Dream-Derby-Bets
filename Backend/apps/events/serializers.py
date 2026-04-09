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

_HTML_PATTERN = re.compile(r'<[^>]+>')
_XSS_PATTERN = re.compile(r'(?i)(javascript\s*:|on\w+\s*=|<script)', re.IGNORECASE)
_VALID_URL_SCHEMES = ('http://', 'https://')
_NUMERIC_ONLY = re.compile(r'^\d+$')
_ISO8601_DT = re.compile(
    r'^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$'
)


def _race_status_index(status):
    try:
        return _RACE_STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _validate_race_datetimes(*, opening_dt, active_dt, race_start_dt, race_end_dt):
    try:
        sequence = [opening_dt, active_dt, race_start_dt, race_end_dt]
        present = [dt for dt in sequence if dt is not None]
        for i in range(len(present) - 1):
            if present[i] > present[i + 1]:
                raise serializers.ValidationError(
                    'Race dates must be in chronological order.'
                )
    except serializers.ValidationError:
        raise
    except Exception:
        raise serializers.ValidationError('Invalid race dates.')
    finally:
        pass


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
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_image(self, value):
        try:
            if not value:
                return value
            if not value.startswith(_VALID_URL_SCHEMES):
                raise serializers.ValidationError("Invalid image URL.")
            if _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Invalid image URL.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid image URL.")
        finally:
            pass

    def validate_distance(self, value):
        try:
            if not value:
                return value
            value = value.strip()
            if not _NUMERIC_ONLY.match(value):
                raise serializers.ValidationError("Distance must be a number (e.g. 1600).")
            if int(value) <= 0:
                raise serializers.ValidationError("Distance must be greater than zero.")
            if len(value) > 10:
                raise serializers.ValidationError("Distance is too long.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid distance.")
        finally:
            pass


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
        try:
            if obj.status == RaceEvent.Status.completed:
                winner = obj.results.filter(place=1).first()
                return UmamusumeSerializer(winner.umamusume).data if winner else None
            results = obj.results.all()
            if results.exists():
                return UmamusumeSerializer([r.umamusume for r in results], many=True).data
            return None
        except Exception:
            return None
        finally:
            pass

    def get_bid_count(self, obj):
        try:
            return obj.bids.count()
        except Exception:
            return 0
        finally:
            pass

    def get_participants(self, obj):
        """
        Returns all enrolled umamusume with their Results IDs.
        Clients use result IDs as the `uma` value when placing a bid.
        """
        try:
            results = obj.results.all()
            return ResultsWithUmaSerializer(results, many=True).data
        except Exception:
            return []
        finally:
            pass


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

    def _validate_dt_format(self, value, field_name):
        """Reject raw datetime strings that don't look like ISO 8601."""
        raw = self.initial_data.get(field_name)
        if raw is not None and isinstance(raw, str) and raw.strip():
            if not _ISO8601_DT.match(raw.strip()):
                raise serializers.ValidationError({
                    field_name: 'Invalid datetime format. Use ISO 8601 (e.g. 2025-06-01T14:00:00Z).'
                })

    def validate(self, data):
        try:
            for field in ('opening_dt', 'active_dt', 'race_start_dt', 'race_end_dt'):
                self._validate_dt_format(data.get(field), field)
            _validate_race_datetimes(
                opening_dt=data.get('opening_dt'),
                active_dt=data.get('active_dt'),
                race_start_dt=data.get('race_start_dt'),
                race_end_dt=data.get('race_end_dt'),
            )
            return data
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError('Invalid race event data.')
        finally:
            pass

    def create(self, validated_data):
        try:
            validated_data['host'] = self.context['request'].user
            validated_data.setdefault('status', RaceEvent.Status.scheduled)
            return super().create(validated_data)
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError('Unable to create race event.')
        finally:
            pass


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

    def _validate_dt_format(self, value, field_name):
        raw = self.initial_data.get(field_name)
        if raw is not None and isinstance(raw, str) and raw.strip():
            if not _ISO8601_DT.match(raw.strip()):
                raise serializers.ValidationError({
                    field_name: 'Invalid datetime format. Use ISO 8601 (e.g. 2025-06-01T14:00:00Z).'
                })

    def validate(self, data):
        try:
            for field in ('opening_dt', 'active_dt', 'race_start_dt', 'race_end_dt'):
                self._validate_dt_format(data.get(field), field)
            inst = self.instance
            _validate_race_datetimes(
                opening_dt=data.get('opening_dt', inst.opening_dt),
                active_dt=data.get('active_dt', inst.active_dt),
                race_start_dt=data.get('race_start_dt', inst.race_start_dt),
                race_end_dt=data.get('race_end_dt', inst.race_end_dt),
            )

            if 'status' in data and data['status'] != inst.status:
                if inst.status == RaceEvent.Status.completed:
                    raise serializers.ValidationError({
                        'status': 'Cannot modify a completed race.'
                    })
                if _race_status_index(data['status']) < _race_status_index(inst.status):
                    raise serializers.ValidationError({
                        'status': 'Invalid status transition.'
                    })
                # Opening bets requires runners from at least 2 different users
                if (inst.status == RaceEvent.Status.scheduled
                        and data['status'] == RaceEvent.Status.open):
                    distinct_owners = (
                        inst.results
                        .values_list('umamusume__user', flat=True)
                        .distinct()
                        .count()
                    )
                    if distinct_owners < 2:
                        raise serializers.ValidationError({
                            'status': 'At least 2 runners from different users must be enrolled before opening bets.'
                        })
            return data
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError('Invalid race event data.')
        finally:
            pass


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
        finally:
            pass

    def get_umamusume_name(self, obj):
        try:
            return obj.uma.umamusume.name if obj.uma else None
        except Exception:
            return None
        finally:
            pass


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
        try:
            if value <= 0:
                raise serializers.ValidationError("Bet amount must be greater than zero.")
            if value > MAX_BID_AMOUNT:
                raise serializers.ValidationError("Bet amount exceeds the allowed limit.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid bet amount.")
        finally:
            pass

    def validate(self, data):
        try:
            request = self.context['request']
            race_event = self.context['race_event']

            if race_event.status != RaceEvent.Status.open:
                raise serializers.ValidationError(
                    "This race is not currently accepting bets."
                )

            profile = request.user.profile
            if profile.balance < data['amount']:
                raise serializers.ValidationError({"amount": "Insufficient balance."})

            if Bids.objects.filter(race_event=race_event, bidder=request.user).exists():
                raise serializers.ValidationError(
                    "You have already placed a bid on this race."
                )

            uma = data.get('uma')
            if race_event.results.count() > 0 and uma is None:
                raise serializers.ValidationError({"uma": "Select a runner to bet on."})
            if uma is not None and uma.race_event != race_event:
                raise serializers.ValidationError(
                    {"uma": "The selected runner is not participating in this race."}
                )

            return data
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to validate bid.")
        finally:
            pass

    @transaction.atomic
    def create(self, validated_data):
        try:
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
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to place bid.")
        finally:
            pass


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
        try:
            if value <= 0:
                raise serializers.ValidationError("Bet amount must be greater than zero.")
            if value > MAX_BID_AMOUNT:
                raise serializers.ValidationError("Bet amount exceeds the allowed limit.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid bet amount.")
        finally:
            pass

    def validate(self, data):
        try:
            bid = self.instance
            if bid.race_event.status != RaceEvent.Status.open:
                raise serializers.ValidationError(
                    "This race is no longer accepting bet changes."
                )

            if 'amount' in data:
                difference = data['amount'] - bid.amount
                if difference > 0:
                    profile = self.context['request'].user.profile
                    if profile.balance < difference:
                        raise serializers.ValidationError(
                            {"amount": "Insufficient balance."}
                        )

            return data
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to validate bid update.")
        finally:
            pass

    @transaction.atomic
    def update(self, instance, validated_data):
        try:
            if 'amount' in validated_data:
                difference = validated_data['amount'] - instance.amount
                profile = self.context['request'].user.profile
                profile.balance -= difference  # negative diff = refund, positive = deduct
                profile.save()

            return super().update(instance, validated_data)
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to update bid.")
        finally:
            pass
