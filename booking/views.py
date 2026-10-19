# booking/views.py
import json

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from booking.models import Booking
from booking.service.booking_service import BookingService, BookingServiceError


def _ensure_session(request):
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


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

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "redirect_url": f"/booking/passengers/{booking.pk}/",
        }
    )


@require_http_methods(["GET", "POST"])
def passenger_details_view(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError as exc:
        if exc.code in ("not_found", "forbidden"):
            return redirect("transport:flight_results")
        return render(
            request,
            "booking/passengers.html",
            {"error": exc.message, "booking": None},
        )

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
            {"ok": False, "error": exc.message, "code": exc.code}, status=400
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


@require_http_methods(["GET", "POST"])
def travel_services_view(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError as exc:
        if exc.code in ("not_found", "forbidden", "expired"):
            return redirect("transport:flight_results")
        return render(
            request,
            "booking/services.html",
            {"error": exc.message, "booking": None},
        )

    if request.method == "GET":
        passengers = list(
            booking.passengers.all().values(
                "id",
                "order",
                "first_name",
                "last_name",
                "passenger_type",
            )
        )
        return render(
            request,
            "booking/services.html",
            {
                "booking": booking,
                "offer": booking.offer_snapshot,
                "passengers_json": passengers,
                "error": None,
            },
        )

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
        BookingService.save_travel_services(booking, payload)
    except BookingServiceError as exc:
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code}, status=400
        )
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "next_url": f"/booking/review/{booking.pk}/",
        }
    )


@require_GET
def review_view(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError:
        return redirect("transport:out")

    price_info = None
    error = None
    unavailable = False

    try:
        price_info = BookingService.revalidate(booking)
        booking.refresh_from_db()
    except BookingServiceError as exc:
        error = exc.message
        if exc.code in ("unavailable", "expired"):
            unavailable = True

    return render(
        request,
        "booking/review.html",
        {
            "booking": booking,
            "offer": booking.offer_snapshot,
            "passengers": booking.passengers.all(),
            "price_info": price_info,
            "error": error,
            "unavailable": unavailable,
        },
    )


@require_POST
def revalidate_api(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
        result = BookingService.revalidate(booking)
        booking.refresh_from_db()
    except BookingServiceError as exc:
        status = 410 if exc.code in ("expired", "unavailable") else 400
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code}, status=status
        )

    return JsonResponse(
        {
            "ok": True,
            "price_changed": result["price_changed"],
            "old_amount": result["old_amount"],
            "new_amount": result["new_amount"],
            "currency": result["currency"],
            "message": result.get("message"),
            "total_price": str(booking.total_price),
        }
    )


@require_POST
def confirm_booking_view(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
        booking = BookingService.confirm_and_issue(booking)
    except BookingServiceError as exc:
        status = 410 if exc.code in ("expired", "unavailable") else 400
        return JsonResponse(
            {"ok": False, "error": exc.message, "code": exc.code}, status=status
        )

    return JsonResponse(
        {
            "ok": True,
            "booking_id": booking.pk,
            "status": booking.status,
            "provider_order_id": booking.provider_order_id,
            "redirect_url": f"/booking/confirmation/{booking.pk}/",
        }
    )


@require_GET
def confirmation_view(request, booking_id: int):
    try:
        booking = BookingService.get_booking_for_request(booking_id, request)
    except BookingServiceError:
        return redirect("transport:out")

    if booking.status != Booking.Status.ISSUED:
        return redirect("booking:review", booking_id=booking.pk)

    order_meta = (booking.offer_snapshot or {}).get("order") or {}
    return render(
        request,
        "booking/confirmation.html",
        {
            "booking": booking,
            "passengers": booking.passengers.all(),
            "order_meta": order_meta,
        },
    )
