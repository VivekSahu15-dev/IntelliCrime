import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, Badge } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar
} from 'recharts'

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: 'var(--slate-4)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? '#fff', fontFamily: 'DM Mono,monospace', fontSize: 14 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function VictimsPage() {
  const { data: murder,  loading: l1 } = useApi(api.murderVictims)
  const { data: gender,  loading: l2 } = useApi(api.genderSplit)
  const { data: rape,    loading: l3 } = useApi(api.rapeAgeBreakdown)

  // Age group chart — exclude summary rows
  const ageGroups = murder
    ? murder.filter(r => !['Total Child', 'Total Adult', 'Total Victims'].includes(r.age_group))
        .map(r => ({ name: r.age_group, male: r.male ?? 0, female: r.female ?? 0, total: r.total ?? 0 }))
    : []

  // Summary rows only
  const summaryRows = murder
    ? murder.filter(r => ['Total Child', 'Total Adult', 'Total Victims'].includes(r.age_group))
    : []

  // Radar data for victim vulnerability profile
  const radarData = [
    { subject: 'Child victims',  value: summaryRows.find(r => r.age_group === 'Total Child')?.total ?? 0 },
    { subject: 'Adult victims',  value: summaryRows.find(r => r.age_group === 'Total Adult')?.total ?? 0 },
    { subject: 'Female victims', value: gender?.female ?? 0 },
    { subject: 'Rape cases',     value: rape?.cases_reported ?? 0 },
    { subject: 'Child rape',     value: rape?.total_child_victims ?? 0 },
  ]
  const radarMax = Math.max(...radarData.map(r => r.value), 1)
  const radarNorm = radarData.map(r => ({ ...r, value: Math.round((r.value / radarMax) * 100) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Summary KPI strip */}
      {!l2 && !l3 && gender && rape && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total murder victims', value: fmt(gender.total),              color: 'var(--signal)' },
            { label: 'Male victims',         value: `${fmt(gender.male)} (${gender.male_pct}%)`,  color: 'var(--teal)' },
            { label: 'Female victims',       value: `${fmt(gender.female)} (${gender.female_pct}%)`, color: '#E63946' },
            { label: 'Rape cases',           value: fmt(rape.cases_reported),       color: '#F4A261' },
            { label: 'Total rape victims',   value: fmt(rape.total_victims),        color: '#F4A261' },
            { label: 'Child rape victims',   value: fmt(rape.total_child_victims),  color: 'var(--signal)' },
          ].map(m => (
            <Card key={m.label}>
              <div className="label" style={{ marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 18, color: m.color, fontWeight: 500, lineHeight: 1.2 }}>
                {m.value}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Murder victims by age + gender */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <Card>
          <SectionHead icon="◇" title="Murder victims by age group — Karnataka 2024" />
          {l1 ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageGroups} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="male"   name="Male"   stackId="a" fill="var(--teal)"   radius={[0,0,0,0]} />
                <Bar dataKey="female" name="Female" stackId="a" fill="var(--signal)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--teal)' }} />
              <span style={{ fontSize: 12, color: 'var(--slate-4)' }}>Male victims</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--signal)' }} />
              <span style={{ fontSize: 12, color: 'var(--slate-4)' }}>Female victims</span>
            </div>
          </div>
        </Card>

        {/* Radar vulnerability */}
        <Card>
          <SectionHead icon="◉" title="Vulnerability profile" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarNorm} cx="50%" cy="50%" outerRadius={85}>
              <PolarGrid stroke="var(--ink-4)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--slate-4)', fontSize: 10 }} />
              <Radar name="Score" dataKey="value" stroke="var(--signal)" fill="var(--signal)" fillOpacity={0.2} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: 'var(--slate-4)', textAlign: 'center', marginTop: 4 }}>
            Normalised scores — relative victim burden
          </div>
        </Card>
      </div>

      {/* Child vs adult summary table */}
      <Card>
        <SectionHead icon="◇" title="Murder victims — child vs adult breakdown" />
        {l1 ? <Spinner /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
                {['Category', 'Male', 'Female', 'Transgender', 'Total', 'Female %'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(r => (
                <tr key={r.age_group} style={{
                  borderBottom: '1px solid var(--ink-4)',
                  background: r.age_group === 'Total Victims' ? 'rgba(46,196,182,0.05)' : 'transparent',
                }}>
                  <td style={{ padding: '10px', color: r.age_group === 'Total Victims' ? 'var(--teal)' : '#fff', fontWeight: 600 }}>{r.age_group}</td>
                  <td style={{ padding: '10px', fontFamily: 'DM Mono,monospace', color: 'var(--teal)' }}>{fmt(r.male)}</td>
                  <td style={{ padding: '10px', fontFamily: 'DM Mono,monospace', color: 'var(--signal)' }}>{fmt(r.female)}</td>
                  <td style={{ padding: '10px', fontFamily: 'DM Mono,monospace', color: '#F4A261' }}>{fmt(r.transgender)}</td>
                  <td style={{ padding: '10px', fontFamily: 'DM Mono,monospace', color: '#fff', fontWeight: 600 }}>{fmt(r.total)}</td>
                  <td style={{ padding: '10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-4)' }}>{r.female_pct ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Rape age breakdown table */}
      <Card>
        <SectionHead icon="◇" title="Rape victims — age band detail (Karnataka 2024)" />
        {l3 ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', background: 'rgba(230,57,70,0.08)', borderRadius: 8, border: '1px solid rgba(230,57,70,0.15)' }}>
                <div className="label" style={{ color: 'var(--signal)' }}>Cases registered</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 22, color: 'var(--signal)', fontWeight: 500 }}>{fmt(rape?.cases_reported)}</div>
              </div>
              <div style={{ padding: '8px 14px', background: 'rgba(244,162,97,0.08)', borderRadius: 8, border: '1px solid rgba(244,162,97,0.15)' }}>
                <div className="label" style={{ color: 'var(--amber)' }}>Total victims</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 22, color: 'var(--amber)', fontWeight: 500 }}>{fmt(rape?.total_victims)}</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
                  {['Age Band', 'Category', 'Victims', '% of total'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rape?.age_breakdown?.map((b, i) => (
                  <tr key={b.age_band} style={{ borderBottom: '1px solid var(--ink-4)' }}>
                    <td style={{ padding: '9px 10px', color: '#fff', fontWeight: 500 }}>{b.age_band}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <Badge label={b.category} type={b.category === 'Child' ? 'red' : 'amber'} />
                    </td>
                    <td style={{ padding: '9px 10px', fontFamily: 'DM Mono,monospace', color: b.category === 'Child' ? 'var(--signal)' : '#fff', fontWeight: b.count > 100 ? 600 : 400 }}>
                      {fmt(b.count)}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--ink-4)', borderRadius: 3, maxWidth: 120 }}>
                          <div style={{ width: `${b.pct}%`, height: '100%', borderRadius: 3, background: b.category === 'Child' ? 'var(--signal)' : '#F4A261' }} />
                        </div>
                        <span style={{ fontFamily: 'DM Mono,monospace', color: 'var(--slate-4)', fontSize: 12 }}>{b.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  )
}
