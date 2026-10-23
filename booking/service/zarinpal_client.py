# booking/service/zarinpal_client.py
"""Minimal Zarinpal PG v4 client (request + verify)."""
from __future__ import annotations

import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ZarinpalError(Exception):
    def __init__(self, message: str, *, code: str = "zarinpal_error"):
        super().__init__(message)
        self.message = message
        self.code = code


def _merchant_id() -> str:
    mid = (getattr(settings, "ZARINPAL_MERCHANT_ID", None) or "").strip()
    if not mid:
        raise ZarinpalError(
            "ZARINPAL_MERCHANT_ID is not configured.",
            code="config",
        )
    return mid


def _sandbox() -> bool:
    return bool(getattr(settings, "ZARINPAL_SANDBOX", True))


def _api_base() -> str:
    if _sandbox():
        return "https://sandbox.zarinpal.com/pg/v4/payment"
    return "https://api.zarinpal.com/pg/v4/payment"


def start_pay_base() -> str:
    if _sandbox():
        return "https://sandbox.zarinpal.com/pg/StartPay"
    return "https://www.zarinpal.com/pg/StartPay"


def amount_to_rial(total_price, currency: str = "") -> int:
    """
    Convert booking.total_price to integer Rial for Zarinpal.

    Settings:
      ZARINPAL_PRICE_UNIT = "rial" | "toman"  (default "toman")
    """
    unit = (getattr(settings, "ZARINPAL_PRICE_UNIT", "toman") or "toman").lower()
    value = Decimal(str(total_price or 0))
    if value <= 0:
        raise ZarinpalError("Payment amount must be positive.", code="invalid_amount")
    if unit == "rial":
        rial = value
    else:
        rial = value * Decimal("10")
    amount = int(rial.to_integral_value(rounding=ROUND_HALF_UP))
    if amount < 1000:
        raise ZarinpalError(
            "Amount is below Zarinpal minimum (1000 Rial).",
            code="invalid_amount",
        )
    return amount


def _has_errors(errors) -> bool:
    if isinstance(errors, dict) and errors:
        return True
    if isinstance(errors, list) and len(errors) > 0:
        return True
    return False


def _error_message(errors) -> str:
    if isinstance(errors, dict):
        return str(errors.get("message") or errors)
    return str(errors)


def request_payment(
    *,
    amount_rial: int,
    description: str,
    callback_url: str,
    email: str = "",
    mobile: str = "",
) -> dict[str, Any]:
    """Call Zarinpal PaymentRequest. Returns authority."""
    payload: dict[str, Any] = {
        "merchant_id": _merchant_id(),
        "amount": int(amount_rial),
        "callback_url": callback_url,
        "description": (description or "Booking payment")[:255],
        "metadata": {},
    }
    if email:
        payload["metadata"]["email"] = email[:255]
    if mobile:
        payload["metadata"]["mobile"] = mobile[:20]

    url = f"{_api_base()}/request.json"
    headers = {"accept": "application/json", "content-type": "application/json"}
    try:
        resp = requests.post(url, data=json.dumps(payload), headers=headers, timeout=30)
        body = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.exception("Zarinpal request failed")
        raise ZarinpalError("Could not reach Zarinpal.", code="network") from exc

    data = body.get("data") or {}
    errors = body.get("errors")
    if _has_errors(errors):
        raise ZarinpalError(
            _error_message(errors) or "Zarinpal request error.",
            code="request_failed",
        )

    authority = (data.get("authority") or "").strip()
    code = data.get("code")
    if code != 100 or not authority:
        raise ZarinpalError(
            f"Zarinpal request rejected (code={code}).",
            code="request_failed",
        )

    return {
        "authority": authority,
        "fee": data.get("fee"),
        "raw": body,
    }


def start_pay_url(authority: str) -> str:
    return f"{start_pay_base()}/{authority}"


def verify_payment(*, authority: str, amount_rial: int) -> dict[str, Any]:
    """Verify payment after callback. Returns ref_id."""
    payload = {
        "merchant_id": _merchant_id(),
        "amount": int(amount_rial),
        "authority": authority,
    }
    url = f"{_api_base()}/verify.json"
    headers = {"accept": "application/json", "content-type": "application/json"}
    try:
        resp = requests.post(url, data=json.dumps(payload), headers=headers, timeout=30)
        body = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.exception("Zarinpal verify failed")
        raise ZarinpalError(
            "Could not verify payment with Zarinpal.", code="network"
        ) from exc

    data = body.get("data") or {}
    errors = body.get("errors")
    if _has_errors(errors):
        raise ZarinpalError(
            _error_message(errors) or "Zarinpal verify error.",
            code="verify_failed",
        )

    code = data.get("code")
    if code not in (100, 101):
        raise ZarinpalError(
            f"Payment not verified (code={code}).",
            code="verify_failed",
        )

    ref_id = data.get("ref_id")
    return {
        "ref_id": str(ref_id) if ref_id is not None else "",
        "card_pan": data.get("card_pan"),
        "code": code,
        "raw": body,
    }
