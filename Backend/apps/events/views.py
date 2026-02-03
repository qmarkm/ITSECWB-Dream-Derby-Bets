from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.files.storage import default_storage
from django.conf import settings
import os
from .models import Track, RaceEvent, Results, Bids
from .serializers import TrackSerializer, RaceEventSerializer, ResultsSerializer, BidsSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    # List all races
    # GET /api/races

    races = RaceEvent.objects.all()
    serializer = RaceEventSerializer(races, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tracks(request):
    # List all tracks
    # GET /api/races/tracks

    tracks = Track.objects.all()
    serializer = TrackSerializer(tracks, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_race_event(request, id):
    # Get specific race
    # GET /api/races/<id>

    try:
        race = RaceEvent.objects.get(id=id)
        race_serializer = RaceEventSerializer(race)

        bids = race.bids.all()
        bids_serializer = BidsSerializer(bids, many=True)

        return Response({
            'race': race_serializer.data,
            'bids': bids_serializer.data
        })
    except RaceEvent.DoesNotExist:
        return Response(    
            {'error': 'Race not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_race_event(request):
    # serializer = 
    return Response()