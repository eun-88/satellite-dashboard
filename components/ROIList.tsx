'use client';

import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { ROI } from '@/types';

// 샘플 데이터
const SAMPLE_ROIS: ROI[] = [
  {
    id: 'roi-001',
    priority: 95,
    location: { lat: 35.6892, lon: 51.3890, name: 'Tehran, Iran' },
    eventSummary: 'Military convoy movement detected near IRGC facility',
    goldsteinScore: -9.2,
    mentionCount: 847,
    detectedAt: '2026-04-20T14:23:00Z',
    status: 'pending',
  },
  {
    id: 'roi-002',
    priority: 89,
    location: { lat: 32.4279, lon: 53.6880, name: 'Isfahan, Iran' },
    eventSummary: 'Reported explosion at nuclear facility - verification required',
    goldsteinScore: -8.7,
    mentionCount: 1203,
    detectedAt: '2026-04-20T11:45:00Z',
    status: 'scheduled',
  },
  {
    id: 'roi-003',
    priority: 82,
    location: { lat: 29.5918, lon: 52.5836, name: 'Shiraz, Iran' },
    eventSummary: 'Increased military aircraft activity at air base',
    goldsteinScore: -7.5,
    mentionCount: 456,
    detectedAt: '2026-04-20T09:12:00Z',
    status: 'scheduled',
  },
  {
    id: 'roi-004',
    priority: 78,
    location: { lat: 38.0746, lon: 46.2976, name: 'Tabriz, Iran' },
    eventSummary: 'Naval vessels departing Bandar Abbas port',
    goldsteinScore: -7.1,
    mentionCount: 312,
    detectedAt: '2026-04-20T07:30:00Z',
    status: 'pending',
  },
  {
    id: 'roi-005',
    priority: 65,
    location: { lat: 36.2605, lon: 59.6168, name: 'Mashhad, Iran' },
    eventSummary: 'Troop mobilization reported near border region',
    goldsteinScore: -6.3,
    mentionCount: 189,
    detectedAt: '2026-04-19T22:18:00Z',
    status: 'pending',
  },
];

interface ROIListProps {
  filterStatus: 'all' | 'pending' | 'scheduled';
  selectedROI: string | null;
  onSelectROI: (id: string) => void;
}

export default function ROIList({ filterStatus, selectedROI, onSelectROI }: ROIListProps) {
  const filteredROIs = SAMPLE_ROIS.filter((roi) => {
    if (filterStatus === 'all') return true;
    return roi.status === filterStatus;
  });

  const getStatusIcon = (status: ROI['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'scheduled':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'captured':
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 90) return 'var(--status-critical)';
    if (priority >= 75) return 'var(--status-warning)';
    return 'var(--status-info)';
  };

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {filteredROIs.map((roi) => (
        <button
          key={roi.id}
          onClick={() => onSelectROI(roi.id)}
          className={`w-full p-4 text-left transition-colors hover:bg-[var(--bg-tertiary)] ${
            selectedROI === roi.id ? 'bg-[var(--bg-elevated)] border-l-2 border-[var(--accent-cyan)]' : ''
          }`}
        >
          {/* Priority Badge */}
          <div className="flex items-start justify-between mb-2">
            <div 
              className="px-2 py-1 rounded text-xs font-bold mono"
              style={{ 
                backgroundColor: `${getPriorityColor(roi.priority)}20`,
                color: getPriorityColor(roi.priority),
                border: `1px solid ${getPriorityColor(roi.priority)}40`
              }}
            >
              P{roi.priority}
            </div>
            <div className={`status-badge ${roi.status === 'scheduled' ? 'success' : 'warning'}`}>
              {getStatusIcon(roi.status)}
              {roi.status}
            </div>
          </div>

          {/* Location */}
          <h3 className="font-semibold text-sm mb-1 text-[var(--text-primary)]">
            {roi.location.name}
          </h3>

          {/* Event Summary */}
          <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">
            {roi.eventSummary}
          </p>

          {/* Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[var(--status-warning)]" />
              <span className="text-[var(--text-muted)]">GS:</span>
              <span className="font-semibold mono text-[var(--status-critical)]">
                {roi.goldsteinScore}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">Mentions:</span>
              <span className="font-semibold mono text-[var(--accent-cyan)]">
                {roi.mentionCount}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="mt-2 text-xs text-[var(--text-muted)] mono">
            {new Date(roi.detectedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </button>
      ))}
    </div>
  );
}