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


def _error_status(code: str) -> int:
    return 410 if code in ("expired", "unavailable") else 400


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
            {"ok": False, "error": exc.message, "code": exc.code}, status=400
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


@require_http_methods(["GET", "POST"])
def passenger_details_view(request, booking_id: int):
    if not request.user.is_authenticated:
        return _require_login_json_or_redirect(
            request, f"/booking/passengers/{booking_id}/"
        )

    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError as exc:
        if exp.code in ("not_found", "forbidden"):
            return redirect("transport:flight_results")
        return render(
            request,
            "booking/passengers.html",
            {"error": exc.message, "booking": None},
        )

    if booking.user_id is None:
        booking.user = request.user
        booking.save(update_fields=["user"])

    if request.method == "GET":
        return render(
            request,
            "booking/passengers.html",
            {
                "booking": booking,
                "offer": booking.offer_snapshot,
                "error": None,
            },
        )

    if booking.status != Booking.Status.DRAFT:
        return JsonResponse(
            {
                "ok": False,
                "error": "Passenger details cannot be changed after payment has started.",
                "code": "invalid_status",
            },
            status=400,
        )

    try:
        if request.content_type and "application/json" in request.content_type:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        else:
            payload = {
                "contact": {
                    "contact_full_name": request.POST.get("contact_full_name", ""),
                    "contact_email": request.POST.get("contact_email", ""),
                    "contact_phone": request.POST.get("contact_phone", ""),
                },
                "passengers": [],
            }
        contact = payload.get("contact") or {}
        passengers = payload.get("passengers") or []
        BookingService.save_passengers_and_contact(booking, passengers, contact)
    except BookingServiceError as exc:
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exp.code}, status=400
        )
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "next_url": f"/booking/services/{booking.pk}/",
        }
    )
