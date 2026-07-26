import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, StatCard, Badge, Spinner, SectionHead, ErrorMsg } from '../components/UI'
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: 'var(--slate-4)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500 }}>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const { data: ov,  loading: l1, error: e1 } = useApi(api.overview)
  const { data: trends, loading: l2 }          = useApi(api.trends)
  const { data: gender, loading: l3 }          = useApi(api.genderSplit)
  const { data: rape,   loading: l4 }          = useApi(api.rapeAgeBreakdown)

  if (l1) return <Spinner />
  if (e1) return <ErrorMsg msg={e1} />

  const trendData = trends?.map(t => ({ year: String(t.year), crimes: t.total_crimes })) ?? []

  const genderData = gender ? [
    { name: 'Male',        value: gender.male,        pct: gender.male_pct,  fill: '#2EC4B6' },
    { name: 'Female',      value: gender.female,      pct: gender.female_pct,fill: '#E63946' },
    { name: 'Transgender', value: gender.transgender, pct: gender.trans_pct, fill: '#F4A261' },
  ] : []

  const rapeData = rape?.age_breakdown?.map(b => ({
    name: b.age_band, value: b.count, pct: b.pct,
    fill: b.category === 'Child' ? '#E63946' : '#F4A261'
  })) ?? []

  const yoyColor = ov.yoy_change_pct > 0 ? '#E63946' : '#52B788'
  const yoySign  = ov.yoy_change_pct > 0 ? '↑' : '↓'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero banner */}
      <Card style={{ background: 'linear-gradient(135deg, var(--ink-2) 0%, rgba(46,196,182,0.06) 100%)', border: '1px solid rgba(46,196,182,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="label" style={{ color: 'var(--teal)', marginBottom: 6 }}>Karnataka State • 2024</div>
            <div className="stat-val-lg">{fmt(ov.total_crimes_2024)}</div>
            <div style={{ color: 'var(--slate-4)', marginTop: 4, fontSize: 14 }}>
              Total IPC/BNS registered crimes
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div className="label">vs 2023</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: yoyColor, fontWeight: 500 }}>
                {yoySign} {Math.abs(ov.yoy_change_pct)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label">National rank</div>
              <Badge label={ov.karnataka_vs_national + ' avg'} type={ov.karnataka_vs_national === 'Below' ? 'green' : 'amber'} />
            </div>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard
          label="Crime rate / lakh"
          value={ov.crime_rate_2024}
          sub="2024 — national avg 211.0"
          badge={<Badge label={ov.crime_rate_category} type={ov.crime_rate_category === 'High' ? 'amber' : 'green'} />}
          color="var(--amber)"
        />
        <StatCard
          label="Chargesheeting rate"
          value={`${ov.chargesheeting_rate_2024}%`}
          sub="Cases with charge sheets filed"
          color="var(--teal)"
        />
        <StatCard
          label="Murder victims"
          value={fmt(ov.murder_victims_2024)}
          sub="All ages • 2024"
          color="var(--signal)"
        />
        <StatCard
          label="Rape cases"
          value={fmt(ov.rape_cases_2024)}
          sub="Registered cases • 2024"
          color="#F4A261"
        />
        <StatCard
          label="Districts monitored"
          value={ov.districts_count}
          sub="Karnataka coverage"
          color="var(--teal)"
        />
      </div>

      {/* Trend chart + Gender + Rape age */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Crime trend */}
        <Card>
          <SectionHead icon="◈" title="Crime trend 2022 – 2024" />
          {l2 ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" />
                <XAxis dataKey="year" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--slate-4)', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="crimes" stroke="var(--teal)" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: 'var(--teal)', r: 5, strokeWidth: 0 }} />
                <ReferenceLine y={148648} stroke="var(--signal)" strokeDasharray="4 4" label={{ value: 'Peak 2023', fill: 'var(--signal)', fontSize: 10, position: 'right' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ink-4)' }}>
            {trendData.map(t => (
              <div key={t.year} style={{ flex: 1, textAlign: 'center' }}>
                <div className="label">{t.year}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#fff', marginTop: 2 }}>
                  {fmt(t.crimes)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gender split */}
        <Card>
          <SectionHead icon="◇" title="Murder victims — gender split" />
          {l3 ? <Spinner /> : (
            <div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={genderData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {genderData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {genderData.map(g => (
                  <div key={g.name} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: g.fill, fontWeight: 500 }}>{g.pct}%</div>
                    <div className="label" style={{ marginTop: 2 }}>{g.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Rape victims age breakdown */}
      <Card>
        <SectionHead icon="◉" title="Rape victims — age band distribution (Karnataka 2024)" />
        {l4 ? <Spinner /> : (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '8px 14px', background: 'rgba(230,57,70,0.1)', borderRadius: 8, border: '1px solid rgba(230,57,70,0.2)' }}>
                <div className="label" style={{ color: 'var(--signal)' }}>Child victims</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, color: 'var(--signal)', fontWeight: 500 }}>
                  {rape?.total_child_victims ?? 0}
                  <span style={{ fontSize: 12, fontFamily: 'DM Sans,sans-serif', color: 'var(--slate-4)', marginLeft: 6 }}>
                    ({rape?.child_victim_pct}%)
                  </span>
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: 'rgba(244,162,97,0.1)', borderRadius: 8, border: '1px solid rgba(244,162,97,0.2)' }}>
                <div className="label" style={{ color: 'var(--amber)' }}>Adult victims</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, color: 'var(--amber)', fontWeight: 500 }}>
                  {rape?.total_adult_victims ?? 0}
                  <span style={{ fontSize: 12, fontFamily: 'DM Sans,sans-serif', color: 'var(--slate-4)', marginLeft: 6 }}>
                    ({rape?.adult_victim_pct}%)
                  </span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rapeData} margin={{ top: 0, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {rapeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

    </div>
  )
}
