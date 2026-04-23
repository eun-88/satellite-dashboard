'use client';

import { useEffect, useState } from 'react';
import { ROI } from '@/lib/dataConverter';

interface GlobalMapProps {
  rois: ROI[];
  selectedROI: ROI | null;
  onSelectROI: (roi: ROI) => void;
}

export default function GlobalMap({ rois, selectedROI, onSelectROI }: GlobalMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <div className="text-white">지도 로딩 중...</div>
      </div>
    );
  }

  return <MapComponent rois={rois} selectedROI={selectedROI} onSelectROI={onSelectROI} />;
}

// 실제 지도 컴포넌트
function MapComponent({ rois, selectedROI, onSelectROI }: GlobalMapProps) {
  const { MapContainer, TileLayer, Marker, Popup, useMap } = require('react-leaflet');
  const L = require('leaflet');
  require('leaflet/dist/leaflet.css');

  // MapController 함수
  function MapController({ selectedROI }: { selectedROI: ROI | null }) {
    const map = useMap();
    
    useEffect(() => {
      if (selectedROI) {
        map.flyTo([selectedROI.lat, selectedROI.lng], 10, { duration: 1 });
      }
    }, [selectedROI, map]);
    
    return null;
  }

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