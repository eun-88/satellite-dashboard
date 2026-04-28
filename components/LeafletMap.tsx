'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── 타입 export (Dashboard.tsx 에서 import 해서 사용)
export interface SatPass {
  satellite: string;
  norad_id: number;
  sensor_type: string;
  resolution_m: number;
  pass_time_utc: string;
  max_elevation_deg: number;
  within_swath: boolean;
  cloud_cover_pct: number;
  cloud_status: string;
  daylight: boolean;
  shootable: boolean;
  action_priority_label: string;
  urgency_label: string;
  capture_condition_label: string;
  recommendation_reason: string;
}

export interface Target {
  city: string;
  display_name: string;
  lat: number;
  lng: number;
  tier: string;
  innov_z: number;
  risk_label: string;
  events: number;
  conflict_index: number;
  sources_total: number;
  mentions_total: number;
  llm_status: string;
  llm_message: string;
  urls_sent: string[];
  satellite_passes: SatPass[];
}

interface LeafletMapProps {
  targets: Target[];
  selected: string | null;
  onSelect: (city: string) => void;
}

function MapController({ targets, selected }: { targets: Target[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const t = targets.find(t => t.city === selected);
    if (t) map.flyTo([t.lat, t.lng], 11, { duration: 1 });
  }, [selected, targets, map]);
  return null;
}

export default function LeafletMap({ targets, selected, onSelect }: LeafletMapProps) {
  const createIcon = (target: Target, isSelected: boolean) => {
    const z = target.innov_z;
    const color = z > 20 ? '#ff3b3b' : z > 5 ? '#f5a623' : '#00e5ff';
    const size = isSelected ? 36 : 28;
    const glow = isSelected
      ? `box-shadow: 0 0 0 3px #00e5ff, 0 0 16px ${color};`
      : `box-shadow: 0 0 8px ${color};`;

    return L.divIcon({
      html: `
        <div style="position:relative;width:${size}px;height:${size}px;">
          <div style="
            width:${size}px;height:${size}px;
            background:${color};
            border:2px solid rgba(255,255,255,0.7);
            border-radius:50%;cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            ${glow}
          ">
            <div style="width:8px;height:8px;background:white;border-radius:50%;opacity:0.9;"></div>
          </div>
          ${isSelected ? `
            <div style="
              position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:${size+16}px;height:${size+16}px;
              border:1.5px solid ${color};border-radius:50%;
              animation:sat-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
              pointer-events:none;
            "></div>` : ''}
        </div>
      `,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const centerLat = targets.reduce((s, t) => s + t.lat, 0) / (targets.length || 1);
  const centerLng = targets.reduce((s, t) => s + t.lng, 0) / (targets.length || 1);

  return (
    <div className="h-[300px] border-b border-white/[0.07] relative">
      <style>{`
        .leaflet-container { background: #0d1117; }
        .leaflet-popup-content-wrapper {
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          color: #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          font-family: 'DM Sans', sans-serif;
        }
        .leaflet-popup-tip { background: #0d1117; }
        .leaflet-popup-close-button { color: #64748b !important; }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          background: #0d1117 !important;
        }
        .leaflet-control-zoom a {
          background: #0d1117 !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #131920 !important;
          color: #00e5ff !important;
        }
        @keyframes sat-ping {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={[centerLat || 32.0, centerLng || 35.0]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        />

        <MapController targets={targets} selected={selected} />

        {targets.map(target => (
          <Marker
            key={target.city}
            position={[target.lat, target.lng]}
            icon={createIcon(target, selected === target.city)}
            eventHandlers={{ click: () => onSelect(target.city) }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#ff3b3b', letterSpacing:'0.1em', marginBottom:4 }}>
                  {target.risk_label} · TIER {target.tier}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>
                  {target.display_name}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
                  {([
                    ['Z-score',  target.innov_z.toFixed(1)],
                    ['충돌지수', target.conflict_index.toFixed(0)],
                    ['이벤트',   String(target.events)],
                    ['소스',     String(target.sources_total)],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} style={{ background:'rgba(255,255,255,0.05)', padding:'4px 6px', borderRadius:2 }}>
                      <div style={{ fontSize:9, color:'#64748b', fontFamily:'Space Mono,monospace' }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#f5a623', fontFamily:'Space Mono,monospace' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', lineHeight:1.5 }}>
                  {target.llm_message}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
