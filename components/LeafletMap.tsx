'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface LeafletMapProps {
  alerts: Alert[];
  selected: string | null;
  onSelect: (city: string) => void;
}

function MapController({ alerts, selected }: { alerts: Alert[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const target = alerts.find(a => a.city === selected);
    if (target) map.flyTo([target.lat, target.lon], 11, { duration: 1 });
  }, [selected, alerts, map]);
  return null;
}

export default function LeafletMap({ alerts, selected, onSelect }: LeafletMapProps) {
  const createIcon = (alert: Alert, isSelected: boolean) => {
    const z = alert.innovation_z;
    const color = z > 20 ? '#ff3b3b' : z > 10 ? '#f5a623' : '#00e5ff';
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
            border-radius:50%;
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            ${glow}
          ">
            <div style="width:8px;height:8px;background:white;border-radius:50%;opacity:0.9;"></div>
          </div>
          ${isSelected ? `
            <div style="
              position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:${size + 16}px;height:${size + 16}px;
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

  const centerLat = alerts.reduce((s, a) => s + a.lat, 0) / (alerts.length || 1);
  const centerLon = alerts.reduce((s, a) => s + a.lon, 0) / (alerts.length || 1);

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
        center={[centerLat || 33.1, centerLon || 35.3]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Carto Dark — 자체적으로 다크해서 필터 불필요 */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapController alerts={alerts} selected={selected} />

        {alerts.map(alert => (
          <Marker
            key={alert.city}
            position={[alert.lat, alert.lon]}
            icon={createIcon(alert, selected === alert.city)}
            eventHandlers={{ click: () => onSelect(alert.city) }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontFamily:'Space Mono,monospace', fontSize:10, color:'#ff3b3b', letterSpacing:'0.1em', marginBottom:4 }}>
                  {alert.risk_label}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>
                  {alert.city}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                  {([
                    ['Z-score', alert.innovation_z],
                    ['충돌지수', alert.conflict_index.toFixed(0)],
                    ['이벤트',  alert.events],
                    ['LLM',    `${(alert.llm_confidence * 100).toFixed(0)}%`],
                  ] as [string, string | number][]).map(([label, val]) => (
                    <div key={label} style={{ background:'rgba(255,255,255,0.05)', padding:'4px 6px', borderRadius:2 }}>
                      <div style={{ fontSize:9, color:'#64748b', fontFamily:'Space Mono,monospace' }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#f5a623', fontFamily:'Space Mono,monospace' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:6, fontSize:10, color:'#94a3b8', lineHeight:1.4 }}>
                  {alert.guide}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
