import { useState, useMemo } from 'react'
import { KARNATAKA_DISTRICTS } from '../data/karnataka'
import SVG_DATA from '../data/karnataka_svg.json'
import { SectionHead } from '../components/UI'

const { svgWidth: W, svgHeight: H, features, points } = SVG_DATA

const ALL_SVG = [
  ...features.map(f => ({ ...f, isPolygon: true  })),
  ...points  .map(p => ({ ...p, isPolygon: false })),
]

const TIME_BANDS = {
  all:       { label:'All Hours',  icon:'◎', color:'#E63946',
    fn: d => 0.45 + (d.risk_score/100)*0.55 },
  morning:   { label:'Morning',    icon:'◌', color:'#F9C74F',
    fn: d => 0.25 + (d.poverty_index/100)*0.4 + (d.risk_score/100)*0.2 },
  afternoon: { label:'Afternoon',  icon:'◐', color:'#F4A261',
    fn: d => 0.3  + (d.unemployment_rate/15)*0.35 + (d.risk_score/100)*0.25 },
  evening:   { label:'Evening',    icon:'◕', color:'#FF6B8A',
    fn: d => 0.4  + (d.risk_score/100)*0.45 + (d.is_anomaly?0.1:0) },
  night:     { label:'Night',      icon:'●', color:'#9B8FE8',
    fn: d => 0.45 + (d.poverty_index/100)*0.35 + (d.is_anomaly?0.2:0) + (d.risk_score/100)*0.25 },
}

function clamp(v) { return Math.min(Math.max(v, 0), 1) }

function heatColor(inten) {
  if (inten > 0.78) return '#E63946'
  if (inten > 0.58) return '#F4A261'
  if (inten > 0.38) return '#F9C74F'
  return '#52B788'
}

export default function HotspotPage() {
  const [band,     setBand]     = useState('all')
  const [selected, setSelected] = useState(null)
  const [hovered,  setHovered]  = useState(null)

  const profile = TIME_BANDS[band]

  // Pre-compute intensities for all districts
  const withInten = useMemo(() => ALL_SVG.map(d => {
    const src = KARNATAKA_DISTRICTS.find(k => k.district === d.district) ?? d
    const inten = clamp(profile.fn({ ...d, ...src }))
    return { ...d, ...src, inten }
  }), [band])

  const topHot = [...withInten].sort((a,b) => b.inten - a.inten).slice(0, 8)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHead icon="◉" title="Crime Hotspot Map — Spatiotemporal Analysis" />

      {/* Time band selector */}
      <div style={{
        display:'flex', gap:8, padding:'14px 18px',
        background:'#0d1117', border:'1px solid #1e2530', borderRadius:12,
        alignItems:'center', flexWrap:'wrap',
      }}>
        <span style={{ color:'#3d5070', fontSize:12, fontWeight:500 }}>Time Band:</span>
        {Object.entries(TIME_BANDS).map(([key, p]) => (
          <button key={key} onClick={() => setBand(key)} style={{
            padding:'8px 18px', borderRadius:8, fontSize:12, fontWeight:700,
            cursor:'pointer', transition:'all 0.18s',
            border:`1px solid ${band===key ? p.color : '#1e2530'}`,
            background: band===key ? `${p.color}18` : 'transparent',
            color: band===key ? p.color : '#3d5070',
            display:'flex', alignItems:'center', gap:7,
          }}>
            <span style={{ fontSize:15 }}>{p.icon}</span>{p.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Active Hotspots',   value: withInten.filter(d=>d.inten>0.6).length,  color:'#E63946' },
          { label:'High Intensity',    value: withInten.filter(d=>d.inten>0.45).length, color:'#F4A261' },
          { label:'Avg Intensity',     value: Math.round(withInten.reduce((a,d)=>a+d.inten,0)/withInten.length*100)+'%', color:profile.color },
          { label:'Anomaly Districts', value: withInten.filter(d=>d.is_anomaly).length, color:'#9B8FE8' },
        ].map(s => (
          <div key={s.label} style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:10, padding:'13px 16px' }}>
            <div style={{ color:'#3d5070', fontSize:11, marginBottom:4 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:24, fontWeight:700,
              fontFamily:'DM Mono,monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Map + panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 272px', gap:14 }}>
        {/* SVG heatmap */}
        <div style={{
          position:'relative', borderRadius:14, overflow:'hidden',
          background:'#060a12',
          border:`1px solid ${profile.color}33`,
          boxShadow:`0 0 60px ${profile.color}0a, inset 0 0 60px rgba(0,0,0,0.4)`,
        }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'100%', display:'block' }}>
            <defs>
              {withInten.map(d => {
                const c = heatColor(d.inten)
                return (
                  <radialGradient key={d.district} id={`hg-${d.district.replace(/\s/g,'_')}`}
                    cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={c} stopOpacity={d.inten * 0.85}/>
                    <stop offset="40%"  stopColor={c} stopOpacity={d.inten * 0.35}/>
                    <stop offset="100%" stopColor={c} stopOpacity={0}/>
                  </radialGradient>
                )
              })}
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={W} height={H} fill="#060a12"/>

            {/* Grid */}
            {Array.from({length:14}).map((_,i) => (
              <line key={`gx${i}`} x1={i*(W/13)} y1={0} x2={i*(W/13)} y2={H}
                stroke="rgba(46,196,182,0.04)" strokeWidth="0.5"/>
            ))}
            {Array.from({length:15}).map((_,i) => (
              <line key={`gy${i}`} x1={0} y1={i*(H/14)} x2={W} y2={i*(H/14)}
                stroke="rgba(46,196,182,0.04)" strokeWidth="0.5"/>
            ))}

            {/* District polygon outlines */}
            {withInten.filter(d => d.isPolygon).map(d => (
              <path key={d.district} d={d.path}
                fill="rgba(255,255,255,0.02)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.6}
                style={{ pointerEvents:'none' }}/>
            ))}

            {/* Heatmap blobs — large background glow */}
            {withInten.map(d => {
              const rx = 28 + d.inten * 52
              const ry = 24 + d.inten * 44
              return (
                <ellipse key={`blob-${d.district}`}
                  cx={d.cx} cy={d.cy} rx={rx} ry={ry}
                  fill={`url(#hg-${d.district.replace(/\s/g,'_')})`}
                  style={{ pointerEvents:'none' }}/>
              )
            })}

            {/* Mid ring */}
            {withInten.filter(d => d.inten > 0.3).map(d => {
              const c = heatColor(d.inten)
              const r = 10 + d.inten * 22
              return (
                <circle key={`ring-${d.district}`}
                  cx={d.cx} cy={d.cy} r={r}
                  fill={c} fillOpacity={d.inten * 0.22}
                  stroke={c} strokeWidth={0.8} strokeOpacity={d.inten * 0.5}
                  style={{ pointerEvents:'none' }}/>
              )
            })}

            {/* Core interactive circles */}
            {withInten.map(d => {
              const c   = heatColor(d.inten)
              const r   = 5 + d.inten * 14
              const sel = selected?.district === d.district
              const hov = hovered?.district  === d.district
              return (
                <g key={`core-${d.district}`}>
                  <circle cx={d.cx} cy={d.cy} r={r + (sel?3:hov?1:0)}
                    fill={c} fillOpacity={0.55 + d.inten * 0.4}
                    stroke={sel?'#fff':hov?c:'transparent'}
                    strokeWidth={sel?2:1}
                    style={{
                      cursor:'pointer',
                      filter: d.inten > 0.55
                        ? `drop-shadow(0 0 ${4+d.inten*8}px ${c})`
                        : undefined,
                    }}
                    onClick={() => setSelected(sel ? null : d)}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {/* White hot core for very intense */}
                  {d.inten > 0.65 && (
                    <circle cx={d.cx} cy={d.cy} r={3}
                      fill="#fff" fillOpacity={0.6 + d.inten * 0.3}
                      style={{ pointerEvents:'none' }}/>
                  )}
                  {/* Pulsing ring for critical */}
                  {d.inten > 0.75 && (
                    <circle cx={d.cx} cy={d.cy} r={r + 6}
                      fill="none" stroke={c} strokeWidth={1}
                      strokeOpacity={0.35} strokeDasharray="3 3"
                      style={{ pointerEvents:'none' }}/>
                  )}
                </g>
              )
            })}

            {/* Labels for top hotspots */}
            {withInten.filter(d => d.inten > 0.58).map(d => {
              const c = heatColor(d.inten)
              const r = 5 + d.inten * 14
              return (
                <text key={`lbl-${d.district}`}
                  x={d.cx} y={d.cy - r - 5}
                  textAnchor="middle" fontSize={8} fontWeight={700}
                  fontFamily="DM Mono, monospace" fill={c}
                  style={{ pointerEvents:'none', userSelect:'none',
                    filter:`drop-shadow(0 0 5px ${c})` }}>
                  {d.district.toUpperCase().split(' ')[0]}
                </text>
              )
            })}

            {/* Hover tooltip */}
            {hovered && (() => {
              const c  = heatColor(hovered.inten)
              const tx = Math.min(hovered.cx + 14, W - 165)
              const ty = Math.max(hovered.cy - 80, 10)
              return (
                <g style={{ pointerEvents:'none' }}>
                  <rect x={tx} y={ty} width={155} height={76} rx={8}
                    fill="#080b14" stroke={c} strokeWidth="1" strokeOpacity="0.6"
                    style={{ filter:'drop-shadow(0 4px 20px rgba(0,0,0,0.85))' }}/>
                  <text x={tx+10} y={ty+18} fontSize={12} fontWeight={700}
                    fontFamily="DM Mono,monospace" fill={c}>{hovered.district}</text>
                  <text x={tx+10} y={ty+31} fontSize={9} fill="#3d5070">
                    {hovered.division} Division
                  </text>
                  <text x={tx+10} y={ty+47} fontSize={10} fill="#8899bb">
                    Intensity: <tspan fill={c} fontWeight={700}>{Math.round(hovered.inten*100)}%</tspan>
                  </text>
                  <text x={tx+10} y={ty+61} fontSize={9} fill="#5a6a8a">
                    Risk: {hovered.risk_score} · Poverty: {hovered.poverty_index ?? '—'}%
                  </text>
                  {hovered.is_anomaly ? (
                    <text x={tx+10} y={ty+74} fontSize={8} fill="#E63946" fontWeight={700}>
                      ⚠ Statistical Anomaly
                    </text>
                  ) : null}
                </g>
              )
            })()}

            {/* Active time badge */}
            <g transform="translate(14,14)">
              <rect x={0} y={0} width={130} height={28} rx={7}
                fill="rgba(8,11,20,0.92)" stroke={profile.color} strokeWidth="1" strokeOpacity="0.5"/>
              <circle cx={16} cy={14} r={5} fill={profile.color}
                style={{ filter:`drop-shadow(0 0 6px ${profile.color})` }}/>
              <text x={28} y={19} fontSize={11} fontWeight={700}
                fontFamily="DM Mono,monospace" fill={profile.color}>
                {profile.icon} {profile.label}
              </text>
            </g>

            {/* Legend */}
            <g transform={`translate(14,${H-130})`}>
              <rect x={0} y={0} width={140} height={120} rx={8}
                fill="rgba(8,11,20,0.93)" stroke="rgba(46,196,182,0.2)" strokeWidth={1}/>
              <text x={10} y={18} fontSize={9} fill="#3d5070"
                fontFamily="monospace" letterSpacing="1">INTENSITY</text>
              {[
                { label:'Critical',  color:'#E63946', y:35  },
                { label:'High',      color:'#F4A261', y:55  },
                { label:'Moderate',  color:'#F9C74F', y:75  },
                { label:'Low',       color:'#52B788', y:95  },
              ].map(it => (
                <g key={it.label}>
                  <circle cx={18} cy={it.y} r={6} fill={it.color}
                    style={{ filter:`drop-shadow(0 0 4px ${it.color})` }}/>
                  <text x={32} y={it.y+4} fontSize={10} fill="#8899bb" fontFamily="monospace">
                    {it.label}
                  </text>
                </g>
              ))}
            </g>

            {/* Compass */}
            <g transform={`translate(${W-36},36)`}>
              <circle cx={0} cy={0} r={14} fill="rgba(8,11,20,0.8)"
                stroke="rgba(46,196,182,0.2)" strokeWidth={1}/>
              <polygon points="0,-10 3,0 0,3 -3,0" fill="#2eC4B6" fillOpacity="0.9"/>
              <polygon points="0,10 3,0 0,-3 -3,0"  fill="rgba(46,196,182,0.3)"/>
              <text x={0} y={-14} textAnchor="middle" fontSize={7} fill="#2eC4B6"
                fontFamily="monospace" fontWeight={700}>N</text>
            </g>
          </svg>

          {/* Bottom bar */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            background:'rgba(6,10,18,0.92)', backdropFilter:'blur(8px)',
            padding:'8px 16px 10px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            borderTop:'1px solid rgba(46,196,182,0.06)',
          }}>
            <span style={{ color:'#3d5070', fontSize:11 }}>
              Glow radius & intensity = crime density. Click a hotspot circle to inspect.
            </span>
            <span style={{ color:profile.color, fontSize:11, fontFamily:'DM Mono,monospace' }}>
              {withInten.filter(d=>d.inten>0.5).length} active hotspots
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Selected detail */}
          {selected ? (
            <div style={{ background:'#0d1117', border:`1px solid ${profile.color}44`,
              borderRadius:12, padding:'15px 16px',
              boxShadow:`0 0 24px ${profile.color}12` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ color:heatColor(selected.inten), fontWeight:700, fontSize:15 }}>
                    {selected.district}
                  </div>
                  <div style={{ color:'#3d5070', fontSize:11, marginTop:2 }}>
                    {selected.division} Division
                    {selected.is_anomaly
                      ? <span style={{color:'#E63946',marginLeft:8}}>⚠ Anomaly</span>
                      : null}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  background:'transparent', border:'none', color:'#3d5070',
                  fontSize:16, cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
              </div>

              {/* Time band breakdown */}
              <div style={{ marginBottom:12 }}>
                <div style={{ color:'#3d5070', fontSize:9, textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:8 }}>Intensity by Time Band</div>
                {Object.entries(TIME_BANDS).filter(([k])=>k!=='all').map(([key, p]) => {
                  const src   = KARNATAKA_DISTRICTS.find(k=>k.district===selected.district)??selected
                  const inten = clamp(p.fn({...selected,...src}))
                  const pct   = Math.round(inten*100)
                  return (
                    <div key={key} style={{ marginBottom:7 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ color:p.color, fontSize:11 }}>{p.icon} {p.label}</span>
                        <span style={{ color:'#cdd6f4', fontFamily:'DM Mono,monospace', fontSize:11 }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
                        <div style={{ width:`${pct}%`, height:'100%', borderRadius:2,
                          background:p.color, boxShadow:`0 0 5px ${p.color}88` }}/>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  ['Poverty',    `${selected.poverty_index??'—'}%`],
                  ['Unemp.',     `${selected.unemployment_rate??'—'}%`],
                  ['Literacy',   `${selected.literacy_rate??'—'}%`],
                  ['Risk Score', selected.risk_score],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:'rgba(255,255,255,0.04)',
                    borderRadius:6, padding:'7px 9px' }}>
                    <div style={{ color:'#3d5070', fontSize:10 }}>{k}</div>
                    <div style={{ color:'#cdd6f4', fontWeight:700, fontSize:13,
                      fontFamily:'DM Mono,monospace' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background:'#0d1117', border:'1px solid #1e2530',
              borderRadius:12, padding:'16px', color:'#3d5070', fontSize:12, lineHeight:1.8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:profile.color, marginBottom:8 }}>
                {profile.icon} {profile.label} Hotspots
              </div>
              Select a glowing circle on the map to see the full time-band intensity breakdown for that district.
            </div>
          )}

          {/* Top hotspots list */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:'14px 16px', flex:1 }}>
            <div style={{ color:profile.color, fontSize:12, fontWeight:600, marginBottom:12 }}>
              {profile.icon} Top Hotspots
            </div>
            {topHot.map((d, i) => {
              const c   = heatColor(d.inten)
              const pct = Math.round(d.inten*100)
              return (
                <div key={d.district} onClick={() => setSelected(d)}
                  style={{ marginBottom:9, cursor:'pointer', padding:'4px 6px',
                    borderRadius:6, background:selected?.district===d.district?`${c}12`:'transparent',
                    transition:'background 0.15s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#8899bb', fontSize:11 }}>
                      <span style={{ color:'#2a3a55', marginRight:5 }}>#{i+1}</span>
                      {d.district}
                    </span>
                    <span style={{ color:c, fontFamily:'DM Mono,monospace', fontSize:11, fontWeight:700 }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
                    <div style={{ width:`${pct}%`, height:'100%', borderRadius:2,
                      background:c, boxShadow:`0 0 5px ${c}88` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}