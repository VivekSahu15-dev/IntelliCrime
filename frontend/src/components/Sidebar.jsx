const NAV = [
  { id: 'overview',     icon: '⬡', label: 'Overview',              section: 'Dashboard' },
  { id: 'map3d',        icon: '◎', label: '3D District Map',        section: null, badge: 'NEW' },
  { id: 'hotspot',      icon: '◉', label: 'Crime Hotspot Map',      section: null },
  { id: 'crimes',       icon: '◈', label: 'Crime Analysis',         section: 'Intelligence' },
  { id: 'victims',      icon: '◇', label: 'Victim Profiles',        section: null },
  { id: 'network',      icon: '⬕', label: 'Risk Network',           section: null },
  { id: 'networkgraph', icon: '◉', label: 'Criminal Network Graph', section: null },
  { id: 'compare',      icon: '⊞', label: 'National Ranking',       section: null },
  { id: 'socio',        icon: '◐', label: 'Socio-Economic',         section: 'Analytics' },
  { id: 'ml',           icon: '⬢', label: 'AI/ML Intelligence',     section: null, badge: 'ML' },
  { id: 'upload',       icon: '⬆', label: 'Data Upload',            section: 'Operations', badge: 'NEW' },
]

export default function Sidebar({ active, onSelect }) {
  let lastSection = null

  return (
    <aside style={{
      width: 224, minHeight: '100vh',
      background: 'var(--ink-2)',
      borderRight: '1px solid var(--ink-4)',
      display: 'flex', flexDirection: 'column',
      padding: '0 12px', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 8px 18px', borderBottom: '1px solid var(--ink-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'column' }}>
                   <img src="/logo.png" alt="IntelliCrime Logo" className="h-auto w-32"/>

          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>IntelliCrime</div>
            <div style={{ color: 'var(--slate-4)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>KSP Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 10 }}>
        {NAV.map(item => {
          const showSection = item.section && item.section !== lastSection
          if (item.section) lastSection = item.section
          return (
            <div key={item.id}>
              {showSection && (
                <div className="label" style={{ padding: '10px 12px 4px', marginTop: 4 }}>
                  {item.section}
                </div>
              )}
              <button
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '2px 5px', borderRadius: 4,
                    background: item.badge === 'ML'
                      ? 'rgba(46,196,182,0.15)'
                      : 'rgba(230,57,70,0.15)',
                    color: item.badge === 'ML' ? 'var(--teal)' : 'var(--signal)',
                  }}>{item.badge}</span>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 8px', borderTop: '1px solid var(--ink-4)' }}>
        <div style={{ fontSize: 11, color: 'var(--slate-4)', lineHeight: 1.6 }}>
          Data: NCRB 2024<br />Karnataka State Police
        </div>
        <div style={{
          marginTop: 8, padding: '4px 8px', borderRadius: 6,
          background: 'rgba(46,196,182,0.08)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
          <span style={{ fontSize: 11, color: 'var(--teal)' }}>API connected</span>
        </div>
      </div>
    </aside>
  )
}