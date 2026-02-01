import json
import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from check_availability import find_availability
from reservation_data import RestaurantResult

# Configuration
STATIC_FOLDER = os.environ.get("STATIC_FOLDER", None)

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path="")
CORS(app)

# Load restaurant data once at startup
DATA_DIR = Path(__file__).parent
with open(DATA_DIR / "restaurant_week_data.json", "r") as f:
    RESTAURANTS = json.load(f)

# Extract unique values for filter options
def get_filter_options():
    neighborhoods = set()
    tags = set()
    meal_types = set()
    
    for r in RESTAURANTS:
        neighborhoods.add(r.get("neighborhood", ""))
        for tag in r.get("tags", []):
            tags.add(tag)
        for meal in r.get("meal_types", []):
            meal_types.add(meal)
    
    return {
        "neighborhoods": sorted(list(neighborhoods)),
        "tags": sorted(list(tags)),
        "meal_types": sorted(list(meal_types))
    }

FILTER_OPTIONS = get_filter_options()


@app.route("/api/filters", methods=["GET"])
def get_filters():
    """Return available filter options."""
    return jsonify(FILTER_OPTIONS)


@app.route("/api/restaurants", methods=["GET"])
def get_restaurants():
    """Return filtered restaurant list."""
    neighborhoods = request.args.get("neighborhoods", "").strip()
    tag = request.args.get("tag", "").strip()
    meal_types = request.args.getlist("meal_type")  # Support multiple meal types
    search = request.args.get("search", "").strip().lower()
    
    results = RESTAURANTS
    
    if neighborhoods:
        results = [r for r in results if any(mt in r.get("neighborhood", []) for mt in neighborhoods]
    
    if tag:
        results = [r for r in results if tag in r.get("tags", [])]
    
    if meal_types:
        results = [r for r in results if any(mt in r.get("meal_types", []) for mt in meal_types)]
    
    if search:
        results = [r for r in results if search in r.get("name", "").lower()]
    
    return jsonify(results)


@app.route("/api/availability", methods=["GET"])
def check_availability_route():
    """Check availability for a restaurant on a given date."""
    opentable_id = request.args.get("opentable_id")
    platform_url = request.args.get("platform_url")
    date = request.args.get("date")
    party_size = request.args.get("party_size", "2")
    
    if not date:
        return jsonify({"error": "date is required"}), 400
    
    # Determine the URL to check
    if platform_url:
        url = platform_url
    elif opentable_id:
        # Construct OpenTable URL from ID
        url = f"https://www.opentable.com/restref/client/?rid={opentable_id}"
    else:
        return jsonify({"error": "Either platform_url or opentable_id is required"}), 400
    
    try:
        result: RestaurantResult = find_availability(url, date, int(party_size))
        slots = [
            {
                "time": slot.time.strftime("%H:%M"),
                "seating_type": slot.seating_type
            }
            for slot in result.slots
        ]
        return jsonify({"slots": slots})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Serve static files in production
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    """Serve static files or fallback to index.html for SPA routing."""
    if STATIC_FOLDER is None:
        return jsonify({"error": "Static folder not configured. Running in development mode."}), 404
    
    static_path = Path(STATIC_FOLDER)
    file_path = static_path / path
    
    if file_path.is_file():
        return send_from_directory(STATIC_FOLDER, path)
    
    # Fallback to index.html for SPA routing
    return send_from_directory(STATIC_FOLDER, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
