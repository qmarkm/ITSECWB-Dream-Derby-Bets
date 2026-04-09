from django.conf import settings


class ContentSecurityPolicyMiddleware:
    """
    Adds a Content-Security-Policy header to every response.

    - Admin paths get a permissive policy (Django admin uses inline scripts/styles).
    - All other paths (API) get a restrictive policy — JSON responses don't render
      HTML, but CSP still prevents any accidental mis-rendering and signals intent.
    """

    # Django admin requires inline scripts and styles.
    _ADMIN_CSP = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "frame-ancestors 'none';"
    )

    # Pure API responses: nothing should be rendered, so lock everything down.
    _API_CSP = (
        "default-src 'none'; "
        "frame-ancestors 'none';"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/admin/'):
            response['Content-Security-Policy'] = self._ADMIN_CSP
        else:
            response['Content-Security-Policy'] = self._API_CSP
        return response
