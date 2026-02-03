from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('uma/<int:id>/', views.view_umamusume, name='view_umamusume'),
    path('create/', views.create_umamusume, name='create_umamusume'),
    path('update/<int:id>/', views.update_umamusume, name='update_umamusume'),
    path('delete/<int:id>/', views.delete_umamusume, name='delete_umamusume'),
    path('my-umas/', views.get_my_umas, name='get_my_umas'),
    path('skills/', views.get_skills, name='get_skills'),
    path('get-umas/', views.get_umas, name='get_umas'),
]