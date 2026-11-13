import { EngineSettings } from './types';

export interface Status {
  code: string;
  label: string;
  /** ok | warn | alert | unknown - lets the UI pick a colour without knowing the codes */
  tone: 'ok' | 'warn' | 'alert' | 'unknown';
}

const unknown: Status = { code: 'NO_DATA', label: 'No data', tone: 'unknown' };

export const soilStatus = (v: number | null, s: EngineSettings): Status => {
  if (v === null) return unknown;
  if (v < s.soilDryThreshold) return { code: 'DRY', label: 'Dry', tone: 'alert' };
  if (v > s.soilWetTarget) return { code: 'WET', label: 'Wet', tone: 'warn' };
  return { code: 'MOIST', label: 'Moist', tone: 'ok' };
};

export const temperatureStatus = (v: number | null, s: EngineSettings): Status => {
  if (v === null) return unknown;
  if (v > s.tempAlarmThreshold) return { code: 'TOO_HOT', label: 'Too hot', tone: 'alert' };
  if (v < s.tempLowThreshold) return { code: 'TOO_COLD', label: 'Too cold', tone: 'warn' };
  return { code: 'OPTIMAL', label: 'Optimal', tone: 'ok' };
};

export const humidityStatus = (v: number | null, s: EngineSettings): Status => {
  if (v === null) return unknown;
  if (v < s.humidityMin) return { code: 'TOO_DRY', label: 'Too dry', tone: 'warn' };
  if (v > s.humidityMax) return { code: 'TOO_HUMID', label: 'Too humid', tone: 'warn' };
  return { code: 'OPTIMAL', label: 'Optimal', tone: 'ok' };
};

export const lightStatus = (v: number | null, s: EngineSettings): Status => {
  if (v === null) return unknown;
  if (v < s.lightOnThreshold) return { code: 'LOW_LIGHT', label: 'Low light', tone: 'warn' };
  return { code: 'GOOD_LIGHT', label: 'Good light', tone: 'ok' };
};
