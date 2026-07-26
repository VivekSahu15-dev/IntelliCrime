"""
IntelliCrime — Phase 4 | ML Model 1: DBSCAN Spatial Clustering
Identifies geographic crime hotspot clusters across Karnataka districts
using density-based spatial clustering on lat/lng + risk score.

Output: cluster labels, hotspot zones, noise points (isolated districts)
"""

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import sqlite3, os, json

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")


def load_district_features():
    """Load all 31 districts with spatial + socio-economic features."""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT district, division, latitude, longitude,
               population_2011, literacy_rate, poverty_index,
               urban_population_pct, unemployment_rate
        FROM districts ORDER BY district
    """, conn)
    conn.close()

    # Fill any nulls with column medians
    for col in ['literacy_rate','poverty_index','urban_population_pct','unemployment_rate']:
        df[col] = df[col].fillna(df[col].median())

    return df


def run_spatial_dbscan(df):
    """
    DBSCAN on lat/lng coordinates (converted to radians for haversine).
    eps=1.2 degrees ≈ ~130 km radius — captures geographically close districts.
    min_samples=2: at least 2 districts to form a cluster.
    """
    coords = np.radians(df[['latitude', 'longitude']].values)

    # Haversine metric — earth-surface distance
    db = DBSCAN(
        eps=1.2 * (np.pi / 180),   # ~130 km
        min_samples=2,
        metric='haversine'
    ).fit(coords)

    df = df.copy()
    df['spatial_cluster'] = db.labels_      # -1 = noise (isolated)
    df['is_hotspot_core'] = (db.core_sample_indices_
                              if hasattr(db, 'core_sample_indices_') else [])
    return df, db


def run_feature_dbscan(df):
    """
    DBSCAN on socio-economic features (poverty, literacy, unemployment, urban%).
    Finds districts that are socio-economically similar — potential
    co-vulnerability clusters regardless of geography.
    """
    features = ['poverty_index', 'literacy_rate', 'unemployment_rate', 'urban_population_pct']
    X = df[features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    db = DBSCAN(eps=0.9, min_samples=2).fit(X_scaled)
    df = df.copy()
    df['socio_cluster'] = db.labels_
    return df


def compute_cluster_stats(df):
    """Aggregate statistics per spatial cluster."""
    stats = []
    for label in sorted(df['spatial_cluster'].unique()):
        cluster_df = df[df['spatial_cluster'] == label]
        if label == -1:
            cluster_type = 'Isolated'
        else:
            avg_poverty = cluster_df['poverty_index'].mean()
            cluster_type = 'High-Risk' if avg_poverty > 30 else 'Moderate-Risk'

        stats.append({
            'cluster_id':       int(label),
            'cluster_type':     cluster_type,
            'district_count':   int(len(cluster_df)),
            'districts':        cluster_df['district'].tolist(),
            'divisions':        cluster_df['division'].unique().tolist(),
            'center_lat':       round(float(cluster_df['latitude'].mean()), 4),
            'center_lng':       round(float(cluster_df['longitude'].mean()), 4),
            'avg_poverty':      round(float(cluster_df['poverty_index'].mean()), 1),
            'avg_literacy':     round(float(cluster_df['literacy_rate'].mean()), 1),
            'avg_unemployment': round(float(cluster_df['unemployment_rate'].mean()), 1),
            'avg_urban_pct':    round(float(cluster_df['urban_population_pct'].mean()), 1),
            'total_population': int(cluster_df['population_2011'].sum()),
            'risk_label':       'ALERT' if cluster_type == 'High-Risk' else 'WATCH' if cluster_type == 'Moderate-Risk' else 'MONITOR',
        })
    return stats


def save_results(df, cluster_stats, conn):
    """Persist cluster assignments into SQLite for API serving."""
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS ml_spatial_clusters")
    c.execute("""
        CREATE TABLE ml_spatial_clusters (
            district        TEXT PRIMARY KEY,
            division        TEXT,
            latitude        REAL,
            longitude       REAL,
            spatial_cluster INTEGER,
            socio_cluster   INTEGER,
            cluster_type    TEXT,
            poverty_index   REAL,
            literacy_rate   REAL,
            unemployment_rate REAL,
            population_2011 INTEGER
        )
    """)

    # Map cluster_type back onto df
    cluster_type_map = {s['cluster_id']: s['cluster_type'] for s in cluster_stats}
    df = df.copy()
    df['cluster_type'] = df['spatial_cluster'].map(cluster_type_map).fillna('Unknown')

    for _, row in df.iterrows():
        c.execute("""
            INSERT OR REPLACE INTO ml_spatial_clusters VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            row['district'], row['division'], row['latitude'], row['longitude'],
            int(row['spatial_cluster']), int(row['socio_cluster']),
            row['cluster_type'], row['poverty_index'], row['literacy_rate'],
            row['unemployment_rate'], int(row['population_2011'])
        ))

    # Save cluster summary
    c.execute("DROP TABLE IF EXISTS ml_cluster_summary")
    c.execute("""
        CREATE TABLE ml_cluster_summary (
            cluster_id      INTEGER PRIMARY KEY,
            cluster_type    TEXT,
            district_count  INTEGER,
            districts_json  TEXT,
            center_lat      REAL,
            center_lng      REAL,
            avg_poverty     REAL,
            avg_literacy    REAL,
            avg_unemployment REAL,
            total_population INTEGER,
            risk_label      TEXT
        )
    """)
    for s in cluster_stats:
        c.execute("""
            INSERT INTO ml_cluster_summary VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            s['cluster_id'], s['cluster_type'], s['district_count'],
            json.dumps(s['districts']), s['center_lat'], s['center_lng'],
            s['avg_poverty'], s['avg_literacy'], s['avg_unemployment'],
            s['total_population'], s['risk_label']
        ))
    conn.commit()


def run():
    print("[DBSCAN] Loading district features...")
    df = load_district_features()

    print("[DBSCAN] Running spatial clustering (haversine)...")
    df, _ = run_spatial_dbscan(df)

    print("[DBSCAN] Running socio-economic clustering...")
    df = run_feature_dbscan(df)

    print("[DBSCAN] Computing cluster statistics...")
    stats = compute_cluster_stats(df)

    conn = sqlite3.connect(DB_PATH)
    save_results(df, stats, conn)
    conn.close()

    n_clusters = len([s for s in stats if s['cluster_id'] != -1])
    n_isolated = len([s for s in stats if s['cluster_id'] == -1])
    n_high     = len([s for s in stats if s['cluster_type'] == 'High-Risk'])

    print(f"[DBSCAN] ✓ {n_clusters} spatial clusters found")
    print(f"         {n_high} high-risk clusters")
    print(f"         {n_isolated} isolated districts (noise)")
    for s in stats:
        icon = '🔴' if s['cluster_type'] == 'High-Risk' else '🟡' if s['cluster_type'] == 'Moderate-Risk' else '⚪'
        label = f"Cluster {s['cluster_id']}" if s['cluster_id'] != -1 else 'Isolated'
        print(f"         {icon} {label}: {', '.join(s['districts'][:4])}{'...' if len(s['districts']) > 4 else ''}")

    return df, stats


if __name__ == "__main__":
    run()