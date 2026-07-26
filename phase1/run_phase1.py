"""
IntelliCrime — Phase 1 | Master Runner
Run this single file to execute all Phase 1 steps:
  Step 1 → Ingest raw NCRB files
  Step 2 → Clean & enrich data
  Step 3 → Create SQLite schema
  Step 4 → Load data into database
"""

import os
import sys
import time

# Add parent to path so sub-scripts can import each other
sys.path.insert(0, os.path.dirname(__file__))

def separator(title):
    print()
    print("─" * 55)
    print(f"  {title}")
    print("─" * 55)

if __name__ == "__main__":
    start = time.time()

    print()
    print("╔══════════════════════════════════════════════════════╗")
    print("║        IntelliCrime — Phase 1: Data Foundation      ║")
    print("║        Karnataka State Police Crime Intelligence     ║")
    print("╚══════════════════════════════════════════════════════╝")

    # ── Step 1: Ingest ────────────────────────────────────────────────────────
    separator("STEP 1 of 4 — Ingesting raw NCRB files")
    from ingest import ingest_table1, ingest_table2, ingest_table3, ingest_geojson
    ingest_table1()
    ingest_table2()
    ingest_table3()
    ingest_geojson()

    # ── Step 2: Clean ─────────────────────────────────────────────────────────
    separator("STEP 2 of 4 — Cleaning & enriching data")
    from clean import (clean_ipc_crimes, clean_murder_victims,
                       clean_rape_victims, build_districts_table,
                       build_national_comparison)
    clean_ipc_crimes()
    clean_murder_victims()
    clean_rape_victims()
    build_districts_table()
    build_national_comparison()

    # ── Step 3: Schema ────────────────────────────────────────────────────────
    separator("STEP 3 of 4 — Creating database schema")
    from schema import create_schema
    DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    create_schema()

    # ── Step 4: Load ──────────────────────────────────────────────────────────
    separator("STEP 4 of 4 — Loading data into SQLite")
    from load import load_csv_to_table, build_crime_trends, verify_database
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    load_csv_to_table("districts_master.csv",     "districts",           conn)
    load_csv_to_table("ipc_crimes_clean.csv",     "ipc_crimes",          conn)
    load_csv_to_table("murder_victims_clean.csv", "murder_victims",      conn)
    load_csv_to_table("rape_victims_clean.csv",   "rape_victims",        conn)
    load_csv_to_table("national_comparison.csv",  "national_comparison", conn)
    build_crime_trends(conn)
    conn.commit()
    verify_database(conn)
    conn.close()

    elapsed = time.time() - start
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print(f"║  ✓ Phase 1 complete in {elapsed:.1f}s                        ║")
    print("║                                                      ║")
    print("║  Output files:                                       ║")
    print("║   • data/clean/ipc_crimes_clean.csv                 ║")
    print("║   • data/clean/murder_victims_clean.csv             ║")
    print("║   • data/clean/rape_victims_clean.csv               ║")
    print("║   • data/clean/districts_master.csv                 ║")
    print("║   • data/clean/national_comparison.csv              ║")
    print("║   • intellicrime.db  (SQLite database)              ║")
    print("║                                                      ║")
    print("║  Next → Run Phase 2: FastAPI backend                ║")
    print("╚══════════════════════════════════════════════════════╝")
