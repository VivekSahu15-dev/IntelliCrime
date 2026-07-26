"""
IntelliCrime — Smart Upload Routes (NCRB-aware + Claude AI)
Handles:
  - Standard NCRB report format (multi-row headers, section rows, footnotes)
  - Any other crime CSV/Excel via fuzzy column detection
  - Claude AI for accurate analysis of whatever data is extracted
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import io, re, json
import pandas as pd
from difflib import get_close_matches
import anthropic

from .database import get_db

upload_router = APIRouter(prefix="/upload", tags=["Data Upload"])
_anthropic    = anthropic.Anthropic()

# ── Karnataka districts ───────────────────────────────────────────────────────
KA_DISTRICTS = [
    "Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar",
    "Chamarajanagar","Chikkaballapura","Chikkamagaluru","Chitradurga",
    "Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri",
    "Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mangaluru","Mysuru",
    "Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi",
    "Uttara Kannada","Vijayapura","Yadgir",
]
KA_LOWER = {d.lower(): d for d in KA_DISTRICTS}
DISTRICT_ALIASES = {
    "bangalore urban":"Bengaluru Urban","bangalore rural":"Bengaluru Rural",
    "bangalore":"Bengaluru Urban","bengaluru":"Bengaluru Urban",
    "belgaum":"Belagavi","bellary":"Ballari","bijapur":"Vijayapura",
    "chamrajnagar":"Chamarajanagar","gulbarga":"Kalaburagi",
    "mysore":"Mysuru","shimoga":"Shivamogga","tumkur":"Tumakuru",
    "dakshin kannad":"Dakshina Kannada","uttar kannada":"Uttara Kannada",
    "chikmagalur":"Chikkamagaluru","mangalore":"Mangaluru","ramanagar":"Ramanagara",
}

def normalise_district(raw):
    if not raw: return None
    c = str(raw).strip().lower()
    if c in ('nan','none',''): return None
    if c in DISTRICT_ALIASES: return DISTRICT_ALIASES[c]
    if c in KA_LOWER: return KA_LOWER[c]
    m = get_close_matches(c, list(KA_LOWER.keys()), n=1, cutoff=0.65)
    if m: return KA_LOWER[m[0]]
    for kl, kn in KA_LOWER.items():
        if kl in c or c in kl: return kn
    return str(raw).strip()

def safe_int(v, default=0):
    try: return max(int(float(str(v).replace(',','').split('.')[0])), 0)
    except: return default

def safe_float(v):
    try: return float(str(v).replace(',',''))
    except: return None

def safe_year(v):
    try:
        y = int(str(v).split('.')[0])
        return y if 2000 <= y <= 2030 else None
    except: return None

# ── NCRB skip patterns ────────────────────────────────────────────────────────
NCRB_SKIP = [
    r'^\[', r'^STATES', r'^UNION TERRIT', r'^TOTAL', r'^TABLE',
    r'^\+', r'^●', r'^population', r'page \d', r'^sl$', r'^nan$',
    r'^note', r'^source', r'^crime rate', r'^\*',
]

def is_skip_row(val):
    s = str(val).strip()
    for p in NCRB_SKIP:
        if re.match(p, s, re.IGNORECASE): return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
# NCRB-AWARE PARSER
# Handles: merged title rows, [1][2] column-index rows, STATES:/UTs section rows,
# footnote rows, totals rows
# ─────────────────────────────────────────────────────────────────────────────
def parse_ncrb(df: pd.DataFrame):
    """
    Returns: {
      'crime_type': str,
      'title': str,
      'year_cols': [(col_idx, year_str), ...],
      'state_col': int,
      'extra_cols': [(col_idx, col_name), ...],
      'rows': [{'state_ut':..., 'crime_type':..., 'cases_YYYY':..., ...}],
      'is_ncrb': bool,
    }
    """
    # ── Extract title from first ~4 rows ─────────────────────────────────────
    title_parts = []
    for i in range(min(5, len(df))):
        v = str(df.iloc[i, 0]).strip()
        if v and v.lower() not in ('nan','none') and not re.match(r'^\[', v):
            title_parts.append(v)

    full_title = ' | '.join(title_parts[:3])

    # Extract crime type from title
    crime_match = re.search(
        r'(Kidnapping[^()\-|]*|Murder[^()\-|]*|Rape[^()\-|]*|Robbery[^()\-|]*'
        r'|Theft[^()\-|]*|Burglary[^()\-|]*|Assault[^()\-|]*|Fraud[^()\-|]*'
        r'|Dacoity[^()\-|]*|Dowry[^()\-|]*|Arson[^()\-|]*|Abduction[^()\-|]*'
        r'|Hurt[^()\-|]*|Riot[^()\-|]*|Extortion[^()\-|]*|Cheating[^()\-|]*'
        r'|Counterfeiting[^()\-|]*|Cruelty[^()\-|]*|SLL[^()\-|]*'
        r'|Crime[^()\-|]*against[^()\-|]*)',
        full_title, re.IGNORECASE
    )
    crime_type = crime_match.group(1).strip().rstrip('- ') if crime_match else "Crime"

    # ── Find the real header row ──────────────────────────────────────────────
    header_row_idx = None
    for i, row in df.iterrows():
        vals = [str(v).strip().lower() for v in row]
        has_state = any('state' in v or 'ut' in v or 'district' in v for v in vals)
        has_year  = any(re.match(r'20\d\d', v) for v in vals)
        if has_state and has_year:
            header_row_idx = i
            break

    if header_row_idx is None:
        return {'is_ncrb': False}

    # ── Parse headers ─────────────────────────────────────────────────────────
    raw_headers = list(df.iloc[header_row_idx])
    clean_headers = []
    for v in raw_headers:
        s = str(v).strip()
        if s.lower() in ('nan','') or re.match(r'^\[\d+\]$', s):
            clean_headers.append(None)
        else:
            clean_headers.append(s)

    year_cols  = [(i, h) for i, h in enumerate(clean_headers)
                  if h and re.match(r'^20\d\d$', str(h).strip())]
    state_col  = next((i for i, h in enumerate(clean_headers)
                       if h and ('state' in h.lower() or 'ut' in h.lower()
                                 or 'district' in h.lower())), 1)
    extra_cols = [(i, h) for i, h in enumerate(clean_headers)
                  if h and i not in [c[0] for c in year_cols]
                  and i != state_col
                  and h.upper() not in ('SL','NO.','SR')]

    if not year_cols:
        return {'is_ncrb': False}

    # ── Extract data rows ─────────────────────────────────────────────────────
    rows = []
    # skip row after header if it's the [1][2]... index row
    start = header_row_idx + 1
    if start < len(df):
        first_val = str(df.iloc[start, 0]).strip()
        if re.match(r'^\[1\]', first_val):
            start += 1

    for i in range(start, len(df)):
        row   = df.iloc[i]
        first = str(row.iloc[0]).strip()
        state = str(row.iloc[state_col]).strip()

        if is_skip_row(first) or is_skip_row(state): continue
        if state.lower() in ('nan','','none'):        continue

        # Must have ≥1 numeric year value
        year_vals = [row.iloc[ci] for ci, _ in year_cols]
        if not any(str(v).replace('.','').replace('-','').strip().isdigit()
                   for v in year_vals if str(v).strip().lower() not in ('nan','')):
            continue

        rec = {'state_ut': state, 'crime_type': crime_type}
        for ci, yr in year_cols:
            rec[f'cases_{yr}'] = safe_int(row.iloc[ci])
        for ci, col_name in extra_cols:
            key = re.sub(r'[^a-z0-9_]', '_', col_name.lower())[:32]
            rec[key] = safe_float(row.iloc[ci])

        rows.append(rec)

    return {
        'is_ncrb':    True,
        'title':      full_title,
        'crime_type': crime_type,
        'year_cols':  [yr for _, yr in year_cols],
        'state_col':  state_col,
        'extra_cols': [col for _, col in extra_cols],
        'rows':       rows,
    }


# ── Standard fuzzy-column parser (for non-NCRB files) ────────────────────────
COL_SYNONYMS = {
    "district":         ["district","dist","district_name","area","region","location",
                         "place","city","police_station","taluk","state/ut","state_ut"],
    "crime_type":       ["crime_type","crime","offence","offense","ipc_head","head",
                         "category","nature","section","charge","type","incident_type"],
    "year":             ["year","yr","crime_year","case_year","fy","period"],
    "cases_reported":   ["cases_reported","cases","reported","total_cases","count",
                         "incidents","value","total","no_of_cases"],
    "persons_arrested": ["persons_arrested","arrested","accused","arrests"],
    "month":            ["month","mon","month_name"],
}

def detect_columns(df):
    mapping, used = {}, set()
    cols_lower = {c: c.lower().strip() for c in df.columns}
    for canonical, synonyms in COL_SYNONYMS.items():
        for actual, al in cols_lower.items():
            if actual in used: continue
            clean = al.replace(" ","_").replace("-","_").replace(".","").replace("/","_")
            syn_c = [s.replace(" ","_").replace("-","_").replace(".","").replace("/","_")
                     for s in synonyms]
            if clean in syn_c:
                mapping[canonical] = actual; used.add(actual); break
        if canonical not in mapping:
            close = get_close_matches(canonical,
                        [cols_lower[c] for c in cols_lower], n=1, cutoff=0.72)
            if close:
                for actual, al in cols_lower.items():
                    if al == close[0] and actual not in used:
                        mapping[canonical] = actual; used.add(actual); break
    return mapping


# ── Build Claude prompt ───────────────────────────────────────────────────────
def build_claude_prompt(parsed: dict, is_ncrb: bool, filename: str) -> str:
    if is_ncrb:
        rows      = parsed['rows']
        years     = parsed['year_cols']
        crime     = parsed['crime_type']
        title     = parsed['title']
        total_rows= len(rows)

        # Karnataka row
        ka_row = next((r for r in rows
                       if 'karnataka' in r.get('state_ut','').lower()), None)

        # Sort by latest year cases
        latest_yr  = years[-1] if years else None
        sorted_rows = sorted(rows, key=lambda r: r.get(f'cases_{latest_yr}', 0)
                             if latest_yr else 0, reverse=True)

        top_states  = sorted_rows[:8]
        all_india   = next((r for r in rows
                            if 'total all india' in r.get('state_ut','').lower()
                            or 'india' in r.get('state_ut','').lower()), None)

        state_lines = "\n".join(
            f"  {r['state_ut']}: " + ", ".join(
                f"{yr}={r.get(f'cases_{yr}','?')}" for yr in years
            ) + (f", rate={r.get(list(r.keys())[-2])}" if len(r)>4 else "")
            for r in top_states
        )
        ka_line = (
            f"\nKarnataka specifically: " + ", ".join(
                f"{yr}={ka_row.get(f'cases_{yr}','?')}" for yr in years
            ) + f", rate={ka_row.get(list(ka_row.keys())[-2],'?')}"
            f", chargesheeting={ka_row.get(list(ka_row.keys())[-1],'?')}%"
            if ka_row else "\nKarnataka: not in dataset"
        )
        india_line = (
            f"\nAll India total: " + ", ".join(
                f"{yr}={all_india.get(f'cases_{yr}','?')}" for yr in years
            ) if all_india else ""
        )

        prompt = f"""You are an expert NCRB crime data analyst for India, with deep knowledge
of Karnataka State Police and Indian crime statistics.

DATASET: {title}
CRIME TYPE: {crime}
YEARS COVERED: {', '.join(years)}
TOTAL STATES/UTs IN FILE: {total_rows}

TOP STATES BY {latest_yr or 'latest'} CASES:
{state_lines}
{ka_line}
{india_line}

Analyse this NCRB data and respond ONLY with valid JSON (no markdown, no explanation):
{{
  "overall_assessment": "3-4 sentence expert assessment of {crime} crime trends across India and specifically Karnataka",
  "severity": "Critical|High|Moderate|Low",
  "karnataka_analysis": {{
    "risk_score": 0-100,
    "risk_level": "Critical|High|Moderate|Low",
    "trend": "Rising|Falling|Stable",
    "national_rank": "approximate rank among states",
    "key_insight": "specific insight about Karnataka's {crime} situation",
    "chargesheeting_analysis": "analysis of chargesheeting rate compared to national average"
  }},
  "key_findings": ["finding 1 with specific numbers", "finding 2", "finding 3", "finding 4"],
  "high_risk_states": ["state1", "state2", "state3"],
  "trend_insight": "year-on-year trend analysis with specific numbers from the data",
  "anomalies": ["any unusual patterns in the data"],
  "recommendations": ["specific recommendation 1 for Karnataka Police", "recommendation 2", "recommendation 3"],
  "prediction": "data-driven prediction for {crime} trend based on the numbers"
}}"""
    else:
        # Generic file
        district_agg  = parsed.get('district_agg', {})
        crime_counts  = parsed.get('crime_counts', {})
        year_counts   = parsed.get('year_counts', {})
        top_districts = sorted(district_agg.items(),
                               key=lambda x: x[1]['total_cases'], reverse=True)[:8]
        top_crimes    = sorted(crime_counts.items(),
                               key=lambda x: x[1], reverse=True)[:10]

        dist_lines  = "\n".join(
            f"  {d}: {v['total_cases']} cases, crimes: {', '.join(list(v['crime_types'])[:4])}"
            for d,v in top_districts
        )
        crime_lines = "\n".join(f"  {ct}: {n} cases" for ct,n in top_crimes)
        year_lines  = "\n".join(
            f"  {y}: {c} cases"
            for y,c in sorted(year_counts.items()) if 2000<=y<=2030
        ) or "  (no year data)"

        prompt = f"""You are an expert crime data analyst for Karnataka State Police (India).

FILE: {filename}
ROWS PROCESSED: {parsed.get('total_rows', 0)}

TOP DISTRICTS BY CASES:
{dist_lines}

TOP CRIME TYPES:
{crime_lines}

YEAR TREND:
{year_lines}

Respond ONLY with valid JSON (no markdown):
{{
  "overall_assessment": "3-4 sentence assessment of the crime data",
  "severity": "Critical|High|Moderate|Low",
  "key_findings": ["finding 1 with numbers", "finding 2", "finding 3", "finding 4"],
  "district_risk": [
    {{"district": "Name", "risk_level": "Critical|High|Moderate|Low",
      "risk_score": 0-100, "reason": "specific reason", "primary_crime": "crime type"}}
  ],
  "crime_analysis": [
    {{"crime_type": "Name", "severity": "Critical|High|Moderate|Low",
      "trend": "Rising|Falling|Stable", "insight": "specific insight"}}
  ],
  "hotspots": ["district1", "district2", "district3"],
  "anomalies": ["anomaly if any"],
  "trend_insight": "trend analysis",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "prediction": "forward-looking prediction"
}}"""

    return prompt


def call_claude(prompt: str) -> dict:
    try:
        msg = _anthropic.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse: {e}", "_raw": raw[:500] if 'raw' in dir() else ""}
    except Exception as e:
        return {"error": str(e)}


# ── POST /api/upload/analyze ──────────────────────────────────────────────────
@upload_router.post("/analyze")
async def analyze_upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    fname = (file.filename or "").lower()
    if not any(fname.endswith(x) for x in (".csv",".xlsx",".xls")):
        raise HTTPException(400, "Only CSV and Excel files are supported.")

    content = await file.read()
    if len(content) > 15*1024*1024:
        raise HTTPException(413, "File too large (max 15 MB).")

    # ── Parse file ────────────────────────────────────────────────────────────
    try:
        if fname.endswith(".csv"):
            for enc in ("utf-8","latin-1","cp1252"):
                try: df = pd.read_csv(io.BytesIO(content), encoding=enc, header=None); break
                except: continue
        else:
            xl  = pd.ExcelFile(io.BytesIO(content))
            dfs = {}
            for s in xl.sheet_names:
                try:
                    tmp = xl.parse(s, header=None)
                    if not tmp.empty: dfs[s] = tmp
                except: pass
            if not dfs: raise HTTPException(400, "No readable sheets found.")
            df = max(dfs.values(), key=len)
    except HTTPException: raise
    except Exception as e: raise HTTPException(400, f"Cannot parse file: {e}")

    df = df.fillna('').reset_index(drop=True)

    # ── Try NCRB parser first ─────────────────────────────────────────────────
    ncrb = parse_ncrb(df)

    if ncrb['is_ncrb']:
        # ── NCRB path ─────────────────────────────────────────────────────────
        rows      = ncrb['rows']
        years     = ncrb['year_cols']
        crime     = ncrb['crime_type']
        latest_yr = years[-1] if years else None

        # Find Karnataka
        ka_row = next((r for r in rows
                       if 'karnataka' in r.get('state_ut','').lower()), None)

        # National total row
        all_india = next((r for r in rows if 'india' in r.get('state_ut','').lower()), None)

        # Build year trend using all states summed (or total row)
        year_trend = []
        if all_india:
            for yr in years:
                v = all_india.get(f'cases_{yr}')
                if v is not None: year_trend.append({'year': int(yr), 'cases': v})
        else:
            for yr in years:
                total = sum(r.get(f'cases_{yr}', 0) for r in rows
                            if 'total' not in r.get('state_ut','').lower())
                if total > 0: year_trend.append({'year': int(yr), 'cases': total})

        # State breakdown sorted by latest year
        state_breakdown = sorted(
            [{'state_ut':   r['state_ut'],
              'crime_type': crime,
              'is_karnataka': 'karnataka' in r.get('state_ut','').lower(),
              **{f'cases_{yr}': r.get(f'cases_{yr}', 0) for yr in years},
              **{k: v for k, v in r.items()
                 if k not in ['state_ut','crime_type'] + [f'cases_{yr}' for yr in years]},
             } for r in rows],
            key=lambda x: x.get(f'cases_{latest_yr}', 0), reverse=True
        ) if latest_yr else []

        # Claude AI analysis
        prompt     = build_claude_prompt(ncrb, True, file.filename)
        ai_insight = call_claude(prompt)

        # Karnataka-specific insight from Claude
        ka_ai = ai_insight.get('karnataka_analysis', {})
        if ka_row and ka_ai:
            for r in state_breakdown:
                if 'karnataka' in r.get('state_ut','').lower():
                    r['ai_risk_score'] = ka_ai.get('risk_score', 50)
                    r['ai_risk_level'] = ka_ai.get('risk_level', 'Moderate')
                    r['ai_trend']      = ka_ai.get('trend', 'Stable')
                    r['ai_insight']    = ka_ai.get('key_insight', '')

        summary = {
            'total_rows':       len(rows),
            'total_states':     len(rows),
            'years_covered':    [int(y) for y in years],
            'crime_type':       crime,
            'dataset_title':    ncrb['title'],
            'severity':         ai_insight.get('severity', 'Moderate'),
            'karnataka_rank':   ka_ai.get('national_rank', '—'),
            'karnataka_trend':  ka_ai.get('trend', '—'),
        }
        if ka_row and latest_yr:
            summary['karnataka_latest_cases'] = ka_row.get(f'cases_{latest_yr}', 0)

        return {
            'status':           'success',
            'file_type':        'ncrb_report',
            'file_info': {
                'filename':      file.filename,
                'rows_processed':len(rows),
                'years_detected':years,
                'crime_detected':crime,
            },
            'summary':          summary,
            'ai_insight':       {
                'overall_assessment': ai_insight.get('overall_assessment',''),
                'severity':           ai_insight.get('severity','Moderate'),
                'key_findings':       ai_insight.get('key_findings',[]),
                'high_risk_states':   ai_insight.get('high_risk_states',[]),
                'karnataka_analysis': ka_ai,
                'trend_insight':      ai_insight.get('trend_insight',''),
                'anomalies':          ai_insight.get('anomalies',[]),
                'recommendations':    ai_insight.get('recommendations',[]),
                'prediction':         ai_insight.get('prediction',''),
                'error':              ai_insight.get('error'),
            },
            'state_breakdown':  state_breakdown,
            'year_trend':       year_trend,
            'karnataka':        ka_row,
        }

    else:
        # ── Generic fuzzy-column path ─────────────────────────────────────────
        # Try parsing with proper header
        try:
            df2 = (pd.read_csv(io.BytesIO(content))
                   if fname.endswith('.csv')
                   else pd.ExcelFile(io.BytesIO(content)).parse(0))
            df2.columns = [str(c).strip() for c in df2.columns]
        except:
            raise HTTPException(400,
                "Could not parse this file. Please ensure it has column headers.")

        df2 = df2.dropna(how='all').reset_index(drop=True)
        col_map = detect_columns(df2)

        # Fallback
        if 'district' not in col_map and 'crime_type' not in col_map:
            tc = df2.select_dtypes(include='object').columns.tolist()
            nc = df2.select_dtypes(include='number').columns.tolist()
            if tc: col_map['district']   = tc[0]
            if len(tc) > 1: col_map['crime_type'] = tc[1]
            if nc and 'cases_reported' not in col_map: col_map['cases_reported'] = nc[0]

        MAX = 5000
        truncated = len(df2) > MAX
        work      = df2.head(MAX)

        district_agg, crime_counts, year_counts, records = {}, {}, {}, []

        for idx, row in work.iterrows():
            r          = row.to_dict()
            district   = normalise_district(str(r.get(col_map.get('district',''), '')))
            crime_type = str(r.get(col_map.get('crime_type',''), 'Unknown')).strip().title()
            year       = safe_year(r.get(col_map.get('year',''), None))
            cases      = max(safe_int(r.get(col_map.get('cases_reported',''), 1)), 1)

            d = district or 'Unknown'
            if d not in district_agg:
                district_agg[d] = {'total_incidents':0,'total_cases':0,
                                   'crime_types':set(),'years':set()}
            district_agg[d]['total_incidents'] += 1
            district_agg[d]['total_cases']     += cases
            district_agg[d]['crime_types'].add(crime_type)
            if year: district_agg[d]['years'].add(year)

            crime_counts[crime_type[:50]] = crime_counts.get(crime_type[:50], 0) + cases
            if year: year_counts[year]    = year_counts.get(year, 0) + cases

            records.append({'row':idx+2,'district':district,'crime_type':crime_type,
                            'year':year,'cases':cases})

        parsed_generic = {
            'district_agg': district_agg,
            'crime_counts':  crime_counts,
            'year_counts':   year_counts,
            'total_rows':    len(records),
        }

        prompt     = build_claude_prompt(parsed_generic, False, file.filename)
        ai_insight = call_claude(prompt)

        # Merge AI risk scores
        ai_dist_map = {d['district']: d
                       for d in (ai_insight.get('district_risk') or [])
                       if isinstance(d, dict) and d.get('district')}

        district_summaries = []
        for d, agg in district_agg.items():
            ai  = ai_dist_map.get(d, {})
            db_row = db.execute(text(
                "SELECT division, poverty_index, unemployment_rate, latitude, longitude "
                "FROM districts WHERE LOWER(district)=LOWER(:d) LIMIT 1"
            ), {'d': d}).fetchone()
            db_ctx = dict(db_row._mapping) if db_row else {}
            district_summaries.append({
                'district':        d,
                'total_incidents': agg['total_incidents'],
                'total_cases':     agg['total_cases'],
                'risk_score':      ai.get('risk_score', 40),
                'risk_level':      ai.get('risk_level', 'Moderate'),
                'primary_crime':   ai.get('primary_crime',''),
                'reason':          ai.get('reason',''),
                'crime_types':     sorted(list(agg['crime_types']))[:8],
                'years':           sorted(list(agg['years'])),
                **db_ctx,
            })

        district_summaries.sort(key=lambda x: x['risk_score'], reverse=True)
        top_crimes = [{'crime_type':ct,'cases':n,
                       **next((c for c in (ai_insight.get('crime_analysis') or [])
                               if isinstance(c,dict) and c.get('crime_type')==ct), {})}
                      for ct,n in sorted(crime_counts.items(),
                                         key=lambda x:x[1],reverse=True)[:12]]
        year_trend = [{'year':y,'cases':c}
                      for y,c in sorted(year_counts.items()) if 2000<=y<=2030]

        return {
            'status':    'success',
            'file_type': 'generic',
            'file_info': {
                'filename':       file.filename,
                'rows_processed': len(records),
                'columns_mapped': col_map,
                'truncated':      truncated,
            },
            'summary': {
                'total_rows':      len(records),
                'total_districts': len(district_summaries),
                'total_cases':     sum(d['total_cases'] for d in district_summaries),
                'years_covered':   sorted(list(year_counts.keys())),
                'severity':        ai_insight.get('severity','Moderate'),
            },
            'ai_insight': {
                'overall_assessment': ai_insight.get('overall_assessment',''),
                'severity':           ai_insight.get('severity','Moderate'),
                'key_findings':       ai_insight.get('key_findings',[]),
                'hotspots':           ai_insight.get('hotspots',[]),
                'anomalies':          ai_insight.get('anomalies',[]),
                'trend_insight':      ai_insight.get('trend_insight',''),
                'recommendations':    ai_insight.get('recommendations',[]),
                'prediction':         ai_insight.get('prediction',''),
                'error':              ai_insight.get('error'),
            },
            'district_breakdown': district_summaries,
            'top_crime_types':    top_crimes,
            'year_trend':         year_trend,
            'records':            records[:300],
        }


# ── POST /api/upload/manual ───────────────────────────────────────────────────
@upload_router.post("/manual")
async def manual_entry(payload: dict, db: Session = Depends(get_db)):
    missing = [f for f in ['district','crime_type','year'] if not payload.get(f)]
    if missing: raise HTTPException(400, f"Missing fields: {missing}")

    prompt = f"""Karnataka Police crime analyst. Single incident logged:
District: {payload.get('district')}
Crime Type: {payload.get('crime_type')}
Year: {payload.get('year')}
Cases: {payload.get('cases_reported',1)}
Time: {payload.get('time_of_day','unknown')}

Respond ONLY with JSON:
{{"risk_score":0-100,"risk_level":"Critical|High|Moderate|Low",
  "recommended_action":"specific Karnataka Police action",
  "context":"brief context about this crime in this district",
  "escalate":true|false}}"""

    ai = call_claude(prompt)
    db_row = db.execute(text(
        "SELECT division,poverty_index,unemployment_rate FROM districts "
        "WHERE LOWER(district)=LOWER(:d) LIMIT 1"
    ), {'d': payload['district']}).fetchone()

    return {
        'status':             'success',
        'risk_score':         ai.get('risk_score', 40),
        'risk_level':         ai.get('risk_level', 'Moderate'),
        'recommended_action': ai.get('recommended_action','Standard recording.'),
        'context':            ai.get('context',''),
        'escalate':           ai.get('escalate', False),
        'district_context':   dict(db_row._mapping) if db_row else {},
    }


@upload_router.get("/template")
def get_template():
    return {
        "note": "Any NCRB report or crime CSV/Excel accepted. Columns auto-detected.",
        "ncrb_formats": "Standard NCRB TABLE format files are fully supported.",
    }