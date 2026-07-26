"""
IntelliCrime — Phase 2 | Pydantic Response Models
Defines the shape of every API response so the frontend
always gets typed, predictable JSON.
"""

from pydantic import BaseModel
from typing import Optional, List


# ── Districts ─────────────────────────────────────────────────────────────────

class DistrictOut(BaseModel):
    id: int
    district: str
    division: str
    latitude: float
    longitude: float
    population_2011: Optional[int]
    literacy_rate: Optional[float]
    poverty_index: Optional[float]
    urban_population_pct: Optional[float]
    unemployment_rate: Optional[float]
    population_density: Optional[float]

    class Config:
        from_attributes = True


# ── IPC / BNS State-level crimes ─────────────────────────────────────────────

class IPCCrimeOut(BaseModel):
    id: int
    state_ut: str
    total_crimes_2022: Optional[int]
    total_crimes_2023: Optional[int]
    ipc_crimes_2024: Optional[int]
    bns_crimes_2024: Optional[int]
    total_crimes_2024: Optional[int]
    population_lakhs_2024: Optional[float]
    crime_rate_2024: Optional[float]
    chargesheeting_rate_2024: Optional[float]
    crime_rate_category: Optional[str]
    yoy_change_pct: Optional[float]

    class Config:
        from_attributes = True


# ── Murder victims ────────────────────────────────────────────────────────────

class MurderVictimOut(BaseModel):
    id: int
    state_ut: str
    crime_type: Optional[str]
    year: Optional[int]
    age_group: str
    victim_type: Optional[str]
    male: Optional[int]
    female: Optional[int]
    transgender: Optional[int]
    total: Optional[int]
    female_pct: Optional[float]

    class Config:
        from_attributes = True


# ── Rape victims ──────────────────────────────────────────────────────────────

class RapeVictimOut(BaseModel):
    id: int
    state_ut: str
    crime_type: Optional[str]
    year: Optional[int]
    cases_reported: Optional[int]
    child_below_6: Optional[int]
    child_6_to_12: Optional[int]
    child_12_to_16: Optional[int]
    child_16_to_18: Optional[int]
    total_child_victims: Optional[int]
    adult_18_to_30: Optional[int]
    adult_30_to_45: Optional[int]
    adult_45_to_60: Optional[int]
    adult_60_plus: Optional[int]
    total_adult_victims: Optional[int]
    total_victims: Optional[int]
    child_victim_pct: Optional[float]
    adult_victim_pct: Optional[float]

    class Config:
        from_attributes = True


# ── Crime trends ──────────────────────────────────────────────────────────────

class CrimeTrendOut(BaseModel):
    id: int
    state_ut: str
    year: int
    total_crimes: Optional[int]
    crime_type: Optional[str]

    class Config:
        from_attributes = True


# ── National comparison ───────────────────────────────────────────────────────

class NationalComparisonOut(BaseModel):
    id: int
    entity: str
    crime_rate_2024: Optional[float]
    chargesheeting_rate: Optional[float]
    total_crimes_2024: Optional[float]

    class Config:
        from_attributes = True


# ── Composite overview (single endpoint, dashboard hero stats) ────────────────

class KarnatakaOverview(BaseModel):
    total_crimes_2024: int
    total_crimes_2023: int
    total_crimes_2022: int
    yoy_change_pct: float
    crime_rate_2024: float
    chargesheeting_rate_2024: float
    crime_rate_category: str
    murder_victims_2024: int
    rape_cases_2024: int
    districts_count: int
    national_avg_crime_rate: float
    karnataka_vs_national: str   # "Above" | "Below" | "At"


# ── District risk score (computed) ───────────────────────────────────────────

class DistrictRiskOut(BaseModel):
    district: str
    division: str
    latitude: float
    longitude: float
    population_2011: Optional[int]
    literacy_rate: Optional[float]
    poverty_index: Optional[float]
    urban_population_pct: Optional[float]
    unemployment_rate: Optional[float]
    risk_score: float           # 0–100 composite
    risk_level: str             # Low / Moderate / High / Critical


# ── API health ────────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    database: str
    version: str
    endpoints: int