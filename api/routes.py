"""
IntelliCrime — Phase 2 | API Routes
All endpoints served by the FastAPI backend.

Endpoint map:
  GET /api/health
  GET /api/karnataka/overview
  GET /api/districts
  GET /api/districts/{district_name}
  GET /api/districts/risk-scores
  GET /api/crimes/ipc/all-states
  GET /api/crimes/ipc/karnataka
  GET /api/crimes/trends
  GET /api/crimes/murder/victims
  GET /api/crimes/murder/victims/gender-split
  GET /api/crimes/rape/victims
  GET /api/crimes/rape/victims/age-breakdown
  GET /api/compare/national
  GET /api/compare/top-states
  GET /api/analytics/division-summary
  GET /api/analytics/socioeconomic-correlation
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import math

from .database import get_db, ping_db
from .models import (
    HealthOut, KarnatakaOverview, DistrictOut, DistrictRiskOut,
    IPCCrimeOut, CrimeTrendOut, MurderVictimOut,
    RapeVictimOut, NationalComparisonOut
)

router = APIRouter()


# ─── HEALTH ───────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthOut, tags=["System"])
def health_check():
    db_ok = ping_db()
    return HealthOut(
        status="ok" if db_ok else "degraded",
        database="connected" if db_ok else "unavailable",
        version="1.0.0",
        endpoints=16
    )


# ─── KARNATAKA OVERVIEW ───────────────────────────────────────────────────────

@router.get("/karnataka/overview", response_model=KarnatakaOverview, tags=["Overview"])
def karnataka_overview(db: Session = Depends(get_db)):
    """
    Hero stats for the IntelliCrime dashboard landing panel.
    Returns Karnataka 2024 crime summary vs national benchmarks.
    """
    k = db.execute(text("""
        SELECT total_crimes_2022, total_crimes_2023, total_crimes_2024,
               crime_rate_2024, chargesheeting_rate_2024, crime_rate_category,
               yoy_change_pct
        FROM ipc_crimes WHERE state_ut = 'Karnataka'
    """)).fetchone()

    if not k:
        raise HTTPException(status_code=404, detail="Karnataka data not found")

    murder_total = db.execute(text("""
        SELECT COALESCE(SUM(total), 0) FROM murder_victims
        WHERE state_ut = 'Karnataka' AND age_group = 'Total Victims'
    """)).scalar()

    rape_cases = db.execute(text("""
        SELECT COALESCE(SUM(cases_reported), 0) FROM rape_victims
        WHERE state_ut = 'Karnataka'
    """)).scalar()

    dist_count = db.execute(text("SELECT COUNT(*) FROM districts")).scalar()

    national_avg = db.execute(text("""
        SELECT AVG(crime_rate_2024) FROM ipc_crimes
        WHERE crime_rate_2024 IS NOT NULL
    """)).scalar()

    k_rate = k.crime_rate_2024
    if national_avg and k_rate:
        diff = ((k_rate - national_avg) / national_avg) * 100
        vs_national = "Above" if diff > 2 else ("Below" if diff < -2 else "At")
    else:
        vs_national = "At"

    return KarnatakaOverview(
        total_crimes_2024=int(k.total_crimes_2024 or 0),
        total_crimes_2023=int(k.total_crimes_2023 or 0),
        total_crimes_2022=int(k.total_crimes_2022 or 0),
        yoy_change_pct=round(float(k.yoy_change_pct or 0), 2),
        crime_rate_2024=float(k.crime_rate_2024 or 0),
        chargesheeting_rate_2024=float(k.chargesheeting_rate_2024 or 0),
        crime_rate_category=k.crime_rate_category or "Unknown",
        murder_victims_2024=int(murder_total or 0),
        rape_cases_2024=int(rape_cases or 0),
        districts_count=int(dist_count or 0),
        national_avg_crime_rate=round(float(national_avg or 0), 1),
        karnataka_vs_national=vs_national,
    )


# ─── DISTRICTS ────────────────────────────────────────────────────────────────

@router.get("/districts", response_model=List[DistrictOut], tags=["Districts"])
def get_all_districts(
    division: Optional[str] = Query(None, description="Filter by division name"),
    db: Session = Depends(get_db)
):
    """All 31 Karnataka districts with coordinates and socio-economic data."""
    query = "SELECT * FROM districts"
    params = {}
    if division:
        query += " WHERE LOWER(division) = LOWER(:division)"
        params["division"] = division
    query += " ORDER BY district"
    rows = db.execute(text(query), params).fetchall()
    return [DistrictOut(**dict(r._mapping)) for r in rows]


@router.get("/districts/risk-scores", response_model=List[DistrictRiskOut], tags=["Districts"])
def get_district_risk_scores(db: Session = Depends(get_db)):
    """
    Computes a composite risk score (0–100) for each district
    based on poverty index, literacy rate (inverted), and unemployment.
    Used for heatmap coloring in Phase 3.
    """
    rows = db.execute(text("SELECT * FROM districts ORDER BY district")).fetchall()
    results = []
    for r in rows:
        d = dict(r._mapping)
        # Composite: poverty (40%) + inv-literacy (35%) + unemployment (25%)
        poverty    = d.get("poverty_index") or 30
        literacy   = d.get("literacy_rate") or 70
        unemploy   = d.get("unemployment_rate") or 5

        inv_lit = 100 - literacy            # higher illiteracy = higher risk
        raw = (poverty * 0.40) + (inv_lit * 0.35) + (unemploy * 2.5 * 0.25)
        score = round(min(max(raw, 0), 100), 1)

        if score < 25:    level = "Low"
        elif score < 45:  level = "Moderate"
        elif score < 65:  level = "High"
        else:             level = "Critical"

        results.append(DistrictRiskOut(
            district=d["district"],
            division=d["division"],
            latitude=d["latitude"],
            longitude=d["longitude"],
            population_2011=d.get("population_2011"),
            literacy_rate=d.get("literacy_rate"),
            poverty_index=d.get("poverty_index"),
            urban_population_pct=d.get("urban_population_pct"),
            unemployment_rate=d.get("unemployment_rate"),
            risk_score=score,
            risk_level=level,
        ))

    return sorted(results, key=lambda x: x.risk_score, reverse=True)


@router.get("/districts/{district_name}", response_model=DistrictOut, tags=["Districts"])
def get_district(district_name: str, db: Session = Depends(get_db)):
    """Single district detail by name."""
    row = db.execute(text(
        "SELECT * FROM districts WHERE LOWER(district) = LOWER(:name)"
    ), {"name": district_name}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"District '{district_name}' not found")
    return DistrictOut(**dict(row._mapping))


# ─── IPC CRIMES ───────────────────────────────────────────────────────────────

@router.get("/crimes/ipc/all-states", response_model=List[IPCCrimeOut], tags=["Crimes"])
def get_all_states_ipc(
    sort_by: str = Query("crime_rate_2024", description="Column to sort by"),
    order:   str = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db)
):
    """IPC/BNS crime data for all states — used for national comparison charts."""
    allowed = {"crime_rate_2024", "total_crimes_2024", "chargesheeting_rate_2024",
               "yoy_change_pct", "state_ut"}
    if sort_by not in allowed:
        sort_by = "crime_rate_2024"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    rows = db.execute(text(
        f"SELECT * FROM ipc_crimes ORDER BY {sort_by} {direction}"
    )).fetchall()
    return [IPCCrimeOut(**dict(r._mapping)) for r in rows]


@router.get("/crimes/ipc/karnataka", response_model=IPCCrimeOut, tags=["Crimes"])
def get_karnataka_ipc(db: Session = Depends(get_db)):
    """Karnataka-specific IPC row with all metrics."""
    row = db.execute(text(
        "SELECT * FROM ipc_crimes WHERE state_ut = 'Karnataka'"
    )).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Karnataka IPC data not found")
    return IPCCrimeOut(**dict(row._mapping))


# ─── CRIME TRENDS ─────────────────────────────────────────────────────────────

@router.get("/crimes/trends", response_model=List[CrimeTrendOut], tags=["Crimes"])
def get_crime_trends(
    state: str = Query("Karnataka", description="State/UT name"),
    db: Session = Depends(get_db)
):
    """Year-over-year crime trend for a given state (default: Karnataka)."""
    rows = db.execute(text("""
        SELECT * FROM crime_trends
        WHERE LOWER(state_ut) = LOWER(:state)
        ORDER BY year ASC
    """), {"state": state}).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No trends found for '{state}'")
    return [CrimeTrendOut(**dict(r._mapping)) for r in rows]


# ─── MURDER VICTIMS ───────────────────────────────────────────────────────────

@router.get("/crimes/murder/victims", response_model=List[MurderVictimOut], tags=["Crimes"])
def get_murder_victims(
    state: str = Query("Karnataka", description="State/UT name"),
    victim_type: Optional[str] = Query(None, description="Child | Adult"),
    db: Session = Depends(get_db)
):
    """Murder victims breakdown by age group and gender."""
    query = """
        SELECT * FROM murder_victims
        WHERE LOWER(state_ut) = LOWER(:state)
    """
    params: dict = {"state": state}
    if victim_type:
        query += " AND LOWER(victim_type) = LOWER(:vtype)"
        params["vtype"] = victim_type
    query += " ORDER BY id"
    rows = db.execute(text(query), params).fetchall()
    return [MurderVictimOut(**dict(r._mapping)) for r in rows]


@router.get("/crimes/murder/victims/gender-split", tags=["Crimes"])
def get_murder_gender_split(
    state: str = Query("Karnataka"),
    db: Session = Depends(get_db)
):
    """
    Returns total male / female / transgender murder victims
    and percentage split — for pie/donut charts.
    """
    row = db.execute(text("""
        SELECT SUM(male) as total_male,
               SUM(female) as total_female,
               SUM(transgender) as total_trans,
               SUM(total) as grand_total
        FROM murder_victims
        WHERE LOWER(state_ut) = LOWER(:state)
          AND age_group = 'Total Victims'
    """), {"state": state}).fetchone()

    if not row or not row.grand_total:
        raise HTTPException(status_code=404, detail="No murder victim data found")

    total = row.grand_total
    return {
        "state_ut": state,
        "year": 2024,
        "male": int(row.total_male or 0),
        "female": int(row.total_female or 0),
        "transgender": int(row.total_trans or 0),
        "total": int(total),
        "male_pct": round(row.total_male / total * 100, 1) if total else 0,
        "female_pct": round(row.total_female / total * 100, 1) if total else 0,
        "trans_pct": round(row.total_trans / total * 100, 1) if total else 0,
    }


# ─── RAPE VICTIMS ─────────────────────────────────────────────────────────────

@router.get("/crimes/rape/victims", response_model=List[RapeVictimOut], tags=["Crimes"])
def get_rape_victims(
    state: str = Query("Karnataka"),
    db: Session = Depends(get_db)
):
    """Rape victims by age band for a given state."""
    rows = db.execute(text("""
        SELECT * FROM rape_victims
        WHERE LOWER(state_ut) = LOWER(:state)
    """), {"state": state}).fetchall()
    return [RapeVictimOut(**dict(r._mapping)) for r in rows]


@router.get("/crimes/rape/victims/age-breakdown", tags=["Crimes"])
def get_rape_age_breakdown(
    state: str = Query("Karnataka"),
    db: Session = Depends(get_db)
):
    """
    Returns a chart-ready list of age bands and victim counts
    for bar / funnel chart in the dashboard.
    """
    row = db.execute(text("""
        SELECT * FROM rape_victims WHERE LOWER(state_ut) = LOWER(:state)
    """), {"state": state}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"No rape victim data for {state}")

    d = dict(row._mapping)
    total = d.get("total_victims") or 1
    bands = [
        {"age_band": "Below 6 yrs",  "count": d.get("child_below_6") or 0,   "category": "Child"},
        {"age_band": "6 – 12 yrs",   "count": d.get("child_6_to_12") or 0,   "category": "Child"},
        {"age_band": "12 – 16 yrs",  "count": d.get("child_12_to_16") or 0,  "category": "Child"},
        {"age_band": "16 – 18 yrs",  "count": d.get("child_16_to_18") or 0,  "category": "Child"},
        {"age_band": "18 – 30 yrs",  "count": d.get("adult_18_to_30") or 0,  "category": "Adult"},
        {"age_band": "30 – 45 yrs",  "count": d.get("adult_30_to_45") or 0,  "category": "Adult"},
        {"age_band": "45 – 60 yrs",  "count": d.get("adult_45_to_60") or 0,  "category": "Adult"},
        {"age_band": "60+ yrs",       "count": d.get("adult_60_plus") or 0,   "category": "Adult"},
    ]
    for b in bands:
        b["pct"] = round(b["count"] / total * 100, 1)

    return {
        "state_ut": state,
        "year": 2024,
        "cases_reported": d.get("cases_reported"),
        "total_victims": d.get("total_victims"),
        "total_child_victims": d.get("total_child_victims"),
        "total_adult_victims": d.get("total_adult_victims"),
        "child_victim_pct": d.get("child_victim_pct"),
        "adult_victim_pct": d.get("adult_victim_pct"),
        "age_breakdown": bands,
    }


# ─── NATIONAL COMPARISON ──────────────────────────────────────────────────────

@router.get("/compare/national", response_model=List[NationalComparisonOut], tags=["Comparison"])
def get_national_comparison(db: Session = Depends(get_db)):
    """Karnataka vs national average and top states benchmark."""
    rows = db.execute(text("SELECT * FROM national_comparison ORDER BY id")).fetchall()
    return [NationalComparisonOut(**dict(r._mapping)) for r in rows]


@router.get("/compare/top-states", tags=["Comparison"])
def get_top_states(
    metric: str = Query("crime_rate_2024", description="crime_rate_2024 | total_crimes_2024 | chargesheeting_rate_2024"),
    top_n:  int = Query(10, ge=3, le=36),
    db: Session = Depends(get_db)
):
    """Top N states by a given metric — for national ranking chart."""
    allowed = {"crime_rate_2024", "total_crimes_2024", "chargesheeting_rate_2024"}
    if metric not in allowed:
        metric = "crime_rate_2024"

    rows = db.execute(text(f"""
        SELECT state_ut, {metric} as value,
               crime_rate_category,
               CASE WHEN state_ut = 'Karnataka' THEN 1 ELSE 0 END as is_karnataka
        FROM ipc_crimes
        WHERE {metric} IS NOT NULL
        ORDER BY {metric} DESC
        LIMIT :n
    """), {"n": top_n}).fetchall()

    return {
        "metric": metric,
        "top_n": top_n,
        "states": [dict(r._mapping) for r in rows]
    }


# ─── ANALYTICS ────────────────────────────────────────────────────────────────

@router.get("/analytics/division-summary", tags=["Analytics"])
def get_division_summary(db: Session = Depends(get_db)):
    """
    Aggregates district socio-economic metrics by Karnataka division.
    Returns 4 division-level summaries for grouped bar charts.
    """
    rows = db.execute(text("""
        SELECT division,
               COUNT(*) as district_count,
               ROUND(AVG(literacy_rate), 1) as avg_literacy,
               ROUND(AVG(poverty_index), 1) as avg_poverty,
               ROUND(AVG(urban_population_pct), 1) as avg_urban_pct,
               ROUND(AVG(unemployment_rate), 1) as avg_unemployment,
               SUM(population_2011) as total_population
        FROM districts
        GROUP BY division
        ORDER BY avg_poverty DESC
    """)).fetchall()

    return {
        "divisions": [dict(r._mapping) for r in rows]
    }


@router.get("/analytics/socioeconomic-correlation", tags=["Analytics"])
def get_socioeconomic_correlation(db: Session = Depends(get_db)):
    """
    Returns per-district data points for scatter plot:
    poverty_index vs computed risk score, colored by division.
    Phase 5 ML models will use this for deeper correlation analysis.
    """
    rows = db.execute(text("""
        SELECT district, division, latitude, longitude,
               literacy_rate, poverty_index, urban_population_pct,
               unemployment_rate, population_2011,
               ROUND(
                 (COALESCE(poverty_index,30)*0.40) +
                 ((100 - COALESCE(literacy_rate,70))*0.35) +
                 (COALESCE(unemployment_rate,5)*2.5*0.25),
               1) as risk_score
        FROM districts
        ORDER BY risk_score DESC
    """)).fetchall()

    data = [dict(r._mapping) for r in rows]
    for d in data:
        score = d["risk_score"]
        d["risk_level"] = (
            "Critical" if score >= 65 else
            "High"     if score >= 45 else
            "Moderate" if score >= 25 else "Low"
        )

    return {
        "data_points": data,
        "x_axis": "poverty_index",
        "y_axis": "risk_score",
        "color_by": "division",
        "total": len(data),
    }