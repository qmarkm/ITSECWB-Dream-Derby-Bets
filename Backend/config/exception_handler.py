"""
Custom DRF exception handler.

Behaviour:
  DEBUG=True  — returns full exception class, message, and stack trace.
  DEBUG=False — returns a generic "unexpected error" message only,
                so internal details are never exposed to clients.

Known DRF exceptions (ValidationError, NotFound, PermissionDenied, etc.)
are still handled by DRF's default handler and pass through unchanged.
Only truly unhandled exceptions (Python errors that DRF would otherwise
let propagate as a 500) are intercepted here.
"""

import traceback
import logging

from django.conf import settings
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('django.request')


def custom_exception_handler(exc, context):
    # 1. Let DRF handle known API exceptions first (returns a Response or None).
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    # 2. Unhandled exception — log it with full traceback.
    view = context.get('view', 'unknown view')
    logger.exception("Unhandled server error in %s", view)

    # 3. Build the response based on DEBUG mode.
    if settings.DEBUG:
        return Response(
            {
                'error': 'Internal server error.',
                'exception': type(exc).__name__,
                'detail': str(exc),
                'traceback': traceback.format_exc(),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {'error': 'An unexpected error occurred. Please try again later.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
