import logging
import traceback

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger('django.request')


def server_error(exc):
    """Return a 500 response with debug details when DEBUG=True."""
    logger.exception("Unhandled exception in view")
    if settings.DEBUG:
        return Response(
            {
                'error': 'An unexpected error occurred.',
                'exception': type(exc).__name__,
                'detail': str(exc),
                'traceback': traceback.format_exc(),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return Response(
        {'error': 'An unexpected error occurred.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
