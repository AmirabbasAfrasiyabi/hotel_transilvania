# booking/zarinpal_views.py
"""Zarinpal payment start + callback views."""
from __future__ import annotations

import logging
from urllib.parse import urlencode

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST

from booking.models import Booking
from booking.service.booking_service import BookingService, BookingServiceError
from booking.service.zarinpal_client import (
    ZarinpalError,
    amount_to_rial,
    request_payment,
    start_pay_url,
    verify_payment,
)

logger = logging.getLogger(__name__)


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
def zarinpal_start_view(request, booking_id: int):
    """Create Zarinpal payment request; return StartPay URL."""
    if not request.user.is_authenticated:
        return _require_login_json_or_redirect(
            request, f"/booking/payment/{booking_id}/"
        )

    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError as exc:
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code},
            status=_error_status(exc.code),
        )

    if booking.status != Booking.Status.PENDING_PAYMENT:
        return JsonResponse(
            {
                "ok": False,
                "error": "Booking is not awaiting payment.",
                "code": "invalid_status",
            },
            status=400,
        )

    try:
        amount_rial = amount_to_rial(booking.total_price, booking.currency or "")
        callback_path = reverse(
            "booking:zarinpal_callback", kwargs={"booking_id": booking.pk}
        )
        callback_url = request.build_absolute_uri(callback_path)
        configured = (getattr(settings, "ZARINPAL_CALLBACK_URL", None) or "").strip()
        if configured:
            if "{booking_id}" in configured:
                callback_url = configured.format(booking_id=booking.pk)
            elif configured.endswith("/"):
                callback_url = f"{configured}{booking.pk}/"
            else:
                callback_url = configured

        result = request_payment(
            amount_rial=amount_rial,
            description=(
                f"Booking #{booking.pk} "
                f"{booking.origin_code or ''}-{booking.destination_code or ''}"
            ),
            callback_url=callback_url,
            email=booking.contact_email or "",
            mobile=booking.contact_phone or "",
        )
        authority = result["authority"]
        booking.payment_authority = authority[:100]
        booking.save(update_fields=["payment_authority", "updated_at"])
        pay_url = start_pay_url(authority)
    except ZarinpalError as exc:
        logger.warning("Zarinpal start failed booking=%s: %s", booking_id, exc.message)
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code},
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "authority": authority,
            "redirect_url": pay_url,
        }
    )


@require_http_methods(["GET", "POST"])
@csrf_exempt
def zarinpal_callback_view(request, booking_id: int):
    """Zarinpal returns here with Authority & Status; verify then mark_paid."""
    authority = (
        request.GET.get("Authority") or request.POST.get("Authority") or ""
    ).strip()
    status = (
        request.GET.get("Status") or request.POST.get("Status") or ""
    ).strip().upper()

    try:
        booking = Booking.objects.get(pk=booking_id)
    except Booking.DoesNotExist:
        return redirect("transport:out")

    if request.user.is_authenticated:
        try:
            booking = BookingService.get_booking_for_request(booking_id, request)
        except BookingServiceError:
            return redirect(
                f"/booking/payment/{booking_id}/?error=Access%20denied"
            )

    if booking.status == Booking.Status.ISSUED:
        return redirect("booking:confirmation", booking_id=booking.pk)

    if status != "OK" or not authority:
        return redirect(
            f"/booking/payment/{booking.pk}/?error=Payment%20cancelled%20or%20failed"
        )

    stored = (booking.payment_authority or "").strip()
    if stored and stored != authority:
        return redirect(
            f"/booking/payment/{booking.pk}/?error=Invalid%20payment%20authority"
        )

    try:
        amount_rial = amount_to_rial(booking.total_price, booking.currency or "")
        verified = verify_payment(authority=authority, amount_rial=amount_rial)
        booking = BookingService.mark_paid(
            booking,
            payment_ref=str(verified.get("ref_id") or "")[:100],
            payment_authority=authority[:100],
        )
    except ZarinpalError as exc:
        logger.warning(
            "Zarinpal verify failed booking=%s: %s", booking_id, exc.message
        )
        return redirect(
            f"/booking/payment/{booking.pk}/?error={exc.message[:120]}"
        )
    except BookingServiceError as exc:
        return redirect(
            f"/booking/payment/{booking.pk}/?error={exc.message[:120]}"
        )

    return redirect("booking:confirmation", booking_id=booking.pk)
