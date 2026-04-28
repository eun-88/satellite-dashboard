'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
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

// 지도 이동만 담당 — 리마운트 없이 flyTo만
function MapController({ targets, selected }: { targets: Target[]; selected: string | null }) {
  const map = useMap();
  const prevSelected = useRef<string | null>(null);

  useEffect(() => {
    if (!selected || selected === prevSelected.current) return;
    const t = targets.find(t => t.city === selected);
    if (t) {
      map.flyTo([t.lat, t.lng], 10, { duration: 0.8, easeLinearity: 0.5 });
      prevSelected.current = selected;
    }
  }, [selected, targets, map]);

  return null;
}

function MarkersLayer({ targets, selected, onSelect }: LeafletMapProps) {
  const createIcon = (target: Target, isSelected: boolean) => {
    // 위험도 라벨 기반 색상
    const color = target.risk_label === '위기' ? '#e05252'
                : target.risk_label === '주의' ? '#d4883a'
                : '#f5c842'; // 관심/기타
    const size  = isSelected ? 14 : 10;
    const ring  = isSelected
      ? `box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px ${color}, 0 0 10px ${color}55;`
      : `box-shadow: 0 1px 4px rgba(0,0,0,0.5);`;

    return L.divIcon({
      html: `
        <div style="position:relative;">
          <div style="
            width:${size}px; height:${size}px;
            background:${color};
            border:1.5px solid rgba(255,255,255,0.8);
            border-radius:50%;
            ${ring}
          "></div>
          <div style="
            position:absolute;
            top:${size + 3}px;
            left:50%;
            transform:translateX(-50%);
            white-space:nowrap;
            font-family:'Barlow', sans-serif;
            font-size:10px;
            font-weight:600;
            color:#ffffff;
            background:rgba(0,0,0,0.65);
            padding:1px 5px;
            border-radius:2px;
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

  return (
    <>
      {targets.map(target => (
        <Marker
          key={target.city}
          position={[target.lat, target.lng]}
          icon={createIcon(target, selected === target.city)}
          eventHandlers={{ click: () => onSelect(target.city) }}
        >
          <Popup>
            <div style={{ minWidth: 200, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div style={{ fontSize:10, fontWeight:600, color: target.risk_label==='위기'?'#e05252':'#d4883a', marginBottom:4 }}>
                {target.risk_label} · TIER {target.tier}
              </div>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#0f172a', lineHeight:1.2 }}>
                {target.display_name}
              </div>
              <div style={{ fontSize:11, color:'#374151', lineHeight:1.6, marginBottom:10 }}>
                {target.llm_message}
              </div>
              <button
                onClick={() => onSelect(target.city)}
                style={{
                  width:'100%', padding:'6px 0', fontSize:11, fontWeight:600,
                  background:'#0f172a', color:'#ffffff', border:'none',
                  borderRadius:4, cursor:'pointer', letterSpacing:'.02em',
                }}
              >
                상세 분석 보기 →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function LeafletMap({ targets, selected, onSelect }: LeafletMapProps) {
  const centerLat = targets.reduce((s, t) => s + t.lat, 0) / (targets.length || 1);
  const centerLng = targets.reduce((s, t) => s + t.lng, 0) / (targets.length || 1);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        .leaflet-container { background: #1a1a1a; }
        .leaflet-popup-content-wrapper {
          background: #fff; border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          font-family: 'Plus Jakarta Sans', sans-serif;
          border: 1px solid #e2e8f0; color: #1e293b;
        }
        .leaflet-popup-tip { background: #fff; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
        /* 줌 버튼 하단 배치 */
        .leaflet-bottom.leaflet-left { display: block; }
        .leaflet-top.leaflet-left .leaflet-control-zoom { display: none; }
        .leaflet-bottom.leaflet-left .leaflet-control-zoom {
          display: block;
          border: 1px solid rgba(255,255,255,0.15) !important;
          box-shadow: none !important;
          margin-bottom: 10px;
          margin-left: 10px;
        }
        .leaflet-control-zoom a {
          background: #1a1a1a !important;
          color: #888 !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .leaflet-control-zoom a:hover {
          background: #222 !important;
          color: #fff !important;
        }
        /* attribution 숨기기 */
        .leaflet-control-attribution { display: none !important; }
      `}</style>

      <MapContainer
        key="sat-map"
        center={[centerLat || 32.0, centerLng || 35.0]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution=""
        />
        <MapController targets={targets} selected={selected} />
        <MarkersLayer targets={targets} selected={selected} onSelect={onSelect} />
        {/* 줌 버튼을 하단 왼쪽으로 */}
        <ZoomControl position="bottomleft" />
      </MapContainer>
    </div>
  );
}
