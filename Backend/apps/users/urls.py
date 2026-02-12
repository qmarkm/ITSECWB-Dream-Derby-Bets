from django.urls import path
from . import views

urlpatterns = [
    # User listing and viewing
    path('', views.index, name='index'),
    path('profile/<str:username>/', views.view_profile, name='view_profile'),

    # Authentication (login is handled at /api/auth/token/)
    path('create/', views.create_profile, name='create_profile'),
    path('logout/', views.logout, name='logout'),

    # Current user operations
    path('me/', views.get_current_user, name='get_current_user'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('account/update/', views.update_account, name='update_account'),

    # Avatar management
    path('avatar/upload/', views.upload_avatar, name='upload_avatar'),

    # Balance management
    path('balance/add/', views.add_balance, name='add_balance'),
    path('balance/deduct/', views.deduct_balance, name='deduct_balance'),

    # Admin user management
    path('admin/', views.admin_user_list, name='admin_user_list'),
    path('admin/<int:user_id>/', views.admin_user_detail, name='admin_user_detail'),
]
