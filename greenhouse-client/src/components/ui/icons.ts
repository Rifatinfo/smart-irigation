import type React from 'react'
import { Droplets, Lightbulb, ShowerHead, Siren, Sprout, Sun, Thermometer } from 'lucide-react'
import type { MetricKey } from '@/lib/data'

export const METRIC_ICONS: Record<MetricKey, React.ElementType> = {
  soil: Sprout,
  temperature: Thermometer,
  humidity: Droplets,
  light: Sun,
}

export const DEVICE_ICONS = { pump: ShowerHead, growLight: Lightbulb, buzzer: Siren }

export type DeviceKey = keyof typeof DEVICE_ICONS
