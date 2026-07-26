import { useState, useMemo } from 'react'
import SVG_DATA from '../data/karnataka_svg.json'
import { SectionHead } from '../components/UI'

const { svgWidth: W, svgHeight: H, features, points } = SVG_DATA

// ── Colour system ─────────────────────────────────────────────────────────────
const RISK = {
  Critical: { hex:'#E63946', glow:'rgba(230,57,70,0.5)',  dim:'rgba(230,57,70,0.18)', dark:'#5C0A10' },
  High:     { hex:'#F4A261', glow:'rgba(244,162,97,0.5)', dim:'rgba(244,162,97,0.18)',dark:'#7A4010' },
  Moderate: { hex:'#F9C74F', glow:'rgba(249,199,79,0.5)', dim:'rgba(249,199,79,0.15)',dark:'#7A6010' },
  Low:      { hex:'#52B788', glow:'rgba(82,183,136,0.5)', dim:'rgba(82,183,136,0.15)',dark:'#1A4A30' },
}
const rc = l => (RISK[l] ?? RISK.Low).hex

// ── All districts merged ──────────────────────────────────────────────────────
const ALL = [
  ...features.map(f => ({ ...f, isPolygon: true  })),
  ...points  .map(p => ({ ...p, isPolygon: false })),
].sort((a,b) => b.risk_score - a.risk_score)

const MODES = [
  { key:'choropleth', label:'▦ Choropleth' },
  { key:'3d',         label:'⬡ 3D Columns' },
  { key:'heatmap',    label:'◉ Heatmap'    },
]

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:'#0d1117', border:'1px solid #1e2530',
      borderRadius:10, padding:'14px 18px' }}>
      <div style={{ color:'#5a6a8a', fontSize:11, marginBottom:4 }}>{label}</div>
      <div style={{ color:color??'#fff', fontSize:26, fontWeight:700,
        fontFamily:'DM Mono,monospace', lineHeight:1 }}>{value}</div>
      {sub && <div style={{ color:'#3d4d6a', fontSize:10, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ mode }) {
  return (
    <div style={{
      position:'absolute', bottom:16, left:16,
      background:'rgba(8,11,20,0.96)', backdropFilter:'blur(12px)',
      border:'1px solid rgba(46,196,182,0.2)', borderRadius:10,
      padding:'12px 16px', minWidth:150, pointerEvents:'none', zIndex:10,
    }}>
      <div style={{ color:'#3d5070', fontSize:9, letterSpacing:'0.1em',
        textTransform:'uppercase', marginBottom:8 }}>Risk Level</div>
      {Object.entries(RISK).map(([lv, c]) => (
        <div key={lv} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <div style={{ width:mode==='choropleth'?14:9,
            height:mode==='choropleth'?9:9,
            borderRadius:mode==='choropleth'?2:'50%',
            background:c.hex, boxShadow:`0 0 6px ${c.hex}88`, flexShrink:0 }}/>
          <span style={{ color:'#8899bb', fontSize:11 }}>{lv}</span>
        </div>
      ))}
    </div>
  )
}

// ── Info panel ────────────────────────────────────────────────────────────────
function InfoPanel({ d, onClose }) {
  if (!d) return (
    <div style={{ background:'#0d1117', border:'1px solid #1e2530',
      borderRadius:12, padding:'18px', color:'#3d5070', fontSize:12, lineHeight:1.8 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#2eC4B6', marginBottom:8 }}>
        ◈ District Inspector
      </div>
      Click any district on the map to view its full risk profile, socio-economic data, and anomaly status.
    </div>
  )
  const c   = RISK[d.risk_level] ?? RISK.Low
  const pct = d.risk_score
  return (
    <div style={{ background:'#0d1117', border:`1px solid ${c.hex}44`,
      borderRadius:12, padding:'16px',
      boxShadow:`0 0 40px ${c.hex}18, inset 0 0 40px rgba(0,0,0,0.3)` }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div style={{ color:c.hex, fontWeight:700, fontSize:16, marginBottom:2 }}>{d.district}</div>
          <div style={{ color:'#3d5070', fontSize:11 }}>{d.division} Division</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          <span style={{ padding:'3px 9px', borderRadius:4, fontSize:11, fontWeight:700,
            background:`${c.hex}22`, color:c.hex, border:`1px solid ${c.hex}55` }}>
            {d.risk_level}
          </span>
          {d.is_anomaly ? (
            <span style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:700,
              background:'rgba(230,57,70,0.15)', color:'#E63946',
              border:'1px solid rgba(230,57,70,0.4)', letterSpacing:'0.04em' }}>
              ⚠ ANOMALY
            </span>
          ) : null}
        </div>
      </div>

      {/* Score bar */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ color:'#3d5070', fontSize:11 }}>Risk Score</span>
          <span style={{ color:c.hex, fontFamily:'DM Mono,monospace',
            fontWeight:700, fontSize:15 }}>{pct}<span style={{color:'#3d5070',fontSize:11}}>/100</span></span>
        </div>
        <div style={{ height:7, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', borderRadius:4,
            background:`linear-gradient(90deg,${c.dark},${c.hex})`,
            boxShadow:`0 0 10px ${c.hex}88`, transition:'width 0.5s ease' }}/>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, marginBottom:12 }}>
        {[
          ['Poverty Index', d.poverty_index    != null ? `${d.poverty_index}%`    : '—'],
          ['Unemployment',  d.unemployment_rate != null ? `${d.unemployment_rate}%` : '—'],
          ['Literacy Rate', d.literacy_rate     != null ? `${d.literacy_rate}%`   : '—'],
          ['Population',    d.population        != null ? `${(d.population/1e6).toFixed(2)}M` : '—'],
        ].map(([k,v]) => (
          <div key={k} style={{ background:'rgba(255,255,255,0.04)',
            borderRadius:7, padding:'8px 10px' }}>
            <div style={{ color:'#3d5070', fontSize:10, marginBottom:2 }}>{k}</div>
            <div style={{ color:'#cdd6f4', fontWeight:700, fontSize:13,
              fontFamily:'DM Mono,monospace' }}>{v}</div>
          </div>
        ))}
      </div>

      <button onClick={onClose} style={{ width:'100%', padding:'7px',
        borderRadius:7, cursor:'pointer', fontSize:11,
        border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)',
        color:'#3d5070', transition:'all 0.15s' }}>
        ✕ Deselect
      </button>
    </div>
  )
}

// ── SVG Map ───────────────────────────────────────────────────────────────────
function KarnatakaMap({ mode, filter, selected, onSelect }) {
  const [hovered, setHovered] = useState(null)

  const visible = filter === 'All' ? ALL : ALL.filter(d => d.risk_level === filter)

  function districtFill(d) {
    const c   = RISK[d.risk_level] ?? RISK.Low
    const sel = selected?.district === d.district
    const hov = hovered?.district  === d.district

    if (mode === 'choropleth') {
      if (sel) return c.hex
      if (hov) return c.hex + 'dd'
      return c.hex + '99'
    }
    if (mode === '3d') return 'rgba(255,255,255,0.03)'
    if (mode === 'heatmap') return 'transparent'
    return c.hex + '80'
  }

  function districtStroke(d) {
    const c   = RISK[d.risk_level] ?? RISK.Low
    const sel = selected?.district === d.district
    const hov = hovered?.district  === d.district
    if (sel) return '#ffffff'
    if (hov) return c.hex
    if (mode === 'choropleth') return c.hex + 'cc'
    return 'rgba(46,196,182,0.25)'
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width:'100%', height:'100%', display:'block' }}
    >
      <defs>
        {/* Glow filters per risk level */}
        {Object.entries(RISK).map(([lv, c]) => (
          <filter key={lv} id={`glow-${lv}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feColorMatrix in="blur" type="matrix"
              values={`0 0 0 0 ${parseInt(c.hex.slice(1,3),16)/255}
                       0 0 0 0 ${parseInt(c.hex.slice(3,5),16)/255}
                       0 0 0 0 ${parseInt(c.hex.slice(5,7),16)/255}
                       0 0 0 1 0`} result="colored"/>
            <feMerge><feMergeNode in="colored"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.6"/>
        </filter>
        <filter id="glow-white">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width={W} height={H} fill="#060a12"/>

      {/* Subtle grid */}
      {Array.from({length:14}).map((_,i) => (
        <line key={`gx${i}`} x1={i*(W/13)} y1={0} x2={i*(W/13)} y2={H}
          stroke="rgba(46,196,182,0.04)" strokeWidth="0.5"/>
      ))}
      {Array.from({length:15}).map((_,i) => (
        <line key={`gy${i}`} x1={0} y1={i*(H/14)} x2={W} y2={i*(H/14)}
          stroke="rgba(46,196,182,0.04)" strokeWidth="0.5"/>
      ))}

      {/* ── CHOROPLETH / 3D border layer ──────────────────────────────────── */}
      {visible.filter(d => d.isPolygon).map(d => {
        const c   = RISK[d.risk_level] ?? RISK.Low
        const sel = selected?.district === d.district
        const hov = hovered?.district  === d.district

        return (
          <g key={d.district}>
            {/* Heatmap glow blob (behind polygon) */}
            {mode === 'heatmap' && (
              <ellipse cx={d.cx} cy={d.cy}
                rx={18 + d.risk_score * 0.38}
                ry={16 + d.risk_score * 0.32}
                fill={c.hex}
                fillOpacity={0.08 + (d.risk_score/100)*0.18}
                style={{ pointerEvents:'none' }}
              />
            )}

            {/* District polygon */}
            <path
              d={d.path}
              fill={districtFill(d)}
              stroke={districtStroke(d)}
              strokeWidth={sel ? 2 : hov ? 1.5 : 0.8}
              style={{ cursor:'pointer', transition:'all 0.15s' }}
              filter={sel ? `url(#glow-${d.risk_level})` : undefined}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(sel ? null : d)}
            />

            {/* 3D column on top of polygon */}
            {mode === '3d' && (() => {
              const colH = Math.max(12, (d.risk_score/100)*70)
              const colW = 12
              const x    = d.cx - colW/2
              const y    = d.cy - colH
              const depth= 5
              const clr  = c.hex
              const dark = c.dark
              return (
                <g style={{ cursor:'pointer', pointerEvents:'none' }}>
                  {/* Shadow */}
                  <ellipse cx={d.cx+2} cy={d.cy+3} rx={colW*0.7} ry={3}
                    fill="#000" fillOpacity="0.4" style={{filter:'blur(2px)'}}/>
                  {/* Right face */}
                  <polygon
                    points={`${x+colW},${y} ${x+colW+depth},${y-depth} ${x+colW+depth},${d.cy-depth} ${x+colW},${d.cy}`}
                    fill={dark} fillOpacity="0.9"/>
                  {/* Top face */}
                  <polygon
                    points={`${x},${y} ${x+depth},${y-depth} ${x+colW+depth},${y-depth} ${x+colW},${y}`}
                    fill={clr} fillOpacity="1" style={{filter:'brightness(1.4)'}}/>
                  {/* Front face */}
                  <rect x={x} y={y} width={colW} height={colH}
                    fill={clr} fillOpacity="0.95"
                    style={{
                      filter: sel || d.risk_score>=70
                        ? `drop-shadow(0 0 ${sel?10:6}px ${clr})`
                        : undefined
                    }}/>
                  {/* Glow pulse for critical */}
                  {d.risk_score >= 70 && (
                    <rect x={x-2} y={y-2} width={colW+4} height={colH+4}
                      fill="none" stroke={clr} strokeWidth="1"
                      fillOpacity="0" strokeOpacity="0.4" rx="1"/>
                  )}
                </g>
              )
            })()}

            {/* Heatmap concentric rings */}
            {mode === 'heatmap' && (
              <g style={{ pointerEvents:'none' }}>
                <circle cx={d.cx} cy={d.cy}
                  r={10 + d.risk_score*0.22}
                  fill={c.hex} fillOpacity={0.35 + (d.risk_score/100)*0.35}
                  stroke={c.hex} strokeWidth="1" strokeOpacity="0.6"
                  style={{ filter:`drop-shadow(0 0 ${4+d.risk_score*0.08}px ${c.hex})` }}
                />
                <circle cx={d.cx} cy={d.cy} r={4}
                  fill="#fff" fillOpacity="0.9"/>
              </g>
            )}

            {/* District name label */}
            {(mode === 'choropleth' || (mode==='3d' && d.risk_score>=50)) && (
              <text x={d.cx} y={mode==='3d' ? d.cy-(d.risk_score/100)*70-16 : d.cy}
                textAnchor="middle" dominantBaseline="middle"
                style={{ pointerEvents:'none', userSelect:'none' }}
                fontSize={mode==='3d' ? 8 : (sel||hov) ? 10 : 9}
                fontWeight={sel||hov ? 700 : 500}
                fontFamily="DM Mono, monospace"
                fill={mode==='choropleth'
                  ? (sel||hov ? '#fff' : 'rgba(255,255,255,0.85)')
                  : c.hex}
                style={{
                  pointerEvents:'none', userSelect:'none',
                  textShadow: mode==='choropleth'
                    ? '0 1px 4px rgba(0,0,0,0.9)'
                    : `0 0 8px ${c.hex}`,
                  filter: mode==='3d' ? `drop-shadow(0 0 4px ${c.hex})` : undefined,
                }}
              >
                {d.district.length > 10 ? d.district.replace(' ', '\n') : d.district}
              </text>
            )}
            {mode === 'heatmap' && d.risk_score >= 60 && (
              <text x={d.cx} y={d.cy - (10+d.risk_score*0.22) - 5}
                textAnchor="middle"
                fontSize={8} fontWeight={700}
                fontFamily="DM Mono, monospace"
                fill={c.hex}
                style={{ pointerEvents:'none', userSelect:'none',
                  filter:`drop-shadow(0 0 5px ${c.hex})` }}>
                {d.district.split(' ')[0].toUpperCase()}
              </text>
            )}
          </g>
        )
      })}

      {/* ── Point districts (4 missing from GeoJSON) ──────────────────────── */}
      {visible.filter(d => !d.isPolygon).map(d => {
        const c   = RISK[d.risk_level] ?? RISK.Low
        const sel = selected?.district === d.district
        const r   = mode==='heatmap' ? 8+(d.risk_score/100)*18
                  : mode==='3d'      ? 7
                  : 10

        return (
          <g key={d.district}>
            {mode==='heatmap' && (
              <circle cx={d.cx} cy={d.cy} r={r*2.5}
                fill={c.hex} fillOpacity="0.08" style={{pointerEvents:'none'}}/>
            )}
            <circle cx={d.cx} cy={d.cy} r={r}
              fill={mode==='choropleth' ? c.hex+'bb' : c.hex}
              fillOpacity={mode==='3d'?0.9:0.85}
              stroke={sel?'#fff':c.hex} strokeWidth={sel?2:1.2}
              style={{ cursor:'pointer', filter:`drop-shadow(0 0 ${sel?8:4}px ${c.hex})` }}
              onClick={() => onSelect(sel?null:d)}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
            />
            <text x={d.cx} y={d.cy-r-4} textAnchor="middle"
              fontSize={8} fontWeight={700} fontFamily="DM Mono, monospace"
              fill={c.hex}
              style={{ pointerEvents:'none', userSelect:'none',
                filter:`drop-shadow(0 0 4px ${c.hex})` }}>
              {d.district.split(' ')[0]}
            </text>
          </g>
        )
      })}

      {/* ── Hover tooltip ────────────────────────────────────────────────── */}
      {hovered && (() => {
        const c  = RISK[hovered.risk_level] ?? RISK.Low
        const tx = Math.min(hovered.cx + 12, W - 160)
        const ty = Math.max(hovered.cy - 70, 10)
        return (
          <g style={{ pointerEvents:'none' }}>
            <rect x={tx} y={ty} width={150} height={70} rx={8}
              fill="#080b14" stroke={c.hex} strokeWidth="1" strokeOpacity="0.6"
              style={{ filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.8))' }}/>
            <text x={tx+10} y={ty+18} fontSize={12} fontWeight={700}
              fontFamily="DM Mono,monospace" fill={c.hex}>{hovered.district}</text>
            <text x={tx+10} y={ty+32} fontSize={9} fill="#3d5070">{hovered.division} Division</text>
            <text x={tx+10} y={ty+48} fontSize={10} fill="#8899bb">
              Risk: <tspan fill={c.hex} fontWeight={700}>{hovered.risk_score}/100</tspan>
            </text>
            {hovered.poverty_index != null && (
              <text x={tx+10} y={ty+62} fontSize={9} fill="#5a6a8a">
                Poverty: {hovered.poverty_index}%  Unemp: {hovered.unemployment_rate}%
              </text>
            )}
          </g>
        )
      })()}

      {/* ── Compass rose ──────────────────────────────────────────────────── */}
      <g transform={`translate(${W-36},36)`} style={{pointerEvents:'none'}}>
        <circle cx={0} cy={0} r={14} fill="rgba(8,11,20,0.8)" stroke="rgba(46,196,182,0.2)" strokeWidth={1}/>
        <polygon points="0,-10 3,0 0,3 -3,0" fill="#2eC4B6" fillOpacity="0.9"/>
        <polygon points="0,10 3,0 0,-3 -3,0"  fill="rgba(46,196,182,0.3)"/>
        <text x={0} y={-14} textAnchor="middle" fontSize={7} fill="#2eC4B6"
          fontFamily="monospace" fontWeight={700} dominantBaseline="auto">N</text>
      </g>

      {/* ── Scale bar ─────────────────────────────────────────────────────── */}
      <g transform={`translate(${W-130},${H-20})`} style={{pointerEvents:'none'}}>
        <line x1={0} y1={0} x2={80} y2={0} stroke="rgba(46,196,182,0.4)" strokeWidth={1.5}/>
        <line x1={0} y1={-4} x2={0}  y2={4} stroke="rgba(46,196,182,0.4)" strokeWidth={1.5}/>
        <line x1={80} y1={-4} x2={80} y2={4} stroke="rgba(46,196,182,0.4)" strokeWidth={1.5}/>
        <text x={40} y={-6} textAnchor="middle" fontSize={8}
          fill="rgba(46,196,182,0.5)" fontFamily="monospace">~200 km</text>
      </g>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Map3DPage() {
  const [mode,     setMode]     = useState('choropleth')
  const [filter,   setFilter]   = useState('All')
  const [selected, setSelected] = useState(null)

  const critical = ALL.filter(d => d.risk_level==='Critical').length
  const high     = ALL.filter(d => d.risk_level==='High').length
  const avgRisk  = Math.round(ALL.reduce((a,d)=>a+d.risk_score,0)/ALL.length)
  const topFive  = ALL.slice(0,5)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionHead icon="◎" title="District Risk Map — Karnataka" />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <StatCard label="Districts Mapped" value={ALL.length}  color="#2eC4B6" />
        <StatCard label="Critical Risk"    value={critical}    color="#E63946" sub="immediate attention" />
        <StatCard label="High Risk"        value={high}        color="#F4A261" sub="elevated monitoring" />
        <StatCard label="Avg Risk Score"   value={avgRisk}     color="#F9C74F" sub="/ 100" />
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ color:'#3d5070', fontSize:12, fontWeight:500 }}>View:</span>
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            padding:'7px 15px', borderRadius:7, fontSize:12, fontWeight:600,
            cursor:'pointer', transition:'all 0.18s',
            border:`1px solid ${mode===m.key?'#2eC4B6':'#1e2530'}`,
            background: mode===m.key?'rgba(46,196,182,0.12)':'#0d1117',
            color: mode===m.key?'#2eC4B6':'#3d5070',
          }}>{m.label}</button>
        ))}
        <div style={{ width:1, height:20, background:'#1e2530', margin:'0 4px' }}/>
        <span style={{ color:'#3d5070', fontSize:12, fontWeight:500 }}>Filter:</span>
        {['All','Critical','High','Moderate','Low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'5px 13px', borderRadius:20, fontSize:11, fontWeight:600,
            cursor:'pointer', transition:'all 0.15s',
            border:`1px solid ${filter===f?(RISK[f]?.hex??'#2eC4B6'):'#1e2530'}`,
            background: filter===f?`${RISK[f]?.hex??'#2eC4B6'}18`:'transparent',
            color: filter===f?(RISK[f]?.hex??'#2eC4B6'):'#3d5070',
          }}>{f}</button>
        ))}
      </div>

      {/* Map + panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 272px', gap:14 }}>
        {/* SVG map card */}
        <div style={{
          position:'relative', borderRadius:14, overflow:'hidden',
          background:'#060a12',
          border:'1px solid #1e2530',
          boxShadow:'0 0 60px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.3)',
        }}>
          <KarnatakaMap mode={mode} filter={filter}
            selected={selected} onSelect={setSelected} />
          <Legend mode={mode} />

          {/* Mode badge */}
          <div style={{
            position:'absolute', top:14, left:14,
            background:'rgba(8,11,20,0.9)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(46,196,182,0.25)', borderRadius:7,
            padding:'6px 12px', fontSize:11, fontWeight:700, color:'#2eC4B6',
            letterSpacing:'0.04em',
          }}>
            {MODES.find(m=>m.key===mode)?.label} · Karnataka
          </div>

          {/* Bottom bar */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            background:'rgba(6,10,18,0.92)', backdropFilter:'blur(8px)',
            padding:'8px 16px 10px',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            borderTop:'1px solid rgba(46,196,182,0.08)',
          }}>
            <span style={{ color:'#3d5070', fontSize:11 }}>
              {mode==='choropleth' && 'Polygon fill = risk level. Hover to preview, click to inspect.'}
              {mode==='3d' && 'Column height = risk score. Click any district for details.'}
              {mode==='heatmap' && 'Glow intensity = crime density. Click to inspect district.'}
            </span>
            <span style={{ color:'#2eC4B6', fontSize:11, fontFamily:'DM Mono,monospace' }}>
              KA · {ALL.length} districts
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <InfoPanel d={selected} onClose={() => setSelected(null)} />

          {/* Top 5 */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:'14px 16px' }}>
            <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:12 }}>
              ⚑ Highest Risk
            </div>
            {topFive.map((d, i) => {
              const c = RISK[d.risk_level] ?? RISK.Low
              return (
                <div key={d.district} onClick={() => setSelected(d)}
                  style={{ marginBottom:10, cursor:'pointer', padding:'5px 7px',
                    borderRadius:7, transition:'background 0.15s',
                    background:selected?.district===d.district?`${c.hex}12`:'transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:'#8899bb', fontSize:12 }}>
                      <span style={{ color:'#2a3a55', marginRight:5 }}>#{i+1}</span>
                      {d.district}
                    </span>
                    <span style={{ color:c.hex, fontFamily:'DM Mono,monospace',
                      fontSize:12, fontWeight:700 }}>{d.risk_score}</span>
                  </div>
                  <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
                    <div style={{ width:`${d.risk_score}%`, height:'100%', borderRadius:2,
                      background:`linear-gradient(90deg,${c.dark},${c.hex})`,
                      boxShadow:`0 0 6px ${c.hex}88` }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Breakdown */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2530',
            borderRadius:12, padding:'14px 16px' }}>
            <div style={{ color:'#2eC4B6', fontSize:12, fontWeight:600, marginBottom:10 }}>
              Distribution
            </div>
            {['Critical','High','Moderate','Low'].map(lv => {
              const count = ALL.filter(d=>d.risk_level===lv).length
              const pct   = Math.round((count/ALL.length)*100)
              const c     = RISK[lv]
              return (
                <div key={lv} style={{ marginBottom:9 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ color:c.hex, fontSize:11 }}>{lv}</span>
                    <span style={{ color:'#3d5070', fontSize:11 }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.05)' }}>
                    <div style={{ width:`${pct}%`, height:'100%', borderRadius:2,
                      background:`linear-gradient(90deg,${c.dark},${c.hex})`,
                      boxShadow:`0 0 6px ${c.hex}66` }}/>
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