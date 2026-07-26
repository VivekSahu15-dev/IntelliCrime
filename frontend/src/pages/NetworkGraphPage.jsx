import { useEffect, useRef, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { Card, Spinner, SectionHead, RiskBadge } from '../components/UI'

const RISK_COLOR  = { High: '#E63946', Moderate: '#F4A261', Low: '#52B788' }
const EDGE_COLOR  = { division: '#364156', socio_cluster: '#2EC4B6', anomaly: '#E63946' }
const DIV_COLOR   = { Bengaluru: '#2EC4B6', Mysuru: '#F4A261', Belgaum: '#E63946', Gulbarga: '#F9C74F' }

export default function NetworkGraphPage() {
  const svgRef    = useRef(null)
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')   // all | division | socio_cluster | anomaly
  const [highlight, setHighlight] = useState(null)  // division name

  const { data, loading } = useApi(() =>
    fetch('/api/ml/network-graph').then(r => r.json())
  )

  useEffect(() => {
    if (!data || !svgRef.current) return
    buildGraph(data, svgRef.current, filter, highlight, setSelected)
  }, [data, filter, highlight])

  const stats = data?.stats ?? {}
  const divisions = data?.divisions ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--slate-4)', fontSize: 12 }}>Edge type:</span>
        {[
          { key: 'all',          label: 'All connections' },
          { key: 'division',     label: 'Geographic (division)' },
          { key: 'socio_cluster',label: 'Socio-economic cluster' },
          { key: 'anomaly',      label: 'Anomaly links' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filter === f.key ? EDGE_COLOR[f.key] || 'var(--teal)' : 'var(--ink-4)'}`,
            background: filter === f.key ? `${EDGE_COLOR[f.key] || 'var(--teal)'}22` : 'transparent',
            color: filter === f.key ? (EDGE_COLOR[f.key] || 'var(--teal)') : 'var(--slate-4)',
            transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--slate-4)', fontSize: 12 }}>
          Highlight division:
        </span>
        {divisions.map(div => (
          <button key={div} onClick={() => setHighlight(h => h === div ? null : div)} style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${highlight === div ? DIV_COLOR[div] : 'var(--ink-4)'}`,
            background: highlight === div ? `${DIV_COLOR[div]}22` : 'transparent',
            color: highlight === div ? DIV_COLOR[div] : 'var(--slate-4)',
            transition: 'all 0.15s',
          }}>{div}</button>
        ))}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'District nodes', value: stats.total_nodes, color: 'var(--teal)' },
          { label: 'Connections',    value: stats.total_edges, color: 'var(--slate-2)' },
          { label: 'Anomaly nodes',  value: stats.anomaly_nodes, color: 'var(--signal)' },
          { label: 'High-risk nodes',value: stats.high_risk_nodes, color: '#F4A261' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '12px 16px' }}>
            <div className="label">{s.label}</div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 24, color: s.color, fontWeight: 500, lineHeight: 1.2 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Graph + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <Card style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {loading
            ? <div style={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
            : <svg ref={svgRef} width="100%" height="520"
                style={{ display: 'block', cursor: 'grab', background: 'transparent' }} />
          }
          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {Object.entries(EDGE_COLOR).map(([type, col]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: col, opacity: 0.8 }} />
                <span style={{ fontSize: 10, color: 'var(--slate-4)' }}>{type.replace('_',' ')}</span>
              </div>
            ))}
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(RISK_COLOR).map(([r, c]) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 10, color: 'var(--slate-4)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Detail panel */}
        <Card style={{ overflow: 'auto' }}>
          <SectionHead icon="◉" title="Node detail" />
          {selected ? (
            <div className="fade-in">
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{selected.id}</div>
              <div style={{ color: 'var(--slate-4)', fontSize: 12, marginBottom: 12 }}>{selected.division} Division</div>
              <RiskBadge level={selected.risk_level} />
              {selected.is_anomaly && (
                <span className="badge badge-red" style={{ marginLeft: 8 }}>⚠ Anomaly</span>
              )}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Risk score',    value: selected.risk_score },
                  { label: 'Poverty',       value: `${selected.poverty_index}%` },
                  { label: 'Literacy',      value: `${selected.literacy_rate}%` },
                  { label: 'Unemployment',  value: `${selected.unemployment}%` },
                  { label: 'Population',    value: selected.population?.toLocaleString('en-IN') },
                  { label: 'Socio cluster', value: `Cluster ${selected.socio_cluster}` },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--ink-4)' }}>
                    <span style={{ color: 'var(--slate-4)', fontSize: 12 }}>{m.label}</span>
                    <span style={{ fontFamily: 'DM Mono,monospace', color: '#fff', fontSize: 12 }}>{m.value}</span>
                  </div>
                ))}
              </div>
              {selected.anomaly_severity > 0 && (
                <div style={{ marginTop: 12, padding: '10px', background: 'rgba(230,57,70,0.08)', borderRadius: 6, border: '1px solid rgba(230,57,70,0.2)' }}>
                  <div style={{ fontSize: 11, color: 'var(--signal)', fontWeight: 600, marginBottom: 4 }}>Anomaly severity</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'var(--ink-4)', borderRadius: 3 }}>
                      <div style={{ width: `${selected.anomaly_severity}%`, height: '100%', background: 'var(--signal)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: 'var(--signal)' }}>{selected.anomaly_severity}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--slate-4)', fontSize: 13, marginTop: 20, textAlign: 'center', lineHeight: 1.7 }}>
              Click any node in the graph to see its intelligence profile
            </div>
          )}
        </Card>
      </div>

      {/* Intelligence insights */}
      <Card>
        <SectionHead icon="◈" title="Network intelligence insights" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {[
            { icon: '🔴', title: 'Anomaly cluster',    body: 'Bengaluru Urban, Yadgir, Raichur, Dakshina Kannada and Chamarajanagar are flagged as statistical anomalies. Red edges connect them — these districts warrant priority investigative attention.' },
            { icon: '🟡', title: 'Gulbarga division',  body: 'Yadgir, Raichur, Kalaburagi, Koppal, Ballari and Vijayapura form a tight socio-economic cluster in the Gulbarga division with high poverty and low literacy — systemic risk zone.' },
            { icon: '🟢', title: 'Coastal corridor',   body: 'Dakshina Kannada, Udupi and Uttara Kannada share similar high-literacy, lower-poverty profiles connected by geographic proximity. Anomaly in DK stands out strongly.' },
          ].map(item => (
            <div key={item.title} style={{ padding: '12px 14px', background: 'var(--ink-3)', borderRadius: 8, border: '1px solid var(--ink-4)' }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6 }}>{item.icon} {item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--slate-4)', lineHeight: 1.6 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── D3 force-directed graph (pure vanilla D3 loaded from CDN) ─────────────────
function buildGraph(data, svgEl, filter, highlight, onSelect) {
  // Remove previous render
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild)

  const W = svgEl.clientWidth || 700
  const H = 520

  const nodes = data.nodes.map(n => ({ ...n }))
  const edges = data.edges
    .filter(e => filter === 'all' || e.type === filter)
    .map(e => ({ ...e }))

  const nodeMap = {}
  nodes.forEach(n => { nodeMap[n.id] = n })

  // SVG setup
  const ns = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(ns, 'g')
  svgEl.appendChild(g)

  // Draw edges
  const edgeEls = edges.map(e => {
    const line = document.createElementNS(ns, 'line')
    const col = EDGE_COLOR[e.type] || '#364156'
    line.setAttribute('stroke', col)
    line.setAttribute('stroke-width', e.type === 'anomaly' ? '2' : '1')
    line.setAttribute('stroke-opacity', e.type === 'anomaly' ? '0.7' : '0.3')
    if (e.type === 'anomaly') line.setAttribute('stroke-dasharray', '4 3')
    g.appendChild(line)
    return { el: line, edge: e }
  })

  // Draw nodes
  const nodeEls = nodes.map(n => {
    const grp = document.createElementNS(ns, 'g')
    grp.style.cursor = 'pointer'

    const dimmed = highlight && n.division !== highlight
    const col = DIV_COLOR[n.division] || RISK_COLOR[n.risk_level] || '#6B7A99'
    const r   = n.node_size || 10

    // Outer pulse ring for anomalies
    if (n.is_anomaly) {
      const ring = document.createElementNS(ns, 'circle')
      ring.setAttribute('r', r + 5)
      ring.setAttribute('fill', 'none')
      ring.setAttribute('stroke', '#E63946')
      ring.setAttribute('stroke-width', '1')
      ring.setAttribute('stroke-opacity', '0.4')
      ring.setAttribute('stroke-dasharray', '3 3')
      grp.appendChild(ring)
    }

    const circle = document.createElementNS(ns, 'circle')
    circle.setAttribute('r', r)
    circle.setAttribute('fill', col)
    circle.setAttribute('fill-opacity', dimmed ? '0.2' : '0.85')
    circle.setAttribute('stroke', n.risk_level === 'High' ? '#E63946' : col)
    circle.setAttribute('stroke-width', n.risk_level === 'High' ? '2' : '1')
    circle.setAttribute('stroke-opacity', dimmed ? '0.2' : '1')
    grp.appendChild(circle)

    const label = document.createElementNS(ns, 'text')
    label.textContent = n.id.length > 9 ? n.id.slice(0, 8) + '…' : n.id
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dy', r + 12)
    label.setAttribute('font-size', '9')
    label.setAttribute('fill', dimmed ? '#364156' : '#C5CCDB')
    label.setAttribute('font-family', 'DM Sans, sans-serif')
    grp.appendChild(label)

    grp.addEventListener('click', () => onSelect(n))
    grp.addEventListener('mouseenter', () => {
      circle.setAttribute('fill-opacity', '1')
      circle.setAttribute('stroke-width', '2.5')
    })
    grp.addEventListener('mouseleave', () => {
      circle.setAttribute('fill-opacity', dimmed ? '0.2' : '0.85')
      circle.setAttribute('stroke-width', n.risk_level === 'High' ? '2' : '1')
    })

    g.appendChild(grp)
    return { el: grp, circle, node: n }
  })

  // Simple force simulation (no D3 dependency — pure JS)
  const REPEL = 800, ATTRACT = 0.02, CENTER = 0.01, DAMP = 0.85
  const cx = W / 2, cy = H / 2

  nodes.forEach(n => {
    n.x = cx + (Math.random() - 0.5) * 300
    n.y = cy + (Math.random() - 0.5) * 300
    n.vx = 0; n.vy = 0
  })

  function tick() {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = REPEL / (dist * dist)
        nodes[i].vx += force * dx / dist
        nodes[i].vy += force * dy / dist
        nodes[j].vx -= force * dx / dist
        nodes[j].vy -= force * dy / dist
      }
    }

    // Edge attraction
    edges.forEach(e => {
      const s = nodeMap[e.source], t = nodeMap[e.target]
      if (!s || !t) return
      const dx = t.x - s.x, dy = t.y - s.y
      const str = ATTRACT * (e.weight || 1)
      s.vx += dx * str; s.vy += dy * str
      t.vx -= dx * str; t.vy -= dy * str
    })

    // Center pull
    nodes.forEach(n => {
      n.vx += (cx - n.x) * CENTER
      n.vy += (cy - n.y) * CENTER
      n.vx *= DAMP; n.vy *= DAMP
      n.x  += n.vx;  n.y  += n.vy
      // Clamp to bounds
      n.x = Math.max(24, Math.min(W - 24, n.x))
      n.y = Math.max(24, Math.min(H - 24, n.y))
    })

    // Update positions
    edgeEls.forEach(({ el, edge }) => {
      const s = nodeMap[edge.source], t = nodeMap[edge.target]
      if (!s || !t) return
      el.setAttribute('x1', s.x); el.setAttribute('y1', s.y)
      el.setAttribute('x2', t.x); el.setAttribute('y2', t.y)
    })
    nodeEls.forEach(({ el, node }) => {
      el.setAttribute('transform', `translate(${node.x},${node.y})`)
    })
  }

  // Run simulation
  let frame = 0
  function loop() {
    tick()
    frame++
    if (frame < 200) requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  // Pan + zoom
  let scale = 1, tx = 0, ty = 0, dragging = false, startX, startY
  svgEl.addEventListener('wheel', e => {
    e.preventDefault()
    scale = Math.max(0.4, Math.min(3, scale - e.deltaY * 0.001))
    g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`)
  })
  svgEl.addEventListener('mousedown', e => { dragging = true; startX = e.clientX - tx; startY = e.clientY - ty })
  svgEl.addEventListener('mousemove', e => {
    if (!dragging) return
    tx = e.clientX - startX; ty = e.clientY - startY
    g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`)
  })
  svgEl.addEventListener('mouseup', () => { dragging = false })
}