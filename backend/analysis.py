"""
India Cost of Living - Analysis Module
=======================================
Clean, reusable Python module for analysing inflation data
across Indian cities using pandas, NumPy, and matplotlib.

Dataset columns: Year, City, Food, Fuel, Rent, Transport, Utilities, Entertainment
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CATEGORIES = ["Food", "Fuel", "Rent", "Transport", "Utilities", "Entertainment"]

# ---------------------------------------------------------------------------
# 1. Load and Clean Data
# ---------------------------------------------------------------------------

# Path to the CSV (resolved relative to *this* file)
_DEFAULT_CSV = os.path.join(os.path.dirname(__file__), "..", "data", "inflation.csv")

# Module-level cache so we load only once
_df: pd.DataFrame | None = None


def load_data(file_path: str = _DEFAULT_CSV) -> pd.DataFrame:
    """Load the CSV into a DataFrame, clean it, and cache it."""
    global _df
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error loading data: {e}")
        return pd.DataFrame()

    # Drop any completely empty rows (the CSV has blank lines between cities)
    df = df.dropna(how="all")

    # Convert Year → numeric (int) so it's usable for math / plotting
    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").astype("Int64")
    df = df.dropna(subset=["Year"])
    df["Year"] = df["Year"].astype(int)

    # Sort for consistent downstream calculations
    df = df.sort_values(by=["City", "Year"]).reset_index(drop=True)

    _df = df
    return df


def _ensure_loaded() -> pd.DataFrame:
    """Return the cached DataFrame, loading it first if needed."""
    global _df
    if _df is None:
        load_data()
    return _df


# ---------------------------------------------------------------------------
# 2. Reusable query / analysis functions
# ---------------------------------------------------------------------------

def get_cities() -> list[str]:
    """Return a sorted list of unique city names."""
    df = _ensure_loaded()
    return sorted(df["City"].unique().tolist())


def get_city_data(city: str) -> pd.DataFrame:
    """Return the full dataset for a given city, sorted by Year."""
    df = _ensure_loaded()
    return df[df["City"] == city].sort_values("Year").reset_index(drop=True)


def get_city_growth(city: str) -> pd.DataFrame:
    """
    Calculate year-wise percentage growth for every category in a city.

    Returns a DataFrame with Year + <Category>_Growth_% columns.
    First year will be NaN (no prior data to compare).
    """
    city_df = get_city_data(city).copy()
    if city_df.empty:
        return city_df

    for col in CATEGORIES:
        city_df[f"{col}_Growth_%"] = city_df[col].pct_change() * 100

    return city_df


def compare_cities(city1: str, city2: str) -> pd.DataFrame:
    """
    Return a merged DataFrame containing rows for *both* cities,
    sorted by Year, suitable for side-by-side comparison.
    """
    df = _ensure_loaded()
    comparison = df[df["City"].isin([city1, city2])].sort_values(
        ["Year", "City"]
    ).reset_index(drop=True)
    return comparison


def get_summary() -> dict:
    """
    Return a summary dictionary useful for dashboard cards:
      - total_cities   : int
      - year_range     : (min_year, max_year)
      - highest_inflation_city : str  (city with highest total cost growth 2018–2024)
    """
    df = _ensure_loaded()
    if df.empty:
        return {}

    cities = get_cities()
    years = df["Year"].unique()

    # -- highest inflation city (same logic as notebook) --
    df_copy = df.copy()
    df_copy["Total"] = df_copy[CATEGORIES].sum(axis=1)

    start_year, end_year = int(years.min()), int(years.max())
    boundary = df_copy[df_copy["Year"].isin([start_year, end_year])]

    if boundary.empty:
        highest_city = "N/A"
    else:
        pivot = boundary.pivot(index="City", columns="Year", values="Total")
        if start_year in pivot.columns and end_year in pivot.columns:
            pivot["Inflation_%"] = (
                (pivot[end_year] - pivot[start_year]) / pivot[start_year]
            ) * 100
            highest_city = pivot["Inflation_%"].idxmax()
        else:
            highest_city = "N/A"

    return {
        "total_cities": len(cities),
        "year_range": (start_year, end_year),
        "highest_inflation_city": highest_city,
    }


def predict_next_year(city: str) -> dict | None:
    """
    Predict next year's values for a city using the average growth rate
    for each category (same approach as in the notebook).

    Returns a dict like:
      { 'Year': 2025, 'City': 'Mumbai', 'Food': ..., 'Fuel': ..., ... }
    """
    city_df = get_city_data(city)
    if city_df.empty:
        return None

    last_year = int(city_df["Year"].max())
    target_year = last_year + 1

    prediction: dict = {"Year": target_year, "City": city}
    for cat in CATEGORIES:
        avg_growth = city_df[cat].pct_change().mean()
        if pd.isna(avg_growth):
            avg_growth = 0.0
        last_val = city_df.iloc[-1][cat]
        prediction[cat] = round(last_val * (1 + avg_growth), 2)

    return prediction


# ---------------------------------------------------------------------------
# 3. Visualisation functions (matplotlib)
# ---------------------------------------------------------------------------

def plot_city_trend(city: str) -> None:
    """
    Line plot of ALL categories over years for a single city.
    Reproduces the notebook's 'year-wise total cost trend' per city.
    """
    city_df = get_city_data(city)
    if city_df.empty:
        print(f"No data for city: {city}")
        return

    plt.figure(figsize=(10, 6))
    for cat in CATEGORIES:
        plt.plot(city_df["Year"], city_df[cat], marker="o", label=cat)

    plt.title(f"Category Trends Over Years — {city}")
    plt.xlabel("Year")
    plt.ylabel("Cost")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()


def plot_category_comparison(city: str) -> None:
    """
    Bar chart showing each category's value for the *latest year* of a city.
    Mirrors the notebook's 'Bar chart: Category comparison (latest year)'.
    """
    city_df = get_city_data(city)
    if city_df.empty:
        print(f"No data for city: {city}")
        return

    latest = city_df.iloc[-1]
    values = [latest[cat] for cat in CATEGORIES]

    plt.figure(figsize=(10, 6))
    plt.bar(CATEGORIES, values, color="steelblue")
    plt.title(f"Category Comparison ({int(latest['Year'])}) — {city}")
    plt.xlabel("Category")
    plt.ylabel("Cost")
    plt.xticks(rotation=45)
    plt.grid(axis="y")
    plt.tight_layout()
    plt.show()


def plot_growth_trend(city: str) -> None:
    """
    Line plot of year-wise growth % for every category in a city.
    """
    growth_df = get_city_growth(city)
    if growth_df.empty:
        print(f"No data for city: {city}")
        return

    growth_cols = [c for c in growth_df.columns if c.endswith("_Growth_%")]

    plt.figure(figsize=(10, 6))
    for col in growth_cols:
        label = col.replace("_Growth_%", "")
        plt.plot(growth_df["Year"], growth_df[col], marker="o", label=label)

    plt.title(f"Year-wise Growth % — {city}")
    plt.xlabel("Year")
    plt.ylabel("Growth %")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()


# ---------------------------------------------------------------------------
# Quick smoke-test when running the file directly
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    df = load_data()
    print("=== Loaded Data ===")
    print(df.head(21))

    print("\n=== Cities ===")
    print(get_cities())

    print("\n=== Mumbai Growth ===")
    print(get_city_growth("Mumbai"))

    print("\n=== Summary ===")
    print(get_summary())

    print("\n=== Prediction (Mumbai, next year) ===")
    print(predict_next_year("Mumbai"))

    # Show one plot as a test
    plot_city_trend("Mumbai")
