from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Track, RaceEvent, Results, Bids
from .serializers import (
    TrackSerializer,
    RaceEventSerializer,
    ResultsSerializer,
    BidsSerializer,
    BidsCreateSerializer,
    BidsUpdateSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    """
    List all races.
    GET /api/events/
    """
    races = RaceEvent.objects.all()
    serializer = RaceEventSerializer(races, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tracks(request):
    """
    List all tracks.
    GET /api/events/tracks/
    """
    tracks = Track.objects.all()
    serializer = TrackSerializer(tracks, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_race_event(request, id):
    """
    Get a specific race with its bids.
    GET /api/events/<id>/
    """
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
        return Response(
            {'error': 'Race not found.'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_race_event(request):
    """
    Placeholder — will be implemented by the admin task owner.
    POST /api/events/create/
    """
    return Response()


# ---------------------------------------------------------------------------
# Bids / Betting CRUD
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_bid(request, id):
    """
    Place a bet on a race event.
    POST /api/events/<id>/bids/

    Body:
      {
        "amount": 100.00,
        "uma": <result_id>   (optional — ID from race's participants list)
      }

    Rules:
      - Race must be in 'open' status.
      - User may only place one bid per race.
      - Amount must not exceed the user's current balance.
      - If 'uma' is provided, it must be a Results entry belonging to this race.
    On success the bet amount is deducted from the user's balance.
    """
    try:
        race_event = RaceEvent.objects.get(id=id)
    except RaceEvent.DoesNotExist:
        return Response(
            {'error': 'Race event not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = BidsCreateSerializer(
        data=request.data,
        context={'request': request, 'race_event': race_event},
    )
    if serializer.is_valid():
        bid = serializer.save()
        return Response(BidsSerializer(bid).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bids(request):
    """
    List all bets placed by the current user.
    GET /api/events/my-bids/

    Query params (all optional):
      - status   : filter by race event status  (e.g. open, completed)
      - race_id  : filter by a specific race event ID

    Results are ordered newest-first.
    """
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


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def bid_detail(request, bid_id):
    """
    Update or cancel a specific bid owned by the current user.

    PATCH  /api/events/bids/<bid_id>/
      Body: { "amount": <new_amount> }
      - Only allowed while the race event is still 'open'.
      - Balance is adjusted for the difference.

    DELETE /api/events/bids/<bid_id>/
      - Only allowed while the race event is 'scheduled' or 'open'.
      - Full bet amount is refunded to the user's balance.
    """
    try:
        bid = Bids.objects.get(id=bid_id, bidder=request.user)
    except Bids.DoesNotExist:
        return Response(
            {'error': 'Bid not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

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

    # DELETE — cancel bid
    cancellable_statuses = [RaceEvent.Status.scheduled, RaceEvent.Status.open]
    if bid.race_event.status not in cancellable_statuses:
        return Response(
            {'error': 'Cannot cancel a bid after betting has closed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Refund the balance
    profile = request.user.profile
    profile.balance += bid.amount
    profile.save()

    bid.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
