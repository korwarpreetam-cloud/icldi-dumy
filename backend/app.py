"""
Inflation API — Flask Backend
==============================
REST API that wraps the analysis.py module.
All analytics logic lives in analysis.py; this file only exposes it via HTTP.

Endpoints:
  GET /               → Dashboard UI (index.html)
  GET /api/health     → Health-check
  GET /cities         → List of available cities
  GET /city-data      → Yearly cost data for one city
  GET /city-growth    → Year-wise growth percentages
  GET /compare        → Side-by-side comparison of two cities
  GET /summary        → Summary statistics
  GET /predict        → Predicted next-year values
"""

import json
import os

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from analysis import (
    load_data,
    get_cities,
    get_city_data,
    get_city_growth,
    compare_cities,
    get_summary,
    predict_next_year,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

# Enable CORS so the frontend can be hosted separately (Vercel / Netlify)
CORS(app)

# Pre-load and cache the dataset once at startup
load_data()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _df_to_json(df):
    """Convert a pandas DataFrame to a JSON-serialisable list of dicts.

    Uses pandas' built-in JSON encoder which correctly converts NaN → null.
    """
    return json.loads(df.to_json(orient="records"))


def _error(message: str, status: int = 400):
    """Return a standardised JSON error response."""
    return jsonify({"error": message}), status


# ---------------------------------------------------------------------------
# Global error handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(_e):
    return _error("The requested resource was not found.", 404)


@app.errorhandler(500)
def internal_error(_e):
    return _error("An internal server error occurred.", 500)


# ---------------------------------------------------------------------------
# Frontend route — serve the dashboard at /
# ---------------------------------------------------------------------------

@app.route("/")
def serve_frontend():
    """Serve the dashboard UI."""
    return send_from_directory(FRONTEND_DIR, "index.html")


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/health")
def health():
    """Health-check endpoint."""
    return jsonify({"status": "ok", "message": "Inflation API Running"})


@app.route("/cities")
def cities():
    """Return the list of available cities."""
    return jsonify({"cities": get_cities()})


@app.route("/city-data")
def city_data():
    """Return yearly cost data for a single city.

    Query params:
        city (required) — name of the city
    """
    city = request.args.get("city")
    if not city:
        return _error("Missing required parameter: 'city'")

    df = get_city_data(city)
    if df.empty:
        return _error(f"No data found for city: '{city}'", 404)

    return jsonify({"city": city, "data": _df_to_json(df)})


@app.route("/city-growth")
def city_growth():
    """Return year-wise growth percentages for a city.

    Query params:
        city (required) — name of the city
    """
    city = request.args.get("city")
    if not city:
        return _error("Missing required parameter: 'city'")

    df = get_city_growth(city)
    if df.empty:
        return _error(f"No data found for city: '{city}'", 404)

    return jsonify({"city": city, "growth": _df_to_json(df)})


@app.route("/compare")
def compare():
    """Compare cost data for two cities side by side.

    Query params:
        city1 (required) — first city
        city2 (required) — second city
    """
    city1 = request.args.get("city1")
    city2 = request.args.get("city2")

    if not city1:
        return _error("Missing required parameter: 'city1'")
    if not city2:
        return _error("Missing required parameter: 'city2'")

    df = compare_cities(city1, city2)
    if df.empty:
        return _error(f"No data found for cities: '{city1}', '{city2}'", 404)

    return jsonify({"city1": city1, "city2": city2, "data": _df_to_json(df)})


@app.route("/summary")
def summary():
    """Return summary statistics: total cities, year range, highest-inflation city."""
    return jsonify(get_summary())


@app.route("/predict")
def predict():
    """Return predicted next-year values for a city.

    Query params:
        city (required) — name of the city
    """
    city = request.args.get("city")
    if not city:
        return _error("Missing required parameter: 'city'")

    result = predict_next_year(city)
    if result is None:
        return _error(f"No data found for city: '{city}'", 404)

    # Convert numpy types to native Python so jsonify works cleanly
    clean = {}
    for k, v in result.items():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            clean[k] = float(v)
        else:
            clean[k] = v

    return jsonify({"prediction": clean})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(debug=True, host="0.0.0.0", port=port)
