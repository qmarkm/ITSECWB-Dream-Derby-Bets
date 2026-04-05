from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='events_index'),
    path('tracks/', views.get_tracks, name='get_tracks'),
    path('tracks/create/', views.create_track, name='create_track'),
    path('tracks/<int:id>/update/', views.update_track, name='update_track'),
    path('tracks/<int:id>/delete/', views.delete_track, name='delete_track'),
    path('create/', views.create_race_event, name='create_race_event'),
    path('my-bids/', views.my_bids, name='my_bids'),
    path('bids/<int:bid_id>/', views.bid_detail, name='bid_detail'),
    path('<int:id>/', views.get_race_event, name='get_race_event'),
    path('<int:id>/update/', views.update_race_event, name='update_race_event'),
    path('<int:id>/delete/', views.delete_race_event, name='delete_race_event'),
    path('<int:id>/results/', views.set_race_results, name='set_race_results'),
    path('<int:id>/enroll/', views.enroll_umamusume, name='enroll_umamusume'),
    path('<int:id>/bids/', views.place_bid, name='place_bid'),
]
