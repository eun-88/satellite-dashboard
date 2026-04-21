'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface GlobalMapProps {
  selectedROI: string | null;
  onSelectROI: (id: string) => void;
}

const ROIS = [
  { id: 'roi-001', coords: [51.3890, 35.6892] as [number, number] },
  { id: 'roi-002', coords: [53.6880, 32.4279] as [number, number] },
  { id: 'roi-003', coords: [52.5836, 29.5918] as [number, number] },
  { id: 'roi-004', coords: [46.2976, 38.0746] as [number, number] },
  { id: 'roi-005', coords: [59.6168, 36.2605] as [number, number] },
];

export default function GlobalMap({ selectedROI, onSelectROI }: GlobalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
            maxzoom: 19
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }]
      },
      center: [51.3890, 35.6892],
      zoom: 5
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      
      ROIS.forEach((roi) => {
        const el = document.createElement('div');
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#ff4444';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.2s';
        
        el.onmouseover = () => {
          el.style.transform = 'scale(1.3)';
          el.style.boxShadow = '0 0 20px rgba(255, 68, 68, 0.9)';
        };
        
        el.onmouseout = () => {
          el.style.transform = 'scale(1)';
          el.style.boxShadow = 'none';
        };
        
        el.onclick = () => {
          onSelectROI(roi.id);
        };

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(roi.coords)
          .addTo(map.current!);
        
        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // ← 빈 배열!

  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedROI) return;

    const roi = ROIS.find(r => r.id === selectedROI);
    if (roi) {
      map.current.flyTo({
        center: roi.coords,
        zoom: 10,
        duration: 1500,
      });
    }
  }, [selectedROI, mapLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      
      <div className="absolute bottom-4 left-4 glass-panel p-3 text-xs space-y-2">
        <div className="font-semibold mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[var(--status-critical)]"></div>
          <span>ROI Marker</span>
        </div>
      </div>
    </div>
  );
}