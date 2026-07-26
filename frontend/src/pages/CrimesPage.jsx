import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, Badge } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: 'var(--slate-4)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color ?? '#fff', fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500 }}>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function CrimesPage() {
  const { data: ipc,    loading: l1 } = useApi(api.allStatesIPC)
  const { data: kIpc,   loading: l2 } = useApi(api.karnatakaIPC)
  const { data: trends, loading: l3 } = useApi(api.trends)

  // Top 12 states by crime rate for chart
  const topStates = ipc
    ? ipc.slice(0, 12).map(s => ({
        name: s.state_ut.length > 13 ? s.state_ut.slice(0, 13) + '…' : s.state_ut,
        rate: s.crime_rate_2024,
        total: s.total_crimes_2024,
        cs: s.chargesheeting_rate_2024,
        isK: s.state_ut === 'Karnataka',
      }))
    : []

  // Year-on-year data
  const trendData = trends?.map(t => ({
    year: String(t.year), crimes: t.total_crimes,
  })) ?? []

  // Pie — crime rate categories breakdown
  const categoryData = ipc
    ? [
        { name: 'Very High (>300)', value: ipc.filter(s => s.crime_rate_2024 > 300).length,  fill: '#E63946' },
        { name: 'High (200–300)',   value: ipc.filter(s => s.crime_rate_2024 >= 200 && s.crime_rate_2024 <= 300).length, fill: '#F4A261' },
        { name: 'Moderate (100–200)',value: ipc.filter(s => s.crime_rate_2024 >= 100 && s.crime_rate_2024 < 200).length, fill: '#F9C74F' },
        { name: 'Low (<100)',       value: ipc.filter(s => s.crime_rate_2024 < 100).length,   fill: '#52B788' },
      ]
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Karnataka IPC snapshot */}
      {!l2 && kIpc && (
        <Card style={{ background: 'linear-gradient(135deg, var(--ink-2), rgba(230,57,70,0.05))', border: '1px solid rgba(230,57,70,0.2)' }}>
          <div className="label" style={{ color: 'var(--signal)', marginBottom: 10 }}>Karnataka IPC/BNS snapshot — 2024</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { label: 'IPC crimes',      value: fmt(kIpc.ipc_crimes_2024),         color: 'var(--signal)' },
              { label: 'BNS crimes',      value: fmt(kIpc.bns_crimes_2024),         color: '#F4A261' },
              { label: 'Total 2024',      value: fmt(kIpc.total_crimes_2024),       color: '#fff' },
              { label: 'Total 2023',      value: fmt(kIpc.total_crimes_2023),       color: 'var(--slate-2)' },
              { label: 'Total 2022',      value: fmt(kIpc.total_crimes_2022),       color: 'var(--slate-2)' },
              { label: 'YoY change',      value: `${kIpc.yoy_change_pct > 0 ? '↑' : '↓'} ${Math.abs(kIpc.yoy_change_pct)}%`,
                color: kIpc.yoy_change_pct > 0 ? 'var(--signal)' : '#52B788' },
              { label: 'Crime rate',      value: kIpc.crime_rate_2024,              color: '#F4A261' },
              { label: 'Chargesheeting',  value: `${kIpc.chargesheeting_rate_2024}%`, color: 'var(--teal)' },
            ].map(m => (
              <div key={m.label}>
                <div className="label">{m.label}</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, color: m.color, fontWeight: 500, marginTop: 3 }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top states by crime rate + category pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card>
          <SectionHead icon="◈" title="Top 12 states by crime rate / lakh (2024)" />
          {l1 ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStates} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--slate-4)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" radius={[0, 5, 5, 0]}>
                  {topStates.map((e, i) => (
                    <Cell key={i}
                      fill={e.isK ? 'var(--teal)' : e.rate > 300 ? 'var(--signal)' : e.rate > 200 ? '#F4A261' : 'var(--ink-4)'}
                      opacity={e.isK ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionHead icon="◉" title="States by crime category" />
          {l1 ? <Spinner /> : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                    {categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--ink-4)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {categoryData.map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c.fill }} />
                      <span style={{ fontSize: 12, color: 'var(--slate-4)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#fff', fontSize: 13 }}>{c.value} states</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Full IPC table */}
      <Card>
        <SectionHead icon="◈" title="All India IPC/BNS data — 2024" />
        {l1 ? <Spinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
                  {['State / UT', '2022', '2023', '2024 (IPC)', '2024 (BNS)', 'Total 2024', 'Rate/lakh', 'CS Rate', 'YoY %'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ipc?.map((s, i) => (
                  <tr key={s.state_ut} style={{
                    borderBottom: '1px solid var(--ink-4)',
                    background: s.state_ut === 'Karnataka'
                      ? 'rgba(46,196,182,0.06)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}>
                    <td style={{ padding: '8px 10px', color: s.state_ut === 'Karnataka' ? 'var(--teal)' : '#fff', fontWeight: s.state_ut === 'Karnataka' ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {s.state_ut}
                      {s.state_ut === 'Karnataka' && <span style={{ fontSize: 10, background: 'rgba(46,196,182,0.15)', color: 'var(--teal)', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>KSP</span>}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-2)', fontSize: 12 }}>{fmt(s.total_crimes_2022)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-2)', fontSize: 12 }}>{fmt(s.total_crimes_2023)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-2)', fontSize: 12 }}>{fmt(s.ipc_crimes_2024)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: 'var(--slate-2)', fontSize: 12 }}>{fmt(s.bns_crimes_2024)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: '#fff', fontWeight: 500 }}>{fmt(s.total_crimes_2024)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: s.crime_rate_2024 > 300 ? 'var(--signal)' : s.crime_rate_2024 > 200 ? '#F4A261' : 'var(--slate-2)' }}>{s.crime_rate_2024}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: s.chargesheeting_rate_2024 > 80 ? 'var(--teal)' : 'var(--slate-2)' }}>{s.chargesheeting_rate_2024}%</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'DM Mono,monospace', color: (s.yoy_change_pct ?? 0) > 0 ? 'var(--signal)' : '#52B788', fontSize: 12 }}>
                      {s.yoy_change_pct != null ? `${s.yoy_change_pct > 0 ? '+' : ''}${s.yoy_change_pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
