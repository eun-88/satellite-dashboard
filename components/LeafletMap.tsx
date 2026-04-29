'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  history_30d?: { date: string; z: number; sources: number; goldstein: number; }[];
  delta_z?: number;
  consecutive_anomaly_days?: number;
}

interface LeafletMapProps {
  targets: Target[];
  selected: string | null;
  onSelect: (city: string) => void;
}

function getRiskColor(risk_label: string) {
  if (risk_label === '위기') return '#e05252';
  if (risk_label === '위험') return '#d4883a';
  return '#f5c842';
}

const riskDisplay = (label: string) =>
  label === '위기' ? '심각' : label === '위험' ? '주의' : '관심';

export default function MapLibreMap({ targets, selected, onSelect }: LeafletMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const centerLat = targets.reduce((s, t) => s + t.lat, 0) / (targets.length || 1);
  const centerLng = targets.reduce((s, t) => s + t.lng, 0) / (targets.length || 1);

  // 지도 초기화
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [centerLng || 44.0, centerLat || 32.0],
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-left');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 마커 업데이트
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      // 기존 마커 제거
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      targets.forEach(target => {
        const color = getRiskColor(target.risk_label);
        const isSelected = selected === target.city;
        const size = isSelected ? 14 : 10;

        // 마커 엘리먼트
        const el = document.createElement('div');
        el.style.cssText = `
          position: relative;
          width: ${size}px;
          height: ${size}px;
          cursor: pointer;
        `;

        // 점
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 1.5px solid rgba(255,255,255,0.8);
          border-radius: 50%;
          box-shadow: ${isSelected
            ? `0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px ${color}, 0 0 10px ${color}88`
            : '0 1px 4px rgba(0,0,0,0.5)'};
        `;

        // pulse 애니메이션
        if (!isSelected) {
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.4;
            animation: pulse 2s ease-out infinite;
          `;
          el.appendChild(pulse);
        }

        // 라벨
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          top: ${size + 3}px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #ffffff;
          background: rgba(0,0,0,0.65);
          padding: 1px 5px;
          border-radius: 2px;
          pointer-events: none;
        `;
        label.textContent = target.display_name;

        el.appendChild(dot);
        el.appendChild(label);

        // 팝업
        const popup = new maplibregl.Popup({
          offset: 12,
          closeButton: true,
          maxWidth: '220px',
        }).setHTML(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif; padding:2px;">
            <div style="font-size:10px;font-weight:600;color:${color};margin-bottom:4px;">
              ${riskDisplay(target.risk_label)}
            </div>
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;line-height:1.2;">
              ${target.display_name}
            </div>
            <div style="font-size:11px;color:#374151;line-height:1.6;">
              ${target.llm_message}
            </div>
          </div>
        `);

        el.addEventListener('click', () => {
          onSelect(target.city);
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([target.lng, target.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (map.loaded()) {
      addMarkers();
    } else {
      map.on('load', addMarkers);
    }
  }, [targets, selected, onSelect]);

  // 선택된 도시로 flyTo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    const t = targets.find(t => t.city === selected);
    if (t) {
      map.flyTo({
        center: [t.lng, t.lat],
        zoom: 10,
        duration: 800,
        essential: true,
      });
    }
  }, [selected, targets]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        @keyframes pulse {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.4; }
          70%  { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 0; }
        }
        .maplibregl-popup-content {
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
        }
        .maplibregl-popup-close-button {
          color: #94a3b8;
          font-size: 16px;
          padding: 4px 6px;
        }
        .maplibregl-ctrl-attrib { display: none !important; }
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl {
          margin: 0 0 10px 10px;
        }
        .maplibregl-ctrl-group {
          background: #1a1a1a !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          box-shadow: none !important;
        }
        .maplibregl-ctrl-group button {
          background: #1a1a1a !important;
          color: #888 !important;
        }
        .maplibregl-ctrl-group button:hover {
          background: #222 !important;
          color: #fff !important;
        }
        .maplibregl-ctrl-icon {
          filter: invert(0.5);
        }
        .maplibregl-ctrl-icon:hover {
          filter: invert(1);
        }
      `}</style>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
