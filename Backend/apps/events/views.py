from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Bids, RaceEvent, Results, Track
from ..umamusume.models import Umamusume
from .serializers import (
    BidsCreateSerializer,
    BidsSerializer,
    BidsUpdateSerializer,
    RaceEventCreateSerializer,
    RaceEventSerializer,
    RaceEventUpdateSerializer,
    RaceResultInputSerializer,
    ResultsSerializer,
    TrackSerializer,
    TrackWriteSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    try:
        races = RaceEvent.objects.all()
        serializer = RaceEventSerializer(races, many=True)
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tracks(request):
    try:
        tracks = Track.objects.all()
        serializer = TrackSerializer(tracks, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_track(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if 'image' in request.FILES:
            data['image'] = request.FILES['image']
        serializer = TrackWriteSerializer(data=data)
        if serializer.is_valid():
            track = serializer.save()
            return Response(TrackSerializer(track, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_track(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        track = Track.objects.get(id=id)
        data = request.data.copy()
        if 'image' in request.FILES:
            data['image'] = request.FILES['image']
        serializer = TrackWriteSerializer(track, data=data, partial=True)
        if serializer.is_valid():
            track = serializer.save()
            return Response(TrackSerializer(track, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Track.DoesNotExist:
        return Response({'error': 'Track not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_track(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        track = Track.objects.get(id=id)

        race_count = RaceEvent.objects.filter(track=track).count()
        if race_count > 0:
            return Response(
                {'error': f'Cannot delete: {race_count} race event(s) use this track. Remove them first.'},
                status=status.HTTP_409_CONFLICT
            )

        track.delete()
        return Response({'message': 'Track deleted successfully.'}, status=status.HTTP_200_OK)

    except Track.DoesNotExist:
        return Response({'error': 'Track not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([AllowAny])
def get_race_event(request, id):
    try:
        race = RaceEvent.objects.get(id=id)
        race_serializer = RaceEventSerializer(race)
        bids = race.bids.all()
        bids_serializer = BidsSerializer(bids, many=True)
        return Response({
            'race': race_serializer.data,
            'bids': bids_serializer.data,
        })
    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_race_event(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RaceEventCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            race = serializer.save()
            return Response(RaceEventSerializer(race).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_race_event(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        race = RaceEvent.objects.get(id=id)
        serializer = RaceEventUpdateSerializer(race, data=request.data, partial=True)
        if serializer.is_valid():
            race = serializer.save()
            return Response(RaceEventSerializer(race).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_race_event(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            race = RaceEvent.objects.select_for_update().get(id=id)

            for bid in race.bids.select_related('bidder__profile').all():
                profile = bid.bidder.profile
                profile.balance += bid.amount
                profile.save()

            race.delete()
        return Response({'message': 'Race event deleted and bids refunded.'}, status=status.HTTP_200_OK)

    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_race_results(request, id):
    """
    Admin sets finishing places for each Results entry.
    Body: [{"result_id": 1, "place": 1}, {"result_id": 2, "place": 2}, ...]
    """
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        race = RaceEvent.objects.get(id=id)

        if not isinstance(request.data, list):
            return Response({'error': 'Expected a list of result assignments.'}, status=status.HTTP_400_BAD_REQUEST)

        input_serializer = RaceResultInputSerializer(data=request.data, many=True)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        valid_result_ids = set(race.results.values_list('id', flat=True))
        updates = input_serializer.validated_data
        n = len(valid_result_ids)

        if n == 0:
            return Response(
                {'error': 'This race has no enrolled participants.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(updates) != n:
            return Response(
                {'error': f'Must assign places for all {n} participants (one row per result).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload_ids = {entry['result_id'] for entry in updates}
        if payload_ids != valid_result_ids:
            return Response(
                {'error': 'Each race participant (result row) must appear exactly once in the payload.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        places = [entry['place'] for entry in updates]
        if len(set(places)) != n:
            return Response(
                {'error': 'Each finishing place must be unique.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if sorted(places) != list(range(1, n + 1)):
            return Response(
                {'error': f'Places must be the integers 1 through {n}, with no gaps or duplicates.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            race_locked = RaceEvent.objects.select_for_update().get(pk=race.pk)

            # 1. Set finishing places
            for entry in updates:
                Results.objects.filter(
                    id=entry['result_id'], race_event=race_locked
                ).update(place=entry['place'])

            from ..users.models import UserProfile, SystemSettings
            winning_result_id = next(
                e['result_id'] for e in updates if e['place'] == 1
            )
            bids = race_locked.bids.select_related('bidder__profile', 'uma').all()
            
            winning_multiplier = Decimal(str(SystemSettings.get_setting('WINNING_MULTIPLIER', '2.0')))
            consolation_multiplier = Decimal(str(SystemSettings.get_setting('CONSOLATION_MULTIPLIER', '0.5')))
            
            for bid in bids:
                profile = UserProfile.objects.select_for_update().get(pk=bid.bidder.profile.pk)
                if bid.uma_id == winning_result_id:
                    payout = bid.amount * winning_multiplier
                    profile.balance += payout
                    profile.total_bets_won += 1
                    profile.total_winnings += payout
                else:
                    consolation = bid.amount * consolation_multiplier
                    profile.balance += consolation
                    profile.total_bets_lost += 1
                    profile.total_losses += bid.amount - consolation
                profile.total_bets_placed += 1
                profile.save()

            race_locked.status = RaceEvent.Status.completed
            race_locked.save()

        race.refresh_from_db()
        return Response(RaceEventSerializer(race).data)

    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_umamusume(request, id):
    """
    Trainer enrolls one of their Umamusume in a scheduled race.
    Body: {"umamusume_id": <int>}
    """
    try:
        race = RaceEvent.objects.get(id=id)

        if race.status != RaceEvent.Status.scheduled:
            return Response(
                {'error': 'Enrollment is only allowed while the race is scheduled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        umamusume_id = request.data.get('umamusume_id')
        try:
            umamusume_id = int(umamusume_id)
            if umamusume_id < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'error': 'umamusume_id must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            umamusume = Umamusume.objects.get(id=umamusume_id, user=request.user)
        except Umamusume.DoesNotExist:
            return Response(
                {'error': 'Umamusume not found or does not belong to you.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if Results.objects.filter(race_event=race, umamusume=umamusume).exists():
            return Response(
                {'error': 'This Umamusume is already enrolled in this race.'},
                status=status.HTTP_409_CONFLICT,
            )

        result = Results.objects.create(race_event=race, umamusume=umamusume, place=None)
        return Response(ResultsSerializer(result).data, status=status.HTTP_201_CREATED)

    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_bid(request, id):
    try:
        race_event = RaceEvent.objects.get(id=id)

        serializer = BidsCreateSerializer(
            data=request.data,
            context={'request': request, 'race_event': race_event},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Atomic block with row-level lock to prevent race conditions
        with transaction.atomic():
            profile = request.user.profile.__class__.objects.select_for_update().get(
                pk=request.user.profile.pk
            )
            amount = serializer.validated_data['amount']

            if amount <= 0:
                return Response(
                    {'amount': ['Bet amount must be greater than zero.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if profile.balance < amount:
                return Response(
                    {'amount': ['Insufficient balance.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            profile.balance -= amount
            profile.save()

            bid = Bids.objects.create(
                race_event=race_event,
                bidder=request.user,
                **serializer.validated_data,
            )

        return Response(BidsSerializer(bid).data, status=status.HTTP_201_CREATED)

    except RaceEvent.DoesNotExist:
        return Response({'error': 'Race not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bids(request):
    try:
        bids = Bids.objects.filter(bidder=request.user).select_related(
            'race_event', 'race_event__track', 'uma', 'uma__umamusume'
        )

        valid_statuses = [s.value for s in RaceEvent.Status]
        event_status = request.query_params.get('status')
        if event_status:
            if event_status not in valid_statuses:
                return Response(
                    {'error': f'Invalid status. Valid values: {valid_statuses}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            bids = bids.filter(race_event__status=event_status)

        race_id = request.query_params.get('race_id')
        if race_id:
            try:
                race_id_int = int(race_id)
                if race_id_int <= 0:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'error': 'race_id must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)
            bids = bids.filter(race_event__id=race_id_int)

        bids = bids.order_by('-created_at')
        serializer = BidsSerializer(bids, many=True)
        return Response(serializer.data)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def bid_detail(request, bid_id):
    try:
        bid = Bids.objects.get(id=bid_id, bidder=request.user)

        if request.method == 'PATCH':
            serializer = BidsUpdateSerializer(
                bid,
                data=request.data,
                partial=True,
                context={'request': request},
            )
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                profile = request.user.profile.__class__.objects.select_for_update().get(
                    pk=request.user.profile.pk
                )
                new_amount = serializer.validated_data.get('amount', bid.amount)

                if new_amount <= 0:
                    return Response(
                        {'amount': ['Bet amount must be greater than zero.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                difference = new_amount - bid.amount
                if difference > 0 and profile.balance < difference:
                    return Response(
                        {'amount': ['Insufficient balance.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                profile.balance -= difference
                profile.save()

                bid.amount = new_amount
                bid.save()

            bid.refresh_from_db()
            return Response(BidsSerializer(bid).data)

        # DELETE
        cancellable_statuses = [RaceEvent.Status.scheduled, RaceEvent.Status.open]
        if bid.race_event.status not in cancellable_statuses:
            return Response({'error': 'Cannot cancel a bid after betting has closed.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            profile = request.user.profile.__class__.objects.select_for_update().get(
                pk=request.user.profile.pk
            )
            profile.balance += bid.amount
            profile.save()
            bid.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    except Bids.DoesNotExist:
        return Response({'error': 'Bid not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass
