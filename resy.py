import datetime
import requests
from urllib.parse import urlparse
import re
from reservation_data import ReservationSlot, RestaurantResult

RESY_HARDCODED_KEY = "VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5" # hardcoded in app.js bundle, just ctrl-f apiKey lmfao
HEADERS = {
    "Authorization": f'ResyAPI api_key="{RESY_HARDCODED_KEY}"',
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0",
}

def parse_resy_slot(slot: dict) -> ReservationSlot:
    time = datetime.datetime.fromisoformat(slot["date"]["start"])
    seating_type = slot["config"]["type"]
    return ReservationSlot(time=time, seating_type=seating_type)

def find_availability_resy_venue_id(venue_id: int, date: str, party_size: int) -> RestaurantResult:
    res = requests.request("POST", "https://api.resy.com/4/find", json = {
        "lat": 0,
        "long": 0,
        "day": date,
        "party_size": party_size,
        "venue_id": venue_id,
    }, headers=HEADERS)

    data = res.json()
    venues = data["results"]["venues"] 
    if len(venues) == 0:
        return RestaurantResult(slots=[])

    venue_results = venues[0]
    slots = [parse_resy_slot(s) for s in venue_results["slots"]]

    return RestaurantResult(slots=slots)

def get_venue_id(resy_page: str) -> int:
    url = urlparse(resy_page)
    matches = re.match("/cities/([^/]*)/(venues/)?([^/]*)/?", url.path)
    city, _, slug = matches.groups()

    res = requests.request("GET", f"https://api.resy.com/3/venue?url_slug={slug}&location={city}", headers=HEADERS)

    return res.json()["id"]["resy"]

def find_availability_resy(resy_url: str, date: str, party_size: int) -> RestaurantResult:
    venue_id = get_venue_id(resy_url)
    return find_availability_resy_venue_id(venue_id, date, party_size)

if __name__ == "__main__":
    find_availability_resy("https://resy.com/cities/new-york-ny/venues/shinzo-omakase?date=2025-08-21&seats=2", "2025-08-22", 2)
