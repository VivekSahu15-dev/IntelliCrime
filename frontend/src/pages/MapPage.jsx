import { useEffect, useRef, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { api } from '../utils/api'
import { Card, Spinner, SectionHead, RiskBadge } from '../components/UI'

// Lazy-load Leaflet only in browser
let L = null

const RISK_COLORS = {
  Critical: '#E63946',
  High:     '#F4A261',
  Moderate: '#F9C74F',
  Low:      '#52B788',
}

const riskColor = (level) => RISK_COLORS[level] ?? '#6B7A99'

function getRiskLevel(score) {
  if (score >= 65) return 'Critical'
  if (score >= 45) return 'High'
  if (score >= 25) return 'Moderate'
  return 'Low'
}

export default function MapPage() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('All')

  const { data: risks, loading } = useApi(api.riskScores)

  useEffect(() => {
    if (loading || !risks || leafletRef.current) return

    async function initMap() {
      L = (await import('leaflet')).default

      const map = L.map(mapRef.current, {
        center: [14.5, 75.7],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      })

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 13,
      }).addTo(map)

      leafletRef.current = map

      // Add district markers
      risks.forEach(d => {
        const color  = riskColor(d.risk_level)
        const radius = 8 + (d.risk_score / 100) * 18

        // Pulsing circle for high-risk
        const circle = L.circleMarker([d.latitude, d.longitude], {
          radius,
          fillColor:   color,
          fillOpacity: 0.75,
          color:       color,
          weight:      1.5,
          opacity:     0.9,
        }).addTo(map)

        // Outer pulse ring for Critical/High
        if (d.risk_level === 'Critical' || d.risk_level === 'High') {
          L.circleMarker([d.latitude, d.longitude], {
            radius: radius + 6,
            fillColor: 'transparent',
            color,
            weight: 1,
            opacity: 0.35,
            dashArray: '4 4',
          }).addTo(map)
        }

        // Popup
        circle.bindPopup(`
          <div style="min-width:200px">
            <div style="font-weight:700;font-size:15px;color:#fff;margin-bottom:8px">${d.district}</div>
            <div style="color:var(--slate-4);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">${d.division} Division</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
              <div>
                <div style="color:var(--slate-4);font-size:10px">RISK SCORE</div>
                <div style="color:${color};font-family:DM Mono,monospace;font-size:18px;font-weight:500">${d.risk_score}</div>
              </div>
              <div>
                <div style="color:var(--slate-4);font-size:10px">LEVEL</div>
                <div style="color:${color};font-weight:600">${d.risk_level}</div>
              </div>
              <div>
                <div style="color:var(--slate-4);font-size:10px">POVERTY</div>
                <div style="color:#fff">${d.poverty_index ?? '—'}%</div>
              </div>
              <div>
                <div style="color:var(--slate-4);font-size:10px">LITERACY</div>
                <div style="color:#fff">${d.literacy_rate ?? '—'}%</div>
              </div>
              <div>
                <div style="color:var(--slate-4);font-size:10px">POPULATION</div>
                <div style="color:#fff">${d.population_2011?.toLocaleString('en-IN') ?? '—'}</div>
              </div>
              <div>
                <div style="color:var(--slate-4);font-size:10px">UNEMPLOYMENT</div>
                <div style="color:#fff">${d.unemployment_rate ?? '—'}%</div>
              </div>
            </div>
          </div>
        `, { maxWidth: 260 })

        circle.on('click', () => setSelected(d))
      })
    }

    initMap()

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [loading, risks])

  const filtered = risks
    ? (filter === 'All' ? risks : risks.filter(r => r.risk_level === filter))
    : []

  const counts = risks ? {
    Critical: risks.filter(r => r.risk_level === 'Critical').length,
    High:     risks.filter(r => r.risk_level === 'High').length,
    Moderate: risks.filter(r => r.risk_level === 'Moderate').length,
    Low:      risks.filter(r => r.risk_level === 'Low').length,
  } : {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Legend + filter row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--slate-4)', fontSize: 12, marginRight: 4 }}>Filter:</span>
        {['All', 'Critical', 'High', 'Moderate', 'Low'].map(lvl => (
          <button key={lvl} onClick={() => setFilter(lvl)} style={{
            padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filter === lvl ? riskColor(lvl) : 'var(--ink-4)'}`,
            background: filter === lvl ? `${riskColor(lvl)}22` : 'transparent',
            color: filter === lvl ? riskColor(lvl) : 'var(--slate-4)',
            transition: 'all 0.15s',
          }}>
            {lvl} {lvl !== 'All' && counts[lvl] !== undefined ? `(${counts[lvl]})` : ''}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {Object.entries(RISK_COLORS).map(([lvl, col]) => (
            <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
              <span style={{ fontSize: 11, color: 'var(--slate-4)' }}>{lvl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <Card style={{ padding: 0, overflow: 'hidden', height: 520 }}>
          {loading ? <Spinner /> : <div ref={mapRef} style={{ width: '100%', height: '100%' }} />}
        </Card>

        {/* District list */}
        <Card style={{ padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <SectionHead icon="◎" title={`Districts (${filtered.length})`} />
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.map((d, i) => (
              <div key={d.district}
                onClick={() => setSelected(d)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: selected?.district === d.district ? 'var(--ink-3)' : 'transparent',
                  border: `1px solid ${selected?.district === d.district ? 'var(--ink-4)' : 'transparent'}`,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{d.district}</span>
                  <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: riskColor(d.risk_level) }}>
                    {d.risk_score}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--slate-4)' }}>{d.division}</span>
                  <RiskBadge level={d.risk_level} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Selected district detail */}
      {selected && (
        <Card className="fade-in" style={{ borderColor: riskColor(selected.risk_level) + '40' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{selected.district}</div>
              <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 2 }}>{selected.division} Division</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 32, color: riskColor(selected.risk_level), fontWeight: 500 }}>
                {selected.risk_score}
              </div>
              <RiskBadge level={selected.risk_level} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Population',   value: selected.population_2011?.toLocaleString('en-IN') },
              { label: 'Literacy',     value: `${selected.literacy_rate}%` },
              { label: 'Poverty',      value: `${selected.poverty_index}%` },
              { label: 'Urban pop.',   value: `${selected.urban_population_pct}%` },
              { label: 'Unemployment', value: `${selected.unemployment_rate}%` },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '10px', background: 'var(--ink-3)', borderRadius: 8 }}>
                <div className="label">{m.label}</div>
                <div style={{ fontFamily: 'DM Mono,monospace', color: '#fff', fontSize: 15, fontWeight: 500, marginTop: 4 }}>
                  {m.value ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
