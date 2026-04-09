import re
from rest_framework import serializers
from .models import Aptitude, Skill, Umamusume, Umas

_HTML_PATTERN = re.compile(r'<[^>]+>')
_XSS_PATTERN = re.compile(r'(?i)(javascript\s*:|on\w+\s*=|<script)', re.IGNORECASE)
_VALID_URL_SCHEMES = ('http://', 'https://')


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']


class UmaSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(source='unique_skill', many=True, read_only=True)

    class Meta:
        model = Umas
        fields = ['id', 'name', 'avatar_url', 'is_active', 'skills']
        read_only_fields = ['id']


class UmaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Umas
        fields = ['name', 'avatar_url']
        extra_kwargs = {
            'avatar_url': {'required': False, 'allow_blank': True},
        }

    def validate_name(self, value):
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            if Umas.objects.filter(name__iexact=value).exists():
                raise serializers.ValidationError("Name is already taken.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_avatar_url(self, value):
        try:
            if not value:
                return value
            if not value.startswith(_VALID_URL_SCHEMES):
                raise serializers.ValidationError("Invalid avatar URL.")
            if _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Invalid avatar URL.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid avatar URL.")
        finally:
            pass


class AptitudeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aptitude
        fields = [
            'id',
            'turf', 'dirt',
            'short', 'mile', 'medium', 'long',
            'front', 'pace', 'late', 'end'
        ]
        read_only_fields = ['id']


class UmamusumeSerializer(serializers.ModelSerializer):
    base_uma = UmaSerializer(source='uma', read_only=True)
    aptitudes = AptitudeSerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    races_won = serializers.SerializerMethodField()
    races_lost = serializers.SerializerMethodField()

    def get_races_won(self, obj):
        return obj.results.filter(place=1).count()

    def get_races_lost(self, obj):
        return obj.results.filter(place__gt=1).count()

    class Meta:
        model = Umamusume
        fields = [
            'id', 'name', 'avatar_url', 'user', 'user_username',
            'base_uma',
            'speed', 'stamina', 'power', 'guts', 'wit',
            'skills', 'aptitudes', 'created_at',
            'races_won', 'races_lost',
        ]
        read_only_fields = ['id', 'user', 'created_at']


class AptitudeUpdateSerializer(serializers.ModelSerializer):
    _rank = Aptitude.Rank.choices

    turf = serializers.ChoiceField(choices=_rank, required=False)
    dirt = serializers.ChoiceField(choices=_rank, required=False)
    short = serializers.ChoiceField(choices=_rank, required=False)
    mile = serializers.ChoiceField(choices=_rank, required=False)
    medium = serializers.ChoiceField(choices=_rank, required=False)
    long = serializers.ChoiceField(choices=_rank, required=False)
    front = serializers.ChoiceField(choices=_rank, required=False)
    pace = serializers.ChoiceField(choices=_rank, required=False)
    late = serializers.ChoiceField(choices=_rank, required=False)
    end = serializers.ChoiceField(choices=_rank, required=False)

    class Meta:
        model = Aptitude
        fields = [
            'turf', 'dirt',
            'short', 'mile', 'medium', 'long',
            'front', 'pace', 'late', 'end'
        ]


class UmamusumeCreateSerializer(serializers.ModelSerializer):
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    base_uma_id = serializers.PrimaryKeyRelatedField(
        queryset=Umas.objects.all(),
        source='uma',
        write_only=True,
        required=True
    )
    aptitudes = AptitudeUpdateSerializer(required=False)

    class Meta:
        model = Umamusume
        fields = [
            'name', 'avatar_url', 'base_uma_id',
            'speed', 'stamina', 'power', 'guts', 'wit',
            'skill_ids', 'aptitudes'
        ]

    def validate_name(self, value):
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_avatar_url(self, value):
        try:
            if not value:
                return value
            if not value.startswith(_VALID_URL_SCHEMES):
                raise serializers.ValidationError("Invalid avatar URL.")
            if _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Invalid avatar URL.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid avatar URL.")
        finally:
            pass

    def create(self, validated_data):
        try:
            skill_ids = validated_data.pop('skill_ids', [])
            aptitudes_data = validated_data.pop('aptitudes', None)

            umamusume = Umamusume.objects.create(**validated_data)

            base_uma_skills = list(umamusume.uma.unique_skill.all()) if umamusume.uma else []
            all_skills = list({s.id: s for s in [*skill_ids, *base_uma_skills]}.values())
            umamusume.skills.set(all_skills)

            Aptitude.objects.create(umamusume=umamusume, **(aptitudes_data or {}))

            return umamusume
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to create Umamusume.")
        finally:
            pass

    def update(self, instance, validated_data):
        try:
            skill_ids = validated_data.pop('skill_ids', None)
            aptitudes_data = validated_data.pop('aptitudes', None)

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if skill_ids is not None:
                instance.skills.set(skill_ids)

            if aptitudes_data is not None:
                Aptitude.objects.filter(umamusume=instance).update(**aptitudes_data)

            return instance
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Unable to update Umamusume.")
        finally:
            pass


class UmaUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Umas
        fields = ['name', 'avatar_url']
        extra_kwargs = {
            'name': {'required': False},
            'avatar_url': {'required': False, 'allow_blank': True},
        }

    def validate_name(self, value):
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            if Umas.objects.filter(name__iexact=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Name is already taken.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_avatar_url(self, value):
        try:
            if not value:
                return value
            if not value.startswith(_VALID_URL_SCHEMES):
                raise serializers.ValidationError("Invalid avatar URL.")
            if _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Invalid avatar URL.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid avatar URL.")
        finally:
            pass


class SkillAdminSerializer(serializers.ModelSerializer):
    uma_id = serializers.IntegerField(source='uma.id', read_only=True, allow_null=True)
    uma_name = serializers.CharField(source='uma.name', read_only=True, allow_null=True)

    class Meta:
        model = Skill
        fields = ['id', 'name', 'description', 'uma_id', 'uma_name']


class SkillUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['name', 'description']
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False, 'allow_blank': True},
        }

    def validate_name(self, value):
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_description(self, value):
        try:
            if not value:
                return value
            value = value.strip()
            if len(value) > 500:
                raise serializers.ValidationError("Description is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Description contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid description.")
        finally:
            pass


class SkillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['name', 'description']

    def validate_name(self, value):
        try:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Name is required.")
            if len(value) > 100:
                raise serializers.ValidationError("Name is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Name contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid name.")
        finally:
            pass

    def validate_description(self, value):
        try:
            if not value:
                return value
            value = value.strip()
            if len(value) > 500:
                raise serializers.ValidationError("Description is too long.")
            if _HTML_PATTERN.search(value) or _XSS_PATTERN.search(value):
                raise serializers.ValidationError("Description contains invalid characters.")
            return value
        except serializers.ValidationError:
            raise
        except Exception:
            raise serializers.ValidationError("Invalid description.")
        finally:
            pass
