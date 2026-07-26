import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, Badge } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

const METRICS = [
  { key: 'crime_rate_2024',         label: 'Crime rate / lakh',       unit: '' },
  { key: 'total_crimes_2024',       label: 'Total crimes',            unit: '' },
  { key: 'chargesheeting_rate_2024',label: 'Chargesheeting rate (%)', unit: '%' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const isKarnataka = label === 'Karnataka'
  return (
    <div style={{ background: 'var(--ink-2)', border: `1px solid ${isKarnataka ? 'var(--teal)' : 'var(--ink-4)'}`, borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: isKarnataka ? 'var(--teal)' : 'var(--slate-2)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 16, color: '#fff' }}>
        {payload[0].value?.toLocaleString('en-IN')}
      </div>
    </div>
  )
}

export default function ComparePage() {
  const [metric, setMetric] = useState(METRICS[0])
  const { data, loading }   = useApi(() => api.topStates(36), [])
  const { data: natComp }   = useApi(api.nationalComparison)

  const chartData = data?.states?.map(s => ({
    name: s.state_ut.length > 12 ? s.state_ut.slice(0, 12) + '…' : s.state_ut,
    fullName: s.state_ut,
    value: s.value,
    isKarnataka: s.state_ut === 'Karnataka',
  })) ?? []

  // Sort by selected metric
  const sortedForMetric = data
    ? [...data.states].sort((a, b) => b.value - a.value).slice(0, 15).map(s => ({
        name: s.state_ut,
        value: s.value,
        isKarnataka: s.state_ut === 'Karnataka',
      }))
    : []

  const karnatakaRank = data
    ? [...data.states].sort((a, b) => b.value - a.value).findIndex(s => s.state_ut === 'Karnataka') + 1
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Metric selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {METRICS.map(m => (
          <button key={m.key} onClick={() => setMetric(m)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${metric.key === m.key ? 'var(--teal)' : 'var(--ink-4)'}`,
            background: metric.key === m.key ? 'rgba(46,196,182,0.12)' : 'transparent',
            color: metric.key === m.key ? 'var(--teal)' : 'var(--slate-4)',
            transition: 'all 0.15s',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Karnataka position banner */}
      {karnatakaRank && (
        <Card style={{ background: 'rgba(46,196,182,0.05)', border: '1px solid rgba(46,196,182,0.2)' }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div>
              <div className="label" style={{ color: 'var(--teal)' }}>Karnataka national rank</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 40, color: '#fff', fontWeight: 500, lineHeight: 1.1 }}>
                #{karnatakaRank}
                <span style={{ fontSize: 16, color: 'var(--slate-4)', fontFamily: 'DM Sans,sans-serif', marginLeft: 8 }}>
                  of {data?.states?.length} states
                </span>
              </div>
            </div>
            {natComp && natComp.slice(0, 3).map(n => (
              <div key={n.entity} style={{ textAlign: 'center' }}>
                <div className="label">{n.entity}</div>
                <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 20, color: n.entity === 'Karnataka' ? 'var(--teal)' : '#fff', fontWeight: 500 }}>
                  {n.crime_rate_2024}
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate-4)' }}>rate/lakh</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main bar chart */}
      <Card>
        <SectionHead icon="⊞" title={`${metric.label} — all states (2024)`} />
        {loading ? <Spinner /> : (
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={sortedForMetric} layout="vertical" margin={{ top: 0, right: 24, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-4)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--slate-4)', fontSize: 11 }}
                tickFormatter={v => metric.key === 'total_crimes_2024' ? `${(v/1000).toFixed(0)}k` : v} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--slate-4)', fontSize: 12 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {sortedForMetric.map((e, i) => (
                  <Cell key={i} fill={e.isKarnataka ? 'var(--teal)' : 'var(--ink-4)'} opacity={e.isKarnataka ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: 12, color: 'var(--slate-4)', marginTop: 8, textAlign: 'center' }}>
          <span style={{ color: 'var(--teal)', fontWeight: 600 }}>■</span> Karnataka &nbsp;
          <span style={{ color: 'var(--ink-4)', fontWeight: 600 }}>■</span> Other states
        </div>
      </Card>

      {/* National comparison table */}
      <Card>
        <SectionHead icon="⊞" title="Karnataka vs national benchmarks" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--ink-4)' }}>
              {['Entity', 'Crime rate / lakh', 'Chargesheeting %', 'Total crimes'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--slate-4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {natComp?.map(n => (
              <tr key={n.entity} style={{
                borderBottom: '1px solid var(--ink-4)',
                background: n.entity === 'Karnataka' ? 'rgba(46,196,182,0.06)' : 'transparent',
              }}>
                <td style={{ padding: '10px 12px', color: n.entity === 'Karnataka' ? 'var(--teal)' : '#fff', fontWeight: n.entity === 'Karnataka' ? 600 : 400 }}>
                  {n.entity} {n.entity === 'Karnataka' && <span style={{ fontSize: 10, background: 'rgba(46,196,182,0.15)', color: 'var(--teal)', padding: '1px 6px', borderRadius: 4, marginLeft: 6 }}>YOU</span>}
                </td>
                <td style={{ padding: '10px 12px', fontFamily: 'DM Mono,monospace', color: '#fff' }}>{n.crime_rate_2024}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'DM Mono,monospace', color: '#fff' }}>{n.chargesheeting_rate ?? '—'}%</td>
                <td style={{ padding: '10px 12px', fontFamily: 'DM Mono,monospace', color: '#fff' }}>{n.total_crimes_2024?.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
