from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='events_index'),
    path('tracks/', views.get_tracks, name='get_tracks'),
    path('my-bids/', views.my_bids, name='my_bids'),
    path('bids/<int:bid_id>/', views.bid_detail, name='bid_detail'),
    path('<int:id>/', views.get_race_event, name='get_race_event'),
    path('<int:id>/bids/', views.place_bid, name='place_bid'),
]
