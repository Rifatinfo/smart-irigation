import { Router } from 'express';
import auth from '../middlewares/auth';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { ControlRoutes } from '../modules/control/control.routes';
import { DashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { DeviceRoutes } from '../modules/device/device.routes';
import { DeviceAdminRoutes } from '../modules/devices/devices.routes';
import { HistoryRoutes } from '../modules/history/history.routes';
import { AlertRoutes, LogRoutes } from '../modules/logs/logs.routes';
import { SettingsRoutes } from '../modules/settings/settings.routes';
import { StreamRoutes } from '../modules/stream/stream.routes';

export const router = Router();

// ── public ────────────────────────────────────────────────
router.use('/auth', AuthRoutes);

// ── hardware (device API key) ─────────────────────────────
router.use('/device', DeviceRoutes);

// ── dashboard (login required unless DASHBOARD_AUTH_REQUIRED=false) ──
router.use('/stream', auth({ allowQueryToken: true }), StreamRoutes);
router.use('/dashboard', auth(), DashboardRoutes);
router.use('/history', auth(), HistoryRoutes);
router.use('/settings', auth(), SettingsRoutes);
router.use('/control', auth(), ControlRoutes);
router.use('/logs', auth(), LogRoutes);
router.use('/alerts', auth(), AlertRoutes);
router.use('/devices', auth(), DeviceAdminRoutes);
