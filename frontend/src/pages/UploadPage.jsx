import { useState, useRef, useCallback } from 'react'
import { SectionHead } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         LineChart, Line, CartesianGrid, Cell, PieChart, Pie } from 'recharts'

// ── Colours ───────────────────────────────────────────────────────────────────
const RC = {
  Critical:{ bg:'rgba(230,57,70,0.1)',  border:'#E63946', text:'#E63946' },
  High:    { bg:'rgba(244,162,97,0.1)', border:'#F4A261', text:'#F4A261' },
  Moderate:{ bg:'rgba(249,199,79,0.1)', border:'#F9C74F', text:'#F9C74F' },
  Low:     { bg:'rgba(82,183,136,0.1)', border:'#52B788', text:'#52B788' },
}
const rc  = l => RC[l] ?? RC.Low
const PAL = ['#E63946','#F4A261','#F9C74F','#52B788','#2eC4B6','#9B8FE8','#F72585','#4CC9F0']

function Chip({ level, label }) {
  const c = rc(level)
  return (
    <span style={{ padding:'2px 9px', borderRadius:4, fontSize:11, fontWeight:700,
      background:c.bg, border:`1px solid ${c.border}55`, color:c.text }}>
      {label ?? level}
    </span>
  )
}
function ChartTip({ active, payload, label }) {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'#0d1117', border:'1px solid #1e2530',
      borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'#2eC4B6', fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color??'#cdd6f4' }}>
          {p.name}: <b>{typeof p.value==='number'?p.value.toLocaleString('en-IN'):p.value}</b>
        </div>
      ))}
    </div>
  )
}

// ── AI insight panel (shared) ─────────────────────────────────────────────────
function AIPanel({ ai, isNcrb, karnataka }) {
  if (!ai) return null
  const sev = rc(ai.severity ?? 'Moderate')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Assessment */}
      <div style={{ padding:'16px 20px', borderRadius:12,
        background:`${sev.border}0f`, border:`1px solid ${sev.border}44`,
        display:'flex', gap:14 }}>
        <span style={{ fontSize:28 }}>⬡</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ color:'#2eC4B6', fontWeight:700, fontSize:11,
              textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Analysis
            </span>
            <Chip level={ai.severity??'Moderate'} label={`${ai.severity??'Moderate'} Severity`}/>
          </div>
          <div style={{ color:'#cdd6f4', fontSize:13, lineHeight:1.75 }}>
            {ai.overall_assessment}
          </div>
        </div>
      </div>

      {/* Karnataka spotlight (NCRB only) */}
      {isNcrb && ai.karnataka_analysis && (() => {
        const ka = ai.karnataka_analysis
        const kc = rc(ka.risk_level ?? 'Moderate')
        return (
          <div style={{ padding:'16px 20px', borderRadius:12,
            background:`${kc.border}0f`, border:`2px solid ${kc.border}55` }}>
            <div style={{ color:kc.text, fontWeight:700, fontSize:14, marginBottom:12,
              display:'flex', alignItems:'center', gap:10 }}>
              🔵 Karnataka — {karnataka?.crime_type ?? 'Crime'} Analysis
              <Chip level={ka.risk_level} label={ka.trend ?? ka.risk_level}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10,
              marginBottom:12 }}>
              {[
                ['AI Risk Score',    ka.risk_score + '/100', kc.text],
                ['National Rank',    ka.national_rank ?? '—', '#cdd6f4'],
                ['Trend',           ka.trend ?? '—',
                  ka.trend==='Rising'?'#E63946':ka.trend==='Falling'?'#52B788':'#F9C74F'],
              ].map(([k,v,col]) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.04)',
                  borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ color:'#3d5070', fontSize:10, marginBottom:4 }}>{k}</div>
                  <div style={{ color:col, fontWeight:700, fontSize:16,
                    fontFamily:'DM Mono,monospace' }}>{v}</div>
                </div>
              ))}
            </div>
            {ka.key_insight && (
              <div style={{ padding:'10px 14px', borderRadius:8,
                background:'rgba(255,255,255,0.03)',
                borderLeft:`3px solid ${kc.border}`, marginBottom:8 }}>
                <div style={{ color:kc.text, fontSize:10, marginBottom:4,
                  textTransform:'uppercase' }}>Key Insight</div>
                <div style={{ color:'#cdd6f4', fontSize:12, lineHeight:1.65 }}>
                  {ka.key_insight}
                </div>
              </div>
            )}
            {ka.chargesheeting_analysis && (
              <div style={{ padding:'10px 14px', borderRadius:8,
                background:'rgba(255,255,255,0.03)',
                borderLeft:'3px solid #9B8FE8' }}>
                <div style={{ color:'#9B8FE8', fontSize:10, marginBottom:4,
                  textTransform:'uppercase' }}>Chargesheeting Rate</div>
                <div style={{ color:'#cdd6f4', fontSize:12, lineHeight:1.65 }}>
                  {ka.chargesheeting_analysis}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Key findings */}
        {ai.key_findings?.length > 0 && (
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'14px 16px' }}>
            <div style={{ color:'#2eC4B6', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:10 }}>🔍 Key Findings</div>
            {ai.key_findings.map((f,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <span style={{ color:'#2eC4B6', flexShrink:0 }}>▸</span>
                <span style={{ color:'#8899bb', fontSize:12, lineHeight:1.6 }}>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {ai.recommendations?.length > 0 && (
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'14px 16px' }}>
            <div style={{ color:'#52B788', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:10 }}>✓ Recommendations</div>
            {ai.recommendations.map((r,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <span style={{ color:'#52B788', flexShrink:0 }}>▸</span>
                <span style={{ color:'#8899bb', fontSize:12, lineHeight:1.6 }}>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* High risk states / hotspots */}
        {(ai.high_risk_states?.length > 0 || ai.hotspots?.length > 0) && (
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'14px 16px' }}>
            <div style={{ color:'#E63946', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:10 }}>
              ⚑ {isNcrb ? 'High Risk States' : 'Hotspot Districts'}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {(isNcrb ? ai.high_risk_states : ai.hotspots)?.map((h,i) => (
                <span key={i} style={{ padding:'4px 10px', borderRadius:6, fontSize:11,
                  fontWeight:600, background:'rgba(230,57,70,0.1)',
                  border:'1px solid rgba(230,57,70,0.3)', color:'#E63946' }}>{h}</span>
              ))}
            </div>
          </div>
        )}

        {/* Anomalies */}
        {ai.anomalies?.length > 0 && (
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'14px 16px' }}>
            <div style={{ color:'#F9C74F', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:10 }}>⚠ Anomalies</div>
            {ai.anomalies.map((a,i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                <span style={{ color:'#F9C74F', flexShrink:0 }}>!</span>
                <span style={{ color:'#8899bb', fontSize:12, lineHeight:1.5 }}>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trend + prediction */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {ai.trend_insight && (
          <div style={{ padding:'12px 16px', borderRadius:10,
            background:'rgba(155,143,232,0.07)', border:'1px solid rgba(155,143,232,0.2)' }}>
            <div style={{ color:'#9B8FE8', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:6 }}>📈 Trend</div>
            <div style={{ color:'#cdd6f4', fontSize:12, lineHeight:1.65 }}>
              {ai.trend_insight}
            </div>
          </div>
        )}
        {ai.prediction && (
          <div style={{ padding:'12px 16px', borderRadius:10,
            background:'rgba(46,196,182,0.07)', border:'1px solid rgba(46,196,182,0.2)' }}>
            <div style={{ color:'#2eC4B6', fontSize:11, fontWeight:700,
              textTransform:'uppercase', marginBottom:6 }}>🔮 Prediction</div>
            <div style={{ color:'#cdd6f4', fontSize:12, lineHeight:1.65 }}>
              {ai.prediction}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── NCRB Results Dashboard ────────────────────────────────────────────────────
function NCRBDashboard({ result }) {
  const [tab, setTab] = useState('ai')
  const { summary, ai_insight, state_breakdown, year_trend, karnataka } = result
  const years = summary.years_covered ?? []
  const latestYr = years[years.length-1]
  const prevYr   = years[years.length-2]

  // Karnataka row from breakdown
  const kaRow = state_breakdown?.find(r => r.is_karnataka)

  const TABS = [
    { key:'ai',        label:'⬡ AI Analysis'       },
    { key:'overview',  label:'◎ Overview'           },
    { key:'states',    label:'⬕ All States'         },
    { key:'trends',    label:'◐ Trends'             },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* File + dataset banner */}
      <div style={{ padding:'12px 18px', borderRadius:10,
        background:'rgba(46,196,182,0.05)', border:'1px solid rgba(46,196,182,0.2)',
        display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
        <span style={{ color:'#2eC4B6', fontWeight:700, fontSize:13 }}>
          ✓ {result.file_info.filename}
        </span>
        <span style={{ color:'#3d5070', fontSize:12 }}>
          NCRB Report · {summary.crime_type}
        </span>
        <span style={{ color:'#3d5070', fontSize:12 }}>
          {years.join(', ')} · {summary.total_states} States/UTs
        </span>
        <Chip level={summary.severity ?? 'Moderate'}
          label={`${summary.severity} Severity`}/>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
        {[
          { label:'States/UTs',        value: summary.total_states,              color:'#cdd6f4' },
          { label:`Cases (${latestYr})`,
            value: kaRow?.[`cases_${latestYr}`]?.toLocaleString('en-IN') ?? '—',
            color:'#E63946', sub:'Karnataka' },
          { label:`Cases (${prevYr})`,
            value: kaRow?.[`cases_${prevYr}`]?.toLocaleString('en-IN') ?? '—',
            color:'#F4A261', sub:'Karnataka' },
          { label:'KA Trend',
            value: ai_insight?.karnataka_analysis?.trend ?? '—',
            color: ai_insight?.karnataka_analysis?.trend==='Rising' ? '#E63946'
                 : ai_insight?.karnataka_analysis?.trend==='Falling'? '#52B788'
                 : '#F9C74F' },
          { label:'KA National Rank',
            value: ai_insight?.karnataka_analysis?.national_rank ?? '—',
            color:'#9B8FE8' },
        ].map(s => (
          <div key={s.label} style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'12px 14px' }}>
            <div style={{ color:'#3d5070', fontSize:10, marginBottom:4 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:s.value?.toString().length>6?16:22,
              fontWeight:700, fontFamily:'DM Mono,monospace', lineHeight:1 }}>{s.value}</div>
            {s.sub && <div style={{ color:'#3d5070', fontSize:10, marginTop:3 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid #1e2530' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 16px', border:'none', borderRadius:'6px 6px 0 0',
            background: tab===t.key?'#0d1117':'transparent',
            color: tab===t.key?'#fff':'#3d5070',
            borderBottom: tab===t.key?'2px solid #2eC4B6':'2px solid transparent',
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* AI tab */}
      {tab==='ai' && (
        <AIPanel ai={ai_insight} isNcrb={true} karnataka={karnataka}/>
      )}

      {/* Overview tab */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Top 10 states bar chart */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:'18px' }}>
            <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:14 }}>
              Top 15 States — {summary.crime_type} Cases ({latestYr})
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={state_breakdown?.slice(0,15).map(r => ({
                  name:  r.state_ut?.length > 14
                         ? r.state_ut.slice(0,13)+'…' : r.state_ut,
                  cases: r[`cases_${latestYr}`] ?? 0,
                  ka:    r.is_karnataka,
                }))}
                margin={{ left:0, right:10, top:5, bottom:60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2530"/>
                <XAxis dataKey="name" tick={{ fill:'#8899bb', fontSize:10 }}
                  axisLine={false} tickLine={false}
                  angle={-40} textAnchor="end" interval={0}/>
                <YAxis tick={{ fill:'#3d5070', fontSize:11 }}
                  axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="cases" name="Cases" radius={[4,4,0,0]} maxBarSize={32}>
                  {state_breakdown?.slice(0,15).map((r,i) => (
                    <Cell key={i}
                      fill={r.is_karnataka ? '#2eC4B6' : PAL[Math.min(i,PAL.length-1)]}
                      opacity={r.is_karnataka ? 1 : 0.8}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:10, marginTop:8, justifyContent:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:2,
                  background:'#2eC4B6' }}/>
                <span style={{ color:'#3d5070', fontSize:11 }}>Karnataka</span>
              </div>
            </div>
          </div>

          {/* Year trend */}
          {year_trend?.length > 1 && (
            <div style={{ background:'#0d1117', border:'1px solid #1e2530',
              borderRadius:12, padding:'18px' }}>
              <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:14 }}>
                All-India Year-on-Year Trend — {summary.crime_type}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={year_trend}
                  margin={{ left:0, right:20, top:5, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530"/>
                  <XAxis dataKey="year" tick={{ fill:'#3d5070', fontSize:11 }}
                    axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#3d5070', fontSize:11 }}
                    axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Line type="monotone" dataKey="cases" name="Total Cases"
                    stroke="#2eC4B6" strokeWidth={3}
                    dot={{ fill:'#2eC4B6', r:5 }} activeDot={{ r:7 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Karnataka year comparison */}
          {kaRow && years.length > 0 && (
            <div style={{ background:'#0d1117', border:'1px solid rgba(46,196,182,0.3)',
              borderRadius:12, padding:'18px' }}>
              <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:14 }}>
                Karnataka — Year-wise Breakdown
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={years.map(yr => ({
                    year: yr,
                    cases: kaRow[`cases_${yr}`] ?? 0,
                  }))}
                  margin={{ left:0, right:10, top:5, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530"/>
                  <XAxis dataKey="year" tick={{ fill:'#3d5070', fontSize:11 }}
                    axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#3d5070', fontSize:11 }}
                    axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="cases" name="Karnataka Cases"
                    fill="#2eC4B6" radius={[6,6,0,0]} maxBarSize={60}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* All States tab */}
      {tab==='states' && (
        <div style={{ background:'#0d1117', border:'1px solid #1e2530',
          borderRadius:12, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                  {['#','State/UT',
                    ...years.map(y=>`Cases ${y}`),
                    'Rate (2024)','Chargesheeting %'
                  ].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left',
                      color:'#3d5070', fontWeight:600, borderBottom:'1px solid #1e2530',
                      whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state_breakdown?.map((r, i) => {
                  const isKA  = r.is_karnataka
                  // find rate and chargesheeting keys
                  const rateKey = Object.keys(r).find(k=>k.includes('rate_of')||k.includes('rate'))
                  const csKey   = Object.keys(r).find(k=>k.includes('chargesheeting'))
                  return (
                    <tr key={r.state_ut} style={{
                      borderBottom:'1px solid #0f1520',
                      background: isKA
                        ? 'rgba(46,196,182,0.07)'
                        : i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                      <td style={{ padding:'9px 14px', color:'#2a3a55',
                        fontFamily:'DM Mono,monospace' }}>{i+1}</td>
                      <td style={{ padding:'9px 14px',
                        color: isKA ? '#2eC4B6' : '#fff',
                        fontWeight: isKA ? 700 : 400 }}>
                        {r.state_ut} {isKA ? '← KA' : ''}
                      </td>
                      {years.map(yr => (
                        <td key={yr} style={{ padding:'9px 14px',
                          color: isKA ? '#2eC4B6' : '#cdd6f4',
                          fontFamily:'DM Mono,monospace',
                          fontWeight: isKA ? 700 : 400 }}>
                          {(r[`cases_${yr}`] ?? 0).toLocaleString('en-IN')}
                        </td>
                      ))}
                      <td style={{ padding:'9px 14px', color:'#8899bb',
                        fontFamily:'DM Mono,monospace' }}>
                        {rateKey ? r[rateKey] ?? '—' : '—'}
                      </td>
                      <td style={{ padding:'9px 14px',
                        color: (() => {
                          const v = csKey ? r[csKey] : null
                          if (!v) return '#3d5070'
                          return v >= 50 ? '#52B788' : v >= 25 ? '#F9C74F' : '#E63946'
                        })(),
                        fontFamily:'DM Mono,monospace', fontWeight:600 }}>
                        {csKey ? (r[csKey] ?? '—') : '—'}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends tab */}
      {tab==='trends' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {year_trend?.length > 0 && (
            <div style={{ background:'#0d1117', border:'1px solid #1e2530',
              borderRadius:12, padding:'18px' }}>
              <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:14 }}>
                All-India Trend — {summary.crime_type}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={year_trend}
                  margin={{ left:0, right:20, top:5, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530"/>
                  <XAxis dataKey="year" tick={{ fill:'#3d5070', fontSize:12 }}
                    axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#3d5070', fontSize:11 }}
                    axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Line type="monotone" dataKey="cases" name="Total Cases"
                    stroke="#2eC4B6" strokeWidth={3}
                    dot={{ fill:'#2eC4B6', r:6 }} activeDot={{ r:8 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 5 states multi-year comparison */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:'18px' }}>
            <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:14 }}>
              Top States — Multi-Year Comparison
            </div>
            <ResponsiveContainer width="100%"
              height={Math.max(260, state_breakdown?.slice(0,10).length * 44)}>
              <BarChart
                data={state_breakdown?.slice(0,10).map(r => ({
                  name: r.state_ut?.length>12
                        ? r.state_ut.slice(0,11)+'…' : r.state_ut,
                  ...Object.fromEntries(
                    years.map(yr => [`cases_${yr}`, r[`cases_${yr}`]??0])
                  ),
                  ka: r.is_karnataka,
                }))}
                layout="vertical"
                margin={{ left:10, right:20, top:0, bottom:0 }}>
                <XAxis type="number" tick={{ fill:'#3d5070', fontSize:11 }}
                  axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name"
                  tick={{ fill:'#8899bb', fontSize:11 }}
                  axisLine={false} tickLine={false} width={110}/>
                <Tooltip content={<ChartTip/>}/>
                {years.map((yr, i) => (
                  <Bar key={yr} dataKey={`cases_${yr}`} name={`${yr}`}
                    fill={PAL[i]} radius={[0,3,3,0]} maxBarSize={14}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Generic file results ──────────────────────────────────────────────────────
function GenericDashboard({ result }) {
  const [tab, setTab] = useState('ai')
  const { summary, ai_insight, district_breakdown,
          top_crime_types, year_trend, records, file_info } = result
  const TABS = [
    { key:'ai',        label:'⬡ AI Analysis' },
    { key:'overview',  label:'◎ Overview'    },
    { key:'districts', label:'⬕ Districts'   },
    { key:'records',   label:'≡ Records'     },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Banner */}
      <div style={{ padding:'10px 16px', borderRadius:10,
        background:'rgba(46,196,182,0.05)', border:'1px solid rgba(46,196,182,0.15)',
        display:'flex', flexWrap:'wrap', gap:10, alignItems:'center' }}>
        <span style={{ color:'#2eC4B6', fontWeight:700, fontSize:12 }}>
          ✓ {file_info.filename}
        </span>
        <span style={{ color:'#3d5070', fontSize:11 }}>
          {file_info.rows_processed?.toLocaleString()} rows
        </span>
        {Object.entries(file_info.columns_mapped ?? {}).slice(0,6).map(([k,v]) => (
          <span key={k} style={{ fontSize:10, padding:'2px 7px', borderRadius:4,
            background:'rgba(46,196,182,0.08)', color:'#2eC4B6',
            border:'1px solid rgba(46,196,182,0.15)', fontFamily:'DM Mono,monospace' }}>
            {v}→{k}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Rows',       value:summary.total_rows?.toLocaleString(), color:'#2eC4B6' },
          { label:'Districts',  value:summary.total_districts,               color:'#cdd6f4' },
          { label:'Total Cases',value:summary.total_cases?.toLocaleString(), color:'#cdd6f4' },
          { label:'Severity',   value:summary.severity,                      color:rc(summary.severity).text },
        ].map(s => (
          <div key={s.label} style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'12px 14px' }}>
            <div style={{ color:'#3d5070', fontSize:10, marginBottom:4 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:20, fontWeight:700,
              fontFamily:'DM Mono,monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid #1e2530' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 14px', border:'none', borderRadius:'6px 6px 0 0',
            background:tab===t.key?'#0d1117':'transparent',
            color:tab===t.key?'#fff':'#3d5070',
            borderBottom:tab===t.key?'2px solid #2eC4B6':'2px solid transparent',
            fontSize:12, fontWeight:600, cursor:'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {tab==='ai' && <AIPanel ai={ai_insight} isNcrb={false}/>}

      {tab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:18 }}>
            <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:12 }}>
              Top Crime Types
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top_crime_types?.slice(0,8).map(c=>({
                name:c.crime_type?.length>16?c.crime_type.slice(0,15)+'…':c.crime_type,
                cases:c.cases,
              }))} layout="vertical" margin={{left:8,right:20,top:0,bottom:0}}>
                <XAxis type="number" tick={{fill:'#3d5070',fontSize:10}}
                  axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name"
                  tick={{fill:'#8899bb',fontSize:10}}
                  axisLine={false} tickLine={false} width={110}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="cases" name="Cases" radius={[0,4,4,0]} maxBarSize={16}>
                  {top_crime_types?.slice(0,8).map((_,i)=>(
                    <Cell key={i} fill={PAL[i%PAL.length]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {year_trend?.length > 1 && (
            <div style={{ background:'#0d1117', border:'1px solid #1e2530',
              borderRadius:12, padding:18 }}>
              <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:12 }}>
                Year Trend
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={year_trend}
                  margin={{left:0,right:20,top:5,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2530"/>
                  <XAxis dataKey="year" tick={{fill:'#3d5070',fontSize:11}}
                    axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#3d5070',fontSize:11}}
                    axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Line type="monotone" dataKey="cases" name="Cases"
                    stroke="#2eC4B6" strokeWidth={2.5}
                    dot={{fill:'#2eC4B6',r:4}} activeDot={{r:6}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {tab==='districts' && (
        <div style={{ background:'#0d1117', border:'1px solid #1e2530',
          borderRadius:12, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                  {['District','Incidents','Cases','AI Risk','Level','Crime Types'].map(h=>(
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left',
                      color:'#3d5070', fontWeight:600, borderBottom:'1px solid #1e2530',
                      whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {district_breakdown?.map((d,i) => {
                  const c = rc(d.risk_level)
                  return (
                    <tr key={d.district} style={{ borderBottom:'1px solid #0f1520',
                      background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding:'9px 14px', color:'#fff', fontWeight:600 }}>
                        {d.district}
                      </td>
                      <td style={{ padding:'9px 14px', color:'#2eC4B6',
                        fontFamily:'DM Mono,monospace' }}>{d.total_incidents}</td>
                      <td style={{ padding:'9px 14px', color:'#cdd6f4',
                        fontFamily:'DM Mono,monospace' }}>
                        {d.total_cases?.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding:'9px 14px', color:c.text,
                        fontFamily:'DM Mono,monospace', fontWeight:700 }}>
                        {d.risk_score}
                      </td>
                      <td style={{ padding:'9px 14px' }}>
                        <Chip level={d.risk_level}/>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#3d5070', maxWidth:200,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {d.crime_types?.join(', ') ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='records' && (
        <div style={{ background:'#0d1117', border:'1px solid #1e2530',
          borderRadius:12, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,0.03)' }}>
                  {['#','District','Crime Type','Year','Cases'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left',
                      color:'#3d5070', fontWeight:600, borderBottom:'1px solid #1e2530' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records?.slice(0,300).map((r,i)=>(
                  <tr key={r.row} style={{ borderBottom:'1px solid #0f1520',
                    background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'7px 12px', color:'#2a3a55',
                      fontFamily:'DM Mono,monospace' }}>{r.row}</td>
                    <td style={{ padding:'7px 12px', color:'#fff' }}>{r.district}</td>
                    <td style={{ padding:'7px 12px', color:'#8899bb' }}>{r.crime_type}</td>
                    <td style={{ padding:'7px 12px', color:'#3d5070',
                      fontFamily:'DM Mono,monospace' }}>{r.year??'—'}</td>
                    <td style={{ padding:'7px 12px', color:'#2eC4B6',
                      fontFamily:'DM Mono,monospace' }}>{r.cases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── File Upload zone ──────────────────────────────────────────────────────────
function FileUpload() {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [file,    setFile    ] = useState(null)
  const [loading, setLoading ] = useState(false)
  const [result,  setResult  ] = useState(null)
  const [error,   setError   ] = useState(null)
  const [step,    setStep    ] = useState('')

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer?.files?.[0]; if (f) pick(f)
  }, [])

  function pick(f) {
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Only CSV and Excel files are supported.'); return
    }
    setFile(f); setResult(null); setError(null)
  }

  async function upload() {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    const steps = [
      'Parsing file…',
      'Detecting NCRB format…',
      'Extracting crime data…',
      'Sending to Claude AI…',
      'Building dashboard…',
    ]
    let si = 0; setStep(steps[si])
    const iv = setInterval(() => {
      si = Math.min(si+1, steps.length-1); setStep(steps[si])
    }, 900)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/analyze', { method:'POST', body:fd })
      clearInterval(iv)
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.detail ?? `Server error ${res.status}`)
      }
      setResult(await res.json())
    } catch(e) {
      setError(e.message)
    } finally {
      clearInterval(iv); setLoading(false); setStep('')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {!result && (
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && !loading && inputRef.current?.click()}
          style={{
            border:`2px dashed ${dragging?'#2eC4B6':file?'#52B788':'#1e2530'}`,
            borderRadius:14, padding:'44px 28px', textAlign:'center',
            cursor:file||loading?'default':'pointer',
            background:dragging?'rgba(46,196,182,0.04)':'#0d1117',
            transition:'all 0.2s',
          }}>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls"
            style={{display:'none'}}
            onChange={e=>pick(e.target.files[0])}/>

          {loading ? (
            <>
              <div style={{ fontSize:32, color:'#2eC4B6', marginBottom:12 }}>⬡</div>
              <div style={{ color:'#2eC4B6', fontWeight:700, fontSize:15,
                marginBottom:6 }}>{step}</div>
              <div style={{ color:'#3d5070', fontSize:12 }}>
                 AI is analysing your crime data…
              </div>
            </>
          ) : file ? (
            <>
              <div style={{ fontSize:36, marginBottom:12 }}>✓</div>
              <div style={{ color:'#52B788', fontWeight:700, fontSize:15,
                marginBottom:4 }}>{file.name}</div>
              <div style={{ color:'#3d5070', fontSize:12, marginBottom:18 }}>
                {(file.size/1024).toFixed(1)} KB
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button onClick={upload} style={{
                  padding:'11px 28px', borderRadius:8, border:'none',
                  background:'#2eC4B6', color:'#000', fontWeight:700,
                  fontSize:13, cursor:'pointer',
                }}>⬡ Analyse with AI</button>
                <button onClick={()=>{setFile(null);setResult(null)}} style={{
                  padding:'11px 16px', borderRadius:8,
                  border:'1px solid #1e2530', background:'transparent',
                  color:'#3d5070', fontSize:13, cursor:'pointer',
                }}>✕ Clear</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:36, marginBottom:12 }}>⬆</div>
              <div style={{ color:'#fff', fontWeight:600, fontSize:16, marginBottom:8 }}>
                Drop any NCRB report or crime Excel/CSV file
              </div>
              <div style={{ color:'#3d5070', fontSize:13, lineHeight:1.8,
                maxWidth:500, margin:'0 auto 14px' }}>
                NCRB TABLE format · District summaries · FIR exports · Police records<br/>
                <span style={{ color:'#2eC4B6' }}>
                   AI reads the actual data and analyses it accurately
                </span>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                {['NCRB Tables','FIR Exports','District Reports','CSV','XLSX'].map(f=>(
                  <span key={f} style={{ padding:'3px 10px', borderRadius:4,
                    fontSize:11, fontWeight:600,
                    background:'rgba(46,196,182,0.08)',
                    border:'1px solid rgba(46,196,182,0.2)', color:'#2eC4B6' }}>{f}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ color:'#E63946', background:'rgba(230,57,70,0.08)',
          padding:'12px 16px', borderRadius:8, fontSize:13,
          border:'1px solid rgba(230,57,70,0.2)' }}>⚠ {error}</div>
      )}

      {result && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center' }}>
            <div style={{ color:'#52B788', fontWeight:700, fontSize:14 }}>
              ✓ {result.file_type==='ncrb_report'
                ? `NCRB Report detected — ${result.summary.crime_type}`
                : 'Analysis complete'}
            </div>
            <button onClick={()=>{setResult(null);setFile(null)}} style={{
              padding:'6px 14px', borderRadius:6, border:'1px solid #1e2530',
              background:'transparent', color:'#3d5070', fontSize:12, cursor:'pointer',
            }}>Upload another file</button>
          </div>
          {result.file_type==='ncrb_report'
            ? <NCRBDashboard result={result}/>
            : <GenericDashboard result={result}/>}
        </>
      )}
    </div>
  )
}

// ── Manual Entry ──────────────────────────────────────────────────────────────
function ManualEntry() {
  const DISTRICTS = ['Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban',
    'Bidar','Chamarajanagar','Chikkaballapura','Chikkamagaluru','Chitradurga',
    'Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri',
    'Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mangaluru','Mysuru',
    'Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada',
    'Vijayapura','Yadgir']
  const [form, setForm] = useState({
    district:'', crime_type:'', year:new Date().getFullYear(),
    cases_reported:1, time_of_day:'',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const inp = (x={}) => ({ style:{ width:'100%', padding:'8px 10px', borderRadius:6,
    fontSize:13, background:'#0d1117', border:'1px solid #1e2530', color:'#fff',
    outline:'none', boxSizing:'border-box', ...x }})

  async function submit(e) {
    e.preventDefault(); setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/upload/manual', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(form),
      })
      if (!res.ok) { const e=await res.json(); throw new Error(e.detail??'Error') }
      setResult(await res.json())
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ background:'#0d1117', border:'1px solid #1e2530',
        borderRadius:12, padding:20 }}>
        <div style={{ color:'#2eC4B6', fontWeight:600, fontSize:13, marginBottom:14 }}>
          ◈ Log Single Incident
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ color:'#3d5070', fontSize:11, display:'block',
                marginBottom:4 }}>District *</label>
              <select {...inp()} value={form.district}
                onChange={e=>set('district',e.target.value)} required>
                <option value="">Select…</option>
                {DISTRICTS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:'#3d5070', fontSize:11, display:'block',
                marginBottom:4 }}>Crime Type *</label>
              <input {...inp()} value={form.crime_type}
                onChange={e=>set('crime_type',e.target.value)}
                placeholder="e.g. Robbery, Murder…" required/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={{ color:'#3d5070', fontSize:11, display:'block',
                marginBottom:4 }}>Year *</label>
              <input {...inp()} type="number" min="2000" max="2030"
                value={form.year} onChange={e=>set('year',e.target.value)} required/>
            </div>
            <div>
              <label style={{ color:'#3d5070', fontSize:11, display:'block',
                marginBottom:4 }}>Cases</label>
              <input {...inp()} type="number" min="1"
                value={form.cases_reported}
                onChange={e=>set('cases_reported',e.target.value)}/>
            </div>
            <div>
              <label style={{ color:'#3d5070', fontSize:11, display:'block',
                marginBottom:4 }}>Time of Day</label>
              <select {...inp()} value={form.time_of_day}
                onChange={e=>set('time_of_day',e.target.value)}>
                <option value="">Any</option>
                {['Morning','Afternoon','Evening','Night'].map(t=>(
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            padding:'10px', borderRadius:8, border:'none', fontSize:13,
            fontWeight:700, background:'#2eC4B6', color:'#000',
            cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1,
          }}>{loading?'⬡ Asking AI…':'⬡ Analyse with AI'}</button>
          {error && <div style={{ color:'#E63946', fontSize:12 }}>⚠ {error}</div>}
        </form>
      </div>

      <div style={{ background:'#0d1117', border:'1px solid #1e2530',
        borderRadius:12, padding:20 }}>
        <div style={{ color:'#2eC4B6', fontWeight:600, fontSize:13, marginBottom:14 }}>
          ◉ AI Assessment
        </div>
        {!result && !loading && (
          <div style={{ color:'#3d5070', fontSize:13, lineHeight:1.8 }}>
             AI will analyse this incident in context of Karnataka crime patterns
            and provide an accurate, specific risk assessment.
          </div>
        )}
        {loading && (
          <div style={{ textAlign:'center', padding:20, color:'#2eC4B6' }}>
            Consulting AI…
          </div>
        )}
        {result && (() => {
          const c = rc(result.risk_level)
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ padding:'14px 16px', borderRadius:10,
                background:c.bg, border:`1px solid ${c.border}44` }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  marginBottom:8 }}>
                  <span style={{ color:c.text, fontWeight:700, fontSize:20 }}>
                    Risk: {result.risk_score}/100
                  </span>
                  <div style={{ display:'flex', flexDirection:'column',
                    gap:4, alignItems:'flex-end' }}>
                    <Chip level={result.risk_level}/>
                    {result.escalate && (
                      <span style={{ color:'#E63946', fontSize:10,
                        fontWeight:700 }}>⚠ ESCALATE</span>
                    )}
                  </div>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.07)',
                  borderRadius:3 }}>
                  <div style={{ width:`${result.risk_score}%`, height:'100%',
                    borderRadius:3, background:c.border }}/>
                </div>
              </div>
              <div style={{ padding:'12px 14px', borderRadius:8,
                background:'rgba(255,255,255,0.03)',
                borderLeft:`3px solid ${c.border}` }}>
                <div style={{ color:'#3d5070', fontSize:10, marginBottom:4,
                  textTransform:'uppercase' }}>Action</div>
                <div style={{ color:'#fff', fontSize:12, lineHeight:1.6 }}>
                  {result.recommended_action}
                </div>
              </div>
              {result.context && (
                <div style={{ padding:'12px 14px', borderRadius:8,
                  background:'rgba(46,196,182,0.05)',
                  border:'1px solid rgba(46,196,182,0.15)' }}>
                  <div style={{ color:'#2eC4B6', fontSize:10, marginBottom:4,
                    textTransform:'uppercase' }}>Context</div>
                  <div style={{ color:'#8899bb', fontSize:12, lineHeight:1.6 }}>
                    {result.context}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [tab, setTab] = useState('file')
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <SectionHead icon="⬆" title="Data Upload — AI Analysis"/>
      <div style={{ color:'#3d5070', fontSize:13, lineHeight:1.8, maxWidth:700 }}>
        Upload any crime data file — <b style={{color:'#cdd6f4'}}>NCRB reports are
        auto-detected</b> and parsed accurately (title, crime type, state/year columns,
        footnotes all handled). AI analyses the actual numbers and returns
        Karnataka-specific insights.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {[
          { key:'file',   label:'⬡ Bulk File Upload' },
          { key:'manual', label:'◈ Single Incident'  },
        ].map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:700,
            cursor:'pointer', transition:'all 0.18s',
            border:`1px solid ${tab===t.key?'#2eC4B6':'#1e2530'}`,
            background:tab===t.key?'rgba(46,196,182,0.1)':'#0d1117',
            color:tab===t.key?'#2eC4B6':'#3d5070',
          }}>{t.label}</button>
        ))}
      </div>
      {tab==='file'   && <FileUpload/>}
      {tab==='manual' && <ManualEntry/>}
    </div>
  )
}