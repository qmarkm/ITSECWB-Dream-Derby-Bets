from django.core.management.base import BaseCommand
from apps.users.models import SystemSettings


class Command(BaseCommand):
    help = 'Initialize default system settings'

    def handle(self, *args, **options):
        # Session timeout settings
        SystemSettings.set_setting(
            key='SESSION_TIMEOUT_MINUTES',
            value='30',
            description='Inactivity timeout in minutes (1-60)'
        )

        SystemSettings.set_setting(
            key='SESSION_WARNING_MINUTES',
            value='5',
            description='Warning display before timeout in minutes (1-10)'
        )

        self.stdout.write(
            self.style.SUCCESS('Successfully initialized system settings')
        )
