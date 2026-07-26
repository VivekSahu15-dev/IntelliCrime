// IntelliCrime — API service layer
// All calls proxy through Vite to http://localhost:8000

const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  overview:           () => get('/karnataka/overview'),
  districts:          () => get('/districts'),
  riskScores:         () => get('/districts/risk-scores'),
  district:           (name) => get(`/districts/${encodeURIComponent(name)}`),
  allStatesIPC:       () => get('/crimes/ipc/all-states?sort_by=crime_rate_2024&order=desc'),
  karnatakaIPC:       () => get('/crimes/ipc/karnataka'),
  trends:             () => get('/crimes/trends?state=Karnataka'),
  murderVictims:      () => get('/crimes/murder/victims?state=Karnataka'),
  genderSplit:        () => get('/crimes/murder/victims/gender-split?state=Karnataka'),
  rapeVictims:        () => get('/crimes/rape/victims?state=Karnataka'),
  rapeAgeBreakdown:   () => get('/crimes/rape/victims/age-breakdown?state=Karnataka'),
  nationalComparison: () => get('/compare/national'),
  topStates:          (n=10) => get(`/compare/top-states?top_n=${n}`),
  divisionSummary:    () => get('/analytics/division-summary'),
  socioEcon:          () => get('/analytics/socioeconomic-correlation'),
}
