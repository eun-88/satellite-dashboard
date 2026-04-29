'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Split from 'react-split';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
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
  roiRank?: number;
}
interface TrendPoint {
  date: string;
  tone: number;
  conflict: number;
}

const fmtUTC = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`;
};
const fmtMD = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;
};
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtDateLabel = (date: string) => {
  const m = parseInt(date.slice(4,6)) - 1;
  return `${date.slice(6,8)} ${MONTHS[m]} ${date.slice(0,4)}`;
};
const fmtDateShort = (date: string) =>
  `${date.slice(4,6)}/${date.slice(6,8)}`;

function flattenPasses(targets: Target[]): FlatPass[] {
  const sorted = [...targets].sort((a,b) => b.innov_z - a.innov_z);
  const rankMap = new Map(sorted.map((t,i) => [t.city, i+1]));
  return targets.flatMap(t =>
    t.satellite_passes.map(p => ({
      ...p, city: t.city, innov_z: t.innov_z, tier: t.tier,
      roiRank: rankMap.get(t.city),
    }))
  ).sort((a, b) => new Date(a.pass_time_utc).getTime() - new Date(b.pass_time_utc).getTime());
}

function groupPassesByTarget(targets: Target[]): { target: Target; passes: FlatPass[]; rank: number }[] {
  return targets
    .slice()
    .sort((a, b) => b.innov_z - a.innov_z)
    .map((t, idx) => ({
      target: t,
      rank: idx + 1,
      passes: t.satellite_passes
        .map(p => ({ ...p, city: t.city, innov_z: t.innov_z, tier: t.tier, roiRank: idx+1 }))
        .sort((a, b) => new Date(a.pass_time_utc).getTime() - new Date(b.pass_time_utc).getTime()),
    }))
    .filter(g => g.passes.length > 0);
}

const passKey = (p: FlatPass) => `${p.city}-${p.satellite}-${p.pass_time_utc}`;

const S = {
  bg:      '#0a0a0a', bg2: '#111111', bg3: '#1a1a1a', bg4: '#222222',
  border:  'rgba(255,255,255,0.08)', borderB: 'rgba(255,255,255,0.15)',
  red:     '#e05252', redDim:   'rgba(224,82,82,0.12)',
  amber:   '#d4883a', amberDim: 'rgba(212,136,58,0.12)',
  blue:    '#4a90d4', blueDim:  'rgba(74,144,212,0.12)',
  green:   '#5fe6a0', greenDim: 'rgba(95,230,160,0.12)',
  text:    '#ffffff', textSub: '#aaaaaa', textDim: '#555555',
  mono:    "'Martian Mono', monospace",
  body:    "'Plus Jakarta Sans', sans-serif",
  display: "'Plus Jakarta Sans', sans-serif",
} as const;

const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:${S.bg}; color:${S.text}; font-family:${S.body}; min-height:100vh; font-size:13px; -webkit-font-smoothing:antialiased; overflow:hidden; }

  .split-horiz { display:flex; height:100%; }
  .split-horiz > div { min-height:0; }
  .gutter-horizontal {
    cursor:col-resize; background:${S.bg};
    width:5px !important; flex-shrink:0; position:relative; transition:background .15s;
  }
  .gutter-horizontal::after {
    content:''; position:absolute; top:50%; left:50%;
    transform:translate(-50%,-50%);
    width:1px; height:40px; background:rgba(255,255,255,0.15); border-radius:1px;
  }
  .gutter-horizontal:hover { background:rgba(74,144,212,0.2); }
  .gutter-horizontal:hover::after { background:${S.blue}; }

  .panel { background:${S.bg2}; border:1px solid ${S.border}; display:flex; flex-direction:column; overflow:hidden; }
  .panel-hdr { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid ${S.border}; background:${S.bg3}; flex-shrink:0; }
  .panel-title { font-family:${S.body}; font-size:11px; font-weight:600; letter-spacing:.02em; color:${S.textSub}; }
  .panel-tag   { font-family:${S.mono}; font-size:9px; color:${S.textDim}; }

  .badge { display:inline-block; padding:1px 5px; font-size:9px; font-weight:500; border-radius:2px; font-family:${S.body}; }
  .b-red   { background:${S.redDim};   color:${S.red};   border:1px solid rgba(224,82,82,0.2); }
  .b-amber { background:${S.amberDim}; color:${S.amber}; border:1px solid rgba(212,136,58,0.2); }

  .sch-row { border-left:2px solid transparent; transition:background .1s; }
  .sch-row:hover { background:rgba(255,255,255,0.025); }
  .sch-row.urg { border-left-color:${S.red}; }

  .tl-default  { background:#3a3a3a; color:#aaa; opacity:.8; }
  .tl-approved { background:${S.red}; color:#fff; opacity:.95; }

  .date-sel { appearance:none; background:${S.bg3}; border:1px solid ${S.border}; color:${S.text}; font-family:${S.body}; font-size:11px; padding:4px 22px 4px 8px; cursor:pointer; outline:none; }
  .date-sel:hover { border-color:${S.borderB}; }

  .approve-btn {
    width:100%; padding:8px; cursor:pointer; font-family:${S.body};
    font-size:11px; font-weight:500; letter-spacing:.04em; transition:all .15s;
    background:${S.redDim}; border:1px solid rgba(224,82,82,0.3); color:${S.red};
  }
  .approve-btn:hover { background:rgba(224,82,82,0.2); }
  .approve-btn.done { background:${S.greenDim}; border-color:rgba(95,230,160,0.3); color:${S.green}; }

  .art-link { display:flex; gap:8px; padding:5px 8px; background:${S.bg3}; border:1px solid ${S.border}; text-decoration:none; transition:border-color .15s; margin-bottom:3px; }
  .art-link:hover { border-color:${S.borderB}; }
  .ci-fill { height:100%; background:${S.red}; opacity:.6; }

  .cart-item { display:flex; align-items:center; gap:8px; padding:5px 10px; border-bottom:1px solid rgba(255,255,255,0.04); }
  .cart-item:last-child { border-bottom:none; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
`;

function useUTCClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')} UTC`;
}

function TrendChart({ city, currentDate }: { city: string; currentDate: string }) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    const idx = AVAILABLE_DATES.indexOf(currentDate);
    const dates = AVAILABLE_DATES.slice(Math.max(0, idx - 6), idx + 1);
    Promise.all(dates.map(d => fetch(dashboardPath(d)).then(r => r.json())))
      .then(results => {
        setTrend(results.map((data, i) => {
          const t = data.targets?.find((t: Target) => t.city === city);
          return {
            date:     fmtDateShort(dates[i]),
            tone:     t ? parseFloat(t.innov_z.toFixed(1)) : 0,
            conflict: t ? parseFloat(t.conflict_index.toFixed(0)) : 0,
          };
        }));
      })
      .catch(() => setTrend([]))
      .finally(() => setLoading(false));
  }, [city, currentDate]);

  if (loading) return (
    <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:S.textDim, fontFamily:S.mono, fontSize:10 }}>
      LOADING TREND...
    </div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:S.bg4, border:`1px solid ${S.borderB}`, padding:'6px 10px', fontFamily:S.mono, fontSize:10 }}>
        <div style={{ color:S.textSub, marginBottom:3 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color:'#5fe6a0' }}>{p.name}: <span style={{ color:S.text }}>{p.value}</span></div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontFamily:S.body, fontSize:9, color:S.textDim, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>7일 트렌드</div>
      <ResponsiveContainer width="100%" height={90}>
        <ComposedChart data={trend} margin={{ top:4, right:4, bottom:0, left:-10 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false}/>
          <XAxis dataKey="date" tick={{ fontFamily:S.mono, fontSize:8, fill:S.textDim }} tickLine={false} axisLine={false}/>
          <YAxis tick={{ fontFamily:S.mono, fontSize:8, fill:S.textDim }} tickLine={false} axisLine={false} width={40}/>
          <Tooltip content={<CustomTooltip/>}/>
          <Line dataKey="tone"     name="Z-score"  stroke="#5fe6a0" strokeWidth={1.5} dot={{ r:2, fill:'#5fe6a0', strokeWidth:0 }} activeDot={{ r:3 }}/>
          <Line dataKey="conflict" name="충돌지수" stroke="#5fe6a0" strokeWidth={1.5} dot={{ r:2, fill:'#5fe6a0', strokeWidth:0 }} activeDot={{ r:3 }} strokeDasharray="3 2" opacity={0.6}/>
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ display:'flex', gap:10, marginTop:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
          <span style={{ fontFamily:S.mono, fontSize:9, color:'#5fe6a0' }}>—</span>
          <span style={{ fontSize:9, color:S.textDim }}>Z-score</span>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="panel-hdr">
      <span className="panel-title">{title}</span>
      {right && <span className="panel-tag">{right}</span>}
    </div>
  );
}

function ScheduleRow({ pass, rank, approved, onSelect }: {
  pass: FlatPass; rank: number; approved: boolean; onSelect: () => void;
}) {
  const urgent = pass.action_priority_label === '즉시 촬영';
  const cp = pass.cloud_cover_pct;
  const cloudColor = cp < 30 ? S.green : cp > 70 ? S.red : S.amber;
  return (
    <div className={`sch-row${urgent?' urg':''}`} onClick={onSelect}
      style={{ padding:'8px 10px', borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, fontWeight:500, color:'#ffffff' }}>{pass.city}</span>
          <span style={{ fontSize:10, color:S.textDim }}>{pass.satellite}</span>
        </div>
        <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {approved && <span style={{ fontSize:10, color:S.green }}>✓ 승인</span>}
      </div>
    </div>
  );
}

function ApprovedCart({ approvedPasses, onRemove }: {
  approvedPasses: FlatPass[];
  onRemove: (key: string) => void;
}) {
  if (!approvedPasses.length) return null;
  return (
    <div style={{ flexShrink:0, borderTop:`1px solid ${S.border}`, background:S.bg3 }}>
      <div style={{ display:'flex', alignItems:'center', padding:'6px 10px', borderBottom:`1px solid ${S.border}` }}>
        <span style={{ fontFamily:S.body, fontSize:10, fontWeight:600, color:S.green }}>
          ✓ 촬영 승인 목록 ({approvedPasses.length})
        </span>
      </div>
      <div style={{ maxHeight:120, overflowY:'auto' }}>
        {approvedPasses.map(p => (
          <div key={passKey(p)} className="cart-item">
            <span style={{ fontFamily:S.mono, fontSize:9, color:S.green, flexShrink:0 }}>✓</span>
            <span style={{ fontSize:11, fontWeight:500, color:'#ffffff', flex:1 }}>{p.city}</span>
            <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>{p.satellite}</span>
            <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginLeft:6 }}>{fmtMD(p.pass_time_utc)} {fmtUTC(p.pass_time_utc)}</span>
            <button
              onClick={() => onRemove(passKey(p))}
              style={{ background:'none', border:'none', color:S.textDim, cursor:'pointer', fontSize:12, padding:'0 2px', marginLeft:4, lineHeight:1 }}
              title="승인 취소"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ target, pass, approved, onApprove, onCancel, currentDate }: {
  target: Target|null; pass: FlatPass|null; approved: boolean;
  onApprove: () => void; onCancel: () => void; currentDate: string;
}) {
  if (!target) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:120, color:S.textDim, fontSize:12 }}>
      항목을 선택하세요
    </div>
  );
  return (
    <div style={{ padding:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <span className={`badge b-${target.risk_label==='위기'?'red':'amber'}`}>{target.risk_label}</span>
      </div>
      <div style={{ fontFamily:S.display, fontSize:24, fontWeight:800, marginBottom:8, lineHeight:1.2, color:'#ffffff' }}>
        {target.display_name}
      </div>
      <div style={{ fontSize:13, color:'#ffffff', lineHeight:1.7, marginBottom:10, paddingBottom:10, borderBottom:`1px solid ${S.border}` }}>
        {target.llm_message}
      </div>

      <TrendChart city={target.city} currentDate={currentDate}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginBottom:10 }}>
        {([
          ['Goldstein 점수', target.innov_z.toFixed(1),             S.red],
          ['언급 수',        target.mentions_total.toLocaleString(), '#ffffff'],
          ['이벤트',         String(target.events),                  '#ffffff'],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{ background:S.bg3, padding:'5px 7px', border:`1px solid ${S.border}` }}>
            <div style={{ fontSize:8, color:'#aaaaaa', marginBottom:2 }}>{l}</div>
            <div style={{ fontFamily:S.mono, fontSize:12, fontWeight:500, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      {pass && (
        <>
          <div style={{ fontSize:9, color:'#aaaaaa', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>선택된 패스</div>
          <div style={{ background:S.bg3, border:`1px solid ${S.border}`, padding:'8px 10px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:S.mono, fontSize:11, color:'#ffffff' }}>{pass.satellite}</span>
              <span style={{ fontFamily:S.mono, fontSize:9, color:'#ffffff' }}>{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:3 }}>
              {([
                ['앙각',   `${pass.max_elevation_deg.toFixed(0)}°`, '#ffffff'],
                ['운량',   `${pass.cloud_cover_pct}%`,              pass.cloud_cover_pct>70?S.amber:S.green],
                ['센서',   pass.sensor_type.toUpperCase(),          '#ffffff'],
                ['해상도', `${pass.resolution_m}m`,                 '#ffffff'],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l} style={{ background:S.bg4, padding:'4px 6px' }}>
                  <div style={{ fontSize:8, color:'#aaaaaa' }}>{l}</div>
                  <div style={{ fontFamily:S.mono, fontSize:11, fontWeight:500, color:c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <button
            className={`approve-btn${approved?' done':''}`}
            onClick={approved ? onCancel : onApprove}
          >
            {approved ? '✓ 촬영 승인됨 — 클릭하여 취소' : '촬영 승인 / 스케줄 확정'}
          </button>
        </>
      )}

      {target.urls_sent?.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:9, color:'#aaaaaa', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:5 }}>참조 기사</div>
          {target.urls_sent.map((url,i)=>{
            const domain=(()=>{ try{ return new URL(url).hostname.replace('www.',''); }catch{ return url; }})();
            return (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="art-link">
                <span style={{ fontFamily:S.mono, fontSize:9, color:S.blue, flexShrink:0 }}>↗</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:9, color:'#aaaaaa', marginBottom:1 }}>{domain}</div>
                  <div style={{ fontSize:10, color:S.blue, fontWeight:500 }}>기사 원문 바로가기</div>
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
  const utcClock = useUTCClock();
  const [date,     setDate]     = useState(AVAILABLE_DATES[AVAILABLE_DATES.length-1]);
  const [data,     setData]     = useState<DashboardData|null>(null);
  const [selected, setSelected] = useState<string|null>(null);
  const [selPass,  setSelPass]  = useState<FlatPass|null>(null);
  const [approved, setApproved] = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string|null>(null);

  useEffect(()=>{
    setLoading(true); setError(null); setSelected(null); setSelPass(null);
    setApproved([]);
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

  const approve = useCallback((key:string) => {
    setApproved(prev => prev.includes(key) ? prev : [...prev, key]);
  },[]);

  const cancelApprove = useCallback((key:string) => {
    setApproved(prev => prev.filter(k => k !== key));
  },[]);

  if(loading) return (
    <div style={{ background:S.bg, color:S.textDim, fontFamily:S.mono, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', letterSpacing:'.1em' }}>
      LOADING...
    </div>
  );
  if(error||!data) return (
    <div style={{ background:S.bg, color:S.red, fontSize:13, padding:32 }}>⚠ {error??'데이터 없음'}</div>
  );

  const targets      = data.targets??[];
  const allPasses    = flattenPasses(targets);
  const urgentCount  = allPasses.filter(p=>p.action_priority_label==='즉시 촬영').length;
  const selTarget    = targets.find(t=>t.city===selected)??null;
  const satGroups = allPasses.reduce((acc,p)=>{ (acc[p.satellite]??=[]).push(p); return acc; },{} as Record<string,FlatPass[]>);
  const grouped      = groupPassesByTarget(targets);
  const approvedPasses = allPasses.filter(p => approved.includes(passKey(p)));

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ background:S.bg, color:S.text, fontFamily:S.body, height:'100vh', display:'flex', flexDirection:'column', padding:'10px 12px', gap:8 }}>

        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:8, borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <img src="/sia-logo.jpg" alt="SIA" style={{ height:32, objectFit:'contain' }}/>
            <div style={{ width:1, height:24, background:S.border }}/>
            <div>
              <div style={{ fontFamily:S.display, fontSize:20, fontWeight:800, letterSpacing:'.06em', color:'#ffffff' }}>SI ANALYSIS</div>
              <div style={{ fontSize:10, color:S.textDim, marginTop:1 }}>위성 촬영 스케줄링 자동화 · 이란-미국 분쟁 지역</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontFamily:S.mono, fontSize:11, color:S.textSub, letterSpacing:'.06em' }}>{utcClock}</span>
            <div style={{ width:1, height:16, background:S.border }}/>
            <div style={{ position:'relative' }}>
              <select className="date-sel" value={date} onChange={e=>setDate(e.target.value)}>
                {AVAILABLE_DATES.map(d=>(
                  <option key={d} value={d} style={{ background:S.bg3 }}>{fmtDateLabel(d)}</option>
                ))}
              </select>
              <span style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', color:S.textDim, fontSize:9, pointerEvents:'none' }}>▾</span>
            </div>
          </div>
        </div>

        {/* 3분할 */}
        <Split
          className="split-horiz"
          sizes={[34, 33, 33]}
          minSize={200}
          gutterSize={5}
          direction="horizontal"
          style={{ flex:1, minHeight:0 }}
        >
          {/* 1열: 지도 + 장바구니 */}
          <div className="panel">
            <div style={{ height:460, flexShrink:0, overflow:'hidden' }}>
              <LeafletMap
                targets={targets}
                selected={selected}
                onSelect={city=>{
                  setSelected(city);
                  const t = targets.find(t => t.city === city);
                  if (t?.satellite_passes?.length) {
                    const fp = { ...t.satellite_passes[0], city: t.city, innov_z: t.innov_z, tier: t.tier };
                    setSelPass(fp);
                  } else {
                    setSelPass(null);
                  }
                }}
              />
            </div>
            <div style={{ flexShrink:0, borderTop:`1px solid ${S.border}`, background:S.bg3 }}>
              <div style={{ display:'flex', alignItems:'center', padding:'6px 10px', borderBottom:`1px solid ${S.border}` }}>
                <span style={{ fontFamily:S.body, fontSize:10, fontWeight:600, color:S.textSub }}>
                  촬영 승인 목록
                </span>
                {approvedPasses.length > 0 && (
                  <span style={{ fontFamily:S.mono, fontSize:9, color:S.green, marginLeft:6 }}>({approvedPasses.length})</span>
                )}
              </div>
              {approvedPasses.length === 0 ? (
                <div style={{ padding:'8px 10px', fontSize:10, color:S.textDim }}>승인된 촬영이 없습니다</div>
              ) : (
                <div style={{ maxHeight:120, overflowY:'auto' }}>
                  {approvedPasses.map(p => (
                    <div key={passKey(p)} className="cart-item">
                      <span style={{ fontFamily:S.mono, fontSize:9, color:S.green, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:11, fontWeight:500, color:'#ffffff', flex:1 }}>{p.city}</span>
                      <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim }}>{p.satellite}</span>
                      <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginLeft:6 }}>{fmtMD(p.pass_time_utc)} {fmtUTC(p.pass_time_utc)}</span>
                      <button
                        onClick={() => cancelApprove(passKey(p))}
                        style={{ background:'none', border:'none', color:S.textDim, cursor:'pointer', fontSize:12, padding:'0 2px', marginLeft:4, lineHeight:1 }}
                        title="승인 취소"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2열: 타임라인 + 스케줄 — flex column, 높이 100% */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, minHeight:0 }}>

            {/* 타임라인 */}
            <div className="panel" style={{ flexShrink:0 }}>
              <PanelHeader title="24H 촬영 타임라인"/>
              <div style={{ padding:'8px 10px' }}>
                <div style={{ display:'flex', marginLeft:80, marginBottom:4 }}>
                  {[0,4,8,12,16,20,24].map(h=>(
                    <div key={h} style={{ flex:1, fontFamily:S.mono, fontSize:8, color:S.textDim, textAlign:'center' }}>{String(h).padStart(2,'0')}</div>
                  ))}
                </div>
                {Object.entries(satGroups).map(([sat,passes])=>(
                  <div key={sat} style={{ display:'flex', alignItems:'center', marginBottom:5, gap:5 }}>
                    <div style={{ fontSize:8, color:S.textSub, width:76, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={sat}>
                      {sat.replace('ICEYE-','').replace('Sentinel-','S-').replace('SpaceEye-','SE-')}
                    </div>
                    <div style={{ flex:1, height:16, background:'rgba(255,255,255,0.04)', position:'relative', borderRadius:1 }}>
                      {passes.map((p,ei)=>{
                        const d=new Date(p.pass_time_utc), hr=d.getUTCHours()+d.getUTCMinutes()/60;
                        const key = `${p.city}-${p.satellite}-${p.pass_time_utc}`;
                        const isApproved = approved.includes(key);
                        return (
                          <div key={ei}
                            title={`${p.city} | ${p.action_priority_label} | ${p.cloud_cover_pct}%`}
                            onClick={()=>{ setSelected(p.city); setSelPass(p); }}
                            style={{
                              position:'absolute', height:'100%',
                              left:`${(hr/24*100).toFixed(1)}%`, width:'5%', minWidth:3,
                              borderRadius:1, display:'flex', alignItems:'center',
                              padding:'0 2px', fontSize:7, overflow:'hidden',
                              whiteSpace:'nowrap', cursor:'pointer',
                              background: isApproved ? '#5fe6a0' : '#3a3a3a',
                              color: isApproved ? '#000' : '#aaa',
                              opacity: isApproved ? 1 : 0.8,
                              transition: 'background 0.3s, opacity 0.3s',
                            }}>
                            {p.city.substring(0,3)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', gap:8, marginTop:5, paddingTop:5, borderTop:`1px solid ${S.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{ width:8, height:8, borderRadius:1, background:'#5fe6a0' }}/>
                    <span style={{ fontSize:8, color:S.textDim }}>촬영 승인</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{ width:8, height:8, borderRadius:1, background:'#3a3a3a' }}/>
                    <span style={{ fontSize:8, color:S.textDim }}>미승인</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 스케줄 — flex:1 로 남은 공간 채움 */}
            <div className="panel" style={{ flex:1, minHeight:0 }}>
              <PanelHeader title="촬영 스케줄"/>
              <div style={{ overflowY:'auto', flex:1 }}>
                {grouped.map(({ target, passes, rank }) => (
                  <div key={target.city}>
                    <div style={{ padding:'6px 10px', background:S.bg3, borderBottom:`1px solid ${S.border}`, display:'flex', alignItems:'center', gap:8, position:'sticky', top:0, zIndex:1 }}>
                      <span style={{ fontFamily:S.mono, fontSize:10, color:S.textDim, minWidth:20 }}>#{rank}</span>
                      <span className={`badge b-${target.risk_label==='위기'?'red':'amber'}`}>{target.risk_label}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:'#ffffff' }}>{target.display_name}</span>
                      <span style={{ fontFamily:S.mono, fontSize:9, color:S.textDim, marginLeft:'auto' }}>Z {target.innov_z.toFixed(1)}</span>
                    </div>
                    {passes.map((p, i) => (
                      <ScheduleRow
                        key={i} pass={p} rank={rank}
                        approved={approved.includes(passKey(p))}
                        onSelect={() => { setSelected(p.city); setSelPass(p); }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3열: 상세 분석 */}
          <div className="panel">
            <PanelHeader title="상세 분석"/>
            <div style={{ overflowY:'auto', flex:1 }}>
              <DetailPanel
                target={selTarget}
                pass={selPass}
                approved={selPass?approved.includes(passKey(selPass)):false}
                onApprove={()=>selPass&&approve(passKey(selPass))}
                onCancel={()=>selPass&&cancelApprove(passKey(selPass))}
                currentDate={date}
              />
            </div>
          </div>
        </Split>

      </div>
    </>
  );
}
