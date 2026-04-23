'use client';

import { ROI } from '@/lib/dataConverter';
import dynamic from 'next/dynamic';

interface GlobalMapProps {
  rois: ROI[];
  selectedROI: ROI | null;
  onSelectROI: (roi: ROI) => void;
}

// Leaflet 컴포넌트를 동적으로 import (SSR 비활성화)
const LeafletMap = dynamic(
  () => import('./LeafletMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <div className="text-white">지도 로딩 중...</div>
      </div>
    )
  }
);

export default function GlobalMap(props: GlobalMapProps) {
  return <LeafletMap {...props} />;
}