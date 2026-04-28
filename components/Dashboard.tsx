'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Target, SatPass } from './LeafletMap';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

const AVAILABLE_DATES = [
  '20260322','20260323','20260324','20260325','20260326',
  '20260327','20260328','20260329','20260330','20260331',
];
const dashboardPath = (date: string) => `/data/dashboard/daily_${date}.json`;

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

// ── 라이트 모드 토큰
const S = {
  bg:       '#f8f7f5',   // 따뜻한 오프화이트
  bg2:      '#ffffff',
  bg3:      '#f1efe9',
  bg4:      '#e8e4dc',
  border:   '#e2ddd6',
  borderMd: '#ccc8c0',
  // 색상 — 채도 낮춘 따뜻한 톤
  red:      '#c0392b',
  redBg:    '#fdf2f1',
  amber:    '#b7600a',
  amberBg:  '#fdf6ed',
  blue:     '#1d5fa8',
  blueBg:   '#eff5fc',
  green:    '#1a7a4a',
  greenBg:  '#eef7f2',
  // 텍스트
  text:     '#1a1714',
  textSub:  '#5c5650',
  textDim:  '#9c9690',
  // 폰트
  display:  "'Syne', sans-serif",       // 헤딩
  body:     "'Barlow', sans-serif",     // 본문
  mono:     "'Martian Mono', monospace", // 숫자/코드
} as const;

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Barlow:wght@300;400;500;600&family=Martian+Mono:wght@300;400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${S.bg};
    color: ${S.text};
    font-family: ${S.body};
    min-height: 100vh;
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* 테이블 */
  .data-tbl { width: 100%; border-collapse: collapse; }
  .data-tbl th {
    padding: 6px 12px;
    font-family: ${S.body};
    font-size: 10px; font-weight: 500;
    letter-spacing: .06em; text-transform: uppercase;
    color: ${S.textDim}; text-align: left;
    border-bottom: 1px solid ${S.border};
    background: ${S.bg3};
  }
  .data-tbl td { padding: 8px 12px; border-bottom: 1px solid ${S.border}; font-size: 12px; }
  .data-tbl tbody tr { cursor: pointer; transition: background .1s; }
  .data-tbl tbody tr:hover { background: ${S.bg3}; }
  .data-tbl tbody tr.sel td { background: ${S.blueBg}; border-left: 2px solid ${S.blue}; }

  /* 탭 */
  .tab { padding: 8px 14px; font-family: ${S.body}; font-size: 11px; font-weight: 500;
    letter-spacing: .03em; color: ${S.textDim}; cursor: pointer; background: none;
    border: none; border-bottom: 2px solid transparent; transition: all .15s; }
  .tab.on { color: ${S.blue}; border-bottom-color: ${S.blue}; }
  .tab:hover { color: ${S.text}; }

  /* 날짜 드롭다운 */
  .date-sel {
    appearance: none; background: ${S.bg2}; border: 1px solid ${S.border};
    color: ${S.text}; font-family: ${S.body}; font-size: 12px;
    padding: 5px 24px 5px 9px; cursor: pointer; outline: none;
    border-radius: 4px;
  }
  .date-sel:hover { border-color: ${S.borderMd}; }

  /* 스케줄 */
  .sch-row { transition: background .1s; border-left: 2px solid transparent; }
  .sch-row:hover { background: ${S.bg3}; }
  .sch-row.urg { border-left-color: ${S.red}; }

  /* 배지 */
  .badge { display: inline-block; padding: 1px 6px; font-size: 10px; font-weight: 500; border-radius: 3px; font-family: ${S.body}; }
  .b-red   { background: ${S.redBg};   color: ${S.red};   border: 1px solid rgba(192,57,43,.2); }
  .b-amber { background: ${S.amberBg}; color: ${S.amber}; border: 1px solid rgba(183,96,10,.2); }

  /* 승인 버튼 */
  .approve-btn {
    width: 100%; padding: 9px; cursor: pointer; font-family: ${S.body};
    font-size: 12px; font-weight: 500; letter-spacing: .04em;
    transition: all .15s; border-radius: 4px;
    background: ${S.redBg}; border: 1px solid rgba(192,57,43,.3); color: ${S.red};
  }
  .approve-btn:hover { background: #fbe8e7; }
  .approve-btn.done { background: ${S.greenBg}; border-color: rgba(26,122,74,.3); color: ${S.green}; }

  /* 기사 링크 */
  .art-link { display: flex; gap: 8px; padding: 6px 10px; background: ${S.bg3};
    border: 1px solid ${S.border}; text-decoration: none; transition: border-color .15s;
    margin-bottom: 4px; border-radius: 4px; }
  .art-link:hover { border-color: ${S.borderMd}; background: ${S.bg4}; }

  /* 충돌바 */
  .ci-fill { height: 100%; background: ${S.red}; opacity: .6; }

  /* 타임라인 */
  .tl-sh { background: ${S.red};   color: #fff; opacity: .85; }
  .tl-sl { background: ${S.amber}; color: #fff; opacity: .8; }
  .tl-eh { background: ${S.blue};  color: #fff; opacity: .85; }
  .tl-el { background: #94a3b8;    color: #fff; opacity: .7; }

  /* 스크롤바 */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${S.border}; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: ${S.borderMd}; }

  /* stat 구분선 */
  .stat-item { padding: 10px 14px; border-right: 1px solid ${S.border}; }
  .stat-item:last-child { border-right: none; }
`;

// ── COMPONENTS ──

function PanelHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:`1px solid ${S.border}`, background: S.bg2 }}>
      <span style={{ fontFamily:S.body, fontSize:11, fontWeight:600, letterSpacing:'.04em', color:S.text }}>{title}</span>
      {tag && <span style={{ fontFamily:S.body, fontSize:10, color:S.textDim }}>{tag}</span>}
    </div>
  );
}

function ScheduleRow({ pass, approved, onSelect }: {
  pass: FlatPass; approved: boolean; onSelect: () => void;
}) {
  const urgent = pass.action_priority_label === '즉시 촬영';
  const cp = pass.cloud_cover_pct;
  const cloudColor = cp < 30 ? S.green : cp > 70 ? S.red : S.amber;
  return (
    <div className={`sch-row${urgent?' urg':''}`} onClick={onSelect}
      style={{ padding:'9px 12px', borderBottom:`1px solid ${S.border}`, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:S.body, fontSize:12, fontWeight:500 }}>{pass.city}</span>
          <span style={{ fontFamily:S.body, fontSize:10, color:S.textDim }}>{pass.satellite}</span>
        </div>
        <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontFamily:S.body, fontSize:10, color:urgent?S.red:S.textDim, fontWeight:urgent?600:400 }}>{pass.action_priority_label}</span>
        <span style={{ fontSize:10, color:S.textDim }}>EL {pass.max_elevation_deg.toFixed(0)}°</span>
        <span style={{ fontSize:10, color:pass.sensor_type==='sar'?S.blue:S.green }}>{pass.sensor_type.toUpperCase()} {pass.resolution_m}m</span>
        <span style={{ fontSize:10, color:S.textDim }}>{pass.daylight?'주간':'야간'}</span>
        {approved && <span style={{ fontSize:10, color:S.green, fontWeight:500 }}>✓ 승인</span>}
        <div style={{ flex:1, minWidth:40, height:2, background:S.border, marginLeft:'auto' }}>
          <div style={{ height:'100%', width:`${cp}%`, background:cloudColor, opacity:.7 }}/>
        </div>
        <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{cp}%</span>
      </div>
    </div>
  );
}

function DetailPanel({ target, pass, approved, onApprove }: {
  target: Target|null; pass: FlatPass|null; approved:boolean; onApprove:()=>void;
}) {
  if (!target) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:140, color:S.textDim, fontFamily:S.body, fontSize:12 }}>
      항목을 선택하세요
    </div>
  );
  return (
    <div style={{ padding:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span className={`badge b-${target.risk_label==='위기'?'red':'amber'}`}>{target.risk_label}</span>
        <span style={{ fontFamily:S.body, fontSize:10, color:S.textDim }}>TIER {target.tier}</span>
        {pass && <span style={{ fontSize:10, color:S.textDim, marginLeft:'auto', fontFamily:S.mono }}>{pass.satellite}</span>}
      </div>
      <div style={{ fontFamily:S.display, fontSize:20, fontWeight:700, marginBottom:8, color:S.text, lineHeight:1.2 }}>
        {target.display_name}
      </div>
      <div style={{ fontFamily:S.body, fontSize:12, color:S.textSub, lineHeight:1.6, marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${S.border}` }}>
        {target.llm_message}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:12 }}>
        {([
          ['Goldstein Z', target.innov_z.toFixed(1),               S.red],
          ['충돌 지수',   target.conflict_index.toFixed(0),         S.amber],
          ['언급 수',     target.mentions_total.toLocaleString(),   S.text],
          ['이벤트',      String(target.events),                    S.text],
          ['소스',        String(target.sources_total),             S.textSub],
          ['LLM',         target.llm_status,                        target.llm_status==='SUCCESS'?S.green:S.amber],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{ background:S.bg3, padding:'6px 8px', borderRadius:4, border:`1px solid ${S.border}` }}>
            <div style={{ fontFamily:S.body, fontSize:9, color:S.textDim, marginBottom:2, letterSpacing:'.04em' }}>{l}</div>
            <div style={{ fontFamily:S.mono, fontSize:13, fontWeight:500, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {pass && (
        <>
          <div style={{ fontFamily:S.body, fontSize:10, fontWeight:600, color:S.textDim, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>선택된 패스</div>
          <div style={{ background:S.bg3, border:`1px solid ${S.border}`, padding:'10px 12px', borderRadius:4, marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:S.mono, fontSize:11, fontWeight:500, color:S.blue }}>{pass.satellite}</span>
              <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4, marginBottom:8 }}>
              {([
                ['앙각',   `${pass.max_elevation_deg.toFixed(0)}°`, S.text],
                ['운량',   `${pass.cloud_cover_pct}%`,              pass.cloud_cover_pct>70?S.amber:S.green],
                ['센서',   pass.sensor_type.toUpperCase(),          pass.sensor_type==='sar'?S.blue:S.green],
                ['해상도', `${pass.resolution_m}m`,                 S.textSub],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l} style={{ background:S.bg2, padding:'5px 7px', borderRadius:3, border:`1px solid ${S.border}` }}>
                  <div style={{ fontFamily:S.body, fontSize:9, color:S.textDim }}>{l}</div>
                  <div style={{ fontFamily:S.mono, fontSize:12, fontWeight:500, color:c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily:S.body, fontSize:10, color:S.textSub }}>{pass.recommendation_reason}</div>
          </div>
          <button className={`approve-btn${approved?' done':''}`} onClick={onApprove}>
            {approved?'✓ 촬영 승인됨':'촬영 승인 / 스케줄 확정'}
          </button>
        </>
      )}

      {target.satellite_passes.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontFamily:S.body, fontSize:10, fontWeight:600, color:S.textDim, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>
            전체 패스 ({target.satellite_passes.length})
          </div>
          {target.satellite_passes.map((p,i)=>(
            <div key={i} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:`1px solid ${S.border}`, fontSize:11 }}>
              <span style={{ fontFamily:S.body, fontSize:10, color:p.sensor_type==='sar'?S.blue:S.green, width:32, fontWeight:500 }}>{p.sensor_type.toUpperCase()}</span>
              <span style={{ fontFamily:S.body, color:S.textSub, flex:1 }}>{p.satellite}</span>
              <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{fmtUTC(p.pass_time_utc)}</span>
              <span style={{ fontFamily:S.mono, fontSize:10, color:S.amber }}>{p.cloud_cover_pct}%</span>
            </div>
          ))}
        </div>
      )}

      {target.urls_sent?.length > 0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontFamily:S.body, fontSize:10, fontWeight:600, color:S.textDim, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>참조 기사</div>
          {target.urls_sent.map((url,i)=>{
            const domain=(()=>{ try{ return new URL(url).hostname.replace('www.',''); }catch{ return url; }})();
            return (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="art-link">
                <span style={{ fontFamily:S.mono, fontSize:10, color:S.blue, flexShrink:0 }}>↗</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:S.body, fontSize:10, color:S.textDim, marginBottom:1 }}>{domain}</div>
                  <div style={{ fontFamily:S.body, fontSize:10, color:S.textSub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════
export default function Dashboard() {
  const [date,     setDate]     = useState(AVAILABLE_DATES[AVAILABLE_DATES.length-1]);
  const [data,     setData]     = useState<DashboardData|null>(null);
  const [selected, setSelected] = useState<string|null>(null);
  const [selPass,  setSelPass]  = useState<FlatPass|null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab,      setTab]      = useState<'roi'|'sensor'>('roi');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string|null>(null);

  useEffect(()=>{
    setLoading(true); setError(null); setSelected(null); setSelPass(null);
    (async()=>{
      try {
        const res = await fetch(dashboardPath(date));
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch(e:unknown) {
        setError(e instanceof Error ? e.message : 'fetch 실패');
      } finally { setLoading(false); }
    })();
  },[date]);

  const approve = useCallback((key:string)=>{
    setApproved(prev=>new Set([...prev,key]));
  },[]);

  if(loading) return (
    <div style={{ background:S.bg, color:S.textDim, fontFamily:S.mono, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', letterSpacing:'.08em' }}>
      LOADING...
    </div>
  );
  if(error||!data) return (
    <div style={{ background:S.bg, color:S.red, fontFamily:S.body, fontSize:13, padding:32 }}>⚠ {error??'데이터 없음'}</div>
  );

  const targets     = data.targets??[];
  const allPasses   = flattenPasses(targets);
  const urgentCount = allPasses.filter(p=>p.action_priority_label==='즉시 촬영').length;
  const selTarget   = targets.find(t=>t.city===selected)??null;
  const maxCI       = Math.max(...targets.map(t=>t.conflict_index),1);
  const satGroups   = allPasses.reduce((acc,p)=>{ (acc[p.satellite]??=[]).push(p); return acc; },{} as Record<string,FlatPass[]>);

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ background:S.bg, color:S.text, fontFamily:S.body, minHeight:'100vh', padding:'12px 16px' }}>
        <div style={{ maxWidth:1440, margin:'0 auto' }}>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:12, marginBottom:14, borderBottom:`1px solid ${S.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div>
                <div style={{ fontFamily:S.display, fontSize:16, fontWeight:800, letterSpacing:'.02em', color:S.text }}>SATSCHEDULE</div>
                <div style={{ fontFamily:S.body, fontSize:10, color:S.textDim, letterSpacing:'.03em', marginTop:1 }}>위성 촬영 스케줄링 자동화 · 이란-미국 분쟁 지역</div>
              </div>
              <div style={{ width:1, height:28, background:S.border }}/>
              <div style={{ display:'flex', gap:20 }}>
                {([
                  [String(data.summary.satellite_targets), '타겟', S.red],
                  [String(data.summary.total_passes),      '패스', S.amber],
                  [String(urgentCount),                    '즉시', S.blue],
                  [String(Object.keys(satGroups).length),  '위성', S.green],
                ] as [string,string,string][]).map(([val,label,color])=>(
                  <div key={label} style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontFamily:S.mono, fontSize:18, fontWeight:500, color }}>{val}</span>
                    <span style={{ fontFamily:S.body, fontSize:10, color:S.textDim }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:S.green }}/>
                <span style={{ fontFamily:S.body, fontSize:10, color:S.textDim }}>LIVE</span>
              </div>
              <div style={{ position:'relative' }}>
                <select className="date-sel" value={date} onChange={e=>setDate(e.target.value)}>
                  {AVAILABLE_DATES.map(d=>(
                    <option key={d} value={d}>{fmtDateLabel(d)}</option>
                  ))}
                </select>
                <span style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', color:S.textDim, fontSize:9, pointerEvents:'none' }}>▾</span>
              </div>
              <span style={{ fontFamily:S.body, fontSize:11, fontWeight:600, color:S.red }}>▲ {targets.length} TARGETS</span>
            </div>
          </div>

          {/* MAIN GRID */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:12, marginBottom:12 }}>

            {/* LEFT */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}`, borderRadius:6, overflow:'hidden' }}>
              <LeafletMap targets={targets} selected={selected} onSelect={city=>{ setSelected(city); setSelPass(null); }}/>

              {/* 스탯 바 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:`1px solid ${S.border}` }}>
                {([
                  ['타겟 도시', String(data.summary.satellite_targets), S.red],
                  ['전체 패스', String(data.summary.total_passes),      S.amber],
                  ['즉시 촬영', String(urgentCount),                    S.blue],
                  ['투입 위성', String(Object.keys(satGroups).length),  S.green],
                ] as [string,string,string][]).map(([label,val,color])=>(
                  <div key={label} className="stat-item" style={{ background:S.bg2 }}>
                    <div style={{ fontFamily:S.body, fontSize:9, color:S.textDim, marginBottom:3, letterSpacing:'.04em' }}>{label}</div>
                    <div style={{ fontFamily:S.mono, fontSize:18, fontWeight:500, color, lineHeight:1 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* 탭 */}
              <div style={{ display:'flex', borderBottom:`1px solid ${S.border}`, background:S.bg2, paddingLeft:4 }}>
                {(['roi','sensor'] as const).map(t=>(
                  <button key={t} onClick={()=>setTab(t)} className={`tab${tab===t?' on':''}`}>
                    {t==='roi'?'ROI 우선순위':'패스 요약'}
                  </button>
                ))}
              </div>

              {/* ROI 테이블 */}
              {tab==='roi' && (
                <table className="data-tbl">
                  <thead>
                    <tr>{['#','도시','TIER','위험도','충돌지수','언급수','패스'].map(h=><th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {targets.map((t,i)=>(
                      <tr key={t.city} onClick={()=>{ setSelected(t.city); setSelPass(null); }} className={selected===t.city?'sel':''}>
                        <td style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{String(i+1).padStart(2,'0')}</td>
                        <td style={{ fontFamily:S.body, fontWeight:500 }}>{t.display_name}</td>
                        <td style={{ fontFamily:S.mono, fontSize:10, color:S.blue }}>{t.tier}</td>
                        <td><span className={`badge b-${t.risk_label==='위기'?'red':'amber'}`}>{t.risk_label}</span></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:2, background:S.border }}>
                              <div className="ci-fill" style={{ width:`${(t.conflict_index/maxCI*100).toFixed(0)}%` }}/>
                            </div>
                            <span style={{ fontFamily:S.mono, fontSize:10, color:S.textSub, minWidth:28, textAlign:'right' }}>{t.conflict_index.toFixed(0)}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily:S.mono, fontSize:11, color:S.amber }}>{t.mentions_total.toLocaleString()}</td>
                        <td style={{ fontFamily:S.mono, fontSize:10, color:S.textDim }}>{t.satellite_passes.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 패스 요약 */}
              {tab==='sensor' && (
                <div>
                  {([
                    ['전체 타겟', String(data.summary.satellite_targets), S.red],
                    ['전체 패스', String(data.summary.total_passes),      S.amber],
                    ['즉시 촬영', String(urgentCount),                    S.blue],
                    ['SAR 패스',  String(allPasses.filter(p=>p.sensor_type==='sar').length),     S.blue],
                    ['EO 패스',   String(allPasses.filter(p=>p.sensor_type==='optical').length), S.green],
                    ['야간 패스', String(allPasses.filter(p=>!p.daylight).length),               S.textSub],
                    ['구름 없음', String(allPasses.filter(p=>p.cloud_cover_pct<30).length),     S.green],
                    ['구름 많음', String(allPasses.filter(p=>p.cloud_cover_pct>70).length),     S.red],
                    ['투입 위성', String(Object.keys(satGroups).length),                         S.blue],
                  ] as [string,string,string][]).map(([name,val,color])=>(
                    <div key={name} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', borderBottom:`1px solid ${S.border}` }}>
                      <span style={{ fontFamily:S.body, fontSize:11, color:S.textSub }}>{name}</span>
                      <span style={{ fontFamily:S.mono, fontSize:12, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: 스케줄 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}`, borderRadius:6, overflow:'hidden' }}>
              <PanelHeader title="촬영 스케줄" tag={`즉시 ${urgentCount}건`}/>
              <div style={{ overflowY:'auto', maxHeight:680 }}>
                {allPasses.map((p,i)=>(
                  <ScheduleRow key={i} pass={p} approved={approved.has(passKey(p))}
                    onSelect={()=>{ setSelected(p.city); setSelPass(p); }}/>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

            {/* 타임라인 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}`, borderRadius:6, overflow:'hidden' }}>
              <PanelHeader title="24H 촬영 타임라인" tag={`${Object.keys(satGroups).length}개 위성`}/>
              <div style={{ padding:'10px 12px' }}>
                <div style={{ display:'flex', marginLeft:96, marginBottom:5 }}>
                  {[0,4,8,12,16,20,24].map(h=>(
                    <div key={h} style={{ flex:1, fontFamily:S.mono, fontSize:9, color:S.textDim, textAlign:'center' }}>{String(h).padStart(2,'0')}</div>
                  ))}
                </div>
                {Object.entries(satGroups).map(([sat,passes])=>(
                  <div key={sat} style={{ display:'flex', alignItems:'center', marginBottom:6, gap:6 }}>
                    <div style={{ fontFamily:S.body, fontSize:9, color:S.textSub, width:92, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={sat}>
                      {sat.replace('ICEYE-','').replace('Sentinel-','S-').replace('SpaceEye-','SE-')}
                    </div>
                    <div style={{ flex:1, height:18, background:S.bg3, position:'relative', borderRadius:2 }}>
                      {passes.map((p,ei)=>{
                        const d=new Date(p.pass_time_utc), hr=d.getUTCHours()+d.getUTCMinutes()/60;
                        const isSAR=p.sensor_type==='sar', isUrg=p.action_priority_label==='즉시 촬영';
                        const cls=isUrg?(isSAR?'tl-sh':'tl-eh'):(isSAR?'tl-sl':'tl-el');
                        return (
                          <div key={ei} className={cls}
                            title={`${p.city} | ${p.action_priority_label} | EL${p.max_elevation_deg.toFixed(0)}° | ${p.cloud_cover_pct}%`}
                            onClick={()=>{ setSelected(p.city); setSelPass(p); }}
                            style={{ position:'absolute', height:'100%', left:`${(hr/24*100).toFixed(1)}%`, width:'5%', minWidth:3, borderRadius:2, display:'flex', alignItems:'center', padding:'0 3px', fontFamily:S.body, fontSize:8, overflow:'hidden', whiteSpace:'nowrap', cursor:'pointer' }}>
                            {p.city.substring(0,3)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', gap:10, marginTop:8, paddingTop:7, borderTop:`1px solid ${S.border}` }}>
                  {([['tl-sh','SAR 즉시'],['tl-sl','SAR 우선'],['tl-eh','EO 즉시'],['tl-el','EO 우선']] as [string,string][]).map(([cls,label])=>(
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:3 }}>
                      <div className={cls} style={{ width:10, height:10, borderRadius:2 }}/>
                      <span style={{ fontFamily:S.body, fontSize:9, color:S.textDim }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 상세 분석 */}
            <div style={{ background:S.bg2, border:`1px solid ${S.border}`, borderRadius:6, overflow:'hidden' }}>
              <PanelHeader title="상세 분석" tag={selected??'선택 없음'}/>
              <div style={{ overflowY:'auto', maxHeight:400 }}>
                <DetailPanel
                  target={selTarget}
                  pass={selPass}
                  approved={selPass?approved.has(passKey(selPass)):false}
                  onApprove={()=>selPass&&approve(passKey(selPass))}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
