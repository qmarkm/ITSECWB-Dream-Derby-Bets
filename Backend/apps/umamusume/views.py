import csv
import io
import json
import os
import time

from PIL import Image, UnidentifiedImageError

from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Skill, Umas, Umamusume
from .serializers import (
    SkillAdminSerializer,
    SkillCreateSerializer,
    SkillSerializer,
    SkillUpdateSerializer,
    UmaCreateSerializer,
    UmaUpdateSerializer,
    UmamusumeCreateSerializer,
    UmamusumeSerializer,
    UmaSerializer,
)


def _build_umamusume_request_data(request, user_id, *, partial):
    """
    Parse multipart form (POST + FILES) for UmamusumeCreateSerializer.
    If partial=False (create), default skill_ids to [] when omitted.
    If partial=True (update), omit skill_ids when not in POST so skills are unchanged.
    """
    data = {}

    for key in request.POST.keys():
        if key not in ('skill_ids', 'aptitudes'):
            data[key] = request.POST.get(key)

    avatar_file = request.FILES.get('avatar')
    if avatar_file:
        data['avatar'] = avatar_file

    if 'skill_ids' in request.POST:
        skill_ids_raw = request.POST.getlist('skill_ids')
        if len(skill_ids_raw) > 20:
            return None, Response(
                {'error': 'Too many skills selected. Maximum is 20.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data['skill_ids'] = [int(i) for i in skill_ids_raw if i and i.strip()]
        except (ValueError, TypeError):
            data['skill_ids'] = []
    elif not partial:
        data['skill_ids'] = []

    if 'aptitudes' in request.POST:
        aptitudes_str = request.POST.get('aptitudes')
        if aptitudes_str:
            try:
                data['aptitudes'] = json.loads(aptitudes_str)
            except json.JSONDecodeError:
                return None, Response(
                    {'error': 'Invalid aptitudes format.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

    return data, None


@api_view(['GET'])
@permission_classes([AllowAny])
def index(request):
    try:
        umamusume = Umamusume.objects.all()
        serializer = UmamusumeSerializer(umamusume, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([AllowAny])
def view_umamusume(request, id):
    try:
        umamusume = Umamusume.objects.get(id=id)
        serializer = UmamusumeSerializer(umamusume, context={'request': request})
        return Response(serializer.data)
    except Umamusume.DoesNotExist:
        return Response({'error': 'Umamusume not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_umas(request):
    try:
        umamusume = Umamusume.objects.filter(user=request.user)
        serializer = UmamusumeSerializer(umamusume, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skills(request):
    try:
        skills = Skill.objects.all()
        serializer = SkillSerializer(skills, many=True)
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([AllowAny])
def get_umas(request):
    try:
        umas = Umas.objects.filter(is_active=True)
        serializer = UmaSerializer(umas, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_umas(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        umas = Umas.objects.all()
        serializer = UmaSerializer(umas, many=True, context={'request': request})
        return Response(serializer.data)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_uma_active(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        uma = Umas.objects.get(id=id)
        uma.is_active = not uma.is_active
        uma.save()
        return Response(UmaSerializer(uma, context={'request': request}).data)
    except Umas.DoesNotExist:
        return Response({'error': 'Uma not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_uma(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        uma = Umas.objects.get(id=id)
        data = request.data.copy()
        if 'avatar' in request.FILES:
            data['avatar'] = request.FILES['avatar']
        serializer = UmaUpdateSerializer(uma, data=data, partial=True)
        if serializer.is_valid():
            uma = serializer.save()
            return Response(UmaSerializer(uma, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Umas.DoesNotExist:
        return Response({'error': 'Uma not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unassign_skill(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        skill = Skill.objects.get(id=id)
        skill.uma = None
        skill.save()
        return Response(SkillSerializer(skill).data)

    except Skill.DoesNotExist:
        return Response({'error': 'Skill not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_skills(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        skills = Skill.objects.select_related('uma').all().order_by('uma__name', 'name')
        serializer = SkillAdminSerializer(skills, many=True)
        return Response(serializer.data)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_skill(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        skill = Skill.objects.get(id=id)
        serializer = SkillUpdateSerializer(skill, data=request.data, partial=True)
        if serializer.is_valid():
            skill = serializer.save()
            return Response(SkillAdminSerializer(skill).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Skill.DoesNotExist:
        return Response({'error': 'Skill not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_skill(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        skill = Skill.objects.get(id=id)
        skill.delete()
        return Response({'message': 'Skill deleted successfully.'}, status=status.HTTP_200_OK)

    except Skill.DoesNotExist:
        return Response({'error': 'Skill not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_skill(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SkillCreateSerializer(data=request.data)
        if serializer.is_valid():
            skill = serializer.save()
            return Response(SkillSerializer(skill).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_skill_to_uma(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        skill_id = request.data.get('skill_id')
        uma_id = request.data.get('uma_id')

        if not skill_id or not uma_id:
            return Response({'error': 'skill_id and uma_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            skill_id = int(skill_id)
            if skill_id <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'skill_id must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uma_id = int(uma_id)
            if uma_id <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'uma_id must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)

        skill = Skill.objects.get(id=skill_id)
        uma = Umas.objects.get(id=uma_id)
        skill.uma = uma
        skill.save()
        return Response(SkillSerializer(skill).data)

    except Skill.DoesNotExist:
        return Response({'error': 'Skill not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Umas.DoesNotExist:
        return Response({'error': 'Uma not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_uma(request):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if 'avatar' in request.FILES:
            data['avatar'] = request.FILES['avatar']
        serializer = UmaCreateSerializer(data=data)
        if serializer.is_valid():
            uma = serializer.save()
            return Response(UmaSerializer(uma, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_umas_csv(request):
    csv_file = None
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        if 'file' not in request.FILES:
            return Response({'error': 'No file provided. Include a "file" field.'}, status=status.HTTP_400_BAD_REQUEST)

        csv_file = request.FILES['file']

        if not csv_file.name.lower().endswith('.csv'):
            return Response({'error': 'File must be a .csv file.'}, status=status.HTTP_400_BAD_REQUEST)

        from ..users.models import SystemSettings
        max_size_kb = int(SystemSettings.get_setting('CSV_MAX_SIZE_KB', 50))
        MAX_SIZE = max_size_kb * 1024
        
        if csv_file.size > MAX_SIZE:
            return Response({'error': f'File too large. Maximum size is {max_size_kb}KB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_bytes = csv_file.read()
            content = raw_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'File must be UTF-8 encoded.'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(content))

        if reader.fieldnames is None or 'name' not in reader.fieldnames:
            return Response({'error': 'CSV must have a "name" column.'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        skipped_count = 0
        errors = []

        MAX_ROWS = int(SystemSettings.get_setting('CSV_MAX_ROWS', 200))
        for row_number, row in enumerate(reader, start=2):
            if row_number - 1 > MAX_ROWS:
                errors.append({'row': row_number, 'name': '(skipped)', 'reason': f'Row limit of {MAX_ROWS} exceeded.'})
                break
            try:
                data = {
                    'name': row.get('name', ''),
                }

                if Umas.objects.filter(name__iexact=data['name'].strip()).exists():
                    skipped_count += 1
                    continue

                serializer = UmaCreateSerializer(data=data)
                if not serializer.is_valid():
                    first_error = next(iter(serializer.errors.values()))[0]
                    errors.append({
                        'row': row_number,
                        'name': data['name'],
                        'reason': str(first_error),
                    })
                    continue

                uma = serializer.save()
                created_count += 1

                skill_name = row.get('skill_name', '').strip()
                skill_description = row.get('skill_description', '').strip()
                if skill_name:
                    skill_serializer = SkillCreateSerializer(data={
                        'name': skill_name,
                        'description': skill_description or '',
                    })
                    if skill_serializer.is_valid():
                        skill = skill_serializer.save()
                        skill.uma = uma
                        skill.save()

            except Exception:
                errors.append({
                    'row': row_number,
                    'name': row.get('name', '(unknown)'),
                    'reason': 'Unexpected error processing row.',
                })
                continue

        return Response({
            'created': created_count,
            'skipped': skipped_count,
            'error_count': len(errors),
            'errors': errors,
        }, status=status.HTTP_200_OK)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        if csv_file:
            csv_file.close()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_umamusume(request):
    try:
        data, err = _build_umamusume_request_data(request, request.user.id, partial=False)
        if err:
            return err

        serializer = UmamusumeCreateSerializer(data=data)
        if serializer.is_valid():
            umamusume = serializer.save(user=request.user)
            return Response(UmamusumeSerializer(umamusume, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_umamusume(request, id):
    try:
        umamusume = Umamusume.objects.get(id=id)

        if umamusume.user != request.user:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        ct = request.content_type or ''
        if 'multipart/form-data' in ct:
            data, err = _build_umamusume_request_data(request, request.user.id, partial=True)
            if err:
                return err
        else:
            data = request.data

        serializer = UmamusumeCreateSerializer(umamusume, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UmamusumeSerializer(umamusume, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Umamusume.DoesNotExist:
        return Response({'error': 'Umamusume not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_umamusume(request, id):
    try:
        umamusume = Umamusume.objects.get(id=id)

        if umamusume.user != request.user:
            return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        umamusume.delete()
        return Response({'message': 'Umamusume deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)

    except Umamusume.DoesNotExist:
        return Response({'error': 'Umamusume not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_uma(request, id):
    try:
        if not (request.user.is_staff and request.user.is_superuser):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            uma = Umas.objects.get(id=id)
        except Umas.DoesNotExist:
            return Response({'error': 'Uma not found.'}, status=status.HTTP_404_NOT_FOUND)

        umamusume_count = Umamusume.objects.filter(uma=uma).count()
        if umamusume_count > 0:
            return Response(
                {'error': f'Cannot delete: {umamusume_count} Umamusume record(s) are based on this Uma. Disable it instead.'},
                status=status.HTTP_409_CONFLICT
            )

        uma.delete()
        return Response({'message': 'Uma deleted successfully.'}, status=status.HTTP_200_OK)

    except Exception:
        return Response({'error': 'An unexpected error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    finally:
        pass
