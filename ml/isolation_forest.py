"""
IntelliCrime — Phase 4 | ML Model 2: Isolation Forest Anomaly Detection
Detects districts that deviate from the normal socio-economic pattern.
Anomalous districts = unusual combinations of poverty/literacy/unemployment
that don't fit the state-wide trend — these need investigator attention.

contamination=0.15 → expect ~15% of districts to be anomalous (≈5 districts)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")


def load_features():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("""
        SELECT district, division, latitude, longitude,
               literacy_rate, poverty_index,
               urban_population_pct, unemployment_rate,
               population_2011, population_density
        FROM districts ORDER BY district
    """, conn)
    conn.close()
    for col in ['literacy_rate','poverty_index','urban_population_pct',
                'unemployment_rate','population_density']:
        df[col] = df[col].fillna(df[col].median())
    return df


def run_isolation_forest(df):
    """
    IsolationForest scores each district on how 'normal' its
    socio-economic profile is vs. all other Karnataka districts.
    Lower score = more anomalous.
    """
    feature_cols = [
        'literacy_rate', 'poverty_index',
        'urban_population_pct', 'unemployment_rate',
        'population_density'
    ]
    X = df[feature_cols].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.15,   # expect ~15% anomalies = ~5 districts
        random_state=42,
        max_samples='auto'
    )
    iso.fit(X_scaled)

    df = df.copy()
    df['anomaly_label']  = iso.predict(X_scaled)   # 1=normal, -1=anomaly
    df['anomaly_score']  = iso.score_samples(X_scaled)  # lower = more anomalous
    df['is_anomaly']     = df['anomaly_label'] == -1

    # Normalise score to 0–100 (higher = more anomalous for readability)
    raw = df['anomaly_score'].values
    norm = (raw - raw.max()) / (raw.min() - raw.max() + 1e-9)
    df['anomaly_severity'] = np.round(norm * 100, 1)

    return df, feature_cols


def explain_anomaly(row, df, feature_cols):
    """
    Simple explainability: which features deviate most from state median?
    Returns the top 2 deviant features as human-readable reasons.
    """
    medians = df[feature_cols].median()
    stds    = df[feature_cols].std().replace(0, 1)
    z_scores = {col: abs((row[col] - medians[col]) / stds[col]) for col in feature_cols}
    top2 = sorted(z_scores.items(), key=lambda x: x[1], reverse=True)[:2]

    reasons = []
    for col, z in top2:
        val = row[col]
        med = medians[col]
        direction = 'unusually high' if val > med else 'unusually low'
        label_map = {
            'literacy_rate':        f'literacy ({val}% — {direction} vs state median {med:.1f}%)',
            'poverty_index':        f'poverty ({val}% — {direction} vs state median {med:.1f}%)',
            'urban_population_pct': f'urbanisation ({val}% — {direction} vs state median {med:.1f}%)',
            'unemployment_rate':    f'unemployment ({val}% — {direction} vs state median {med:.1f}%)',
            'population_density':   f'population density ({val:.0f} — {direction})',
        }
        reasons.append(label_map.get(col, col))
    return '; '.join(reasons)


def save_results(df, conn):
    c = conn.cursor()
    c.execute("DROP TABLE IF EXISTS ml_anomalies")
    c.execute("""
        CREATE TABLE ml_anomalies (
            district          TEXT PRIMARY KEY,
            division          TEXT,
            latitude          REAL,
            longitude         REAL,
            is_anomaly        INTEGER,
            anomaly_score     REAL,
            anomaly_severity  REAL,
            anomaly_reason    TEXT,
            literacy_rate     REAL,
            poverty_index     REAL,
            unemployment_rate REAL,
            urban_pct         REAL,
            population_2011   INTEGER
        )
    """)
    for _, row in df.iterrows():
        c.execute("""
            INSERT OR REPLACE INTO ml_anomalies VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            row['district'], row['division'],
            row['latitude'], row['longitude'],
            int(row['is_anomaly']),
            round(float(row['anomaly_score']), 4),
            round(float(row['anomaly_severity']), 1),
            row.get('anomaly_reason', ''),
            row['literacy_rate'], row['poverty_index'],
            row['unemployment_rate'], row['urban_population_pct'],
            int(row['population_2011'])
        ))
    conn.commit()


def run():
    print("[ISO-FOREST] Loading district features...")
    df = load_features()

    print("[ISO-FOREST] Running anomaly detection...")
    df, feature_cols = run_isolation_forest(df)

    # Add explainability
    print("[ISO-FOREST] Explaining anomalies...")
    df['anomaly_reason'] = df.apply(
        lambda row: explain_anomaly(row, df, feature_cols) if row['is_anomaly'] else '', axis=1
    )

    conn = sqlite3.connect(DB_PATH)
    save_results(df, conn)
    conn.close()

    anomalies  = df[df['is_anomaly']].sort_values('anomaly_severity', ascending=False)
    normal     = df[~df['is_anomaly']]

    print(f"[ISO-FOREST] ✓ {len(anomalies)} anomalous districts detected")
    print(f"             {len(normal)} districts within normal pattern")
    print()
    print("  Anomalous districts (need investigator attention):")
    for _, row in anomalies.iterrows():
        print(f"  🔴 {row['district']:<22} severity={row['anomaly_severity']:>5.1f} | {row['anomaly_reason'][:80]}")

    return df


if __name__ == "__main__":
    run()