from datetime import timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from transport.airport import city_to_iata
from transport.flight_mapper import (
    format_duration,
    parse_duration_minutes,
    simplify_offer,
    simplify_offers,
)
from transport.flight_params import parse_search_params


def in_days(days):
    """A date string N days from today, e.g. '2026-10-25'."""
    return (timezone.localdate() + timedelta(days=days)).isoformat()


class SearchParamsTests(SimpleTestCase):
    def base(self, **extra):
        query = {"origin": "London", "destination": "Dubai", "travel_date": in_days(10)}
        query.update(extra)
        return query

    def test_valid_one_way(self):
        params, errors = parse_search_params(self.base())
        self.assertEqual(errors, {})
        self.assertEqual(params["trip_type"], "oneway")
        self.assertEqual(params["return_date"], "")
        self.assertEqual(params["adults"], 1)

    def test_missing_everything(self):
        params, errors = parse_search_params({})
        self.assertIn("origin", errors)
        self.assertIn("destination", errors)
        self.assertIn("travel_date", errors)

    def test_date_in_the_past(self):
        params, errors = parse_search_params(self.base(travel_date="2020-01-01"))
        self.assertIn("travel_date", errors)

    def test_same_origin_and_destination(self):
        params, errors = parse_search_params(self.base(destination="london"))
        self.assertIn("destination", errors)

    def test_valid_round_trip(self):
        params, errors = parse_search_params(
            self.base(trip_type="roundtrip", return_date=in_days(12))
        )
        self.assertEqual(errors, {})
        self.assertEqual(params["return_date"], in_days(12))

    def test_round_trip_needs_return_date(self):
        params, errors = parse_search_params(self.base(trip_type="roundtrip"))
        self.assertIn("return_date", errors)

    def test_return_must_be_after_departure(self):
        params, errors = parse_search_params(
            self.base(trip_type="roundtrip", return_date=in_days(10))
        )
        self.assertIn("return_date", errors)

    def test_unknown_trip_type(self):
        params, errors = parse_search_params(self.base(trip_type="multicity"))
        self.assertIn("trip_type", errors)

    def test_infants_cannot_exceed_adults(self):
        params, errors = parse_search_params(self.base(adults="1", infants="2"))
        self.assertIn("infants", errors)

    def test_passengers_must_be_numbers(self):
        params, errors = parse_search_params(self.base(adults="abc"))
        self.assertIn("adults", errors)


class AirportTests(SimpleTestCase):
    def test_city_names_are_case_insensitive(self):
        self.assertEqual(city_to_iata("London"), "LHR")
        self.assertEqual(city_to_iata("  new york "), "JFK")

    def test_raw_code_is_accepted(self):
        self.assertEqual(city_to_iata("jfk"), "JFK")

    def test_unknown_city(self):
        self.assertIsNone(city_to_iata("Atlantis"))

    def test_iran_is_blocked(self):
        self.assertIsNone(city_to_iata("Tehran"))
        self.assertIsNone(city_to_iata("Kish Island"))
        self.assertIsNone(city_to_iata("THR"))
        self.assertIsNone(city_to_iata("IKA"))


def make_segment(origin, destination, departing, arriving, number="100"):
    """A tiny fake Duffel segment (only the fields our mapper reads)."""
    return {
        "origin": {"iata_code": origin, "city_name": origin + " city"},
        "destination": {"iata_code": destination, "city_name": destination + " city"},
        "departing_at": departing,
        "arriving_at": arriving,
        "marketing_carrier": {"iata_code": "ZZ", "name": "Duffel Airways"},
        "marketing_carrier_flight_number": number,
        "operating_carrier": {"name": "Duffel Airways"},
        "aircraft": None,
        "passengers": [{
            "cabin_class_marketing_name": "Economy",
            "baggages": [{"type": "checked", "quantity": 1}, {"type": "carry_on", "quantity": 1}],
        }],
    }


def make_offer(offer_id, amount, round_trip=False):
    slices = [{
        "duration": "PT7H58M",
        "segments": [make_segment("LHR", "JFK", "2026-10-23T18:34:00", "2026-10-23T22:32:00")],
    }]
    if round_trip:
        slices.append({
            "duration": "PT7H10M",
            "segments": [make_segment("JFK", "LHR", "2026-10-25T09:00:00", "2026-10-25T21:10:00", "200")],
        })
    return {
        "id": offer_id,
        "total_amount": amount,
        "total_currency": "EUR",
        "owner": {"name": "Duffel Airways", "iata_code": "ZZ", "logo_symbol_url": None},
        "slices": slices,
        "expires_at": "2026-10-01T00:00:00Z",
    }


class MapperTests(SimpleTestCase):
    def test_duration_parsing(self):
        self.assertEqual(parse_duration_minutes("PT7H58M"), 478)
        self.assertEqual(parse_duration_minutes("PT02H26M"), 146)
        self.assertEqual(parse_duration_minutes("PT45M"), 45)
        self.assertEqual(parse_duration_minutes("P1DT2H"), 1560)
        self.assertIsNone(parse_duration_minutes("nonsense"))
        self.assertIsNone(parse_duration_minutes(None))

    def test_duration_text(self):
        self.assertEqual(format_duration(478), "7h 58m")
        self.assertEqual(format_duration(125), "2h 05m")
        self.assertEqual(format_duration(None), "")

    def test_one_way_offer(self):
        flight = simplify_offer(make_offer("off_1", "215.59"))
        self.assertEqual(len(flight["slices"]), 1)
        outbound = flight["slices"][0]
        self.assertEqual(outbound["direction"], "outbound")
        self.assertEqual(outbound["departure"]["time"], "18:34")
        self.assertEqual(outbound["arrival"]["airport"], "JFK")
        self.assertEqual(outbound["duration_text"], "7h 58m")
        self.assertEqual(outbound["stops"], 0)
        self.assertEqual(outbound["flight_number"], "ZZ100")
        self.assertEqual(flight["baggage"], {"checked": 1, "carry_on": 1})
        self.assertEqual(flight["price"], {"amount": "215.59", "currency": "EUR"})

    def test_round_trip_offer_has_two_slices(self):
        flight = simplify_offer(make_offer("off_2", "430.10", round_trip=True))
        self.assertEqual([s["direction"] for s in flight["slices"]], ["outbound", "return"])
        back = flight["slices"][1]
        self.assertEqual(back["departure"]["airport"], "JFK")
        self.assertEqual(back["arrival"]["airport"], "LHR")
        self.assertEqual(back["departure"]["date"], "2026-10-25")

    def test_offers_are_sorted_by_price_and_limited(self):
        offers = [make_offer("a", "300.00"), make_offer("b", "99.90"), make_offer("c", "1000.00")]
        flights = simplify_offers(offers, limit=2)
        self.assertEqual([f["id"] for f in flights], ["b", "a"])

    def test_broken_offer_is_skipped(self):
        offers = [{"id": "broken"}, make_offer("ok", "50.00")]
        with self.assertLogs("transport.flight_mapper", level="WARNING"):
            flights = simplify_offers(offers)
        self.assertEqual([f["id"] for f in flights], ["ok"])