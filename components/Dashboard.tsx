'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

const CONFIG = {
  roiPath:      '/data/20260414.json',
  schedulePath: '/data/schedule_20260414.json',
};

// ── TYPES ──────────────────────────────────────────────
interface Alert {
  city: string;
  risk_level: number;
  risk_label: string;
  conflict_index: number;
  innovation_z: number;
  guide: string;
  events: number;
  lat: number;
  lon: number;
  country_code: string;
  llm_confidence: number;
  llm_reason: string;
}
interface ROIData {
  date: string;
  alert_count: number;
  scenario_name: string;
  alerts: Alert[];
}
interface Rec {
  satellite: string;
  city: string;
  lat: number;
  lon: number;
  pass_time_utc: string;
  max_elevation_deg: number;
  cloud_cover_pct: number;
  cloud_status: string;
  daylight: boolean;
  quality_score: number;
  action_priority_label: string;
  urgency_label: string;
  capture_condition_label: string;
  recommendation_reason: string;
  severity_score: number;
  priority_band: number;
  sensor_type: string;
}
interface SensorSummary {
  sar_shootable: number;
  sar_total: number;
  optical_shootable: number;
  optical_total: number;
  optical_blocked_night: number;
  optical_blocked_cloud: number;
}
interface ScheduleData {
  generated_utc: string;
  prediction_hours: number;
  satellites_tracked: number;
  total_passes: number;
  swath_passes: number;
  shootable_passes: number;
  scheduled_events: number;
  cities_monitored: number;
  sensor_condition_summary: SensorSummary;
  city_best_recommendations: Rec[];
}

// ── HELPERS ────────────────────────────────────────────
const fmtUTC = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;
};
const fmtMD = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;
};
const pct = (n: number) => `${n.toFixed(1)}%`;

// ── SCHEDULE CARD ──────────────────────────────────────
function ScheduleCard({ rec, approved, onSelect }: {
  rec: Rec; approved: boolean; onSelect: () => void;
}) {
  const urgent = rec.action_priority_label === '즉시 촬영';
  const cc = rec.cloud_cover_pct < 30 ? 'low' : rec.cloud_cover_pct > 70 ? 'high' : 'mid';
  return (
    <div className={`schedule-item ${urgent ? 'urgent' : 'priority'}`} onClick={onSelect}>
      <div className="sch-top">
        <span className="sch-sat">{rec.satellite}</span>
        <span className="sch-time">{fmtMD(rec.pass_time_utc)} {fmtUTC(rec.pass_time_utc)}</span>
      </div>
      <div className="sch-city">{rec.city}</div>
      <div className="sch-meta">
        <span className={`sch-tag ${urgent ? 'good' : ''}`}>{rec.action_priority_label}</span>
        <span className="sch-tag">EL {rec.max_elevation_deg.toFixed(1)}°</span>
        <span className="sch-tag">{rec.daylight ? '☀ 주간' : '🌙 야간'}</span>
        <span className="sch-tag">{rec.sensor_type.toUpperCase()}</span>
        {approved && <span className="sch-tag good">✓ 승인</span>}
      </div>
      <div className="cloud-bar">
        <span className="cloud-label">운량</span>
        <div className="cloud-track">
          <div className={`cloud-fill ${cc}`} style={{ width: `${rec.cloud_cover_pct}%` }}/>
        </div>
        <span className="cloud-label">{rec.cloud_cover_pct}%</span>
      </div>
    </div>
  );
}

// ── DETAIL PANEL ───────────────────────────────────────
function DetailPanel({ roi, rec, recIdx, approved, onApprove }: {
  roi: Alert | null; rec: Rec | null; recIdx: number; approved: boolean; onApprove: () => void;
}) {
  if (!roi || !rec) {
    return (
      <div className="empty-detail">
        <span style={{ fontSize:24, opacity:0.2 }}>⊙</span>
        <p>ROI 또는 스케줄 항목을 선택하세요</p>
      </div>
    );
  }
  return (
    <div className="detail-wrap">
      <div className="detail-sat">{rec.satellite}</div>
      <div className="detail-city">{rec.city}</div>
      <div className="detail-grid">
        <div className="detail-item">
          <div className="detail-item-label">통과 시각</div>
          <div className="detail-item-value" style={{ color:'var(--cyan)', fontSize:12 }}>{fmtUTC(rec.pass_time_utc)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">최대 앙각</div>
          <div className="detail-item-value">{rec.max_elevation_deg.toFixed(1)}°</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">품질 스코어</div>
          <div className="detail-item-value" style={{ color:'var(--green)' }}>{pct(rec.quality_score * 100)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">Goldstein Z</div>
          <div className="detail-item-value" style={{ color:'var(--red)' }}>{roi.innovation_z}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">운량</div>
          <div className="detail-item-value" style={{ color: rec.cloud_cover_pct > 70 ? 'var(--amber)' : 'var(--green)' }}>{rec.cloud_cover_pct}%</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">충돌 지수</div>
          <div className="detail-item-value" style={{ color:'var(--amber)' }}>{roi.conflict_index}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">LLM 신뢰도</div>
          <div className="detail-item-value" style={{ color:'var(--cyan)' }}>{pct(roi.llm_confidence * 100)}</div>
        </div>
        <div className="detail-item">
          <div className="detail-item-label">센서 상태</div>
          <div className="detail-item-value" style={{ fontSize:10, color:'var(--text-mid)' }}>{rec.capture_condition_label}</div>
        </div>
        <div className="detail-item" style={{ gridColumn:'1 / -1' }}>
          <div className="detail-item-label">촬영 근거</div>
          <div className="detail-item-reason">{rec.recommendation_reason}</div>
        </div>
        <div className="detail-item" style={{ gridColumn:'1 / -1' }}>
          <div className="detail-item-label">LLM 판단 근거</div>
          <div className="detail-item-reason">{roi.llm_reason}</div>
        </div>
      </div>
      <button className={`action-btn ${approved ? 'approved' : ''}`} onClick={onApprove}>
        {approved ? '✓ 촬영 승인됨' : '▶ 촬영 승인 / 스케줄 확정'}
      </button>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────
export default function Dashboard() {
  const [roi,      setRoi]      = useState<ROIData | null>(null);
  const [sched,    setSched]    = useState<ScheduleData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [tab,      setTab]      = useState<'roi' | 'sensor'>('roi');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rr, sr] = await Promise.all([
          fetch(CONFIG.roiPath),
          fetch(CONFIG.schedulePath),
        ]);
        if (!rr.ok || !sr.ok) throw new Error(`HTTP ${rr.status}/${sr.status}`);
        setRoi(await rr.json());
        setSched(await sr.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'fetch 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const approve = useCallback((idx: number) => {
    setApproved(prev => new Set([...prev, idx]));
  }, []);

  if (loading) return (
    <div style={{ background:'var(--bg)', color:'var(--text-dim)', fontFamily:'var(--mono)', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', letterSpacing:'0.1em' }}>
      LOADING INTEL DATA...
    </div>
  );
  if (error || !roi || !sched) return (
    <div style={{ background:'var(--bg)', color:'var(--red)', fontFamily:'var(--mono)', fontSize:11, padding:32 }}>
      ⚠ {error ?? '데이터 없음'} — CONFIG 경로를 확인하세요
    </div>
  );

  const recs        = sched.city_best_recommendations ?? [];
  const maxCI       = Math.max(...roi.alerts.map(a => a.conflict_index));
  const sensor      = sched.sensor_condition_summary;
  const selROI      = roi.alerts.find(a => a.city === selected) ?? null;
  const selIdx      = recs.findIndex(r => r.city === selected);
  const selRec      = selIdx >= 0 ? recs[selIdx] : null;
  const urgentCount = recs.filter(r => r.action_priority_label === '즉시 촬영').length;

  const satMap = recs.reduce((acc, r) => {
    (acc[r.satellite] ??= []).push(r);
    return acc;
  }, {} as Record<string, Rec[]>);

  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="header">
        <div className="header-left">
          <div className="logo-mark"/>
          <div>
            <div className="header-title">SATSCHEDULE · INTEL OPS</div>
            <div className="header-sub">이란-미국 분쟁 지역 / 위성 촬영 스케줄링 자동화</div>
          </div>
        </div>
        <div className="header-right">
          <div className="status-chip"><div className="status-dot"/> LIVE PIPELINE</div>
          <div className="status-chip">📅 {roi.date}</div>
          <div className="status-chip">⟳ {sched.prediction_hours}h window</div>
          <div className="alert-badge">▲ {roi.alert_count} ALERTS</div>
        </div>
      </div>

      {/* STATS */}
      <div className="stat-row">
        <div className="stat-card red">
          <div className="stat-label">위기 ROI</div>
          <div className="stat-value">{roi.alert_count}</div>
          <div className="stat-meta">전체 모니터링 도시</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">촬영 가능 패스</div>
          <div className="stat-value">{sched.shootable_passes.toLocaleString()}</div>
          <div className="stat-meta">72시간 내 SAR 후보</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-label">추적 위성</div>
          <div className="stat-value">{sched.satellites_tracked}</div>
          <div className="stat-meta">ICEYE SAR 플릿</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">즉시 스케줄</div>
          <div className="stat-value">{sched.scheduled_events}</div>
          <div className="stat-meta">확정 실행 이벤트</div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="main-grid">

        {/* LEFT */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">전술 지도 — 레바논/이스라엘 접경</span>
            <span className="panel-tag">GDELT·GEOINT</span>
          </div>
          <div className="map-area">
            <LeafletMap alerts={roi.alerts} selected={selected} onSelect={setSelected}/>
          </div>
          <div className="tab-strip">
            <button className={`tab-btn ${tab === 'roi' ? 'active' : ''}`} onClick={() => setTab('roi')}>ROI 우선순위</button>
            <button className={`tab-btn ${tab === 'sensor' ? 'active' : ''}`} onClick={() => setTab('sensor')}>센서 현황</button>
          </div>

          {tab === 'roi' && (
            <table className="roi-table">
              <thead>
                <tr>{['#','도시','위험도','충돌지수','Z-SCORE','이벤트'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {roi.alerts.map((a, i) => (
                  <tr key={a.city} className={selected === a.city ? 'active' : ''} onClick={() => setSelected(a.city)}>
                    <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text-dim)' }}>{String(i+1).padStart(2,'0')}</td>
                    <td style={{ fontWeight:500 }}>{a.city}</td>
                    <td><span className="risk-badge red">위기</span></td>
                    <td>
                      <div className="score-bar">
                        <div className="score-track">
                          <div className="score-fill" style={{ width:`${(a.conflict_index/maxCI*100).toFixed(0)}%` }}/>
                        </div>
                        <span className="score-num">{a.conflict_index.toFixed(0)}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--amber)' }}>{a.innovation_z}</td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--text-mid)' }}>{a.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'sensor' && (
            <div>
              {([
                ['SAR SHOOTABLE',      `${sensor.sar_shootable} / ${sensor.sar_total}`,        'var(--green)'],
                ['OPTICAL SHOOTABLE',  `${sensor.optical_shootable} / ${sensor.optical_total}`,'var(--red)'],
                ['OPT. BLOCKED (야간)', String(sensor.optical_blocked_night),                   'var(--text-mid)'],
                ['OPT. BLOCKED (구름)', String(sensor.optical_blocked_cloud),                   'var(--text-mid)'],
                ['TOTAL PASSES',       sched.total_passes.toLocaleString(),                     'var(--text)'],
                ['SWATH PASSES',       String(sched.swath_passes),                              'var(--amber)'],
                ['PREDICTION WINDOW',  `${sched.prediction_hours}h`,                            'var(--text)'],
                ['CITIES MONITORED',   String(sched.cities_monitored),                          'var(--cyan)'],
              ] as [string,string,string][]).map(([name,val,color]) => (
                <div key={name} className="sensor-row">
                  <span className="sensor-name">{name}</span>
                  <span className="sensor-val" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">최우선 촬영 스케줄</span>
            <span className="panel-tag">즉시 촬영 ×{urgentCount}</span>
          </div>
          <div className="schedule-list">
            {recs.map((r, i) => (
              <ScheduleCard key={i} rec={r} approved={approved.has(i)} onSelect={() => setSelected(r.city)}/>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="bottom-grid">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">24H 촬영 타임라인</span>
            <span className="panel-tag">SAR BAND 5</span>
          </div>
          <div className="timeline-wrap">
            <div className="tl-hours">
              {[0,4,8,12,16,20,24].map(h => (
                <div key={h} className="tl-hour">{String(h).padStart(2,'0')}h</div>
              ))}
            </div>
            {Object.entries(satMap).map(([sat, evts]) => (
              <div key={sat} className="timeline-row">
                <div className="tl-label">{sat.replace('ICEYE-','')}</div>
                <div className="tl-track">
                  {evts.map((e, ei) => {
                    const d = new Date(e.pass_time_utc);
                    const hr = d.getUTCHours() + d.getUTCMinutes() / 60;
                    return (
                      <div
                        key={ei}
                        className={`tl-event band${e.priority_band || 5}`}
                        style={{ left:`${(hr/24*100).toFixed(1)}%`, width:'7%' }}
                        title={e.city}
                        onClick={() => setSelected(e.city)}
                      >
                        {e.city.substring(0,4)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">상세 분석</span>
            <span className="panel-tag">{selected ?? '선택 없음'}</span>
          </div>
          <DetailPanel
            roi={selROI}
            rec={selRec}
            recIdx={selIdx}
            approved={approved.has(selIdx)}
            onApprove={() => approve(selIdx)}
          />
        </div>
      </div>

    </div>
  );
}
