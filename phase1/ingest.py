"""
IntelliCrime — Phase 1 | Step 1: Ingest
Reads all raw NCRB Excel tables + Karnataka TopoJSON
and saves structured raw CSVs to data/clean/
"""

import pandas as pd
import json
import os

RAW_DIR = os.path.join(os.path.dirname(__file__), "../data/raw")
CLEAN_DIR = os.path.join(os.path.dirname(__file__), "../data/clean")
GEO_DIR = os.path.join(os.path.dirname(__file__), "../data/geojson")

os.makedirs(CLEAN_DIR, exist_ok=True)


# ─── TABLE 1A.1 — IPC/BNS Crimes (State/UT-wise) 2022–2024 ────────────────────
def ingest_table1():
    """
    TABLE1A12: Total IPC crimes per State for 2022, 2023, 2024.
    Columns: SL, State/UT, 2022, 2023, IPC-2024, BNS-2024, Total-2024,
             Population(Lakhs), Crime Rate, Chargesheeting Rate
    """
    path = os.path.join(RAW_DIR, "TABLE1A12.xlsx")
    df = pd.read_excel(path, sheet_name="CIIReport", header=None)

    # Data rows start at row index 7 (after 6 header rows), state total row ends at index 36
    data = df.iloc[7:37, :10].copy()
    data.columns = [
        "sl_no", "state_ut",
        "total_crimes_2022", "total_crimes_2023",
        "ipc_crimes_2024", "bns_crimes_2024", "total_crimes_2024",
        "population_lakhs_2024", "crime_rate_2024", "chargesheeting_rate_2024"
    ]

    # Drop blank/total rows
    data = data[data["state_ut"].notna()]
    data = data[~data["state_ut"].astype(str).str.contains("STATE|UT|TOTAL|Andaman", case=False)]
    data = data[data["sl_no"].apply(lambda x: str(x).strip().isdigit())]

    # Clean numerics
    numeric_cols = ["total_crimes_2022", "total_crimes_2023", "ipc_crimes_2024",
                    "bns_crimes_2024", "total_crimes_2024", "population_lakhs_2024",
                    "crime_rate_2024", "chargesheeting_rate_2024"]
    for col in numeric_cols:
        data[col] = pd.to_numeric(data[col], errors="coerce")

    data["state_ut"] = data["state_ut"].str.strip()
    data = data.reset_index(drop=True)

    out_path = os.path.join(CLEAN_DIR, "table1_ipc_crimes.csv")
    data.to_csv(out_path, index=False)
    print(f"[TABLE1] Saved {len(data)} state records → {out_path}")
    return data


# ─── TABLE 2A.3 — Victims of Murder (Gender & Age Group-wise) 2024 ──────────
def ingest_table2():
    """
    TABLE2A31: Murder victims by age group (child/adult) and gender (M/F/Trans).
    Age groups: <6, 6-12, 12-16, 16-18 (child) | 18-30, 30-45, 45-60, 60+ (adult)
    Returns long-format DataFrame: state | age_group | gender | count
    """
    path = os.path.join(RAW_DIR, "TABLE2A31.xlsx")
    raw = pd.read_excel(path, sheet_name="CIIReport", header=None)

    # The table is split across 4 horizontal blocks (each 13 cols wide).
    # Block 1: cols 0-13  | Block 2: cols 14-27 | Block 3: cols 28-41 | Block 4: cols 42-51
    # Data rows: index 7 to 43 (states + UTs), Karnataka = row index 17

    # Age group labels in order of columns within each block
    age_groups_child = ["Below 6 Yrs", "6-12 Yrs", "12-16 Yrs"]      # Block 1
    age_groups_child2 = ["16-18 Yrs", "Total Child"]                   # Block 2 partial
    age_groups_adult = ["18-30 Yrs", "30-45 Yrs"]                      # Block 2 partial + Block 3
    age_groups_adult2 = ["45-60 Yrs", "60+ Yrs", "Total Adult"]        # Block 3 + 4 partial
    total_cols = ["Total Victims"]

    records = []
    # Data rows: skip header rows (0-6), take state rows (7-43)
    for idx in range(7, 44):
        row = raw.iloc[idx]
        state = str(row.iloc[1]).strip()
        if not state or state in ("nan", "State/UT") or "TOTAL" in state.upper():
            continue

        # Block 1: cols 2-13 → child victims: <6(M,F,T,Total), 6-12(M,F,T,Total), 12-16(M,F,T,Total)
        age_map = [
            ("Below 6 Yrs",  [2, 3, 4, 5]),
            ("6-12 Yrs",     [6, 7, 8, 9]),
            ("12-16 Yrs",    [10, 11, 12, 13]),
            # Block 2: cols 16-27
            ("16-18 Yrs",    [16, 17, 18, 19]),
            ("Total Child",  [20, 21, 22, 23]),
            ("18-30 Yrs",    [24, 25, 26, 27]),
            # Block 3: cols 30-41
            ("30-45 Yrs",    [30, 31, 32, 33]),
            ("45-60 Yrs",    [34, 35, 36, 37]),
            ("60+ Yrs",      [38, 39, 40, 41]),
            # Block 4: cols 44-51
            ("Total Adult",  [44, 45, 46, 47]),
            ("Total Victims",[48, 49, 50, 51]),
        ]
        for age_group, (mi, fi, tri, toti) in [(ag, cols) for ag, cols in age_map]:
            try:
                m = pd.to_numeric(row.iloc[mi], errors="coerce")
                f = pd.to_numeric(row.iloc[fi], errors="coerce")
                tr = pd.to_numeric(row.iloc[tri], errors="coerce")
                tot = pd.to_numeric(row.iloc[toti], errors="coerce")
                records.append({
                    "state_ut": state, "crime_type": "Murder",
                    "age_group": age_group,
                    "male": m, "female": f, "transgender": tr, "total": tot,
                    "year": 2024
                })
            except Exception:
                continue

    df = pd.DataFrame(records)
    out_path = os.path.join(CLEAN_DIR, "table2_murder_victims.csv")
    df.to_csv(out_path, index=False)
    print(f"[TABLE2] Saved {len(df)} murder victim records → {out_path}")
    return df


# ─── TABLE 3A.3 — Rape Victims (Age Group-wise) 2024 ────────────────────────
def ingest_table3():
    """
    TABLE3A31: Rape cases & victims by age group.
    Columns: cases_reported | child victims by age band | adult victims by age band | total
    """
    path = os.path.join(RAW_DIR, "TABLE3A31.xlsx")
    raw = pd.read_excel(path, sheet_name="CIIReport", header=None)

    # Header at rows 2-5, data from row 7
    records = []
    for idx in range(7, 45):
        row = raw.iloc[idx]
        state = str(row.iloc[1]).strip()
        if not state or state == "nan" or "TOTAL" in state.upper():
            continue

        try:
            record = {
                "state_ut": state,
                "crime_type": "Rape",
                "year": 2024,
                "cases_reported": pd.to_numeric(row.iloc[2], errors="coerce"),
                # Child victims (below 18 yrs)
                "child_below_6": pd.to_numeric(row.iloc[3], errors="coerce"),
                "child_6_to_12": pd.to_numeric(row.iloc[4], errors="coerce"),
                "child_12_to_16": pd.to_numeric(row.iloc[5], errors="coerce"),
                "child_16_to_18": pd.to_numeric(row.iloc[6], errors="coerce"),
                "total_child_victims": pd.to_numeric(row.iloc[7], errors="coerce"),
                # Adult victims (18+ yrs)
                "adult_18_to_30": pd.to_numeric(row.iloc[8], errors="coerce"),
                "adult_30_to_45": pd.to_numeric(row.iloc[9], errors="coerce"),
                "adult_45_to_60": pd.to_numeric(row.iloc[10], errors="coerce"),
                "adult_60_plus": pd.to_numeric(row.iloc[11], errors="coerce"),
                "total_adult_victims": pd.to_numeric(row.iloc[12], errors="coerce"),
                "total_victims": pd.to_numeric(row.iloc[13], errors="coerce"),
            }
            records.append(record)
        except Exception as e:
            print(f"  [WARN] Row {idx} skipped: {e}")

    df = pd.DataFrame(records)
    out_path = os.path.join(CLEAN_DIR, "table3_rape_victims.csv")
    df.to_csv(out_path, index=False)
    print(f"[TABLE3] Saved {len(df)} rape victim records → {out_path}")
    return df


# ─── Karnataka TopoJSON — Division boundaries ────────────────────────────────
def ingest_geojson():
    """
    Reads Karnataka TopoJSON (4 administrative divisions).
    Extracts division names + centroid approximations for map use.
    """
    path = os.path.join(GEO_DIR, "karnataka_topo.json")
    with open(path) as f:
        topo = json.load(f)

    obj_key = list(topo["objects"].keys())[0]
    geometries = topo["objects"][obj_key]["geometries"]

    divisions = []
    for g in geometries:
        props = g.get("properties", {})
        divisions.append({
            "division": props.get("division", "Unknown"),
            "state": props.get("st_nm", "Karnataka"),
            "state_code": props.get("st_cen_cd", 29),
        })

    df = pd.DataFrame(divisions)
    out_path = os.path.join(CLEAN_DIR, "karnataka_divisions.csv")
    df.to_csv(out_path, index=False)
    print(f"[GEO] Saved {len(df)} Karnataka divisions → {out_path}")
    return df


# ─── Run all ingestion ────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  IntelliCrime — Phase 1 | Ingestion")
    print("=" * 55)
    t1 = ingest_table1()
    t2 = ingest_table2()
    t3 = ingest_table3()
    geo = ingest_geojson()
    print()
    print("✓ Ingestion complete. Files written to data/clean/")
    print(f"  • table1_ipc_crimes.csv       → {len(t1)} rows")
    print(f"  • table2_murder_victims.csv   → {len(t2)} rows")
    print(f"  • table3_rape_victims.csv     → {len(t3)} rows")
    print(f"  • karnataka_divisions.csv     → {len(geo)} rows")
