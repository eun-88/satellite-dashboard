'use client';

import { useState, useEffect } from 'react';
import Split from 'react-split';
import GlobalMap from './GlobalMap';
import ROIList from './ROIList';
import DetailPanel from './DetailPanel';
import StatusBar from './StatusBar';
import { fetchGDELTData, fetchScheduleData } from '@/lib/api';
import { convertGDELTToROIs, ROI } from '@/lib/dataConverter';

export default function Dashboard() {
  const [selectedROI, setSelectedROI] = useState<ROI | null>(null);
  const [rois, setRois] = useState<ROI[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('20260414');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const gdeltData = await fetchGDELTData(currentDate);
      const scheduleData = await fetchScheduleData(currentDate);
      
      if (gdeltData) {
        const convertedROIs = convertGDELTToROIs(gdeltData, scheduleData || undefined);
        setRois(convertedROIs);
        if (convertedROIs.length > 0) {
          setSelectedROI(convertedROIs[0]);
        }
      }
      
      setLoading(false);
    }
    
    loadData();
  }, [currentDate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 상단 상태바 */}
      <StatusBar 
        totalROIs={rois.length}
        highPriority={rois.filter(r => r.priority === 'high').length}
        scheduledPasses={rois.reduce((sum, r) => sum + (r.schedules?.length || 0), 0)}
      />

      {/* 메인 컨텐츠: 상하 분할 */}
      <div className="flex-1 overflow-hidden">
        <Split
          direction="vertical"
          sizes={[60, 40]}
          minSize={[200, 150]}
          gutterSize={8}
          className="flex flex-col h-full"
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          {/* 상단: 좌우 분할 */}
          <div className="overflow-hidden">
            <Split
              sizes={[30, 70]}
              minSize={[250, 400]}
              gutterSize={8}
              className="flex h-full"
              style={{ display: 'flex', height: '100%' }}
            >
              {/* 왼쪽: ROI 목록 */}
              <div className="overflow-hidden">
                <ROIList
                  rois={rois}
                  selectedROI={selectedROI}
                  onSelectROI={setSelectedROI}
                />
              </div>

              {/* 오른쪽: 지도 */}
              <div className="overflow-hidden">
                <GlobalMap
                  rois={rois}
                  selectedROI={selectedROI}
                  onSelectROI={setSelectedROI}
                />
              </div>
            </Split>
          </div>

          {/* 하단: Event Analysis */}
          <div className="overflow-hidden border-t border-gray-700">
            <DetailPanel roi={selectedROI} />
          </div>
        </Split>
      </div>
    </div>
  );
}