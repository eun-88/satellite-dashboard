// ROI (Region of Interest) 데이터 타입
export interface ROI {
  id: string;
  priority: number;
  location: {
    lat: number;
    lon: number;
    name: string;
  };
  eventSummary: string;
  goldsteinScore: number;
  mentionCount: number;
  detectedAt: string;
  status: 'pending' | 'scheduled' | 'captured';
}

// 위성 촬영 스케줄 타입
export interface SatelliteSchedule {
  id: string;
  roiId: string;
  satelliteName: string;
  sensorType: 'EO' | 'SAR';
  scheduledTime: string;
  passType: 'ascending' | 'descending';
  elevationAngle: number;
  weatherScore: number;
  cloudCover?: number;
  confidence: number;
}

// 전역 상황 데이터 타입
export interface GlobalStatus {
  totalEvents: number;
  criticalROIs: number;
  scheduledCaptures: number;
  avgGoldsteinScore: number;
  topKeywords: { word: string; count: number }[];
  heatmapData: {
    lat: number;
    lon: number;
    intensity: number;
  }[];
}

// 위성 궤도 데이터 타입
export interface SatelliteOrbit {
  satelliteName: string;
  positions: {
    timestamp: string;
    lat: number;
    lon: number;
    altitude: number;
  }[];
  groundTrack: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}