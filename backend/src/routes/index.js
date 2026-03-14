const { Router } = require('express');
const { healthRoutes } = require('./health.routes');
const { authRoutes } = require('./auth.routes');
const { membersRoutes } = require('./members.routes');
const { attendanceRoutes } = require('./attendance.routes');
const { requireAdminAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Everything under this middleware requires an authenticated admin.
router.use(requireAdminAuth);
router.use('/members', membersRoutes);
router.use('/attendance', attendanceRoutes);

module.exports = { apiRoutes: router };
