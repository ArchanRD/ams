const { Router } = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  markMemberAttendance,
  unmarkMemberAttendance,
  getAttendanceList,
  exportAttendance,
} = require('../controllers/attendance.controller');

const router = Router();

router.post('/mark', asyncHandler(markMemberAttendance));
router.delete('/mark', asyncHandler(unmarkMemberAttendance));
router.get('/', asyncHandler(getAttendanceList));
router.get('/export', asyncHandler(exportAttendance));

module.exports = { attendanceRoutes: router };
