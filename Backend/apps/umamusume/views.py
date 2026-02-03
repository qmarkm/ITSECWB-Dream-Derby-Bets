from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.files.storage import default_storage
from django.conf import settings
import os
from .models import Skill, Umamusume, Aptitude, Umas
from .serializers import UmaSerializer, SkillSerializer, AptitudeSerializer, UmamusumeSerializer, UmamusumeCreateSerializer, AptitudeUpdateSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    # List all umamusumes
    # GET /api/umamusume

    umamusume = Umamusume.objects.all()
    serializer = UmamusumeSerializer(umamusume, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def view_umamusume(request, id):
    # Get a specific Umamusume by id
    # GET /api/umamusume/uma/<id>

    try:
        umamusume = Umamusume.objects.get(id=id)
        serializer = UmamusumeSerializer(umamusume)
        return Response(serializer.data)
    except Umamusume.DoesNotExist:
        return Response(
            {'error': 'Uma not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_umas(request):
    umamusume = Umamusume.objects.filter(user=request.user)
    serializer = UmamusumeSerializer(umamusume, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skills(request):
    skills = Skill.objects.all()
    serializer = SkillSerializer(skills, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_umas(request):
    umas = Umas.objects.all()
    serializer = UmaSerializer(umas, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_umamusume(request):
    # Create a new umamusume linked to a user
    # POST /api/umamusume/create/

    """
    Expected JSON body:
    {
        "name": "string",
        "avatar_url": "string (optional)",
        "base_uma_id": "integer (optional)",
        "speed": "integer",
        "stamina": "integer",
        "power": "integer",
        "guts": "integer",
        "wit": "integer",
        "skill_ids": [1, 2, 3],  // optional array of skill IDs
        "aptitudes": {  // optional aptitude object
            "turf": "A", "dirt": "A",
            "short": "A", "mile": "A", "medium": "A", "long": "A",
            "front": "A", "pace": "A", "late": "A", "end": "A"
        }
    }
    """

    avatar_file = request.FILES.get('avatar')
    avatar_url = None

    if avatar_file:
        # Validate file type (PNG/GIF only)
        allowed_extensions = ['.png', '.gif']
        file_extension = os.path.splitext(avatar_file.name)[1].lower()

        if file_extension not in allowed_extensions:
            return Response(
                {'error': f'Invalid file type. Only PNG and GIF allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if avatar_file.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 5MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create unique filename with timestamp
        import time
        timestamp = int(time.time())
        filename = f"uma_{request.user.id}_{timestamp}{file_extension}"
        filepath = os.path.join('umamusume_avatars', filename)

        # Save the file to storage
        saved_path = default_storage.save(filepath, avatar_file)

        # Generate the full URL for the saved file
        # Build absolute URL: http://127.0.0.1:8000/media/...
        avatar_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{saved_path}")

    # STEP 2: Prepare data for serializer - build clean dict
    data = {}

    # Copy simple fields from POST
    for key in request.POST.keys():
        if key not in ['skill_ids', 'aptitudes']:  # Handle these separately
            data[key] = request.POST.get(key)

    # Add the avatar URL if file was uploaded
    if avatar_url:
        data['avatar_url'] = avatar_url

    # STEP 3: Parse skill_ids (from FormData)
    print("DEBUG: request.POST keys:", request.POST.keys())

    if 'skill_ids' in request.POST:
        skill_ids_raw = request.POST.getlist('skill_ids')
        print("DEBUG: skill_ids_raw from getlist:", skill_ids_raw)
        if skill_ids_raw:
            try:
                data['skill_ids'] = [int(id) for id in skill_ids_raw if id and id.strip()]
                print("DEBUG: Parsed skill_ids:", data['skill_ids'])
            except (ValueError, TypeError) as e:
                print("DEBUG: Error parsing skill_ids:", e)
                data['skill_ids'] = []
        else:
            data['skill_ids'] = []
    else:
        data['skill_ids'] = []

    print("DEBUG: Final skill_ids value:", data.get('skill_ids'))

    # STEP 4: Parse aptitudes if it's a JSON string (from FormData)
    if 'aptitudes' in request.POST:
        aptitudes_str = request.POST.get('aptitudes')
        if aptitudes_str:
            import json
            try:
                data['aptitudes'] = json.loads(aptitudes_str)
                print("DEBUG: Parsed aptitudes:", data['aptitudes'])
            except json.JSONDecodeError as e:
                print("DEBUG: Error parsing aptitudes:", e)
                return Response(
                    {'error': 'Invalid aptitudes JSON format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

    # STEP 4: Use serializer to validate and save
    serializer = UmamusumeCreateSerializer(data=data)
    if serializer.is_valid():
        umamusume = serializer.save(user=request.user)
        umamusume_data = UmamusumeSerializer(umamusume).data
        return Response(umamusume_data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_umamusume(request, id):
    # Update an existing umamusume linked to a user
    # PATCH /api/umamusume/update/

    try:
        umamusume = Umamusume.objects.get(id=id)
    except Umamusume.DoesNotExist:
        return Response(
            {'error': 'Uma not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if umamusume.user != request.user:
        return Response(
            {'error': 'You do not have permission to update this Uma'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = UmamusumeCreateSerializer(umamusume, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        uma_serializer = UmamusumeSerializer(umamusume)
        return Response(uma_serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_umamusume(request, id):
    try:
        umamusume = Umamusume.objects.get(id=id)
    except Umamusume.DoesNotExist:
        return Response(
            {'error': 'Uma not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if umamusume.user != request.user:
        return Response(
            {'error': 'You do not have permission to update this Uma'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    umamusume.delete()
    return Response(
        {'message': 'Uma deleted succesfully'},
        status=status.HTTP_204_NO_CONTENT
    )