import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'

// Generates real alerts from API data
function buildAlerts(overview, risks, anomalies, distForecasts) {
  const alerts = []

  if (overview) {
    if (overview.yoy_change_pct > 10) {
      alerts.push({
        id: 'yoy-spike',
        level: 'critical',
        title: `Crime spike detected`,
        body: `Karnataka crimes rose ${overview.yoy_change_pct}% from 2022 to 2023 — above the national average trend.`,
        icon: '⬆',
      })
    }
    if (overview.chargesheeting_rate_2024 < 70) {
      alerts.push({
        id: 'cs-low',
        level: 'warning',
        title: 'Low chargesheeting rate',
        body: `${overview.chargesheeting_rate_2024}% chargesheeting rate indicates prosecution gap — cases may be falling through.`,
        icon: '⚠',
      })
    }
  }

  if (risks) {
    const highRisk = risks.filter(r => r.risk_level === 'High')
    if (highRisk.length > 0) {
      alerts.push({
        id: 'high-risk-zones',
        level: 'warning',
        title: `${highRisk.length} high-risk districts`,
        body: `${highRisk.slice(0, 3).map(r => r.district).join(', ')}${highRisk.length > 3 ? ` +${highRisk.length - 3} more` : ''} — elevated socio-economic stress. Resource deployment recommended.`,
        icon: '◉',
      })
    }
  }

  if (anomalies) {
    const topAnom = anomalies.filter(a => a.is_anomaly).sort((a, b) => b.anomaly_severity - a.anomaly_severity)
    if (topAnom.length > 0) {
      alerts.push({
        id: 'anomalies',
        level: 'info',
        title: `${topAnom.length} statistical anomalies flagged`,
        body: `${topAnom[0].district} (severity ${topAnom[0].anomaly_severity}) leads — unusual socio-economic profile requires investigator review.`,
        icon: '◈',
      })
    }
  }

  if (distForecasts) {
    const increasing = distForecasts.filter(d => d.risk_forecast === 'Increasing')
    if (increasing.length > 0) {
      alerts.push({
        id: 'forecast-increase',
        level: 'warning',
        title: `${increasing.length} districts forecast as increasing risk`,
        body: `${increasing.slice(0, 3).map(d => d.district).join(', ')} show rising pressure scores — early intervention recommended.`,
        icon: '⬡',
      })
    }
  }

  return alerts
}

const LEVEL_STYLES = {
  critical: { bg: 'rgba(230,57,70,0.1)',  border: 'rgba(230,57,70,0.35)',  dot: '#E63946', text: '#ff6b75' },
  warning:  { bg: 'rgba(244,162,97,0.1)', border: 'rgba(244,162,97,0.35)', dot: '#F4A261', text: '#F4A261' },
  info:     { bg: 'rgba(46,196,182,0.08)', border: 'rgba(46,196,182,0.3)', dot: '#2EC4B6', text: '#2EC4B6' },
}

export default function AlertBanner() {
  const [dismissed, setDismissed] = useState(new Set())
  const [current, setCurrent]     = useState(0)

  const { data: overview }      = useApi(() => fetch('/api/karnataka/overview').then(r => r.json()))
  const { data: risksData }     = useApi(() => fetch('/api/districts/risk-scores').then(r => r.json()))
  const { data: anomData }      = useApi(() => fetch('/api/ml/anomalies?only_anomalies=true').then(r => r.json()))
  const { data: forecastData }  = useApi(() => fetch('/api/ml/forecast/districts').then(r => r.json()))

  const alerts = buildAlerts(
    overview,
    risksData,
    anomData?.districts,
    forecastData?.districts
  ).filter(a => !dismissed.has(a.id))

  // Rotate alerts every 5s
  useEffect(() => {
    if (alerts.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % alerts.length), 5000)
    return () => clearInterval(t)
  }, [alerts.length])

  if (alerts.length === 0) return null

  const alert = alerts[Math.min(current, alerts.length - 1)]
  const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.info

  return (
    <div style={{
      marginBottom: 16,
      padding: '10px 14px',
      borderRadius: 10,
      background: style.bg,
      border: `1px solid ${style.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Pulsing dot */}
      <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: style.dot,
          position: 'absolute',
        }} />
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: style.dot,
          position: 'absolute',
          animation: 'pulse-ring 1.8s ease-out infinite',
          opacity: 0.6,
        }} />
      </div>

      {/* Icon + text */}
      <span style={{ color: style.text, fontSize: 14, flexShrink: 0 }}>{alert.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: style.text, fontWeight: 600, fontSize: 13 }}>{alert.title} </span>
        <span style={{ color: 'var(--slate-4)', fontSize: 12 }}>{alert.body}</span>
      </div>

      {/* Counter */}
      {alerts.length > 1 && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {alerts.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: i === current ? style.dot : 'var(--ink-4)',
              cursor: 'pointer', transition: 'background 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* Dismiss */}
      <button onClick={() => {
        setDismissed(d => new Set([...d, alert.id]))
        setCurrent(0)
      }} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--slate-4)', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0,
      }}>×</button>
    </div>
  )
}