import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, RiskBadge } from '../components/UI'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DIV_COLORS = {
  Bengaluru: '#2EC4B6',
  Mysuru:    '#F4A261',
  Belgaum:   '#E63946',
  Gulbarga:  '#F9C74F',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8, padding: '12px 14px', minWidth: 180 }}>
      <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>{d.district}</div>
      <div style={{ fontSize: 12, color: 'var(--slate-4)', marginBottom: 8 }}>{d.division} Division</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
        <div><span style={{ color: 'var(--slate-4)' }}>Poverty: </span><span style={{ color: '#fff', fontFamily: 'DM Mono,monospace' }}>{d.poverty_index}%</span></div>
        <div><span style={{ color: 'var(--slate-4)' }}>Literacy: </span><span style={{ color: '#fff', fontFamily: 'DM Mono,monospace' }}>{d.literacy_rate}%</span></div>
        <div><span style={{ color: 'var(--slate-4)' }}>Risk: </span><span style={{ fontFamily: 'DM Mono,monospace', color: DIV_COLORS[d.division] }}>{d.risk_score}</span></div>
        <div><span style={{ color: 'var(--slate-4)' }}>Unemploy: </span><span style={{ color: '#fff', fontFamily: 'DM Mono,monospace' }}>{d.unemployment_rate}%</span></div>
      </div>
    </div>
  )
}

export default function SocioPage() {
  const { data: socio,  loading: l1 } = useApi(api.socioEcon)
  const { data: divSummary, loading: l2 } = useApi(api.divisionSummary)

  const scatterData = socio?.data_points?.map(d => ({
    ...d,
    x: d.poverty_index,
    y: d.risk_score,
  })) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Division summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {l2 ? <Spinner /> : divSummary?.divisions?.map(d => (
          <Card key={d.division} style={{ borderColor: `${DIV_COLORS[d.division]}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ color: DIV_COLORS[d.division], fontWeight: 700, fontSize: 14 }}>{d.division}</div>
              <div style={{ fontSize: 11, color: 'var(--slate-4)' }}>{d.district_count} districts</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Poverty',      value: `${d.avg_poverty}%`,      alert: d.avg_poverty > 30 },
                { label: 'Literacy',     value: `${d.avg_literacy}%`,     alert: d.avg_literacy < 65 },
                { label: 'Urban pop.',   value: `${d.avg_urban_pct}%`,    alert: false },
                { label: 'Unemployment', value: `${d.avg_unemployment}%`, alert: d.avg_unemployment > 7 },
              ].map(m => (
                <div key={m.label}>
                  <div className="label">{m.label}</div>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 15, color: m.alert ? '#F4A261' : '#fff', fontWeight: 500 }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--ink-4)', fontSize: 12, color: 'var(--slate-4)' }}>
              Pop: {d.total_population?.toLocaleString('en-IN')}
            </div>
          </Card>
        ))}
      </div>

      {/* Scatter: Poverty vs Risk score */}
      <Card>
        <SectionHead icon="⬕" title="Poverty index vs risk score — by district" />
        <div style={{ marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(DIV_COLORS).map(([div, col]) => (
            <div key={div} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col }} />
              <span style={{ fontSize: 12, color: 'var(--slate-4)' }}>{div}</span>
            </div>
          ))}
        </div>
        {l1 ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" />
              <XAxis dataKey="x" name="Poverty index" type="number" domain={[0, 60]}
                tick={{ fill: 'var(--slate-4)', fontSize: 11 }}
                label={{ value: 'Poverty index (%)', fill: 'var(--slate-4)', fontSize: 11, position: 'insideBottom', offset: -12 }} />
              <YAxis dataKey="y" name="Risk score" type="number" domain={[0, 60]}
                tick={{ fill: 'var(--slate-4)', fontSize: 11 }}
                label={{ value: 'Risk score', fill: 'var(--slate-4)', fontSize: 11, angle: -90, position: 'insideLeft', offset: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--ink-4)' }} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={DIV_COLORS[d.division] ?? '#6B7A99'} opacity={0.85} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: 12, color: 'var(--slate-4)', marginTop: 8, textAlign: 'center' }}>
          Each dot = one Karnataka district. Higher poverty → higher composite risk score.
        </div>
      </Card>

      {/* District table sorted by risk */}
      <Card>
        <SectionHead icon="⬕" title="All districts — socio-economic profile" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
                {['District', 'Division', 'Risk', 'Poverty %', 'Literacy %', 'Urban %', 'Unemployment %'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(socio?.data_points ?? []).map((d, i) => (
                <tr key={d.district} style={{ borderBottom: '1px solid var(--ink-4)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '9px 10px', color: '#fff', fontWeight: 500 }}>{d.district}</td>
                  <td style={{ padding: '9px 10px', color: DIV_COLORS[d.division] ?? 'var(--slate-4)', fontSize: 12 }}>{d.division}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, color: '#fff' }}>{d.risk_score}</span>
                      <RiskBadge level={d.risk_level} />
                    </div>
                  </td>
                  <td style={{ padding: '9px 10px', fontFamily: 'DM Mono,monospace', color: d.poverty_index > 35 ? '#F4A261' : 'var(--slate-2)' }}>{d.poverty_index}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'DM Mono,monospace', color: d.literacy_rate < 65 ? '#F4A261' : 'var(--slate-2)' }}>{d.literacy_rate}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-2)' }}>{d.urban_population_pct}</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'DM Mono,monospace', color: d.unemployment_rate > 7 ? '#E63946' : 'var(--slate-2)' }}>{d.unemployment_rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
