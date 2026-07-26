"""
IntelliCrime — Phase 4 | ML Master Runner
Runs all 3 models in sequence:
  1. DBSCAN   → spatial + socio-economic clustering
  2. IsoForest → anomaly detection
  3. Forecast  → crime trend prediction 2025–2026
"""

import os, sys, time
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
    print("║     IntelliCrime — Phase 4: ML Intelligence         ║")
    print("║     Karnataka Crime Predictive Analytics            ║")
    print("╚══════════════════════════════════════════════════════╝")

    separator("MODEL 1 of 3 — DBSCAN Spatial Clustering")
    from dbscan_clusters import run as run_dbscan
    run_dbscan()

    separator("MODEL 2 of 3 — Isolation Forest Anomaly Detection")
    from isolation_forest import run as run_iso
    run_iso()

    separator("MODEL 3 of 3 — Crime Trend Forecasting")
    from forecasting import run as run_forecast
    run_forecast()

    elapsed = time.time() - start
    print()
    print("╔══════════════════════════════════════════════════════╗")
    print(f"║  ✓ Phase 4 complete in {elapsed:.1f}s                        ║")
    print("║                                                      ║")
    print("║  New DB tables created:                              ║")
    print("║   • ml_spatial_clusters   (DBSCAN per district)     ║")
    print("║   • ml_cluster_summary    (cluster aggregates)      ║")
    print("║   • ml_anomalies          (IsoForest results)       ║")
    print("║   • ml_crime_forecast     (2022–2026 timeline)      ║")
    print("║   • ml_national_context   (benchmark context)       ║")
    print("║   • ml_district_forecast  (per-district outlook)    ║")
    print("║                                                      ║")
    print("║  Next → Phase 4 API routes + dashboard page         ║")
    print("╚══════════════════════════════════════════════════════╝")