"""
IntelliCrime — Phase 1 | Step 4: Load into SQLite
Reads all cleaned CSVs and populates the database.
Also builds the crime_trends table from multi-year IPC data.
"""

import pandas as pd
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")
CLEAN_DIR = os.path.join(os.path.dirname(__file__), "../data/clean")


def load_csv_to_table(csv_filename, table_name, conn):
    path = os.path.join(CLEAN_DIR, csv_filename)
    if not os.path.exists(path):
        print(f"  [SKIP] {csv_filename} not found")
        return 0
    df = pd.read_csv(path)
    df.to_sql(table_name, conn, if_exists="append", index=False)
    print(f"  [LOAD] {table_name:<25} ← {csv_filename:<40} ({len(df)} rows)")
    return len(df)


def build_crime_trends(conn):
    """
    Derives year-over-year trend rows for Karnataka
    from the ipc_crimes table (2022, 2023, 2024).
    """
    df = pd.read_sql("SELECT * FROM ipc_crimes WHERE state_ut = 'Karnataka'", conn)
    if df.empty:
        print("  [WARN] Karnataka not found in ipc_crimes table")
        return

    k = df.iloc[0]
    trends = pd.DataFrame([
        {"state_ut": "Karnataka", "year": 2022, "total_crimes": int(k["total_crimes_2022"]), "crime_type": "IPC Total"},
        {"state_ut": "Karnataka", "year": 2023, "total_crimes": int(k["total_crimes_2023"]), "crime_type": "IPC Total"},
        {"state_ut": "Karnataka", "year": 2024, "total_crimes": int(k["total_crimes_2024"]), "crime_type": "IPC Total"},
    ])
    trends.to_sql("crime_trends", conn, if_exists="append", index=False)
    print(f"  [LOAD] crime_trends              ← computed from ipc_crimes (3 rows: 2022–2024)")


def verify_database(conn):
    """Prints row counts for all tables and a quick Karnataka sanity check."""
    tables = ["districts", "ipc_crimes", "murder_victims", "rape_victims",
              "national_comparison", "crime_trends"]
    print()
    print("  ┌─────────────────────────────┬───────────┐")
    print("  │ Table                       │ Row count │")
    print("  ├─────────────────────────────┼───────────┤")
    for t in tables:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            print(f"  │ {t:<27} │ {count:>9} │")
        except Exception as e:
            print(f"  │ {t:<27} │ {'ERROR':>9} │  ← {e}")
    print("  └─────────────────────────────┴───────────┘")

    # Karnataka sanity check
    print()
    print("  Quick sanity check — Karnataka 2024:")
    row = conn.execute(
        "SELECT total_crimes_2024, crime_rate_2024, chargesheeting_rate_2024 "
        "FROM ipc_crimes WHERE state_ut = 'Karnataka'"
    ).fetchone()
    if row:
        print(f"    Total crimes : {row[0]:,}")
        print(f"    Crime rate   : {row[1]} per lakh population")
        print(f"    Chargesheeting: {row[2]}%")

    # Murder victims Karnataka
    murder_total = conn.execute(
        "SELECT SUM(total) FROM murder_victims "
        "WHERE state_ut = 'Karnataka' AND age_group = 'Total Victims'"
    ).fetchone()[0]
    if murder_total:
        print(f"    Murder victims: {int(murder_total)}")

    # Rape cases Karnataka
    rape_cases = conn.execute(
        "SELECT cases_reported FROM rape_victims WHERE state_ut = 'Karnataka'"
    ).fetchone()
    if rape_cases:
        print(f"    Rape cases   : {rape_cases[0]}")

    # Districts
    dist_count = conn.execute("SELECT COUNT(*) FROM districts").fetchone()[0]
    print(f"    Districts    : {dist_count} Karnataka districts with coordinates")


if __name__ == "__main__":
    print("=" * 55)
    print("  IntelliCrime — Phase 1 | Loading into SQLite")
    print("=" * 55)

    conn = sqlite3.connect(DB_PATH)

    print("\nLoading tables...")
    load_csv_to_table("districts_master.csv",      "districts",           conn)
    load_csv_to_table("ipc_crimes_clean.csv",      "ipc_crimes",          conn)
    load_csv_to_table("murder_victims_clean.csv",  "murder_victims",      conn)
    load_csv_to_table("rape_victims_clean.csv",    "rape_victims",        conn)
    load_csv_to_table("national_comparison.csv",   "national_comparison", conn)
    build_crime_trends(conn)

    conn.commit()

    print()
    verify_database(conn)
    conn.close()

    db_size = os.path.getsize(DB_PATH) / 1024
    print()
    print(f"✓ intellicrime.db ready — {db_size:.1f} KB")
    print(f"  Path: {os.path.abspath(DB_PATH)}")
