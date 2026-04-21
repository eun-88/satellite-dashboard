'use client';

import { useState } from 'react';
import { Satellite, Radio, TrendingUp } from 'lucide-react';
import GlobalMap from './GlobalMap';
import ROIList from './ROIList';
import DetailPanel from './DetailPanel';
import StatusBar from './StatusBar';

export default function Dashboard() {
  const [selectedROI, setSelectedROI] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'scheduled'>('all');

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Top Header */}
      <header className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
            <Satellite className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SIA Dashboard</h1>
            <p className="text-xs text-[var(--text-muted)]">Satellite Imaging Automation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-[var(--status-success)] pulse-border"></div>
            <span className="text-[var(--text-secondary)]">System Active</span>
          </div>
          <div className="text-xs text-[var(--text-muted)] mono">
            {new Date().toISOString().split('T')[0]}
          </div>
        </div>
      </header>

      {/* Main Content Area - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - ROI List */}
        <aside className="w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent-gold)]" />
              Priority ROIs
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-[var(--status-warning)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('scheduled')}
                className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  filterStatus === 'scheduled'
                    ? 'bg-[var(--status-success)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                Scheduled
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ROIList 
              filterStatus={filterStatus}
              selectedROI={selectedROI}
              onSelectROI={setSelectedROI}
            />
          </div>
        </aside>

        {/* Center Panel - Global Map */}
        <main className="flex-1 relative">
          <GlobalMap selectedROI={selectedROI} onSelectROI={setSelectedROI} />
          
          {/* Status Overlay Cards */}
          <div className="absolute top-4 left-4 right-4 flex gap-4 pointer-events-none">
            <StatusBar />
          </div>
        </main>

        {/* Right Panel - Detail View */}
        <aside className="w-96 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-y-auto">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--accent-purple)]" />
              Event Analysis
            </h2>
          </div>
          
          <DetailPanel selectedROI={selectedROI} />
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-8 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between px-6 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-4">
          <span>GDELT v1.0 Active</span>
          <span>•</span>
          <span>Last Update: 2 min ago</span>
        </div>
        <div className="mono">
          API Status: <span className="text-[var(--status-success)]">OPERATIONAL</span>
        </div>
      </footer>
    </div>
  );
}