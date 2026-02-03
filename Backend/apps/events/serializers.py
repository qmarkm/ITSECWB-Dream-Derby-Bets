from rest_framework import serializers
from .models import Track, RaceEvent, Results, Bids
from ..umamusume.serializers import UmamusumeSerializer

class TrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Track
        fields = ['name', 'image', 'distance', 'dist_category', 'direction', 'track_type']
        read_only_fields = ['name', 'image', 'distance', 'dist_category', 'direction', 'track_type']

class RaceEventSerializer(serializers.ModelSerializer):
    umas = serializers.SerializerMethodField()
    bid_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RaceEvent
        fields = ['id', 'created_at', 'host', 'status', 'opening_dt', 'is_published', 'active_dt', 'race_start_dt', 'race_end_dt', 'umas', 'bid_count', 'track']
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

class RaceEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaceEvent
        fields = ['status', 
                  'opening_dt', 'is_published', 'active_dt', 
                  'race_start_dt', 'race_end_dt', 'track']
    
    def create(self, validated_data):
        validated_data['host'] = self.context['request'].user
        return super().create(validated_data)

class ResultsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Results
        fields = ['id', 'race_event', 'umamusume', 'place']
        read_only_fields = ['id']

class BidsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bids
        fields = ['id', 'race_event', 'bidder', 'amount', 'created_at']
        read_only_fields = ['id']