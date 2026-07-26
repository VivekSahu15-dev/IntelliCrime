"""
IntelliCrime — Phase 4 | ML Model 3: Crime Trend Forecasting
Uses polynomial regression on Karnataka 3-year crime data (2022–2024)
to forecast 2025 and 2026 crime totals with confidence intervals.

Also generates district-level risk forecasts based on socio-economic
trajectory and national trend benchmarks.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
import sqlite3, os, json

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")


def load_trend_data():
    conn = sqlite3.connect(DB_PATH)
    trends = pd.read_sql("""
        SELECT year, total_crimes FROM crime_trends
        WHERE state_ut = 'Karnataka' ORDER BY year
    """, conn)

    # Load all-India data for national trend context
    ipc = pd.read_sql("""
        SELECT state_ut, total_crimes_2022, total_crimes_2023, total_crimes_2024,
               crime_rate_2024, chargesheeting_rate_2024
        FROM ipc_crimes ORDER BY state_ut
    """, conn)
    conn.close()
    return trends, ipc


def forecast_karnataka(trends):
    """
    Polynomial regression (degree 2) on 3-year data.
    Extrapolates to 2025 and 2026.
    Returns forecast values + 95% confidence band.
    """
    X = trends['year'].values.reshape(-1, 1)
    y = trends['total_crimes'].values.astype(float)

    # Linear regression — more stable with only 3 data points.
    # Polynomial degree-2 overfits on 3 points and gives unrealistic 2026 values.
    model = LinearRegression()
    model.fit(X, y)

    # Forecast 2025 and 2026
    future_years = np.array([[2025], [2026]])
    forecasts    = model.predict(future_years)

    # Residual-based confidence interval
    y_pred_train = model.predict(X)
    residuals    = y - y_pred_train
    rmse         = np.sqrt(np.mean(residuals**2))
    # With only 3 points linear regression has very low residuals —
    # use a minimum floor of 5% of mean crimes as CI
    ci_95 = max(1.96 * rmse, y.mean() * 0.05)

    # Build full timeline: historical + forecast
    all_years    = np.array([[yr] for yr in range(2022, 2027)])
    all_pred     = model.predict(all_years)

    timeline = []
    for i, yr in enumerate([2022, 2023, 2024, 2025, 2026]):
        is_historical = yr <= 2024
        actual = int(trends[trends['year'] == yr]['total_crimes'].values[0]) if is_historical else None
        timeline.append({
            'year':       yr,
            'actual':     actual,
            'predicted':  int(round(all_pred[i])),
            'lower_95':   int(round(max(0, all_pred[i] - ci_95))),
            'upper_95':   int(round(all_pred[i] + ci_95)),
            'is_forecast': not is_historical,
        })

    # Trend direction
    trend_2025 = forecasts[0]
    trend_2024 = trends[trends['year'] == 2024]['total_crimes'].values[0]
    change_pct = round((trend_2025 - trend_2024) / trend_2024 * 100, 1)

    return timeline, change_pct, float(rmse)


def national_context(ipc):
    """
    Rank Karnataka vs other states on key metrics.
    Calculate if Karnataka is converging or diverging from national average.
    """
    # Build 3-year rate of change for all states
    ipc = ipc.copy()
    ipc['change_22_24'] = (
        (ipc['total_crimes_2024'] - ipc['total_crimes_2022']) /
        ipc['total_crimes_2022'] * 100
    ).round(1)

    national_mean_change = ipc['change_22_24'].mean()
    k_change = ipc[ipc['state_ut'] == 'Karnataka']['change_22_24'].values
    k_change = float(k_change[0]) if len(k_change) > 0 else 0.0

    # States with similar crime rates to Karnataka
    k_rate = ipc[ipc['state_ut'] == 'Karnataka']['crime_rate_2024'].values
    k_rate = float(k_rate[0]) if len(k_rate) > 0 else 200.0
    similar = ipc[
        (abs(ipc['crime_rate_2024'] - k_rate) < 30) &
        (ipc['state_ut'] != 'Karnataka')
    ]['state_ut'].tolist()

    return {
        'national_avg_change_22_24': round(national_mean_change, 1),
        'karnataka_change_22_24':    k_change,
        'karnataka_converging':      k_change < national_mean_change,
        'similar_rate_states':       similar[:4],
        'karnataka_crime_rate_2024': k_rate,
    }


def district_risk_forecast(conn):
    """
    For each district, forecast if risk will increase/decrease
    based on socio-economic indicators vs state averages.
    Simple rule-based projection using feature thresholds.
    """
    df = pd.read_sql("SELECT * FROM districts", conn)
    state_avg_poverty = df['poverty_index'].mean()
    state_avg_literacy = df['literacy_rate'].mean()
    state_avg_unemploy = df['unemployment_rate'].mean()

    forecasts = []
    for _, row in df.iterrows():
        # Pressure score: above-avg poverty + below-avg literacy + above-avg unemployment
        pressure = 0
        reasons  = []

        if row['poverty_index'] and row['poverty_index'] > state_avg_poverty * 1.15:
            pressure += 2
            reasons.append('high poverty')
        if row['literacy_rate'] and row['literacy_rate'] < state_avg_literacy * 0.88:
            pressure += 2
            reasons.append('low literacy')
        if row['unemployment_rate'] and row['unemployment_rate'] > state_avg_unemploy * 1.2:
            pressure += 1
            reasons.append('high unemployment')

        if pressure >= 4:
            forecast_direction = 'Increasing'
            forecast_confidence = 'High'
        elif pressure >= 2:
            forecast_direction = 'Stable-High'
            forecast_confidence = 'Medium'
        else:
            forecast_direction = 'Stable-Low'
            forecast_confidence = 'Medium'

        forecasts.append({
            'district':             row['district'],
            'division':             row['division'],
            'latitude':             row['latitude'],
            'longitude':            row['longitude'],
            'risk_forecast':        forecast_direction,
            'forecast_confidence':  forecast_confidence,
            'pressure_score':       pressure,
            'forecast_reasons':     ', '.join(reasons) if reasons else 'Within normal range',
            'poverty_index':        row['poverty_index'],
            'literacy_rate':        row['literacy_rate'],
            'unemployment_rate':    row['unemployment_rate'],
        })

    return pd.DataFrame(forecasts)


def save_results(timeline, nat_context, district_df, conn):
    c = conn.cursor()

    # Crime trend forecast table
    c.execute("DROP TABLE IF EXISTS ml_crime_forecast")
    c.execute("""
        CREATE TABLE ml_crime_forecast (
            year         INTEGER PRIMARY KEY,
            actual       INTEGER,
            predicted    INTEGER,
            lower_95     INTEGER,
            upper_95     INTEGER,
            is_forecast  INTEGER
        )
    """)
    for t in timeline:
        c.execute("INSERT INTO ml_crime_forecast VALUES (?,?,?,?,?,?)", (
            t['year'], t['actual'], t['predicted'],
            t['lower_95'], t['upper_95'], int(t['is_forecast'])
        ))

    # National context table
    c.execute("DROP TABLE IF EXISTS ml_national_context")
    c.execute("""
        CREATE TABLE ml_national_context (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    for k, v in nat_context.items():
        # Ensure Python-native types for JSON serialisation
        if isinstance(v, (np.bool_, bool)):
            v = bool(v)
        elif isinstance(v, (np.integer,)):
            v = int(v)
        elif isinstance(v, (np.floating,)):
            v = float(v)
        c.execute("INSERT INTO ml_national_context VALUES (?,?)", (k, json.dumps(v)))

    # District risk forecast table
    c.execute("DROP TABLE IF EXISTS ml_district_forecast")
    c.execute("""
        CREATE TABLE ml_district_forecast (
            district             TEXT PRIMARY KEY,
            division             TEXT,
            latitude             REAL,
            longitude            REAL,
            risk_forecast        TEXT,
            forecast_confidence  TEXT,
            pressure_score       INTEGER,
            forecast_reasons     TEXT,
            poverty_index        REAL,
            literacy_rate        REAL,
            unemployment_rate    REAL
        )
    """)
    for _, row in district_df.iterrows():
        c.execute("INSERT OR REPLACE INTO ml_district_forecast VALUES (?,?,?,?,?,?,?,?,?,?,?)", (
            row['district'], row['division'], row['latitude'], row['longitude'],
            row['risk_forecast'], row['forecast_confidence'],
            int(row['pressure_score']), row['forecast_reasons'],
            row['poverty_index'], row['literacy_rate'], row['unemployment_rate']
        ))

    conn.commit()


def run():
    print("[FORECAST] Loading trend data...")
    trends, ipc = load_trend_data()

    print("[FORECAST] Running polynomial regression forecast...")
    timeline, change_pct, rmse = forecast_karnataka(trends)

    print("[FORECAST] Analysing national context...")
    nat_context = national_context(ipc)

    conn = sqlite3.connect(DB_PATH)
    print("[FORECAST] Generating district-level risk forecasts...")
    district_df = district_risk_forecast(conn)

    print("[FORECAST] Saving results...")
    save_results(timeline, nat_context, district_df, conn)
    conn.close()

    print(f"[FORECAST] ✓ Karnataka 2025 forecast: {timeline[3]['predicted']:,} crimes")
    print(f"            Karnataka 2026 forecast: {timeline[4]['predicted']:,} crimes")
    print(f"            YoY change 2024→2025:    {change_pct:+.1f}%")
    print(f"            RMSE (model error):      {rmse:,.0f} crimes")
    print(f"            National avg change:      {nat_context['national_avg_change_22_24']:+.1f}%")
    print(f"            Karnataka converging:     {nat_context['karnataka_converging']}")
    print()

    inc = district_df[district_df['risk_forecast'] == 'Increasing']
    print(f"  Districts forecast as 'Increasing' risk: {len(inc)}")
    for _, r in inc.iterrows():
        print(f"  ⬆ {r['district']:<22} pressure={r['pressure_score']} | {r['forecast_reasons']}")

    return timeline, nat_context, district_df


if __name__ == "__main__":
    run()