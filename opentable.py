import datetime
import requests
import json
from bs4 import BeautifulSoup, NavigableString

from reservation_data import ReservationSlot, RestaurantResult


def parse_opentable_slot(slot: dict, base_time: datetime.datetime) -> ReservationSlot | None:
    if not slot.get("isAvailable", False):
        return None
    
    offset_minutes = slot["timeOffsetMinutes"]
    slot_time = base_time + datetime.timedelta(minutes=offset_minutes)
    seating_type = slot.get("type", "Standard")
    
    return ReservationSlot(time=slot_time, seating_type=seating_type)


def find_availability_opentable_from_id(restaurant_id: int, date: str, party_size: int, csrf_token: str) -> RestaurantResult:
    req_body = {
  "operationName": "RestaurantsAvailability",
  "variables": {
    "onlyPop": False,
    "forwardDays": 0,
    "requireTimes": False,
    "requireTypes": [
      "Standard",
      "Experience"
    ],
    "privilegedAccess": [
      "VisaDiningProgram",
      "VisaEventsProgram",
      "ChaseDiningProgram"
    ],
    "restaurantIds": [
      restaurant_id
    ],
    "date": date,
    "time": "18:00",
    "backwardMinutes": 1080,
    "backwardTimeslots": 72,
    "forwardMinutes": 600,
    "forwardTimeslots": 72,
    "partySize": party_size,
    "databaseRegion": "NA",
    "restaurantAvailabilityTokens": [],
    "loyaltyRedemptionTiers": [],
    "attributionToken": "x=2025-08-26T20%3A04%3A46&c=1&pt1=1&pt2=1&er=1084915&p1ca=restaurant%2Fprofile%2F1084915",
    "correlationId": "958a5f4b-d966-416b-a5b9-43477052d9bc"
  },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "b2d05a06151b3cb21d9dfce4f021303eeba288fac347068b29c1cb66badc46af"
    }
  }
}

    res = requests.request("POST", "https://www.opentable.com/dapi/fe/gql?optype=query&opname=RestaurantsAvailability", headers={
                         "Host": "www.opentable.com",
                         "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0",
                         "x-csrf-token": csrf_token,
                         "x-query-timeout": "5500",
                         "content-type": "application/json",
                     }, json=req_body, timeout=5)

    data = res.json()["data"]
    
    # Base time is 18:00 on the requested date
    base_time = datetime.datetime.fromisoformat(f"{date}T18:00:00")
    
    availability_days = data["availability"][0]["availabilityDays"]
    raw_slots = availability_days[0]["slots"] if availability_days else []
    
    parsed_slots = []
    for slot in raw_slots:
        parsed = parse_opentable_slot(slot, base_time)
        if parsed is not None:
            parsed_slots.append(parsed)
    
    return RestaurantResult(slots=parsed_slots)


def find_availability_opentable(opentable_url: str, date: str, party_size: int) -> RestaurantResult:
    restaurant_page_res = requests.request("GET", opentable_url, timeout=5, headers={
                                               "User-Agent": "curl/7.74.0"
                                           })
    restaurant_page = BeautifulSoup(restaurant_page_res.text, features="html.parser")
    json_data_tag = restaurant_page.find(id="primary-window-vars")

    if json_data_tag is None or type(json_data_tag) is NavigableString:
        raise ValueError(f"Could not find JSON data in opentable page {opentable_url}")

    if json_data_tag.string is None:
        raise ValueError(f"Could not find JSON data in opentable page {opentable_url}")

    json_data = json.loads(json_data_tag.string)
    csrf_token = json_data["windowVariables"]["__CSRF_TOKEN__"]
    restaurant_id = int(json_data["windowVariables"]["__OT_GA_DATA__"]["cd6"])
    return find_availability_opentable_from_id(restaurant_id, date, party_size, csrf_token)

