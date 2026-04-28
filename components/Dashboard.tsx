'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Target, SatPass } from './LeafletMap';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

// ══════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════
const AVAILABLE_DATES = [
  '20260322','20260323','20260324','20260325','20260326',
  '20260327','20260328','20260329','20260330','20260331',
];
const dashboardPath = (date: string) => `/data/dashboard/daily_${date}.json`;

// ══════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════
interface DashboardData {
  date: string;
  generated_at: string;
  summary: { satellite_targets: number; total_passes: number; };
  targets: Target[];
}

interface FlatPass extends SatPass {
  city: string;
  innov_z: number;
  tier: string;
}

// ══════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════
const fmtUTC = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;
};
const fmtMD = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;
};
const fmtDateLabel = (date: string) =>
  `${date.slice(0,4)}.${date.slice(4,6)}.${date.slice(6,8)}`;

function flattenPasses(targets: Target[]): FlatPass[] {
  return targets.flatMap(t =>
    t.satellite_passes.map(p => ({ ...p, city: t.city, innov_z: t.innov_z, tier: t.tier }))
  ).sort((a, b) => new Date(a.pass_time_utc).getTime() - new Date(b.pass_time_utc).getTime());
}
const passKey = (p: FlatPass) => `${p.city}-${p.satellite}-${p.pass_time_utc}`;

// ══════════════════════════════════════════════════
//  DESIGN TOKENS (HTML 프로토타입과 동일)
// ══════════════════════════════════════════════════
const S = {
  bg:       '#090c10',
  bg2:      '#0d1117',
  bg3:      '#131920',
  border:   'rgba(255,255,255,0.07)',
  borderB:  'rgba(255,255,255,0.14)',
  red:      '#ff3b3b',
  redDim:   'rgba(255,59,59,0.15)',
  amber:    '#f5a623',
  amberDim: 'rgba(245,166,35,0.12)',
  cyan:     '#00e5ff',
  cyanDim:  'rgba(0,229,255,0.1)',
  green:    '#00ff94',
  greenDim: 'rgba(0,255,148,0.1)',
  text:     '#e2e8f0',
  textDim:  '#64748b',
  textMid:  '#94a3b8',
  mono:     '"Space Mono", monospace',
  sans:     '"DM Sans", sans-serif',
} as const;

// ══════════════════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════════════════
const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${S.bg};
    color: ${S.text};
    font-family: ${S.sans};
    min-height: 100vh;
  }
  .sat-scanline::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.015) 2px, rgba(0,229,255,0.015) 4px);
    pointer-events: none;
    z-index: 0;
  }
  /* 로고 애니메이션 */
  .logo-orbit::before {
    content: '';
    position: absolute;
    width: 18px; height: 18px;
    border: 1.5px solid ${S.cyan};
    border-radius: 50%;
    animation: orbit 3s linear infinite;
  }
  .logo-dot {
    width: 5px; height: 5px;
    background: ${S.cyan};
    border-radius: 50%;
    box-shadow: 0 0 8px ${S.cyan};
    z-index: 1;
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(8px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(8px) rotate(-360deg); }
  }
  /* 상태 점 깜빡임 */
  .status-dot-anim {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: ${S.green};
    box-shadow: 0 0 6px ${S.green};
    animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
  /* 스탯 카드 top border */
  .stat-red::before   { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:${S.red}; }
  .stat-amber::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:${S.amber}; }
  .stat-cyan::before  { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:${S.cyan}; }
  .stat-green::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:${S.green}; }
  /* ROI 테이블 hover */
  .roi-row:hover { background: rgba(255,255,255,0.03); }
  .roi-row.selected { background: rgba(0,229,255,0.1); }
  /* 스케줄 아이템 hover */
  .sch-item:hover { background: rgba(255,255,255,0.025); }
  /* 탭 버튼 */
  .tab-active { color: ${S.cyan}; border-bottom: 2px solid ${S.cyan}; }
  .tab-inactive { color: ${S.textDim}; border-bottom: 2px solid transparent; }
  .tab-inactive:hover { color: ${S.textMid}; }
  /* 날짜 드롭다운 */
  .date-select {
    appearance: none;
    background: ${S.bg3};
    border: 1px solid ${S.borderB};
    color: ${S.cyan};
    font-family: ${S.mono};
    font-size: 11px;
    padding: 6px 28px 6px 10px;
    cursor: pointer;
    outline: none;
  }
  .date-select:hover { border-color: rgba(255,255,255,0.3); }
  /* 승인 버튼 */
  .action-btn {
    width: 100%; padding: 10px; cursor: pointer;
    font-family: ${S.mono}; font-size: 11px;
    letter-spacing: .1em; text-transform: uppercase;
    transition: background .15s;
    background: ${S.redDim}; border: 1px solid ${S.red}; color: ${S.red};
  }
  .action-btn:hover { background: rgba(255,59,59,0.25); }
  .action-btn.approved {
    background: ${S.greenDim}; border-color: ${S.green}; color: ${S.green};
  }
  /* 스코어 바 글로우 */
  .score-fill { height: 100%; background: ${S.red}; box-shadow: 0 0 4px ${S.red}; }
  /* 타임라인 이벤트 */
  .tl-sar-urgent  { background: ${S.red};   color: #fff; }
  .tl-sar-normal  { background: ${S.amber}; color: #000; }
  .tl-eo-urgent   { background: #ff8c00;    color: #fff; }
  .tl-eo-normal   { background: ${S.cyan};  color: #000; }
  /* 기사 링크 */
  .article-link:hover { border-color: rgba(0,229,255,0.4); background: ${S.bg3}; }
  /* 스크롤바 */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${S.bg2}; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

// ══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════

function PanelHeader({ title, tag }: { title: string; tag: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:`1px solid ${S.border}` }}>
      <span style={{ fontFamily:S.mono, fontSize:10, letterSpacing:'.12em', color:S.textMid, textTransform:'uppercase' }}>{title}</span>
      <span style={{ fontFamily:S.mono, fontSize:9, padding:'2px 7px', border:`1px solid ${S.borderB}`, color:S.textDim }}>{tag}</span>
    </div>
  );
}

function StatCard({ label, value, color, meta, cls }: {
  label:string; value:string|number; color:string; meta:string; cls:string;
}) {
  return (
    <div className={cls} style={{ flex:1, background:S.bg2, border:`1px solid ${S.border}`, padding:'12px 14px', position:'relative', overflow:'hidden' }}>
      <div style={{ fontFamily:S.mono, fontSize:10, letterSpacing:'.1em', color:S.textDim, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:S.mono, fontSize:28, fontWeight:700, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:S.textDim }}>{meta}</div>
    </div>
  );
}

function ScheduleCard({ pass, approved, onSelect }: {
  pass: FlatPass; approved: boolean; onSelect: () => void;
}) {
  const urgent = pass.action_priority_label === '즉시 촬영';
  const cloudPct = pass.cloud_cover_pct;
  const cloudColor = cloudPct < 30 ? S.green : cloudPct > 70 ? S.red : S.amber;

  return (
    <div
      className="sch-item"
      onClick={onSelect}
      style={{
        padding:'12px 14px',
        borderBottom:`1px solid ${S.border}`,
        borderLeft:`3px solid ${urgent ? S.red : S.amber}`,
        cursor:'pointer', transition:'background .15s',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontFamily:S.mono, fontSize:10, color:S.cyan }}>{pass.satellite}</span>
        <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>{pass.city}</div>
      <div style={{ display:'flex', gap:10, marginBottom:5, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color: urgent ? S.green : S.textDim }}>{pass.action_priority_label}</span>
        <span style={{ fontSize:10, color:S.textDim }}>EL {pass.max_elevation_deg.toFixed(1)}°</span>
        <span style={{ fontSize:10, color:S.textDim }}>{pass.daylight ? '☀ 주간' : '🌙 야간'}</span>
        <span style={{ fontSize:10, fontFamily:S.mono, color: pass.sensor_type==='sar' ? S.cyan : S.green }}>{pass.sensor_type.toUpperCase()}</span>
        <span style={{ fontSize:10, color:S.textDim }}>{pass.resolution_m}m</span>
        {approved && <span style={{ fontSize:10, color:S.green }}>✓ 승인</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>운량</span>
        <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.06)' }}>
          <div style={{ height:'100%', width:`${cloudPct}%`, background:cloudColor }}/>
        </div>
        <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>{cloudPct}%</span>
      </div>
    </div>
  );
}

function ArticleLinks({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>참조 기사</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {urls.map((url, i) => {
          const domain = (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return url; } })();
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="article-link"
              style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'6px 10px', background:S.bg2, border:`1px solid ${S.border}`, textDecoration:'none', transition:'all .15s' }}>
              <span style={{ fontFamily:S.mono, fontSize:9, color:S.cyan, flexShrink:0, marginTop:2 }}>↗</span>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginBottom:2 }}>{domain}</div>
                <div style={{ fontSize:10, color:S.textMid, wordBreak:'break-all', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{url}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({ target, pass, approved, onApprove }: {
  target: Target | null; pass: FlatPass | null; approved: boolean; onApprove: () => void;
}) {
  if (!target) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:S.textDim, gap:8 }}>
        <span style={{ fontSize:24, opacity:.3 }}>⊙</span>
        <p style={{ fontFamily:S.mono, fontSize:10, letterSpacing:'.1em' }}>ROI 또는 스케줄 항목을 선택하세요</p>
      </div>
    );
  }

  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <span style={{ fontFamily:S.mono, fontSize:9, padding:'2px 6px', border:`1px solid ${S.red}`, color:S.red }}>{target.risk_label}</span>
        <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>TIER {target.tier}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:600, marginBottom:10 }}>{target.display_name}</div>

      {/* LLM 메시지 */}
      <div style={{ background:S.bg3, border:`1px solid ${S.border}`, padding:'8px 10px', marginBottom:10 }}>
        <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginBottom:4 }}>LLM 판단</div>
        <div style={{ fontSize:11, color:'#cbd5e1', lineHeight:1.5 }}>{target.llm_message}</div>
      </div>

      {/* 메트릭 그리드 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        {([
          ['Goldstein Z',  target.innov_z.toFixed(1),        S.red],
          ['충돌 지수',    target.conflict_index.toFixed(0),  S.amber],
          ['이벤트',       String(target.events),             S.text],
          ['소스 수',      String(target.sources_total),      S.cyan],
          ['언급 수',      String(target.mentions_total),     S.textMid],
          ['LLM 상태',     target.llm_status,                 target.llm_status==='SUCCESS'?S.green:S.amber],
        ] as [string,string,string][]).map(([label, val, color]) => (
          <div key={label} style={{ background:S.bg3, border:`1px solid ${S.border}`, padding:'8px 10px' }}>
            <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, letterSpacing:'.08em', marginBottom:3 }}>{label}</div>
            <div style={{ fontFamily:S.mono, fontSize:14, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* 선택된 패스 */}
      {pass && (
        <>
          <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>선택된 패스</div>
          <div style={{ background:S.bg2, border:`1px solid rgba(0,229,255,0.2)`, padding:'10px 12px', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:S.mono, fontSize:12, color:S.cyan }}>{pass.satellite}</span>
              <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:8 }}>
              {([
                ['앙각',   `${pass.max_elevation_deg.toFixed(1)}°`, S.text],
                ['운량',   `${pass.cloud_cover_pct}%`,              pass.cloud_cover_pct>70?S.amber:S.green],
                ['센서',   pass.sensor_type.toUpperCase(),          pass.sensor_type==='sar'?S.cyan:S.green],
                ['해상도', `${pass.resolution_m}m`,                 S.textMid],
              ] as [string,string,string][]).map(([label, val, color]) => (
                <div key={label} style={{ background:S.bg3, padding:'6px 8px' }}>
                  <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginBottom:2 }}>{label}</div>
                  <div style={{ fontFamily:S.mono, fontSize:13, fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:10, color:S.textMid }}>{pass.recommendation_reason}</div>
          </div>
          <button className={`action-btn${approved?' approved':''}`} onClick={onApprove}>
            {approved ? '✓ 촬영 승인됨' : '▶ 촬영 승인 / 스케줄 확정'}
          </button>
        </>
      )}

      {/* 전체 패스 목록 */}
      {target.satellite_passes.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6 }}>
            전체 패스 ({target.satellite_passes.length})
          </div>
          {target.satellite_passes.map((p, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid rgba(255,255,255,0.05)`, fontSize:11 }}>
              <span style={{ fontFamily:S.mono, fontSize:9, color: p.sensor_type==='sar'?S.cyan:S.green, textTransform:'uppercase' }}>{p.sensor_type}</span>
              <span style={{ color:S.textMid, flex:1 }}>{p.satellite}</span>
              <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>{fmtUTC(p.pass_time_utc)}</span>
              <span style={{ fontFamily:S.mono, fontSize:9, color:S.amber }}>{p.cloud_cover_pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* 기사 원문 */}
      <ArticleLinks urls={target.urls_sent} />
    </div>
  );
}

// ══════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════
export default function Dashboard() {
  const [date,     setDate]     = useState(AVAILABLE_DATES[AVAILABLE_DATES.length - 1]);
  const [data,     setData]     = useState<DashboardData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selPass,  setSelPass]  = useState<FlatPass | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab,      setTab]      = useState<'roi' | 'sensor'>('roi');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null); setSelected(null); setSelPass(null);
    (async () => {
      try {
        const res = await fetch(dashboardPath(date));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'fetch 실패');
      } finally { setLoading(false); }
    })();
  }, [date]);

  const approve = useCallback((key: string) => {
    setApproved(prev => new Set([...prev, key]));
  }, []);

  if (loading) return (
    <div style={{ background:S.bg, color:S.textDim, fontFamily:S.mono, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', letterSpacing:'.1em' }}>
      LOADING INTEL DATA...
    </div>
  );
  if (error || !data) return (
    <div style={{ background:S.bg, color:S.red, fontFamily:S.mono, fontSize:11, padding:32 }}>
      ⚠ {error ?? '데이터 없음'}
    </div>
  );

  const targets     = data.targets ?? [];
  const allPasses   = flattenPasses(targets);
  const urgentCount = allPasses.filter(p => p.action_priority_label === '즉시 촬영').length;
  const selTarget   = targets.find(t => t.city === selected) ?? null;
  const maxCI       = Math.max(...targets.map(t => t.conflict_index), 1);
  const satGroups   = allPasses.reduce((acc, p) => {
    (acc[p.satellite] ??= []).push(p); return acc;
  }, {} as Record<string, FlatPass[]>);

  return (
    <>
      <style>{globalStyles}</style>
      <div className="sat-scanline" style={{ background:S.bg, color:S.text, fontFamily:S.sans, minHeight:'100vh', padding:16 }}>
        <div style={{ position:'relative', zIndex:1, maxWidth:1400, margin:'0 auto' }}>

          {/* ── HEADER ── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:S.bg2, border:`1px solid ${S.border}`, borderTop:`2px solid ${S.cyan}`, marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {/* 로고 애니메이션 */}
              <div className="logo-orbit" style={{ width:36, height:36, border:`1.5px solid ${S.cyan}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                <div className="logo-dot"/>
              </div>
              <div>
                <div style={{ fontFamily:S.mono, fontSize:13, letterSpacing:'.12em', color:S.cyan, textTransform:'uppercase' }}>SATSCHEDULE · INTEL OPS</div>
                <div style={{ fontSize:11, color:S.textDim, marginTop:2 }}>이란-미국 분쟁 지역 / 위성 촬영 스케줄링 자동화</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="status-dot-anim"/>
                <span style={{ fontFamily:S.mono, fontSize:10, color:S.textMid }}>LIVE PIPELINE</span>
              </div>
              {/* 날짜 드롭다운 */}
              <div style={{ position:'relative' }}>
                <select className="date-select" value={date} onChange={e => setDate(e.target.value)}>
                  {AVAILABLE_DATES.map(d => (
                    <option key={d} value={d} style={{ background:S.bg3 }}>📅 {fmtDateLabel(d)}</option>
                  ))}
                </select>
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:S.cyan, fontSize:10, pointerEvents:'none' }}>▾</span>
              </div>
              <div style={{ background:S.redDim, border:`1px solid ${S.red}`, color:S.red, fontFamily:S.mono, fontSize:11, padding:'3px 10px' }}>
                ▲ {targets.length} TARGETS
              </div>
            </div>
          </div>

          {/* ── STATS ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
            <StatCard cls="stat-red"   label="타겟 도시"  value={data.summary.satellite_targets}  color={S.red}   meta="위성 촬영 대상"/>
            <StatCard cls="stat-amber" label="전체 패스"  value={data.summary.total_passes}       color={S.amber} meta="스케줄 후보"/>
            <StatCard cls="stat-cyan"  label="즉시 촬영"  value={urgentCount}                     color={S.cyan}  meta="우선 실행 패스"/>
            <StatCard cls="stat-green" label="투입 위성"  value={Object.keys(satGroups).length}   color={S.green} meta="활성 위성 수"/>
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:12, marginBottom:12 }}>

            {/* LEFT: 지도 + 테이블 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}` }}>
              <PanelHeader title="전술 지도" tag="GDELT·GEOINT"/>
              <LeafletMap targets={targets} selected={selected} onSelect={city => { setSelected(city); setSelPass(null); }}/>

              {/* 탭 */}
              <div style={{ display:'flex', borderBottom:`1px solid ${S.border}` }}>
                {(['roi','sensor'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={tab===t ? 'tab-active' : 'tab-inactive'}
                    style={{ padding:'8px 14px', fontFamily:S.mono, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', cursor:'pointer', background:'none', border:'none', transition:'color .15s' }}>
                    {t==='roi' ? 'ROI 우선순위' : '패스 요약'}
                  </button>
                ))}
              </div>

              {/* ROI 테이블 */}
              {tab==='roi' && (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {['#','도시','TIER','위험도','충돌지수','NM','패스'].map(h => (
                        <th key={h} style={{ padding:'8px 14px', fontFamily:S.mono, fontSize:9, letterSpacing:'.1em', color:S.textDim, textTransform:'uppercase', textAlign:'left', fontWeight:400, borderBottom:`1px solid ${S.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map((t, i) => (
                      <tr key={t.city} onClick={() => { setSelected(t.city); setSelPass(null); }}
                        className={`roi-row${selected===t.city?' selected':''}`}
                        style={{ borderBottom:`1px solid ${S.border}`, cursor:'pointer', transition:'background .15s' }}>
                        <td style={{ padding:'9px 14px', fontFamily:S.mono, fontSize:11, color:S.textDim }}>{String(i+1).padStart(2,'0')}</td>
                        <td style={{ padding:'9px 14px', fontSize:12, fontWeight:500 }}>{t.display_name}</td>
                        <td style={{ padding:'9px 14px', fontFamily:S.mono, fontSize:11, color:S.cyan }}>{t.tier}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ background:S.redDim, color:S.red, border:`1px solid ${S.red}`, fontFamily:S.mono, fontSize:9, fontWeight:700, padding:'2px 6px' }}>{t.risk_label}</span>
                        </td>
                        <td style={{ padding:'9px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.08)' }}>
                              <div className="score-fill" style={{ width:`${(t.conflict_index/maxCI*100).toFixed(0)}%` }}/>
                            </div>
                            <span style={{ fontFamily:S.mono, fontSize:11, color:S.textMid, minWidth:36, textAlign:'right' }}>{t.conflict_index.toFixed(0)}</span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 14px', fontFamily:S.mono, fontSize:12, color:S.amber }}>{t.mentions_total.toLocaleString()}</td>
                        <td style={{ padding:'9px 14px', fontFamily:S.mono, fontSize:11, color:S.textMid }}>{t.satellite_passes.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 패스 요약 */}
              {tab==='sensor' && (
                <div>
                  {([
                    ['전체 타겟',  String(data.summary.satellite_targets),                            S.red],
                    ['전체 패스',  String(data.summary.total_passes),                                 S.amber],
                    ['즉시 촬영',  String(urgentCount),                                               S.green],
                    ['SAR 패스',   String(allPasses.filter(p=>p.sensor_type==='sar').length),        S.cyan],
                    ['EO 패스',    String(allPasses.filter(p=>p.sensor_type==='optical').length),    S.textMid],
                    ['야간 패스',  String(allPasses.filter(p=>!p.daylight).length),                  S.textDim],
                    ['구름 없음',  String(allPasses.filter(p=>p.cloud_cover_pct<30).length),        S.green],
                    ['구름 많음',  String(allPasses.filter(p=>p.cloud_cover_pct>70).length),        S.red],
                    ['투입 위성',  String(Object.keys(satGroups).length),                            S.cyan],
                  ] as [string,string,string][]).map(([name, val, color]) => (
                    <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:`1px solid ${S.border}` }}>
                      <span style={{ fontFamily:S.mono, fontSize:10, color:S.textMid }}>{name}</span>
                      <span style={{ fontFamily:S.mono, fontSize:12, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: 스케줄 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}` }}>
              <PanelHeader title="촬영 스케줄" tag={`즉시 촬영 ×${urgentCount}`}/>
              <div style={{ overflowY:'auto', maxHeight:640 }}>
                {allPasses.map((p, i) => (
                  <ScheduleCard key={i} pass={p} approved={approved.has(passKey(p))}
                    onSelect={() => { setSelected(p.city); setSelPass(p); }}/>
                ))}
              </div>
            </div>
          </div>

          {/* ── BOTTOM GRID ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

            {/* 타임라인 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}` }}>
              <PanelHeader title="24H 촬영 타임라인" tag={`${Object.keys(satGroups).length} 위성`}/>
              <div style={{ padding:'12px 14px' }}>
                {/* 시간축 */}
                <div style={{ display:'flex', marginLeft:108, marginBottom:6 }}>
                  {[0,4,8,12,16,20,24].map(h => (
                    <div key={h} style={{ flex:1, fontFamily:S.mono, fontSize:9, color:S.textDim, textAlign:'center' }}>
                      {String(h).padStart(2,'0')}h
                    </div>
                  ))}
                </div>
                {/* 위성별 행 */}
                {Object.entries(satGroups).map(([sat, passes]) => (
                  <div key={sat} style={{ display:'flex', alignItems:'center', marginBottom:8, gap:8 }}>
                    <div style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, width:100, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={sat}>
                      {sat.replace('ICEYE-','').replace('Sentinel-','S').replace('SpaceEye-','SE-')}
                    </div>
                    <div style={{ flex:1, height:20, background:'rgba(255,255,255,0.04)', borderRadius:2, position:'relative' }}>
                      {passes.map((p, ei) => {
                        const d = new Date(p.pass_time_utc);
                        const hr = d.getUTCHours() + d.getUTCMinutes()/60;
                        const isSAR    = p.sensor_type === 'sar';
                        const isUrgent = p.action_priority_label === '즉시 촬영';
                        const cls = isUrgent
                          ? (isSAR ? 'tl-sar-urgent' : 'tl-eo-urgent')
                          : (isSAR ? 'tl-sar-normal' : 'tl-eo-normal');
                        return (
                          <div key={ei} className={cls}
                            title={`${p.city} | ${p.action_priority_label} | EL${p.max_elevation_deg.toFixed(0)}° | 운량${p.cloud_cover_pct}%`}
                            onClick={() => { setSelected(p.city); setSelPass(p); }}
                            style={{ position:'absolute', height:'100%', left:`${(hr/24*100).toFixed(1)}%`, width:'6%', minWidth:4, borderRadius:2, display:'flex', alignItems:'center', padding:'0 4px', fontFamily:S.mono, fontSize:8, overflow:'hidden', whiteSpace:'nowrap', cursor:'pointer' }}>
                            {p.city.substring(0,3)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* 범례 */}
                <div style={{ display:'flex', gap:12, marginTop:10, paddingTop:8, borderTop:`1px solid rgba(255,255,255,0.05)` }}>
                  {([
                    ['tl-sar-urgent','SAR 즉시'],
                    ['tl-sar-normal','SAR 우선'],
                    ['tl-eo-urgent', 'EO 즉시'],
                    ['tl-eo-normal', 'EO 우선'],
                  ] as [string,string][]).map(([cls, label]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div className={cls} style={{ width:12, height:12, borderRadius:2 }}/>
                      <span style={{ fontFamily:S.mono, fontSize:8, color:S.textDim }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 상세 분석 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}` }}>
              <PanelHeader title="상세 분석" tag={selected ?? '선택 없음'}/>
              <div style={{ overflowY:'auto', maxHeight:420 }}>
                <DetailPanel
                  target={selTarget}
                  pass={selPass}
                  approved={selPass ? approved.has(passKey(selPass)) : false}
                  onApprove={() => selPass && approve(passKey(selPass))}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
