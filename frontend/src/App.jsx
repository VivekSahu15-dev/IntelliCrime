import { useState } from 'react'
import Sidebar          from './components/Sidebar'
import AlertBanner      from './components/AlertBanner'
import OverviewPage     from './pages/OverviewPage'
import Map3DPage        from './pages/Map3dPage'
import CrimesPage       from './pages/CrimesPage'
import VictimsPage      from './pages/VictimsPage'
import NetworkPage      from './pages/NetworkPage'
import NetworkGraphPage from './pages/NetworkGraphPage'
import HotspotPage      from './pages/HotspotPage'
import ComparePage      from './pages/ComparePage'
import SocioPage        from './pages/SocioPage'
import MLPage           from './pages/MLPage'
import UploadPage       from './pages/UploadPage'

const PAGE_TITLES = {
  overview:     'Karnataka Crime Overview',
  map3d:        '3D District Risk Map',
  hotspot:      'Crime Hotspot Heatmap',
  crimes:       'Crime Analysis',
  victims:      'Victim Profiles',
  network:      'Risk Network & Alerts',
  networkgraph: 'Criminal Network Graph',
  compare:      'National Ranking',
  socio:        'Socio-Economic Correlation',
  ml:           'AI/ML Predictive Intelligence',
  upload:       'Data Upload & Analysis',
}

const PAGES = {
  overview:     OverviewPage,
  map3d:        Map3DPage,
  hotspot:      HotspotPage,
  crimes:       CrimesPage,
  victims:      VictimsPage,
  network:      NetworkPage,
  networkgraph: NetworkGraphPage,
  compare:      ComparePage,
  socio:        SocioPage,
  ml:           MLPage,
  upload:       UploadPage,
}

export default function App() {
  const [page, setPage] = useState('overview')
  const Page = PAGES[page] ?? OverviewPage

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ink)' }}>
      <Sidebar active={page} onSelect={setPage} />
      <main style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {PAGE_TITLES[page]}
            </div>
            <div style={{ color: 'var(--slate-4)', fontSize: 12, marginTop: 2 }}>
              Real-time NCRB data · Karnataka State Police
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--ink-2)', borderRadius: 8, border: '1px solid var(--ink-4)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)' }} />
            <span style={{ fontSize: 12, color: 'var(--slate-4)' }}>NCRB 2024 — Live</span>
          </div>
        </div>

        {/* Global alert banner */}
        <AlertBanner />

        <Page key={page} />
      </main>
    </div>
  )
}