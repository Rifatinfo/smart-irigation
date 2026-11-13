import { ActuatorType, ControlMode } from '@prisma/client';
import prisma from '../../../shared/prisma';
import { DEFAULT_BUZZER_TEST_SEC, MANUAL_PUMP_HARD_CAP_SEC } from '../../../engine/types';
import { logActivity } from '../../../services/activity';
import { runAutomation, withDeviceLock } from '../../../services/automation.service';
import { getSettings } from '../../../services/deviceStore';
import { getActuatorSnapshot } from '../../../services/views';

const LABEL: Record<ActuatorType, string> = { PUMP: 'Pump', GROW_LIGHT: 'Grow light', BUZZER: 'Buzzer' };

/**
 * Manual override. ON/OFF take priority over automation until `durationSec` passes (or forever if omitted,
 * except for the pump and buzzer, which are always time-limited for safety). AUTO hands control back.
 */
export async function setActuatorMode(
  deviceId: string,
  actuator: ActuatorType,
  mode: ControlMode,
  durationSec: number | undefined,
  actor?: string,
) {
  const settings = await getSettings(deviceId);

  let seconds: number | null = durationSec ?? null;
  if (mode === 'ON') {
    if (actuator === 'PUMP') seconds = Math.min(seconds ?? settings.pumpMaxRunSec, MANUAL_PUMP_HARD_CAP_SEC);
    if (actuator === 'BUZZER') seconds = Math.min(seconds ?? DEFAULT_BUZZER_TEST_SEC, 60);
  }

  await withDeviceLock(deviceId, async () => {
    const row = await prisma.actuatorState.findUniqueOrThrow({
      where: { deviceId_actuator: { deviceId, actuator } },
    });
    const now = new Date();

    if (mode === 'AUTO') {
      if (row.mode === 'AUTO') return;
      // expire the override right now; the automation cycle below logs it and takes over
      await prisma.actuatorState.update({ where: { id: row.id }, data: { manualUntil: now } });
      return;
    }
    await prisma.actuatorState.update({
      where: { id: row.id },
      data: { mode, manualUntil: seconds ? new Date(now.getTime() + seconds * 1000) : null },
    });
    await logActivity({
      deviceId,
      source: actuator,
      message: `${LABEL[actuator]} set to ${mode} manually${actor ? ` by ${actor}` : ''}${seconds ? ` for ${seconds}s` : ''}`,
    });
  });

  await runAutomation(deviceId);
  return getActuatorSnapshot(deviceId);
}

export async function resetAllToAuto(deviceId: string, actor?: string) {
  for (const a of ['PUMP', 'GROW_LIGHT', 'BUZZER'] as ActuatorType[]) {
    await setActuatorMode(deviceId, a, 'AUTO', undefined, actor);
  }
  return getActuatorSnapshot(deviceId);
}
