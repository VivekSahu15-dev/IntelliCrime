"""
IntelliCrime — Phase 1 | Step 3: Schema & Database
Creates the SQLite database with all tables and indexes
for fast querying by the Phase 2 FastAPI backend.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")


def create_schema():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Enable WAL mode for better read performance
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")

    # ── Table 1: districts (master reference table) ──────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS districts (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        district            TEXT NOT NULL UNIQUE,
        division            TEXT NOT NULL,
        latitude            REAL NOT NULL,
        longitude           REAL NOT NULL,
        population_2011     INTEGER,
        literacy_rate       REAL,
        poverty_index       REAL,
        urban_population_pct REAL,
        unemployment_rate   REAL,
        population_density  REAL
    )""")

    # ── Table 2: ipc_crimes (state-level, 2022-2024) ─────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS ipc_crimes (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        sl_no                   INTEGER,
        state_ut                TEXT NOT NULL,
        total_crimes_2022       INTEGER,
        total_crimes_2023       INTEGER,
        ipc_crimes_2024         INTEGER,
        bns_crimes_2024         INTEGER,
        total_crimes_2024       INTEGER,
        population_lakhs_2024   REAL,
        crime_rate_2024         REAL,
        chargesheeting_rate_2024 REAL,
        crime_rate_category     TEXT,
        yoy_change_pct          REAL
    )""")

    # ── Table 3: murder_victims (Karnataka, 2024, by age+gender) ─────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS murder_victims (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        state_ut     TEXT NOT NULL,
        crime_type   TEXT DEFAULT 'Murder',
        year         INTEGER DEFAULT 2024,
        age_group    TEXT NOT NULL,
        victim_type  TEXT,
        male         INTEGER,
        female       INTEGER,
        transgender  INTEGER,
        total        INTEGER,
        female_pct   REAL
    )""")

    # ── Table 4: rape_victims (state-level, 2024, by age band) ───────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS rape_victims (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        state_ut             TEXT NOT NULL,
        crime_type           TEXT DEFAULT 'Rape',
        year                 INTEGER DEFAULT 2024,
        cases_reported       INTEGER,
        child_below_6        INTEGER,
        child_6_to_12        INTEGER,
        child_12_to_16       INTEGER,
        child_16_to_18       INTEGER,
        total_child_victims  INTEGER,
        adult_18_to_30       INTEGER,
        adult_30_to_45       INTEGER,
        adult_45_to_60       INTEGER,
        adult_60_plus        INTEGER,
        total_adult_victims  INTEGER,
        total_victims        INTEGER,
        child_victim_pct     REAL,
        adult_victim_pct     REAL
    )""")

    # ── Table 5: national_comparison (benchmark view) ─────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS national_comparison (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        entity              TEXT NOT NULL,
        crime_rate_2024     REAL,
        chargesheeting_rate REAL,
        total_crimes_2024   REAL
    )""")

    # ── Table 6: crime_trends (year-over-year for Karnataka) ──────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS crime_trends (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        state_ut    TEXT NOT NULL,
        year        INTEGER NOT NULL,
        total_crimes INTEGER,
        crime_type  TEXT DEFAULT 'IPC Total'
    )""")

    # ── Indexes for fast API lookups ──────────────────────────────────────────
    c.execute("CREATE INDEX IF NOT EXISTS idx_ipc_state    ON ipc_crimes(state_ut)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_murder_state ON murder_victims(state_ut)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_murder_age   ON murder_victims(age_group)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_rape_state   ON rape_victims(state_ut)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_dist_div     ON districts(division)")

    conn.commit()
    conn.close()
    print(f"[SCHEMA] Database schema created → {DB_PATH}")
    print("  Tables: districts | ipc_crimes | murder_victims | rape_victims | national_comparison | crime_trends")


if __name__ == "__main__":
    # Remove old DB if exists (fresh start)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"[SCHEMA] Removed existing DB at {DB_PATH}")
    create_schema()
