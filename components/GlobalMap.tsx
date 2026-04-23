'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ROI } from '@/lib/dataConverter';

interface GlobalMapProps {
  rois: ROI[];
  selectedROI: ROI | null;
  onSelectROI: (roi: ROI) => void;
}

// 선택된 ROI로 이동하는 컴포넌트
function MapController({ selectedROI }: { selectedROI: ROI | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedROI) {
      map.flyTo([selectedROI.lat, selectedROI.lng], 10, { duration: 1 });
    }
  }, [selectedROI, map]);
  
  return null;
}

export default function GlobalMap({ rois, selectedROI, onSelectROI }: GlobalMapProps) {
  // 커스텀 마커 아이콘 생성
  const createIcon = (priority: string, isSelected: boolean) => {
    const color = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f97316' : '#eab308';
    const border = isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.5)';
    
    return L.divIcon({
      html: `<div style="
        width: 30px;
        height: 30px;
        background-color: ${color};
        border: ${border};
        border-radius: 50%;
        cursor: pointer;
      "></div>`,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[33.1, 35.2]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <MapController selectedROI={selectedROI} />
        
        {rois.map((roi) => (
          <Marker
            key={roi.id}
            position={[roi.lat, roi.lng]}
            icon={createIcon(roi.priority, selectedROI?.id === roi.id)}
            eventHandlers={{
              click: () => onSelectROI(roi),
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{roi.name}</strong>
                <br />
                {roi.riskLabel}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}