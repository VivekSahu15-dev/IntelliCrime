import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, RiskBadge } from '../components/UI'

const RISK_COLORS = { Critical: '#E63946', High: '#F4A261', Moderate: '#F9C74F', Low: '#52B788' }

export default function NetworkPage() {
  const { data: risks, loading } = useApi(api.riskScores)
  const { data: ov }             = useApi(api.overview)

  if (loading) return <Spinner />

  const byLevel = {
    Critical: risks?.filter(r => r.risk_level === 'Critical') ?? [],
    High:     risks?.filter(r => r.risk_level === 'High') ?? [],
    Moderate: risks?.filter(r => r.risk_level === 'Moderate') ?? [],
    Low:      risks?.filter(r => r.risk_level === 'Low') ?? [],
  }

  // Top 5 risk districts
  const top5 = risks?.slice(0, 5) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Alert banner for high risk zones */}
      {byLevel.High.length > 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 10,
          background: 'rgba(244,162,97,0.08)',
          border: '1px solid rgba(244,162,97,0.3)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#F4A261',
            boxShadow: '0 0 0 4px rgba(244,162,97,0.2)',
            animation: 'pulse-ring 1.8s ease infinite',
          }} />
          <div>
            <span style={{ color: '#F4A261', fontWeight: 600 }}>
              {byLevel.High.length} HIGH-RISK districts detected
            </span>
            <span style={{ color: 'var(--slate-4)', fontSize: 13, marginLeft: 8 }}>
              — {byLevel.High.map(d => d.district).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Risk level grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Object.entries(byLevel).map(([level, districts]) => (
          <Card key={level} style={{ borderColor: `${RISK_COLORS[level]}33` }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[level] }} />
                <span style={{ color: RISK_COLORS[level], fontWeight: 700, fontSize: 13 }}>{level}</span>
              </div>
            </div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 32, color: '#fff', fontWeight: 500, lineHeight: 1 }}>
              {districts.length}
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>
              {districts.length === 1 ? 'district' : 'districts'}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {districts.slice(0, 4).map(d => (
                <div key={d.district} style={{ fontSize: 11, color: 'var(--slate-4)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d.district}</span>
                  <span style={{ fontFamily: 'DM Mono,monospace', color: RISK_COLORS[level] }}>{d.risk_score}</span>
                </div>
              ))}
              {districts.length > 4 && (
                <div style={{ fontSize: 11, color: 'var(--slate-4)', marginTop: 2 }}>+{districts.length - 4} more</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Visual risk bar — all 31 districts */}
      <Card>
        <SectionHead icon="◉" title="Risk score spectrum — all 31 Karnataka districts" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {risks?.map(d => (
            <div key={d.district} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 140, fontSize: 12, color: '#fff', flexShrink: 0, textAlign: 'right' }}>{d.district}</div>
              <div style={{ flex: 1, height: 16, background: 'var(--ink-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${(d.risk_score / 60) * 100}%`,
                  height: '100%', borderRadius: 4,
                  background: RISK_COLORS[d.risk_level],
                  opacity: 0.85,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ width: 36, fontFamily: 'DM Mono,monospace', fontSize: 12, color: RISK_COLORS[d.risk_level], flexShrink: 0 }}>
                {d.risk_score}
              </div>
              <div style={{ width: 70, flexShrink: 0 }}>
                <RiskBadge level={d.risk_level} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 5 risk intelligence cards */}
      <div>
        <SectionHead icon="⬡" title="Top 5 risk intelligence profiles" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {top5.map((d, i) => (
            <Card key={d.district} style={{
              borderColor: `${RISK_COLORS[d.risk_level]}40`,
              background: 'var(--ink-2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--slate-4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                    #{i + 1} Highest risk
                  </div>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{d.district}</div>
                  <div style={{ color: 'var(--slate-4)', fontSize: 12 }}>{d.division} Division</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 28, color: RISK_COLORS[d.risk_level], fontWeight: 500, lineHeight: 1 }}>{d.risk_score}</div>
                  <RiskBadge level={d.risk_level} />
                </div>
              </div>
              {/* Mini stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Poverty',      value: `${d.poverty_index}%`,     alert: d.poverty_index > 35 },
                  { label: 'Literacy',     value: `${d.literacy_rate}%`,     alert: d.literacy_rate < 65 },
                  { label: 'Unemploy',     value: `${d.unemployment_rate}%`, alert: d.unemployment_rate > 7 },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--ink-3)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                    <div className="label">{m.label}</div>
                    <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, color: m.alert ? '#F4A261' : '#fff', fontWeight: 500 }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {/* Intelligence note */}
              <div style={{ marginTop: 10, padding: '8px 10px', background: `${RISK_COLORS[d.risk_level]}0D`, borderRadius: 6, border: `1px solid ${RISK_COLORS[d.risk_level]}22`, fontSize: 12, color: 'var(--slate-4)', lineHeight: 1.5 }}>
                {d.risk_level === 'High' || d.risk_level === 'Critical'
                  ? `⚠ High poverty (${d.poverty_index}%) and low literacy (${d.literacy_rate}%) create elevated vulnerability. Priority district for resource deployment.`
                  : `District shows moderate socio-economic stress. Literacy at ${d.literacy_rate}% indicates room for prevention-focused investment.`
                }
              </div>
            </Card>
          ))}
        </div>
      </div>

    </div>
  )
}
