'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Target, SatPass } from './LeafletMap';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

// ══════════════════════════════════════════════════
//  CONFIG — 날짜 목록만 관리하면 됨
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
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════
function PanelHeader({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07]">
      <span className="font-mono-space text-[10px] tracking-widest text-slate-400 uppercase">{title}</span>
      <span className="font-mono-space text-[9px] px-1.5 py-0.5 border border-white/[0.14] text-slate-500">{tag}</span>
    </div>
  );
}

function StatCard({ label, value, accent, meta }: {
  label: string; value: string | number; accent: string; meta: string;
}) {
  return (
    <div className="relative flex-1 bg-[#0d1117] border border-white/[0.07] px-3.5 py-3 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`}/>
      <p className="font-mono-space text-[10px] tracking-widest text-slate-500 uppercase mb-1.5">{label}</p>
      <p className={`font-mono-space text-3xl font-bold leading-none mb-1 ${accent.replace('bg-','text-')}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{meta}</p>
    </div>
  );
}

// ── 기사 원문 카드
function ArticleLinks({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="mt-2">
      <p className="font-mono-space text-[9px] text-slate-500 tracking-widest uppercase mb-1.5">참조 기사</p>
      <div className="space-y-1.5">
        {urls.map((url, i) => {
          const domain = (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return url; } })();
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-2.5 py-2 bg-[#0d1117] border border-white/[0.07] hover:border-[#00e5ff]/40 hover:bg-[#131920] transition-colors group"
            >
              <span className="font-mono-space text-[9px] text-[#00e5ff] shrink-0 mt-0.5 group-hover:text-[#00e5ff]">↗</span>
              <div className="min-w-0">
                <p className="font-mono-space text-[9px] text-slate-500 mb-0.5">{domain}</p>
                <p className="text-[10px] text-slate-300 break-all leading-relaxed line-clamp-2">{url}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCard({ pass, approved, onSelect }: {
  pass: FlatPass; approved: boolean; onSelect: () => void;
}) {
  const urgent = pass.action_priority_label === '즉시 촬영';
  const cloudColor = pass.cloud_cover_pct < 30 ? 'bg-[#00ff94]'
    : pass.cloud_cover_pct > 70 ? 'bg-[#ff3b3b]' : 'bg-[#f5a623]';

  return (
    <div
      onClick={onSelect}
      className={`px-3.5 py-3 border-b border-white/[0.07] cursor-pointer hover:bg-white/[0.02] transition-colors
        ${urgent ? 'border-l-[3px] border-l-[#ff3b3b]' : 'border-l-[3px] border-l-[#f5a623]'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono-space text-[10px] text-[#00e5ff]">{pass.satellite}</span>
        <span className="font-mono-space text-[10px] text-slate-500">{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
      </div>
      <p className="text-[13px] font-medium mb-1">{pass.city}</p>
      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
        <span className={`text-[10px] ${urgent ? 'text-[#00ff94]' : 'text-slate-400'}`}>{pass.action_priority_label}</span>
        <span className="text-[10px] text-slate-500">EL {pass.max_elevation_deg.toFixed(1)}°</span>
        <span className="text-[10px] text-slate-500">{pass.daylight ? '☀ 주간' : '🌙 야간'}</span>
        <span className={`text-[10px] font-mono-space uppercase ${pass.sensor_type === 'sar' ? 'text-[#00e5ff]' : 'text-[#00ff94]'}`}>
          {pass.sensor_type}
        </span>
        <span className="text-[10px] text-slate-500">{pass.resolution_m}m</span>
        {approved && <span className="text-[10px] text-[#00ff94]">✓ 승인</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono-space text-[9px] text-slate-500">운량</span>
        <div className="flex-1 h-0.5 bg-white/[0.06]">
          <div className={`h-full ${cloudColor}`} style={{ width:`${pass.cloud_cover_pct}%` }}/>
        </div>
        <span className="font-mono-space text-[9px] text-slate-500">{pass.cloud_cover_pct}%</span>
      </div>
    </div>
  );
}

function DetailPanel({ target, pass, approved, onApprove }: {
  target: Target | null;
  pass: FlatPass | null;
  approved: boolean;
  onApprove: () => void;
}) {
  if (!target) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-2">
        <span className="text-2xl opacity-30">⊙</span>
        <p className="font-mono-space text-[10px] tracking-widest">ROI 또는 스케줄 항목을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="p-3.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono-space text-[10px] px-1.5 py-0.5 border border-[#ff3b3b] text-[#ff3b3b]">{target.risk_label}</span>
        <span className="font-mono-space text-[10px] text-slate-500">TIER {target.tier}</span>
      </div>
      <p className="text-[22px] font-semibold mb-2">{target.display_name}</p>

      {/* LLM 메시지 */}
      <div className="bg-[#131920] border border-white/[0.07] px-2.5 py-2 mb-3">
        <p className="font-mono-space text-[9px] text-slate-500 mb-1">LLM 판단</p>
        <p className="text-[11px] text-slate-300 leading-relaxed">{target.llm_message}</p>
      </div>

      {/* 타겟 메트릭 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {([
          ['Goldstein Z',  target.innov_z.toFixed(1),         'text-[#ff3b3b]'],
          ['충돌 지수',    target.conflict_index.toFixed(0),   'text-[#f5a623]'],
          ['이벤트',       String(target.events),              'text-white'],
          ['소스 수',      String(target.sources_total),       'text-[#00e5ff]'],
          ['언급 수',      String(target.mentions_total),      'text-slate-300'],
          ['LLM 상태',     target.llm_status,                  target.llm_status === 'SUCCESS' ? 'text-[#00ff94]' : 'text-[#f5a623]'],
        ] as [string,string,string][]).map(([label, val, color]) => (
          <div key={label} className="bg-[#131920] border border-white/[0.07] px-2.5 py-2">
            <p className="font-mono-space text-[9px] text-slate-500 mb-1">{label}</p>
            <p className={`font-mono-space text-[13px] font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* 선택된 패스 */}
      {pass && (
        <>
          <p className="font-mono-space text-[9px] text-slate-500 tracking-widest uppercase mb-2">선택된 패스</p>
          <div className="bg-[#0d1117] border border-[#00e5ff]/20 px-3 py-2.5 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono-space text-[12px] text-[#00e5ff]">{pass.satellite}</span>
              <span className="font-mono-space text-[10px] text-slate-400">{fmtMD(pass.pass_time_utc)} {fmtUTC(pass.pass_time_utc)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {([
                ['앙각',   `${pass.max_elevation_deg.toFixed(1)}°`, 'text-white'],
                ['운량',   `${pass.cloud_cover_pct}%`,              pass.cloud_cover_pct > 70 ? 'text-[#f5a623]' : 'text-[#00ff94]'],
                ['센서',   pass.sensor_type.toUpperCase(),          pass.sensor_type === 'sar' ? 'text-[#00e5ff]' : 'text-[#00ff94]'],
                ['해상도', `${pass.resolution_m}m`,                 'text-slate-300'],
              ] as [string,string,string][]).map(([label, val, color]) => (
                <div key={label} className="bg-[#131920] px-2 py-1.5">
                  <p className="font-mono-space text-[8px] text-slate-500">{label}</p>
                  <p className={`font-mono-space text-[12px] font-bold ${color}`}>{val}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">{pass.recommendation_reason}</p>
          </div>

          <button
            onClick={onApprove}
            className={`w-full py-2.5 font-mono-space text-[11px] tracking-widest uppercase transition-colors cursor-pointer mb-3
              ${approved
                ? 'bg-[rgba(0,255,148,0.1)] border border-[#00ff94] text-[#00ff94]'
                : 'bg-[rgba(255,59,59,0.15)] border border-[#ff3b3b] text-[#ff3b3b] hover:bg-[rgba(255,59,59,0.25)]'
              }`}
          >
            {approved ? '✓ 촬영 승인됨' : '▶ 촬영 승인 / 스케줄 확정'}
          </button>
        </>
      )}

      {/* 전체 패스 목록 */}
      {target.satellite_passes.length > 0 && (
        <div className="mb-3">
          <p className="font-mono-space text-[9px] text-slate-500 tracking-widest uppercase mb-2">전체 패스 ({target.satellite_passes.length})</p>
          {target.satellite_passes.map((p, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.05] text-[11px]">
              <span className={`font-mono-space text-[9px] uppercase ${p.sensor_type === 'sar' ? 'text-[#00e5ff]' : 'text-[#00ff94]'}`}>
                {p.sensor_type}
              </span>
              <span className="text-slate-300 flex-1">{p.satellite}</span>
              <span className="font-mono-space text-[9px] text-slate-500">{fmtUTC(p.pass_time_utc)}</span>
              <span className="font-mono-space text-[9px] text-[#f5a623]">{p.cloud_cover_pct}%</span>
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

  // 날짜 바뀌면 데이터 새로 fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelected(null);
    setSelPass(null);
    (async () => {
      try {
        const res = await fetch(dashboardPath(date));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'fetch 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const approve = useCallback((key: string) => {
    setApproved(prev => new Set([...prev, key]));
  }, []);

  if (loading) return (
    <div className="bg-[#090c10] text-slate-500 font-mono-space text-[11px] flex items-center justify-center h-screen tracking-widest">
      LOADING INTEL DATA...
    </div>
  );
  if (error || !data) return (
    <div className="bg-[#090c10] text-[#ff3b3b] font-mono-space text-[11px] p-8">
      ⚠ {error ?? '데이터 없음'} — /data/dashboard/daily_{date}.json 경로를 확인하세요
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
    <div className="bg-[#090c10] text-[#e2e8f0] font-dm min-h-screen p-4">
      {/* 스캔라인 */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.015) 2px,rgba(0,229,255,0.015) 4px)' }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto space-y-3">

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border border-white/[0.07] border-t-2 border-t-[#00e5ff]">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 border border-[#00e5ff] rounded flex items-center justify-center">
              <span className="font-mono-space text-[#00e5ff] text-base">⊕</span>
            </div>
            <div>
              <p className="font-mono-space text-[13px] tracking-[.12em] text-[#00e5ff] uppercase">SATSCHEDULE · INTEL OPS</p>
              <p className="text-[11px] text-slate-500 mt-0.5">이란-미국 분쟁 지역 / 위성 촬영 스케줄링 자동화</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff94] shadow-[0_0_6px_#00ff94] animate-pulse"/>
              <span className="font-mono-space text-[10px] text-slate-400">LIVE PIPELINE</span>
            </div>

            {/* 날짜 드롭다운 */}
            <div className="relative">
              <select
                value={date}
                onChange={e => setDate(e.target.value)}
                className="appearance-none bg-[#131920] border border-white/[0.14] text-[#00e5ff] font-mono-space text-[11px] px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:border-[#00e5ff]/50 hover:border-white/30 transition-colors"
              >
                {AVAILABLE_DATES.map(d => (
                  <option key={d} value={d} className="bg-[#131920] text-[#e2e8f0]">
                    📅 {fmtDateLabel(d)}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00e5ff] text-[10px] pointer-events-none">▾</span>
            </div>

            <span className="bg-[rgba(255,59,59,0.15)] border border-[#ff3b3b] text-[#ff3b3b] font-mono-space text-[11px] px-2.5 py-0.5">
              ▲ {targets.length} TARGETS
            </span>
          </div>
        </header>

        {/* STATS */}
        <div className="flex gap-2">
          <StatCard label="타겟 도시"  value={data.summary.satellite_targets}  accent="bg-[#ff3b3b]" meta="위성 촬영 대상"/>
          <StatCard label="전체 패스"  value={data.summary.total_passes}       accent="bg-[#f5a623]" meta="스케줄 후보"/>
          <StatCard label="즉시 촬영"  value={urgentCount}                     accent="bg-[#00e5ff]" meta="우선 실행 패스"/>
          <StatCard label="투입 위성"  value={Object.keys(satGroups).length}   accent="bg-[#00ff94]" meta="활성 위성 수"/>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-[1fr_380px] gap-3">

          {/* LEFT */}
          <div className="bg-[#0d1117] border border-white/[0.07]">
            <PanelHeader title="전술 지도" tag="GDELT·GEOINT"/>
            <LeafletMap
              targets={targets}
              selected={selected}
              onSelect={city => { setSelected(city); setSelPass(null); }}
            />

            {/* 탭 */}
            <div className="flex border-b border-white/[0.07]">
              {(['roi','sensor'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3.5 py-2 font-mono-space text-[10px] tracking-wide uppercase cursor-pointer border-b-2 transition-colors
                    ${tab === t ? 'text-[#00e5ff] border-[#00e5ff]' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                  {t === 'roi' ? 'ROI 우선순위' : '패스 요약'}
                </button>
              ))}
            </div>

            {tab === 'roi' && (
              <table className="w-full">
                <thead>
                  <tr>
                    {['#','도시','Tier','위험도','충돌지수','Z-score','패스'].map(h => (
                      <th key={h} className="px-3 py-2 font-mono-space text-[9px] tracking-widest text-slate-500 uppercase text-left font-normal border-b border-white/[0.07]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t, i) => (
                    <tr key={t.city} onClick={() => { setSelected(t.city); setSelPass(null); }}
                      className={`border-b border-white/[0.07] cursor-pointer transition-colors
                        ${selected === t.city ? 'bg-[rgba(0,229,255,0.1)]' : 'hover:bg-white/[0.03]'}`}>
                      <td className="px-3 py-2.5 font-mono-space text-[11px] text-slate-500">{String(i+1).padStart(2,'0')}</td>
                      <td className="px-3 py-2.5 text-[12px] font-medium">{t.display_name}</td>
                      <td className="px-3 py-2.5 font-mono-space text-[11px] text-[#00e5ff]">{t.tier}</td>
                      <td className="px-3 py-2.5">
                        <span className="bg-[rgba(255,59,59,0.15)] text-[#ff3b3b] border border-[#ff3b3b] font-mono-space text-[9px] font-bold px-1.5 py-0.5">{t.risk_label}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-[3px] bg-white/[0.08]">
                            <div className="h-full bg-[#ff3b3b]" style={{ width:`${(t.conflict_index/maxCI*100).toFixed(0)}%` }}/>
                          </div>
                          <span className="font-mono-space text-[10px] text-slate-400 min-w-[36px] text-right">{t.conflict_index.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono-space text-[12px] text-[#f5a623]">{t.innov_z.toFixed(1)}</td>
                      <td className="px-3 py-2.5 font-mono-space text-[11px] text-slate-400">{t.satellite_passes.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'sensor' && (
              <div>
                {([
                  ['전체 타겟',  String(data.summary.satellite_targets),                              'text-[#ff3b3b]'],
                  ['전체 패스',  String(data.summary.total_passes),                                   'text-[#f5a623]'],
                  ['즉시 촬영',  String(urgentCount),                                                 'text-[#00ff94]'],
                  ['SAR 패스',   String(allPasses.filter(p=>p.sensor_type==='sar').length),           'text-[#00e5ff]'],
                  ['EO 패스',    String(allPasses.filter(p=>p.sensor_type==='optical').length),       'text-slate-300'],
                  ['야간 패스',  String(allPasses.filter(p=>!p.daylight).length),                    'text-slate-400'],
                  ['구름 없음',  String(allPasses.filter(p=>p.cloud_cover_pct<30).length),           'text-[#00ff94]'],
                  ['구름 많음',  String(allPasses.filter(p=>p.cloud_cover_pct>70).length),           'text-[#ff3b3b]'],
                  ['투입 위성',  String(Object.keys(satGroups).length),                              'text-[#00e5ff]'],
                ] as [string,string,string][]).map(([name, val, color]) => (
                  <div key={name} className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07]">
                    <span className="font-mono-space text-[10px] text-slate-400">{name}</span>
                    <span className={`font-mono-space text-[12px] ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: 스케줄 */}
          <div className="bg-[#0d1117] border border-white/[0.07]">
            <PanelHeader title="촬영 스케줄" tag={`즉시 촬영 ×${urgentCount}`}/>
            <div className="overflow-y-auto max-h-[640px]">
              {allPasses.map((p, i) => (
                <ScheduleCard key={i} pass={p} approved={approved.has(passKey(p))}
                  onSelect={() => { setSelected(p.city); setSelPass(p); }}/>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-2 gap-3">

          {/* 타임라인 */}
          <div className="bg-[#0d1117] border border-white/[0.07]">
            <PanelHeader title="24H 촬영 타임라인" tag={`${Object.keys(satGroups).length} 위성`}/>
            <div className="p-3.5">
              <div className="flex ml-[110px] mb-1.5">
                {[0,4,8,12,16,20,24].map(h => (
                  <div key={h} className="flex-1 font-mono-space text-[9px] text-slate-500 text-center">
                    {String(h).padStart(2,'0')}h
                  </div>
                ))}
              </div>
              {Object.entries(satGroups).map(([sat, passes]) => (
                <div key={sat} className="flex items-center mb-2 gap-2">
                  <div className="font-mono-space text-[9px] text-slate-500 w-[106px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap" title={sat}>
                    {sat.replace('ICEYE-','').replace('Sentinel-','S').replace('SpaceEye-','SE-')}
                  </div>
                  <div className="flex-1 h-5 bg-white/[0.04] rounded-sm relative">
                    {passes.map((p, ei) => {
                      const d = new Date(p.pass_time_utc);
                      const hr = d.getUTCHours() + d.getUTCMinutes() / 60;
                      const isSAR    = p.sensor_type === 'sar';
                      const isUrgent = p.action_priority_label === '즉시 촬영';
                      const bg = isUrgent
                        ? (isSAR ? 'bg-[#ff3b3b]' : 'bg-[#ff8c00]')
                        : (isSAR ? 'bg-[#f5a623]' : 'bg-[#00e5ff]');
                      const tc = (isSAR && isUrgent) ? 'text-white' : 'text-black';
                      return (
                        <div key={ei} title={`${p.city} | ${p.action_priority_label} | EL${p.max_elevation_deg.toFixed(0)}° | 운량${p.cloud_cover_pct}%`}
                          onClick={() => { setSelected(p.city); setSelPass(p); }}
                          className={`absolute h-full rounded-sm flex items-center px-1 font-mono-space text-[8px] overflow-hidden whitespace-nowrap cursor-pointer hover:opacity-80 ${bg} ${tc}`}
                          style={{ left:`${(hr/24*100).toFixed(1)}%`, width:'6%', minWidth:'4px' }}>
                          {p.city.substring(0,3)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* 범례 */}
              <div className="flex gap-3 mt-3 pt-2 border-t border-white/[0.05]">
                {([
                  ['bg-[#ff3b3b]','SAR 즉시'],
                  ['bg-[#f5a623]','SAR 우선'],
                  ['bg-[#ff8c00]','EO 즉시'],
                  ['bg-[#00e5ff]','EO 우선'],
                ] as [string,string][]).map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-sm ${color}`}/>
                    <span className="font-mono-space text-[8px] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 상세 분석 */}
          <div className="bg-[#0d1117] border border-white/[0.07]">
            <PanelHeader title="상세 분석" tag={selected ?? '선택 없음'}/>
            <div className="overflow-y-auto max-h-[420px]">
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
  );
}
