'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ROI } from '@/lib/dataConverter';

interface GlobalMapProps {
  rois: ROI[];
  selectedROI: ROI | null;
  onSelectROI: (roi: ROI) => void;
}

export default function GlobalMap({ rois, selectedROI, onSelectROI }: GlobalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  // 지도 초기화
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [35.2, 33.1],
      zoom: 8,
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 마커 업데이트
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    rois.forEach((roi) => {
      const el = document.createElement('div');
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.backgroundColor = roi.priority === 'high' ? '#ef4444' : '#f97316';
      el.style.border = selectedROI?.id === roi.id ? '3px solid white' : '2px solid rgba(255,255,255,0.5)';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([roi.lng, roi.lat])
        .addTo(map.current!);

      el.addEventListener('click', () => onSelectROI(roi));
      markers.current.push(marker);
    });
  }, [rois, selectedROI, onSelectROI]);

  useEffect(() => {
    if (selectedROI && map.current) {
      map.current.flyTo({
        center: [selectedROI.lng, selectedROI.lat],
        zoom: 10,
      });
    }
  }, [selectedROI]);

  return (
    <div className="flex-1 relative bg-gray-900">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}