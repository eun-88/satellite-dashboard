'use client';

import { useState, useEffect } from 'react';
import Split from 'react-split';
import GlobalMap from './GlobalMap';
import ROIList from './ROIList';
import DetailPanel from './DetailPanel';
import StatusBar from './StatusBar';
import ScheduleReport from './ScheduleReport';
import { fetchGDELTData, fetchScheduleData } from '@/lib/api';
import { convertGDELTToROIs, ROI } from '@/lib/dataConverter';
import 'react-split/dist/react-split.css';

export default function Dashboard() {
  const [selectedROI, setSelectedROI] = useState<ROI | null>(null);
  const [rois, setRois] = useState<ROI[]>([]);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('20260414');
  const [activeTab, setActiveTab] = useState<'analysis' | 'schedule'>('analysis');

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const gdeltData = await fetchGDELTData(currentDate);
      const scheduleDataResult = await fetchScheduleData(currentDate);
      
      if (gdeltData) {
        const convertedROIs = convertGDELTToROIs(gdeltData, scheduleDataResult || undefined);
        setRois(convertedROIs);
        if (convertedROIs.length > 0) {
          setSelectedROI(convertedROIs[0]);
        }
      }
      
      if (scheduleDataResult) {
        setScheduleData(scheduleDataResult);
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

          {/* 하단: 탭 전환 */}
          <div className="overflow-hidden border-t border-gray-700 flex flex-col">
            {/* 탭 버튼 */}
            <div className="flex border-b border-gray-700 bg-gray-800">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 Event Analysis
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🛰️ Schedule Report
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'analysis' ? (
                <DetailPanel roi={selectedROI} />
              ) : (
                <ScheduleReport scheduleData={scheduleData} rois={rois} />
              )}
            </div>
          </div>
        </Split>
      </div>
    </div>
  );
}