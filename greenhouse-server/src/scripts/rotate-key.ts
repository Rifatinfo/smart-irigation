/** npm run device:rotate-key [-- <deviceId>]  - issues a new API key for a device (default: the first one). */
import prisma from '../shared/prisma';
import { resolveDevice, rotateDeviceKey } from '../services/deviceStore';

async function main() {
  const device = await resolveDevice(process.argv[2]);
  const { apiKey } = await rotateDeviceKey(device.id);
  console.log(`New API key for "${device.name}" (${device.id}):\n\n  ${apiKey}\n\nThe old key stopped working. Update the firmware.`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
