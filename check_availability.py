import argparse
import datetime
from urllib.parse import urlparse
from reservation_data import RestaurantResult

from resy import find_availability_resy

def find_availability(url: str, date: str, party_size: int) -> RestaurantResult:
    url_parsed = urlparse(url)

    if url_parsed.hostname.endswith("resy.com"):
        return find_availability_resy(url, date, party_size)

    raise ValueError(f"Unsupported reservation platform {url_parsed.hostname}")

def print_availability(res: RestaurantResult):
    for slot in res.slots:
        print(f"{slot.time.time().strftime("%H:%M")} - {slot.seating_type}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-d', '--date', help="Date to search for [default: today]")
    parser.add_argument('restaurant')
    parser.add_argument('people')
    args = parser.parse_args()

    date_obj = datetime.date.fromisoformat(args.date) if args.date is not None else datetime.date.today()

    try:
        res = find_availability(args.restaurant, date_obj.isoformat(), int(args.people))
        print_availability(res)
    except ValueError as e:
        print(f"Error: {e.args}")
