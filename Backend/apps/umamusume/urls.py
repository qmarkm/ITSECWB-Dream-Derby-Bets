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
    path('uma/create/', views.create_uma, name='create_uma'),
    path('uma/import/', views.import_umas_csv, name='import_umas_csv'),
    path('skill/admin-list/', views.admin_get_skills, name='admin_get_skills'),
    path('skill/create/', views.create_skill, name='create_skill'),
    path('skill/assign/', views.assign_skill_to_uma, name='assign_skill_to_uma'),
    path('skill/<int:id>/update/', views.update_skill, name='update_skill'),
    path('skill/<int:id>/delete/', views.delete_skill, name='delete_skill'),
    path('uma/<int:id>/update/', views.update_uma, name='update_uma'),
    path('uma/<int:id>/delete/', views.delete_uma, name='delete_uma'),
    path('uma/<int:id>/toggle/', views.toggle_uma_active, name='toggle_uma_active'),
    path('uma/admin-list/', views.admin_get_umas, name='admin_get_umas'),
    path('skill/<int:id>/unassign/', views.unassign_skill, name='unassign_skill'),
]