export type Actuator = 'PUMP' | 'GROW_LIGHT' | 'BUZZER';
export type Mode = 'AUTO' | 'ON' | 'OFF';
export type Source = 'AUTO' | 'MANUAL' | 'SAFETY' | 'SYSTEM';

export interface EngineSettings {
  soilDryThreshold: number;
  soilWetTarget: number;
  pumpMaxRunSec: number;
  pumpMinIntervalMin: number;
  tempAlarmThreshold: number;
  tempAlarmHysteresis: number;
  tempLowThreshold: number;
  humidityMin: number;
  humidityMax: number;
  lightOnThreshold: number;
  lightHysteresisPct: number;
  growLightMinSwitchSec: number;
  growLightScheduleEnabled: boolean;
  growLightStart: string;
  growLightEnd: string;
  timezone: string;
}

export interface EngineState {
  mode: Mode;
  desiredOn: boolean;
  manualUntil: Date | null;
  lastChangedAt: Date | null;
  lastOnAt: Date | null;
  lastOffAt: Date | null;
}

export interface Sample {
  soil: number | null;
  temperature: number | null;
  humidity: number | null;
  lux: number | null;
}

export interface Decision {
  desiredOn: boolean;
  source: Source;
  reason: string;
  /** Present only when the decision turns the actuator OFF */
  endReason?: string;
}

/** Safety ceiling for a manual "water now" no matter what the caller asks for. */
export const MANUAL_PUMP_HARD_CAP_SEC = 120;
export const DEFAULT_BUZZER_TEST_SEC = 5;
