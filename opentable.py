import requests
import json
from bs4 import BeautifulSoup, NavigableString

from reservation_data import RestaurantResult


def pretty_print_POST(req):
    """
    At this point it is completely built and ready
    to be fired; it is "prepared".

    However pay attention at the formatting used in 
    this function because it is programmed to be pretty 
    printed and may differ from the actual request.
    """
    print('{}\n{}\r\n{}\r\n\r\n{}'.format(
        '-----------START-----------',
        req.method + ' ' + req.url,
        '\r\n'.join('{}: {}'.format(k, v) for k, v in req.headers.items()),
        req.body,
    ))

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
                         "Referer": opentable_url,
                     }, json=req_body, timeout=5)

    data = res.json()["data"]
    slots = data["availability"][0]["slots"]
    print()

