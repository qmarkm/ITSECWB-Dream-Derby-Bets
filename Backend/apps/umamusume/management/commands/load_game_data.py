"""
Management command to seed game-accurate Umamusume base Uma and skill data.

Usage:
    python manage.py load_game_data
    python manage.py load_game_data --clear-skills   # wipe existing skills first
"""

from django.core.management.base import BaseCommand
from apps.umamusume.models import Skill, Umas

GAME_DATA = [
    {
        'name': 'Matikanetannhauser',
        'skills': [
            {
                'name': 'Go, Go, Mun!',
                'description': 'Recovers stamina and moderately boosts velocity when positioned 3rd–6th in the midpack during the second half of the race. Signature skill.',
            },
            {
                'name': 'Late Bloomer',
                'description': 'Slightly increases speed when overtaking multiple runners in the final stretch.',
            },
        ],
    },
    {
        'name': 'Oguri Cap',
        'skills': [
            {
                'name': 'Triumphant Pulse',
                'description': 'Greatly increases the ability to break free from the pack. Activates when in 2nd–5th place within the top 50% of the pack with 200m remaining. Signature skill.',
            },
            {
                'name': 'Gourmand',
                'description': 'Recovers stamina steadily during mid-race. Reflects her love of eating.',
            },
        ],
    },
    {
        'name': 'Maruzensky',
        'skills': [
            {
                'name': 'LP1211-M',
                'description': 'Increases acceleration by shifting gears when positioned toward the front on the final corner. Named after her real-life record lap time of 1:21.1. Signature skill.',
            },
            {
                'name': 'Changing Gears',
                'description': 'Boosts velocity mid-race when maintaining a lead position.',
            },
        ],
    },
    {
        'name': 'Seiun Sky',
        'skills': [
            {
                'name': 'Angling and Scheming',
                'description': 'Strong acceleration skill that activates when in 1st place on a corner during the late race. Most effective for front runners who maintain an early lead. Signature skill.',
            },
            {
                'name': 'Hesitant Pace Chasers',
                'description': 'Reduces the speed of Pace Chasers during the late race, helping maintain a front-running lead.',
            },
        ],
    },
    {
        'name': 'Super Creek',
        'skills': [
            {
                'name': 'Purity of Heart',
                'description': 'Recovers stamina when positioned 2nd through the top 40% of the pack during mid-race. Signature skill.',
            },
            {
                'name': 'Swinging Maestro',
                'description': 'Randomly recovers stamina when running along corners. Reflects her graceful, musical style.',
            },
        ],
    },
    {
        'name': 'Manhattan Cafe',
        'skills': [
            {
                'name': 'Chasing After You',
                'description': 'Moderately increases velocity while slightly intimidating runners ahead. Activates from 4th–6th place in the second half of the race. Reflects her theme of chasing a mysterious friend. Signature skill.',
            },
            {
                'name': 'Stamina Siphon',
                'description': 'Recovers own stamina while reducing an opponent\'s stamina. Powerful for long-distance races.',
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed game-accurate base Uma and skill data. Safe to run multiple times.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-skills',
            action='store_true',
            help='Delete all existing skills before loading new ones.',
        )

    def handle(self, *args, **options):
        if options['clear_skills']:
            deleted, _ = Skill.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Cleared {deleted} existing skill(s).'))

        created_umas = 0
        updated_umas = 0
        created_skills = 0
        updated_skills = 0

        for entry in GAME_DATA:
            uma, uma_created = Umas.objects.get_or_create(name=entry['name'])

            if uma_created:
                created_umas += 1
                self.stdout.write(f'  Created Uma: {uma.name}')
            else:
                updated_umas += 1
                self.stdout.write(f'  Found Uma:   {uma.name}')

            for skill_data in entry['skills']:
                skill, skill_created = Skill.objects.update_or_create(
                    name=skill_data['name'],
                    defaults={
                        'description': skill_data['description'],
                        'uma': uma,
                    },
                )
                if skill_created:
                    created_skills += 1
                    self.stdout.write(f'    + Skill created: {skill.name}')
                else:
                    updated_skills += 1
                    self.stdout.write(f'    ~ Skill updated: {skill.name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Umas: {created_umas} created, {updated_umas} found. '
            f'Skills: {created_skills} created, {updated_skills} updated.'
        ))
