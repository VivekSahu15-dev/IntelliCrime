"""
IntelliCrime — Phase 4 | ML API Routes
All endpoints serving ML model outputs.

GET /api/ml/clusters/spatial         — DBSCAN per-district cluster assignments
GET /api/ml/clusters/summary         — cluster aggregates + risk labels
GET /api/ml/anomalies                — IsoForest anomaly flags per district
GET /api/ml/forecast/timeline        — 2022–2026 crime forecast with CI bands
GET /api/ml/forecast/districts       — per-district risk outlook
GET /api/ml/forecast/national-context— Karnataka vs national trend benchmarks
GET /api/ml/intelligence-summary     — combined ML dashboard summary
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import json

from .database import get_db

ml_router = APIRouter(prefix="/ml", tags=["ML Intelligence"])


# ── DBSCAN Clusters ───────────────────────────────────────────────────────────

@ml_router.get("/clusters/spatial")
def get_spatial_clusters(
    cluster_type: Optional[str] = Query(None, description="High-Risk | Moderate-Risk | Isolated"),
    db: Session = Depends(get_db)
):
    """Per-district DBSCAN cluster assignments with spatial + socio labels."""
    query = "SELECT * FROM ml_spatial_clusters"
    params = {}
    if cluster_type:
        query += " WHERE LOWER(cluster_type) = LOWER(:ct)"
        params["ct"] = cluster_type
    query += " ORDER BY spatial_cluster, district"
    rows = db.execute(text(query), params).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No cluster data found. Run ml/run_phase4.py first.")
    return {"clusters": [dict(r._mapping) for r in rows], "total": len(rows)}


@ml_router.get("/clusters/summary")
def get_cluster_summary(db: Session = Depends(get_db)):
    """Aggregated cluster stats — center coordinates, avg poverty, risk label."""
    rows = db.execute(text(
        "SELECT *, json(districts_json) as districts_parsed FROM ml_cluster_summary ORDER BY cluster_id"
    )).fetchall()
    results = []
    for r in rows:
        d = dict(r._mapping)
        try:
            d['districts'] = json.loads(d.get('districts_json', '[]'))
        except Exception:
            d['districts'] = []
        d.pop('districts_json', None)
        d.pop('districts_parsed', None)
        results.append(d)
    return {"summary": results, "total_clusters": len([r for r in results if r['cluster_id'] != -1])}


# ── Anomaly Detection ─────────────────────────────────────────────────────────

@ml_router.get("/anomalies")
def get_anomalies(
    only_anomalies: bool = Query(False, description="If true, return only anomalous districts"),
    db: Session = Depends(get_db)
):
    """Isolation Forest results — anomaly flag + severity score per district."""
    query = "SELECT * FROM ml_anomalies"
    if only_anomalies:
        query += " WHERE is_anomaly = 1"
    query += " ORDER BY anomaly_severity DESC"
    rows = db.execute(text(query)).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No anomaly data. Run ml/run_phase4.py first.")

    data = [dict(r._mapping) for r in rows]
    anomaly_count = sum(1 for d in data if d['is_anomaly'])
    return {
        "districts": data,
        "total": len(data),
        "anomaly_count": anomaly_count,
        "normal_count": len(data) - anomaly_count,
        "anomaly_rate_pct": round(anomaly_count / len(data) * 100, 1),
    }


# ── Crime Forecast ────────────────────────────────────────────────────────────

@ml_router.get("/forecast/timeline")
def get_forecast_timeline(db: Session = Depends(get_db)):
    """
    2022–2026 crime forecast with 95% confidence bands.
    Historical years (2022–2024) show actuals alongside model fit.
    Forecast years (2025–2026) show predicted + lower/upper bounds.
    """
    rows = db.execute(text(
        "SELECT * FROM ml_crime_forecast ORDER BY year"
    )).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No forecast data. Run ml/run_phase4.py first.")

    data = [dict(r._mapping) for r in rows]
    forecast_rows = [d for d in data if d['is_forecast']]

    return {
        "timeline": data,
        "forecast_2025": forecast_rows[0] if len(forecast_rows) > 0 else None,
        "forecast_2026": forecast_rows[1] if len(forecast_rows) > 1 else None,
        "model": "Linear Regression",
        "training_years": [2022, 2023, 2024],
    }


@ml_router.get("/forecast/districts")
def get_district_forecasts(
    risk_forecast: Optional[str] = Query(None, description="Increasing | Stable-High | Stable-Low"),
    db: Session = Depends(get_db)
):
    """Per-district risk trajectory forecast based on socio-economic pressure."""
    query = "SELECT * FROM ml_district_forecast"
    params = {}
    if risk_forecast:
        query += " WHERE LOWER(risk_forecast) = LOWER(:rf)"
        params["rf"] = risk_forecast
    query += " ORDER BY pressure_score DESC, district"
    rows = db.execute(text(query), params).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No district forecast data.")

    data = [dict(r._mapping) for r in rows]
    return {
        "districts": data,
        "total": len(data),
        "increasing_count":    sum(1 for d in data if d['risk_forecast'] == 'Increasing'),
        "stable_high_count":   sum(1 for d in data if d['risk_forecast'] == 'Stable-High'),
        "stable_low_count":    sum(1 for d in data if d['risk_forecast'] == 'Stable-Low'),
    }


@ml_router.get("/forecast/national-context")
def get_national_context(db: Session = Depends(get_db)):
    """Karnataka trend benchmarks vs national average."""
    rows = db.execute(text("SELECT key, value FROM ml_national_context")).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No national context data.")
    result = {}
    for r in rows:
        try:
            result[r.key] = json.loads(r.value)
        except Exception:
            result[r.key] = r.value
    return result


# ── Combined Intelligence Summary ─────────────────────────────────────────────

@ml_router.get("/intelligence-summary")
def get_intelligence_summary(db: Session = Depends(get_db)):
    """
    One-call summary for the ML dashboard panel.
    Aggregates key findings from all 3 models.
    """
    # Anomaly counts
    anom_row = db.execute(text(
        "SELECT COUNT(*) as total, SUM(is_anomaly) as anomalies FROM ml_anomalies"
    )).fetchone()

    # Forecast
    fc_rows = db.execute(text(
        "SELECT year, predicted, lower_95, upper_95 FROM ml_crime_forecast WHERE is_forecast=1 ORDER BY year"
    )).fetchall()

    # Cluster summary
    cluster_rows = db.execute(text(
        "SELECT cluster_type, COUNT(*) as n FROM ml_spatial_clusters GROUP BY cluster_type"
    )).fetchall()

    # High-pressure districts
    hp_rows = db.execute(text(
        "SELECT district, division, pressure_score, forecast_reasons FROM ml_district_forecast "
        "WHERE risk_forecast='Increasing' ORDER BY pressure_score DESC LIMIT 6"
    )).fetchall()

    # Top anomalies
    top_anom = db.execute(text(
        "SELECT district, anomaly_severity, anomaly_reason FROM ml_anomalies "
        "WHERE is_anomaly=1 ORDER BY anomaly_severity DESC LIMIT 5"
    )).fetchall()

    return {
        "anomaly_detection": {
            "total_districts": int(anom_row.total) if anom_row else 31,
            "anomalous_districts": int(anom_row.anomalies) if anom_row else 0,
            "top_anomalies": [dict(r._mapping) for r in top_anom],
        },
        "crime_forecast": {
            "forecast_2025": dict(fc_rows[0]._mapping) if fc_rows else None,
            "forecast_2026": dict(fc_rows[1]._mapping) if len(fc_rows) > 1 else None,
        },
        "spatial_clusters": {
            "breakdown": [dict(r._mapping) for r in cluster_rows],
        },
        "high_pressure_districts": [dict(r._mapping) for r in hp_rows],
        "models_run": ["DBSCAN Spatial Clustering", "Isolation Forest", "Linear Regression Forecast"],
    }

# ── Network Graph Data ─────────────────────────────────────────────────────────

@ml_router.get("/network-graph")
def get_network_graph(db: Session = Depends(get_db)):
    """
    Builds a force-directed graph dataset from real district data.
    Nodes = districts (sized by population, colored by risk level).
    Edges = connections based on:
      - Same division (geographic proximity)
      - Same socio-economic cluster (DBSCAN)
      - Anomaly flag (IsoForest) links anomalous districts to each other
    """
    # Load districts with risk scores
    districts = db.execute(text("""
        SELECT d.district, d.division, d.latitude, d.longitude,
               d.population_2011, d.literacy_rate, d.poverty_index,
               d.unemployment_rate,
               ROUND(
                 (COALESCE(d.poverty_index,30)*0.40) +
                 ((100 - COALESCE(d.literacy_rate,70))*0.35) +
                 (COALESCE(d.unemployment_rate,5)*2.5*0.25), 1
               ) as risk_score
        FROM districts d ORDER BY d.district
    """)).fetchall()

    # Load ML results if available
    try:
        clusters = db.execute(text(
            "SELECT district, spatial_cluster, socio_cluster, cluster_type FROM ml_spatial_clusters"
        )).fetchall()
        cluster_map = {r.district: dict(r._mapping) for r in clusters}
    except Exception:
        cluster_map = {}

    try:
        anomalies = db.execute(text(
            "SELECT district, is_anomaly, anomaly_severity FROM ml_anomalies"
        )).fetchall()
        anomaly_map = {r.district: dict(r._mapping) for r in anomalies}
    except Exception:
        anomaly_map = {}

    # Build nodes
    nodes = []
    for r in districts:
        d = dict(r._mapping)
        score = d['risk_score'] or 20
        if score >= 45:   risk_level = "High"
        elif score >= 25: risk_level = "Moderate"
        else:             risk_level = "Low"

        cl = cluster_map.get(d['district'], {})
        an = anomaly_map.get(d['district'], {})

        nodes.append({
            "id":             d['district'],
            "division":       d['division'],
            "latitude":       d['latitude'],
            "longitude":      d['longitude'],
            "population":     d['population_2011'] or 1000000,
            "risk_score":     score,
            "risk_level":     risk_level,
            "poverty_index":  d['poverty_index'],
            "literacy_rate":  d['literacy_rate'],
            "unemployment":   d['unemployment_rate'],
            "spatial_cluster":cl.get('spatial_cluster', 0),
            "socio_cluster":  cl.get('socio_cluster', 0),
            "is_anomaly":     bool(an.get('is_anomaly', False)),
            "anomaly_severity": an.get('anomaly_severity', 0),
            "node_size":      max(8, min(28, (d['population_2011'] or 1e6) / 350000)),
        })

    # Build edges
    edges = []
    edge_set = set()

    def add_edge(a, b, etype, weight):
        key = tuple(sorted([a, b]))
        if key not in edge_set:
            edge_set.add(key)
            edges.append({"source": a, "target": b, "type": etype, "weight": weight})

    node_map = {n['id']: n for n in nodes}

    for i, ni in enumerate(nodes):
        for j, nj in enumerate(nodes):
            if j <= i:
                continue
            # Same division → geographic link
            if ni['division'] == nj['division']:
                add_edge(ni['id'], nj['id'], "division", 1.0)
            # Same socio-economic cluster → vulnerability link
            if (ni['socio_cluster'] == nj['socio_cluster'] and
                    ni['socio_cluster'] != -1):
                add_edge(ni['id'], nj['id'], "socio_cluster", 0.8)
            # Both anomalies → intelligence link
            if ni['is_anomaly'] and nj['is_anomaly']:
                add_edge(ni['id'], nj['id'], "anomaly", 1.5)

    # Division hub nodes (center nodes for each division)
    divisions = {}
    for n in nodes:
        div = n['division']
        if div not in divisions:
            divisions[div] = []
        divisions[div].append(n)

    return {
        "nodes": nodes,
        "edges": edges,
        "divisions": list(divisions.keys()),
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "anomaly_nodes": sum(1 for n in nodes if n['is_anomaly']),
            "high_risk_nodes": sum(1 for n in nodes if n['risk_level'] == 'High'),
        }
    }


@ml_router.get("/hotspot-data")
def get_hotspot_data(db: Session = Depends(get_db)):
    """
    Returns district-level hotspot intensity data for heatmap overlay.
    Intensity = composite of risk_score + anomaly_severity + poverty.
    Also returns time-band crime distribution (synthetic from real patterns).
    """
    import math as _math

    districts = db.execute(text("""
        SELECT d.district, d.division, d.latitude, d.longitude,
               d.population_2011, d.poverty_index, d.literacy_rate,
               d.unemployment_rate
        FROM districts d ORDER BY d.district
    """)).fetchall()

    try:
        anomalies = db.execute(text(
            "SELECT district, anomaly_severity FROM ml_anomalies"
        )).fetchall()
        anom_map = {r.district: r.anomaly_severity or 0 for r in anomalies}
    except Exception:
        anom_map = {}

    hotspots = []
    for r in districts:
        d = dict(r._mapping)
        poverty   = d['poverty_index'] or 25
        literacy  = d['literacy_rate'] or 70
        unemploy  = d['unemployment_rate'] or 5
        anom      = anom_map.get(d['district'], 0)

        base_risk = (poverty * 0.4) + ((100 - literacy) * 0.35) + (unemploy * 2.5 * 0.25)
        intensity = min(1.0, (base_risk + anom * 0.3) / 80)

        # Synthetic time bands derived from real socio-economic profile
        # High poverty → more night crime; High urban → more evening
        urban_factor  = (d.get('urban_population_pct') or 35) / 100
        night_weight  = 0.3 + poverty / 200
        evening_weight = 0.25 + urban_factor * 0.15
        morning_weight = 0.15
        afternoon_weight = 1 - night_weight - evening_weight - morning_weight

        hotspots.append({
            "district":   d['district'],
            "division":   d['division'],
            "lat":        d['latitude'],
            "lng":        d['longitude'],
            "intensity":  round(intensity, 3),
            "time_bands": {
                "morning":   round(max(0.05, morning_weight), 2),
                "afternoon": round(max(0.05, afternoon_weight), 2),
                "evening":   round(evening_weight, 2),
                "night":     round(night_weight, 2),
            }
        })

    return {
        "hotspots": sorted(hotspots, key=lambda x: x['intensity'], reverse=True),
        "max_intensity": max(h['intensity'] for h in hotspots),
        "time_bands": ["morning", "afternoon", "evening", "night"],
    }