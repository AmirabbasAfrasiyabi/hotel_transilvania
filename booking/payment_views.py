# booking/payment_views.py
"""Payment page and sandbox/gateway callback."""
import json

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET, require_POST

from urllib.parse import urlencode

from django.urls import reverse

from booking.models import Booking
from booking.service.booking_service import BookingService, BookingServiceError


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


@require_GET
def payment_view(request, booking_id: int):
    """Payment step (sandbox until real gateway is connected)."""
    if not request.user.is_authenticated:
        return redirect(_login_url_with_next(f"/booking/payment/{booking_id}/"))

    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError:
        return redirect("transport:out")

    if booking.user_id is None:
        booking.user = request.user
        booking.save(update_fields=["user"])

    if booking.status == Booking.Status.ISSUED:
        return redirect("booking:confirmation", booking_id=booking.pk)

    if booking.status == Booking.Status.DRAFT:
        return redirect("booking:review", booking_id=booking.pk)

    if booking.status not in (
        Booking.Status.PENDING_PAYMENT,
        Booking.Status.PAID,
    ):
        return render(
            request,
            "booking/payment.html",
            {
                "booking": booking,
                "error": "This booking is not awaiting payment.",
            },
        )

    return render(
        request,
        "booking/payment.html",
        {"booking": booking, "error": None},
    )


@require_POST
def payment_callback_view(request, booking_id: int):
    """
    Gateway callback / sandbox success handler.
    JSON: { "success": true, "payment_ref": "...", "payment_authority": "..." }
    """
    if not request.user.is_authenticated:
        return _require_login_json_or_redirect(
            request, f"/booking/payment/{booking_id}/"
        )

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    success = payload.get("success", True)
    payment_ref = str(payload.get("payment_ref") or "")[:100]
    payment_authority = str(payload.get("payment_authority") or "")[:100]

    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError as exc:
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code},
            status=_error_status(exc.code),
        )

    if not success:
        return JsonResponse(
            {
                "ok": False,
                "error": "Payment was not successful.",
                "code": "payment_failed",
                "redirect_url": f"/booking/payment/{booking.pk}/",
            },
            status=400,
        )

    try:
        booking = BookingService.mark_paid(
            booking,
            payment_ref=payment_ref or f"SANDBOX-{booking.pk}",
            payment_authority=payment_authority or "SANDBOX",
        )
    except BookingServiceError as exp:
        status = 410 if exp.code in ("expired", "unavailable") else 400
        return JsonResponse(
            {"ok": False, "error": exp.message, "code": exp.code},
            status=status,
        )

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "status": booking.status,
            "provider_order_id": booking.provider_order_id,
            "redirect_url": f"/booking/confirmation/{booking.pk}/",
        },
    )
