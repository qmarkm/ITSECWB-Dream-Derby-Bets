from django.urls import path 
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('<int:id>/', views.get_race_event, name='get_race_event'),
    path('tracks/', views.get_tracks, name='get_tracks'),
]