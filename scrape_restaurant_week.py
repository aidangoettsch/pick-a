#!/usr/bin/env python3
"""
Scrape restaurant reservation links from NYC Restaurant Week.

Attempts to fetch data directly via HTTP first, falls back to Playwright
to intercept the API response if direct access fails.
"""

import json
import dataclasses
from urllib.request import urlopen, Request
from urllib.error import HTTPError

@dataclasses.dataclass
class Restaurant:
    name: str
    neighborhood: str
    tags: list[str]
    website: str
    reservation_url: str | None
    
    def __str__(self):
        return f"{self.name} ({self.neighborhood}) - {self.reservation_url or 'No reservation link'}"


API_URL = "https://program-api.nyctourism.com/restaurant-week"
PAGE_URL = "https://www.nyctourism.com/restaurant-week/"


def get_restaurant_week_api_page() -> list[dict]:
    """Attempt to fetch restaurant data directly from the API."""
    headers = {
        "Origin": "https://www.nyctourism.com",
        "Referer": "https://www.nyctourism.com/restaurant-week/",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0",
        "x-api-key": "lTQSe929f34fohKaNq0OH53mdVL0yncvtqmuUG6i",
    }
    
    req = Request(API_URL, method="POST", headers=headers, data=json.dumps({"page":1, "lookup": {}}).encode("utf-8"))
    with urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        return data["items"]

.get("name")

def parse_restaurants(data: list[dict]) -> list[Restaurant]:
    """Parse the raw API data into Restaurant objects."""
    print(data)
    restaurants = []
    
    for item in data:
        ecommerce = item.get("ecommerce")
        reservation_url = None
        if ecommerce is not None:
            
        restaurant = Restaurant(
            name=item["shortTitle"],
            neighborhood=item["neighborhood"],
            tags=item["tags"]
            website=item["website"]
            reservation_url=reservation_url,
        )
        restaurants.append(restaurant)
    
    return restaurants


def scrape_restaurant_week() -> list[Restaurant]:
    """
    Scrape restaurant week data.
    
    Returns a list of Restaurant objects with reservation links.
    """
    # Try direct fetch first
    data = get_restaurant_week_api_page()
      
    if not data:
        print("No restaurant data found!")
        return []
    
    return parse_restaurants(data)


def main():
    restaurants = scrape_restaurant_week()
    
    print(f"\nFound {len(restaurants)} restaurants:\n")
    
    # Group by whether they have reservation links
    with_links = [r for r in restaurants if r.reservation_url]
    without_links = [r for r in restaurants if not r.reservation_url]
    
    print(f"=== Restaurants with reservation links ({len(with_links)}) ===\n")
    for r in with_links:
        print(f"  {r.name}")
        print(f"    Neighborhood: {r.neighborhood}")
        print(f"    Cuisine: {r.cuisine}")
        print(f"    Reserve: {r.reservation_url}")
        print()
    
    if without_links:
        print(f"\n=== Restaurants without reservation links ({len(without_links)}) ===\n")
        for r in without_links:
            print(f"  {r.name} ({r.neighborhood})")
    
    # Also output as JSON for programmatic use
    output_file = "restaurant_week_data.json"
    output_data = [dataclasses.asdict(r) for r in restaurants]
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)
    print(f"\nData saved to {output_file}")


if __name__ == "__main__":
    main()
