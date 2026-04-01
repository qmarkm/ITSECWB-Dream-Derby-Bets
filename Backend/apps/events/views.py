from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Bids, RaceEvent, Track
from .serializers import (
    BidsCreateSerializer,
    BidsSerializer,
    BidsUpdateSerializer,
    RaceEventSerializer,
    TrackSerializer,
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
        serializer = TrackSerializer(tracks, many=True)
        return Response(serializer.data)
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
    """
    Placeholder — will be implemented by the admin task owner.
    POST /api/events/create/
    """
    return Response()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_bid(request, id):
    try:
        race_event = RaceEvent.objects.get(id=id)

        serializer = BidsCreateSerializer(
            data=request.data,
            context={'request': request, 'race_event': race_event},
        )
        if serializer.is_valid():
            bid = serializer.save()
            return Response(BidsSerializer(bid).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        bids = Bids.objects.filter(bidder=request.user).select_related('race_event', 'uma')

        event_status = request.query_params.get('status')
        if event_status:
            bids = bids.filter(race_event__status=event_status)

        race_id = request.query_params.get('race_id')
        if race_id:
            bids = bids.filter(race_event__id=race_id)

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
            if serializer.is_valid():
                serializer.save()
                bid.refresh_from_db()
                return Response(BidsSerializer(bid).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # DELETE
        cancellable_statuses = [RaceEvent.Status.scheduled, RaceEvent.Status.open]
        if bid.race_event.status not in cancellable_statuses:
            return Response({'error': 'Cannot cancel a bid after betting has closed.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
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
