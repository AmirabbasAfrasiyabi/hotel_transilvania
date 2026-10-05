from django.conf import settings

class AdminSessionSeparationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.prefixes = tuple(getattr(settings, "ADMIN_URL_PREFIXES", ("/admin/",)))
        # (cookie name Django uses, cookie name used in the admin area)
        self.cookie_pairs = (
            (settings.SESSION_COOKIE_NAME,
             getattr(settings, "ADMIN_SESSION_COOKIE_NAME", "admin_sessionid")),
            (settings.CSRF_COOKIE_NAME,
             getattr(settings, "ADMIN_CSRF_COOKIE_NAME", "admin_csrftoken")),
        )

    def __call__(self, request):
        is_admin_area = request.path_info.startswith(self.prefixes)

        if is_admin_area:
            # Make Django's session/CSRF middleware see ONLY the admin cookies here.
            for default_name, admin_name in self.cookie_pairs:
                admin_value = request.COOKIES.get(admin_name)
                if admin_value is None:
                    request.COOKIES.pop(default_name, None)
                else:
                    request.COOKIES[default_name] = admin_value

        response = self.get_response(request)

        if is_admin_area:
            for default_name, admin_name in self.cookie_pairs:
                self._rename_cookie(response, default_name, admin_name)
        return response

    @staticmethod
    def _rename_cookie(response, default_name, admin_name):
        """Store a cookie that Django set under its default name under the admin name."""
        morsel = response.cookies.pop(default_name, None)
        if morsel is None:
            return
        max_age = morsel["max-age"]
        response.set_cookie(
            admin_name,
            morsel.value,
            max_age=int(max_age) if max_age != "" else None,
            expires=morsel["expires"] or None,
            path=morsel["path"] or "/",
            domain=morsel["domain"] or None,
            secure=bool(morsel["secure"]),
            httponly=bool(morsel["httponly"]),
            samesite=morsel["samesite"] or None,
        )


class BlockStaffOnSiteMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.prefixes = tuple(getattr(settings, "ADMIN_URL_PREFIXES", ("/admin/",)))
        self.enabled = getattr(settings, "SITE_BLOCK_STAFF_LOGIN", True)

    def __call__(self, request):
        if self.enabled and not request.path_info.startswith(self.prefixes):
            user = getattr(request, "user", None)
            if user is not None and user.is_authenticated and (user.is_staff or user.is_superuser):
                from django.contrib.auth import logout
                logout(request)
        return self.get_response(request)
