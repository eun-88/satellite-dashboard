'use client';

import { Calendar, Cloud, Eye, Gauge, MapPin, Orbit, Zap } from 'lucide-react';
import { SatelliteSchedule } from '@/types';

const SAMPLE_SCHEDULES: Record<string, SatelliteSchedule[]> = {
  'roi-001': [
    {
      id: 'sch-001',
      roiId: 'roi-001',
      satelliteName: 'SpaceEye-T',
      sensorType: 'EO',
      scheduledTime: '2026-04-21T06:42:00Z',
      passType: 'descending',
      elevationAngle: 72,
      weatherScore: 85,
      cloudCover: 15,
      confidence: 92,
    },
    {
      id: 'sch-002',
      roiId: 'roi-001',
      satelliteName: 'Sentinel-1B',
      sensorType: 'SAR',
      scheduledTime: '2026-04-21T09:15:00Z',
      passType: 'ascending',
      elevationAngle: 68,
      weatherScore: 100,
      confidence: 88,
    },
  ],
  'roi-002': [
    {
      id: 'sch-003',
      roiId: 'roi-002',
      satelliteName: 'KOMPSAT-3A',
      sensorType: 'EO',
      scheduledTime: '2026-04-21T07:28:00Z',
      passType: 'ascending',
      elevationAngle: 75,
      weatherScore: 72,
      cloudCover: 28,
      confidence: 85,
    },
  ],
};

interface DetailPanelProps {
  selectedROI: string | null;
}

export default function DetailPanel({ selectedROI }: DetailPanelProps) {
  if (!selectedROI) {
    return (
      <div className="p-8 text-center">
        <MapPin className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
        <p className="text-sm text-[var(--text-muted)]">
          Select an ROI to view details and satellite schedules
        </p>
      </div>
    );
  }

  const schedules = SAMPLE_SCHEDULES[selectedROI] || [];

  return (
    <div className="p-4 space-y-4">
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--accent-gold)]" />
          <h3 className="text-sm font-semibold">AI Analysis Summary</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          High-priority military event detected with significant media coverage. Goldstein score 
          indicates severe conflict escalation. Immediate visual confirmation recommended within 
          24-hour golden window before potential concealment efforts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3">
          <div className="text-xs text-[var(--text-muted)] mb-1">Priority Score</div>
          <div className="text-2xl font-bold mono text-[var(--status-critical)]">95</div>
        </div>
        <div className="glass-panel p-3">
          <div className="text-xs text-[var(--text-muted)] mb-1">Goldstein Scale</div>
          <div className="text-2xl font-bold mono text-[var(--status-warning)]">-9.2</div>
        </div>
        <div className="glass-panel p-3">
          <div className="text-xs text-[var(--text-muted)] mb-1">Media Mentions</div>
          <div className="text-2xl font-bold mono text-[var(--accent-cyan)]">847</div>
        </div>
        <div className="glass-panel p-3">
          <div className="text-xs text-[var(--text-muted)] mb-1">Time Remaining</div>
          <div className="text-2xl font-bold mono text-[var(--status-success)]">16h</div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Orbit className="w-4 h-4 text-[var(--accent-purple)]" />
          <h3 className="text-sm font-semibold">Proposed Schedules</h3>
        </div>

        {schedules.length === 0 ? (
          <div className="glass-panel p-4 text-center">
            <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
            <p className="text-xs text-[var(--text-muted)]">
              Computing optimal satellite passes...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="glass-panel p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      {schedule.satelliteName}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(schedule.scheduledTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} UTC
                    </div>
                  </div>
                  <div className={`status-badge ${schedule.sensorType === 'EO' ? 'info' : 'warning'}`}>
                    {schedule.sensorType === 'EO' ? <Eye className="w-3 h-3" /> : null}
                    {schedule.sensorType}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">Elevation:</span>
                    <span className="font-semibold mono">{schedule.elevationAngle}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">Weather:</span>
                    <span className="font-semibold mono">{schedule.weatherScore}%</span>
                  </div>
                  {schedule.cloudCover !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">Cloud Cover:</span>
                      <span className="font-semibold mono">{schedule.cloudCover}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">Confidence:</span>
                    <span className="font-semibold mono text-[var(--status-success)]">
                      {schedule.confidence}%
                    </span>
                  </div>
                </div>

                <button className="w-full py-2 px-3 rounded bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]90 text-white font-medium text-xs transition-colors">
                  Approve Schedule
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-4">
        <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">SOURCE URLS</h4>
        <div className="space-y-1 text-xs">
          <div className="text-[var(--accent-cyan)] hover:underline truncate cursor-pointer">
            reuters.com/world/middle-east/iran-military-...
          </div>
          <div className="text-[var(--accent-cyan)] hover:underline truncate cursor-pointer">
            apnews.com/article/iran-tehran-explosion-...
          </div>
        </div>
      </div>
    </div>
  );
}