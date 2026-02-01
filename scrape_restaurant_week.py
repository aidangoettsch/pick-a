#!/usr/bin/env python3
"""
Scrape restaurant reservation links from NYC Restaurant Week.

Attempts to fetch data directly via HTTP first, falls back to Playwright
to intercept the API response if direct access fails.
"""

import json
import dataclasses
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from typing import TypedDict, NotRequired
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

# Known reservation platforms to look for
RESERVATION_PLATFORMS = [
    "resy.com",
    "opentable.com",
    "exploretock.com",
    "yelp.com/reservations",
    "sevenrooms.com",
]


def find_reservation_link_fast(website_url: str) -> str | None:
    """
    Fast path: Try to find reservation links using simple HTTP + BeautifulSoup.
    
    This avoids the overhead of launching a browser when the link is directly
    present in the HTML. Returns None if no link found (caller should try Playwright).
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        req = Request(website_url, headers=headers)
        with urlopen(req, timeout=5) as response:
            html = response.read().decode("utf-8", errors="ignore")
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Check all anchor tags for reservation platform links
        for link in soup.find_all("a", href=True):
            href = link["href"]
            for platform in RESERVATION_PLATFORMS:
                if platform in href:
                    return href
        
        # Check for Tock widget with business slug
        tock_element = soup.find(attrs={"data-tock-business-slug": True})
        if tock_element:
            business_slug = tock_element.get("data-tock-business-slug")
            if business_slug:
                return f"https://www.exploretock.com/{business_slug}"
                
        return None
        
    except (HTTPError, URLError, TimeoutError, Exception) as e:
        # Fast path failed, will fall back to Playwright
        return None


def find_reservation_link_from_website(website_url: str) -> str | None:
    """
    Load a restaurant's website using Playwright and look for reservation links.
    
    Checks:
    1. Direct links to reservation platforms
    2. Embedded widgets via script/iframe sources
    3. Widget CSS classes (Tock, Resy, etc.)
    4. Clicks "reserve" links to follow indirection
    
    Returns the first matching reservation platform URL found, or None.
    """
    def check_links_for_platforms(page) -> str | None:
        """Check all links on the current page for known reservation platforms."""
        links = page.query_selector_all("a[href]")
        for link in links:
            href = link.get_attribute("href")
            if not href:
                continue
            for platform in RESERVATION_PLATFORMS:
                if platform in href:
                    return href
        return None
    
    def check_widget_classes(page) -> str | None:
        """Check for known widget CSS classes and extract direct URLs when possible."""
        # Check for Tock widget with business ID
        tock_selectors = ["[data-tock-business-slug]"]
        for selector in tock_selectors:
            try:
                element = page.query_selector(selector)
                if element:
                    # Try to get the business ID for a direct URL
                    business_id = element.get_attribute("data-tock-business-slug")
                    if business_id:
                        return f"https://www.exploretock.com/{business_id}"
                    # Fall back to generic URL
                    return "https://exploretock.com"
            except:
                continue
        
        return None
    
    def check_page_for_platforms(page) -> str | None:
        """Run all checks on the current page."""
        # Check direct links first
        result = check_links_for_platforms(page)
        if result:
            return result
              
        # Check for widget classes
        result = check_widget_classes(page)
        if result:
            return result
        
        return None
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(website_url, timeout=15000, wait_until="domcontentloaded")
            
            # First pass: check all indicators on the page
            result = check_page_for_platforms(page)
            if result:
                browser.close()
                return result
            
            # Second pass: look for and click "reserve" links to follow indirection
            reserve_links = page.query_selector_all("a")
            links_to_click = []
            for link in reserve_links:
                try:
                    text = link.text_content() or ""
                    href = link.get_attribute("href") or ""
                    # Check if link text or href contains "reser" (case insensitive)
                    if "reser" in text.lower() or "reser" in href.lower():
                        links_to_click.append((text.strip()[:50], href))
                except:
                    continue
            
            for link_text, link_href in links_to_click:
                try:
                    print(f"    Clicking reservation link: {link_text}")
                    # Navigate directly if it's a relative or absolute URL
                    if link_href.startswith("/"):
                        parsed = urlparse(website_url)
                        target_url = f"{parsed.scheme}://{parsed.netloc}{link_href}"
                        page.goto(target_url, timeout=10000, wait_until="domcontentloaded")
                    elif link_href.startswith("http"):
                        page.goto(link_href, timeout=10000, wait_until="domcontentloaded")
                    else:
                        continue
                                      
                    # Check if we navigated to a reservation platform
                    current_url = page.url
                    for platform in RESERVATION_PLATFORMS:
                        if platform in current_url:
                            browser.close()
                            return current_url
                    
                    # Check all indicators on the new page
                    result = check_page_for_platforms(page)
                    if result:
                        browser.close()
                        return result
                    
                except Exception as e:
                    print(f"    Could not navigate: {e}")
                    continue
            
            browser.close()
            return None
    except Exception as e:
        print(f"Error loading {website_url}: {e}")
        return None


class ReservationOption(TypedDict):
    opentable_id: NotRequired[int]
    known_platform_url: NotRequired[str]
    restaurant_website: str

def reservation_option_to_string(reservation_option: ReservationOption | None) -> str:
    if reservation_option is None:
        return "Unknown"
    if (opentable_id := reservation_option.get("opentable_id")) is not None:
        return f"OpenTable ID {opentable_id}"
    if (known_platform_url := reservation_option.get("known_platform_url")) is not None:
        return known_platform_url
    if (restaurant_website := reservation_option.get("restaurant_website")) is not None:
        return restaurant_website
    return "Unknown"

@dataclasses.dataclass
class Restaurant:
    name: str
    borough: str
    neighborhood: str
    tags: list[str]
    meal_types: list[str]
    reservation_option: ReservationOption
    
    def __str__(self):
        return f"{self.name} ({self.neighborhood}) - {self.reservation_url or 'No reservation link'}"


API_URL = "https://program-api.nyctourism.com/restaurant-week"
PAGE_URL = "https://www.nyctourism.com/restaurant-week/"


def get_restaurant_week_api_page(page: int) -> list[dict]:
    """Attempt to fetch restaurant data directly from the API."""
    headers = {
        "Origin": "https://www.nyctourism.com",
        "Referer": "https://www.nyctourism.com/restaurant-week/",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0",
        "x-api-key": "lTQSe929f34fohKaNq0OH53mdVL0yncvtqmuUG6i",
    }
    
    req = Request(API_URL, method="POST", headers=headers, data=json.dumps({"page": page, "lookup": {}}).encode("utf-8"))
    with urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        return data["items"]

def get_restaurant_week_api() -> list[dict]:
    res = []
    for page in range(1, 56):
        res += get_restaurant_week_api_page(page)
    return res

def parse_restaurants(data: list[dict]) -> list[Restaurant]:
    """Parse the raw API data into Restaurant objects."""
    restaurants = []
    
    for item in data:
        reservation_option = ReservationOption({
            "restaurant_website": item["website"]
        })
        ecommerce = item.get("ecommerce")
        if ecommerce is not None and ecommerce["partnerName"] == "OpenTable":
            reservation_option["opentable_id"] = int(ecommerce["partnerId"])
        else:
            # No ecommerce data - try to find reservation link from restaurant website
            website = item.get("website")
            if website:
                # Fast path: try simple HTTP + BeautifulSoup first
                platform_link = find_reservation_link_fast(website)
                if platform_link:
                    reservation_option["known_platform_url"] = platform_link
                    print(f"Found (fast): {website} -> {platform_link}")
                else:
                    # Slow path: fall back to Playwright for JS-rendered pages
                    print(f"Looking for reservation link on {website} (using browser)...")
                    platform_link = find_reservation_link_from_website(website)
                    if platform_link:
                        reservation_option["known_platform_url"] = platform_link
                        print(f"  Found: {platform_link}")
           
        restaurant = Restaurant(
            name=item["shortTitle"],
            neighborhood=item["neighborhood"],
            borough=item["borough"],
            tags=item["tags"],
            meal_types=item["mealTypes"],
            reservation_option=reservation_option,
        )
        restaurant.tags.remove(restaurant.neighborhood)
        restaurants.append(restaurant)
    
    return restaurants


def scrape_restaurant_week() -> list[Restaurant]:
    """
    Scrape restaurant week data.
    
    Returns a list of Restaurant objects with reservation links.
    """
    data = get_restaurant_week_api()  
    return parse_restaurants(data)


def main():
    restaurants = scrape_restaurant_week()
    
    print(f"\nFound {len(restaurants)} restaurants:\n")
    
    print(f"=== Restaurants ({len(restaurants)}) ===\n")
    for r in restaurants:
        print(f"  {r.name}")
        print(f"    Borough: {r.borough}")
        print(f"    Neighborhood: {r.neighborhood}")
        print(f"    Tags: {', '.join(r.tags)}")
        print(f"    Meal types: {', '.join(r.meal_types)}")
        print(f"    Reserve: {reservation_option_to_string(r.reservation_option)}")
        print()
        
    # Also output as JSON for programmatic use
    output_file = "restaurant_week_data.json"
    output_data = [dataclasses.asdict(r) for r in restaurants]
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)
    print(f"\nData saved to {output_file}")


if __name__ == "__main__":
    main()
