import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, Badge } from '../components/UI'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, Legend
} from 'recharts'

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—'

const FORECAST_COLORS = { actual: '#2EC4B6', predicted: '#F4A261', band: '#F4A261' }
const PRESSURE_COLORS = { Increasing: '#E63946', 'Stable-High': '#F4A261', 'Stable-Low': '#52B788' }
const ANOMALY_COLOR   = '#E63946'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8, padding: '10px 14px', minWidth: 180 }}>
      <div style={{ color: 'var(--slate-4)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color ?? '#fff', fontFamily: 'DM Mono,monospace', fontSize: 13, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

// Add ML endpoints to api utility inline
const mlApi = {
  summary:         () => fetch('/api/ml/intelligence-summary').then(r => r.json()),
  forecast:        () => fetch('/api/ml/forecast/timeline').then(r => r.json()),
  anomalies:       () => fetch('/api/ml/anomalies').then(r => r.json()),
  distForecasts:   () => fetch('/api/ml/forecast/districts').then(r => r.json()),
  clusters:        () => fetch('/api/ml/clusters/spatial').then(r => r.json()),
  natContext:      () => fetch('/api/ml/forecast/national-context').then(r => r.json()),
}

export default function MLPage() {
  const { data: summary,  loading: l1 } = useApi(mlApi.summary)
  const { data: forecast, loading: l2 } = useApi(mlApi.forecast)
  const { data: anomData, loading: l3 } = useApi(mlApi.anomalies)
  const { data: distFc,   loading: l4 } = useApi(mlApi.distForecasts)
  const { data: natCtx,   loading: l5 } = useApi(mlApi.natContext)

  // Build forecast chart data
  const forecastChart = forecast?.timeline?.map(t => ({
    year:      String(t.year),
    actual:    t.actual ?? null,
    predicted: t.predicted,
    lower:     t.lower_95,
    upper:     t.upper_95,
    isForecast: t.is_forecast,
  })) ?? []

  // Anomaly bar chart
  const anomChart = (anomData?.districts ?? [])
    .filter(d => d.is_anomaly)
    .sort((a, b) => b.anomaly_severity - a.anomaly_severity)
    .map(d => ({ name: d.district, severity: d.anomaly_severity, fill: ANOMALY_COLOR }))

  // District forecast breakdown
  const distChart = distFc
    ? [
        { name: 'Increasing',  value: distFc.increasing_count,  fill: '#E63946' },
        { name: 'Stable-High', value: distFc.stable_high_count, fill: '#F4A261' },
        { name: 'Stable-Low',  value: distFc.stable_low_count,  fill: '#52B788' },
      ]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ML model badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['DBSCAN Spatial Clustering', 'Isolation Forest', 'Linear Regression Forecast'].map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, border: '1px solid rgba(46,196,182,0.3)', background: 'rgba(46,196,182,0.06)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
            <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>{m}</span>
          </div>
        ))}
      </div>

      {/* Top KPI strip */}
      {!l1 && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Card style={{ borderColor: 'rgba(230,57,70,0.3)' }}>
            <div className="label" style={{ color: 'var(--signal)' }}>Anomalous districts</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 36, color: 'var(--signal)', fontWeight: 500, lineHeight: 1.1 }}>
              {summary.anomaly_detection.anomalous_districts}
              <span style={{ fontSize: 14, color: 'var(--slate-4)', fontFamily: 'DM Sans,sans-serif', marginLeft: 6 }}>/ 31</span>
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>Flagged by Isolation Forest</div>
          </Card>
          <Card style={{ borderColor: 'rgba(244,162,97,0.3)' }}>
            <div className="label" style={{ color: 'var(--amber)' }}>2025 forecast</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 28, color: 'var(--amber)', fontWeight: 500, lineHeight: 1.1 }}>
              {fmt(summary.crime_forecast.forecast_2025?.predicted)}
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>
              CI: {fmt(summary.crime_forecast.forecast_2025?.lower_95)} – {fmt(summary.crime_forecast.forecast_2025?.upper_95)}
            </div>
          </Card>
          <Card style={{ borderColor: 'rgba(244,162,97,0.2)' }}>
            <div className="label" style={{ color: 'var(--amber)' }}>2026 forecast</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 28, color: '#F9C74F', fontWeight: 500, lineHeight: 1.1 }}>
              {fmt(summary.crime_forecast.forecast_2026?.predicted)}
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>
              CI: {fmt(summary.crime_forecast.forecast_2026?.lower_95)} – {fmt(summary.crime_forecast.forecast_2026?.upper_95)}
            </div>
          </Card>
          <Card style={{ borderColor: 'rgba(230,57,70,0.2)' }}>
            <div className="label" style={{ color: 'var(--signal)' }}>High-pressure districts</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 36, color: 'var(--signal)', fontWeight: 500, lineHeight: 1.1 }}>
              {summary.high_pressure_districts.length}
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>Risk forecast: Increasing</div>
          </Card>
        </div>
      )}

      {/* Crime forecast chart */}
      <Card>
        <SectionHead icon="◈" title="Crime forecast 2022–2026 with 95% confidence band" />
        {l2 ? <Spinner /> : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={forecastChart} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F4A261" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F4A261" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--slate-4)', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x="2024" stroke="var(--ink-4)" strokeDasharray="6 3" label={{ value: 'Forecast →', fill: 'var(--slate-4)', fontSize: 10, position: 'top' }} />
                {/* Confidence band */}
                <Area type="monotone" dataKey="upper" stroke="none" fill="#F4A261" fillOpacity={0.1} name="Upper 95%" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="var(--ink-2)" fillOpacity={1} name="Lower 95%" />
                {/* Actual line */}
                <Area type="monotone" dataKey="actual"    stroke="var(--teal)" strokeWidth={2.5} fill="url(#actualGrad)"   dot={{ fill: 'var(--teal)', r: 5, strokeWidth: 0 }} name="Actual" />
                {/* Forecast line */}
                <Area type="monotone" dataKey="predicted" stroke="#F4A261"      strokeWidth={2} strokeDasharray="6 3" fill="url(#forecastGrad)" dot={{ fill: '#F4A261', r: 4, strokeWidth: 0 }} name="Predicted" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ink-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: 'var(--teal)' }} />
                <span style={{ fontSize: 11, color: 'var(--slate-4)' }}>Actual (2022–2024)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: '#F4A261', borderTop: '2px dashed #F4A261' }} />
                <span style={{ fontSize: 11, color: 'var(--slate-4)' }}>Forecast (2025–2026)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 10, background: 'rgba(244,162,97,0.15)', borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: 'var(--slate-4)' }}>95% confidence band</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Anomaly + District forecast */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Anomaly severity chart */}
        <Card>
          <SectionHead icon="◉" title="Anomaly severity — flagged districts" />
          {l3 ? <Spinner /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={anomChart} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="severity" name="Anomaly severity" radius={[0, 5, 5, 0]}>
                    {anomChart.map((e, i) => <Cell key={i} fill={e.fill} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--slate-4)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(230,57,70,0.05)', borderRadius: 6, border: '1px solid rgba(230,57,70,0.15)' }}>
                <span style={{ color: 'var(--signal)', fontWeight: 600 }}>Isolation Forest</span> detects districts whose socio-economic profile deviates significantly from the Karnataka norm. Higher severity = more unusual.
              </div>
            </>
          )}
        </Card>

        {/* District forecast breakdown */}
        <Card>
          <SectionHead icon="⬡" title="District risk trajectory forecast" />
          {l4 ? <Spinner /> : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {distChart.map(d => (
                  <div key={d.name} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: `${d.fill}11`, borderRadius: 8, border: `1px solid ${d.fill}33` }}>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 28, color: d.fill, fontWeight: 500 }}>{d.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--slate-4)', marginTop: 3 }}>{d.name}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(distFc?.districts ?? []).filter(d => d.risk_forecast === 'Increasing').map(d => (
                  <div key={d.district} style={{ padding: '8px 10px', background: 'rgba(230,57,70,0.06)', borderRadius: 6, border: '1px solid rgba(230,57,70,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{d.district}</span>
                      <span style={{ fontSize: 11, color: 'var(--signal)', fontFamily: 'DM Mono,monospace' }}>pressure={d.pressure_score}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate-4)', marginTop: 2 }}>{d.division} · {d.forecast_reasons}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* National context */}
      {!l5 && natCtx && (
        <Card>
          <SectionHead icon="⊞" title="Karnataka trend context vs national average" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Karnataka 2-yr change', value: `${natCtx.karnataka_change_22_24 > 0 ? '+' : ''}${natCtx.karnataka_change_22_24}%`, color: natCtx.karnataka_change_22_24 > 0 ? 'var(--signal)' : '#52B788' },
              { label: 'National avg 2-yr change', value: `${natCtx.national_avg_change_22_24 > 0 ? '+' : ''}${natCtx.national_avg_change_22_24}%`, color: 'var(--slate-2)' },
              { label: 'Karnataka converging', value: natCtx.karnataka_converging ? 'Yes ✓' : 'No ✗', color: natCtx.karnataka_converging ? '#52B788' : 'var(--signal)' },
              { label: 'Crime rate / lakh', value: natCtx.karnataka_crime_rate_2024, color: 'var(--amber)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '14px', background: 'var(--ink-3)', borderRadius: 8 }}>
                <div className="label">{m.label}</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 22, color: m.color, fontWeight: 500, marginTop: 6 }}>{m.value}</div>
              </div>
            ))}
          </div>
          {natCtx.similar_rate_states?.length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--ink-3)', borderRadius: 8 }}>
              <div className="label" style={{ marginBottom: 6 }}>States with similar crime rates</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {natCtx.similar_rate_states.map(s => (
                  <span key={s} className="badge badge-slate">{s}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Full anomaly table */}
      <Card>
        <SectionHead icon="◈" title="All districts — anomaly intelligence report" />
        {l3 ? <Spinner /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
                {['District', 'Division', 'Status', 'Severity', 'Key deviation'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(anomData?.districts ?? []).map((d, i) => (
                <tr key={d.district} style={{
                  borderBottom: '1px solid var(--ink-4)',
                  background: d.is_anomaly ? 'rgba(230,57,70,0.04)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <td style={{ padding: '9px 10px', color: d.is_anomaly ? '#fff' : 'var(--slate-2)', fontWeight: d.is_anomaly ? 600 : 400 }}>{d.district}</td>
                  <td style={{ padding: '9px 10px', color: 'var(--slate-4)', fontSize: 12 }}>{d.division}</td>
                  <td style={{ padding: '9px 10px' }}>
                    {d.is_anomaly
                      ? <span className="badge badge-red">⚠ Anomaly</span>
                      : <span className="badge badge-green">✓ Normal</span>}
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    {d.is_anomaly ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: 'var(--ink-4)', borderRadius: 3 }}>
                          <div style={{ width: `${d.anomaly_severity}%`, height: '100%', borderRadius: 3, background: 'var(--signal)' }} />
                        </div>
                        <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: 'var(--signal)' }}>{d.anomaly_severity}</span>
                      </div>
                    ) : <span style={{ color: 'var(--slate-4)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 10px', color: 'var(--slate-4)', fontSize: 12, maxWidth: 280 }}>
                    {d.anomaly_reason || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

    </div>
  )
}