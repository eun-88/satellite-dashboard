'use client';

import { Activity, MapPin, Satellite, TrendingDown } from 'lucide-react';

export default function StatusBar() {
  const stats = [
    {
      icon: Activity,
      label: 'Active Events',
      value: '127',
      trend: '+12',
      color: 'var(--status-warning)',
    },
    {
      icon: MapPin,
      label: 'Critical ROIs',
      value: '8',
      trend: '+3',
      color: 'var(--status-critical)',
    },
    {
      icon: Satellite,
      label: 'Scheduled',
      value: '15',
      trend: '+5',
      color: 'var(--status-success)',
    },
    {
      icon: TrendingDown,
      label: 'Avg Goldstein',
      value: '-7.8',
      trend: '-1.2',
      color: 'var(--accent-cyan)',
    },
  ];

  return (
    <div className="flex gap-3 pointer-events-auto">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="glass-panel px-4 py-3 flex items-center gap-3 min-w-[180px]"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${stat.color}20` }}
          >
            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-0.5">{stat.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold mono">{stat.value}</span>
              <span
                className="text-xs font-semibold mono"
                style={{ color: stat.color }}
              >
                {stat.trend}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}