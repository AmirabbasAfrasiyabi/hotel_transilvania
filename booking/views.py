# booking/views.py
import json
from urllib.parse import urlencode

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from booking.models import Booking
from booking.service.booking_service import BookingService, BookingServiceError


def _ensure_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def _login_url_with_next(next_path: str) -> str:
    try:
        login_path = reverse("account:login")
    except Exception:
        login_path = "/account/login"
    return f"{login_path}?{urlencode({'next': next_path})}"


def _require_login_json_or_redirect(request, next_path: str):
    login_url = _login_url_with_next(next_path)
    accept = (request.headers.get("Accept") or "").lower()
    is_ajax = (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "application/json" in accept
        or (request.content_type and "application/json" in request.content_type)
    )
    if is_ajax or request.method == "POST":
        return JsonResponse(
            {
                "ok": False,
                "error": "Please log in to continue booking.",
                "code": "login_required",
                "redirect_url": login_url,
            },
            status=401,
        )
    return redirect(login_url)


@require_POST
def select_offer_view(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    offer = payload.get("offer")
    search_params = payload.get("search_params") or {}
    session_key = _ensure_session(request)

    try:
        booking = BookingService.create_draft_from_offer(
            user=request.user,
            session_key=session_key,
            offer=offer,
            search_params=search_params,
        )
    except BookingServiceError as exc:
        return JsonResponse(
            {"ok": False, "error": exp.message, "code": exp.code}, status=400
        )

    passengers_path = f"/booking/passengers/{booking.pk}/"

    if not request.user.is_authenticated:
        request.session["pending_booking_id"] = booking.pk
        login_url = _login_url_with_next(passengers_path)
        return JsonResponse(
            {
                "ok": True,
                "booking_id": booking.pk,
                "requires_login": True,
                "redirect_url": login_url,
            }
        )

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "requires_login": False,
            "redirect_url": passengers_path,
        }
    )
