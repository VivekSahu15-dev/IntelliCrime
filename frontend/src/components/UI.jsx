// IntelliCrime — Shared UI primitives

export function Card({ children, className = '', style }) {
  return (
    <div className={`card fade-in ${className}`} style={style}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, sub, badge, color = '#fff', mono = true }) {
  return (
    <Card>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className={mono ? 'stat-val' : ''} style={{ color, fontSize: mono ? 28 : 22, fontWeight: 600 }}>
        {value}
      </div>
      {sub && <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 4 }}>{sub}</div>}
      {badge && <div style={{ marginTop: 8 }}>{badge}</div>}
    </Card>
  )
}

export function Badge({ label, type = 'slate' }) {
  return <span className={`badge badge-${type}`}>{label}</span>
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <div style={{
        width: 28, height: 28, border: '2px solid var(--ink-4)',
        borderTopColor: 'var(--teal)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export function SectionHead({ icon, title }) {
  return (
    <div className="section-head">
      <span style={{ color: 'var(--teal)', fontSize: 16 }}>{icon}</span>
      <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{title}</span>
    </div>
  )
}

export function RiskBadge({ level }) {
  const map = { Critical: 'red', High: 'amber', Moderate: 'amber', Low: 'green' }
  return <Badge label={level} type={map[level] || 'slate'} />
}

export function ErrorMsg({ msg }) {
  return (
    <div style={{ color: 'var(--signal)', fontSize: 13, padding: '12px 0' }}>
      ⚠ {msg}
    </div>
  )
}
