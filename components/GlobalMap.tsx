'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface GlobalMapProps {
  selectedROI: string | null;
  onSelectROI: (id: string) => void;
}

const ROIS = [
  { id: 'roi-001', coords: [51.3890, 35.6892], name: 'Tehran' },
  { id: 'roi-002', coords: [53.6880, 32.4279], name: 'Isfahan' },
  { id: 'roi-003', coords: [52.5836, 29.5918], name: 'Shiraz' },
  { id: 'roi-004', coords: [46.2976, 38.0746], name: 'Tabriz' },
  { id: 'roi-005', coords: [59.6168, 36.2605], name: 'Mashhad' },
];

export default function GlobalMap({ selectedROI, onSelectROI }: GlobalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // 지도 초기화 (한 번만 실행)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // MapLibre 지도 생성
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: [51.3890, 35.6892],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18
    });

    // 네비게이션 컨트롤 추가
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 지도 로드 완료 시
    map.current.on('load', () => {
      console.log('Map loaded successfully!');
      setIsMapLoaded(true);

      // ROI 마커 추가
      ROIS.forEach((roi) => {
        const el = document.createElement('div');
        el.className = 'roi-marker';
        el.style.cssText = `
          width: 20px;
          height: 20px;
          background-color: #ff4444;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
          transition: all 0.2s ease;
        `;

        // 호버 효과
        el.addEventListener('mouseenter', () => {
          el.style.width = '28px';
          el.style.height = '28px';
          el.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.8)';
        });

        el.addEventListener('mouseleave', () => {
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.5)';
        });

        // 클릭 이벤트
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectROI(roi.id);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat(roi.coords as [number, number])
          .addTo(map.current!);
      });
    });

    // 에러 핸들링
    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    // 클린업
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // 빈 배열: 한 번만 실행

  // 선택된 ROI로 이동 (별도 useEffect)
  useEffect(() => {
    if (!map.current || !isMapLoaded || !selectedROI) return;

    const roi = ROIS.find(r => r.id === selectedROI);
    if (!roi) return;

    console.log('Flying to:', roi.name);

    map.current.flyTo({
      center: roi.coords as [number, number],
      zoom: 10,
      duration: 1500,
      essential: true
    });
  }, [selectedROI, isMapLoaded]);

  return (
    <div className="relative w-full h-full">
      {/* 지도 컨테이너 */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ minHeight: '400px' }}
      />

      {/* 로딩 인디케이터 */}
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--border-default)] border-t-[var(--accent-cyan)] rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-[var(--text-muted)]">Loading map...</p>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 text-xs space-y-2 pointer-events-auto">
        <div className="font-semibold mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--status-critical)]"></div>
          <span>ROI Marker</span>
        </div>
        <div className="text-[var(--text-muted)] text-[10px] mt-2">
          Click marker to select ROI
        </div>
      </div>
    </div>
  );
}