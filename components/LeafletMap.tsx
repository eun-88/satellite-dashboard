'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
    if (t) map.flyTo([t.lat, t.lng], 10, { duration: 1 });
  }, [selected, targets, map]);
  return null;
}

export default function LeafletMap({ targets, selected, onSelect }: LeafletMapProps) {
  const createIcon = (target: Target, isSelected: boolean) => {
    const z = target.innov_z;
    // 라이트 모드 기반 색상
    const color = z > 20 ? '#dc2626' : z > 5 ? '#d97706' : '#2563eb';
    const size  = isSelected ? 14 : 10;
    const ring  = isSelected
      ? `box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px ${color};`
      : `box-shadow: 0 1px 3px rgba(0,0,0,0.3);`;

    return L.divIcon({
      html: `
        <div style="position:relative;">
          <div style="
            width:${size}px; height:${size}px;
            background:${color};
            border:2px solid white;
            border-radius:50%;
            ${ring}
          "></div>
          <div style="
            position:absolute;
            top:${size + 4}px;
            left:50%;
            transform:translateX(-50%);
            white-space:nowrap;
            font-family:'Barlow', sans-serif;
            font-size:11px;
            font-weight:600;
            color:#1e293b;
            background:rgba(255,255,255,0.92);
            padding:1px 5px;
            border-radius:3px;
            box-shadow:0 1px 3px rgba(0,0,0,0.15);
            pointer-events:none;
            letter-spacing:0.01em;
          ">${target.display_name}</div>
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
    <div style={{ height: 380, borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
      <style>{`
        .leaflet-container { background: #e8e0d8; }
        .leaflet-popup-content-wrapper {
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          font-family: 'Barlow', sans-serif;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .leaflet-popup-tip { background: #fff; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
        .leaflet-control-zoom {
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important;
        }
        .leaflet-control-zoom a {
          background: #fff !important;
          color: #475569 !important;
          border-bottom: 1px solid #e2e8f0 !important;
          font-family: 'Barlow', sans-serif !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f8fafc !important;
          color: #1e293b !important;
        }
      `}</style>

      <MapContainer
        center={[centerLat || 32.0, centerLng || 35.0]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* ESRI 위성 이미지 */}
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
              <div style={{ minWidth: 180, fontFamily: "'Barlow', sans-serif" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: target.risk_label === '위기' ? '#dc2626' : '#d97706', marginBottom: 4, letterSpacing: '.03em' }}>
                  {target.risk_label} · TIER {target.tier}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                  {target.display_name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
                  {([
                    ['Z-score',  target.innov_z.toFixed(1)],
                    ['충돌지수', target.conflict_index.toFixed(0)],
                    ['이벤트',   String(target.events)],
                    ['소스',     String(target.sources_total)],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} style={{ background: '#f8fafc', padding: '4px 6px', borderRadius: 3 }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'Martian Mono', monospace" }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: "'Martian Mono', monospace" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>{target.llm_message}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
