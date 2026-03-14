const { ApiError } = require('../utils/apiError');
const {
  markAttendanceSchema,
  unmarkAttendanceSchema,
  attendanceRangeSchema,
} = require('../validations/attendance.validation');
const {
  markAttendance,
  unmarkAttendance,
  listAttendance,
  buildAttendanceWorkbook,
} = require('../services/attendance.service');

const markMemberAttendance = async (req, res) => {
  const parsed = markAttendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid request body', parsed.error.flatten());
  }

  const attendance = await markAttendance({
    ...parsed.data,
    markedBy: req.auth.uid,
  });

  res.json({
    success: true,
    data: attendance,
  });
};

const getAttendanceList = async (req, res) => {
  const parsed = attendanceRangeSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query params', parsed.error.flatten());
  }

  const rows = await listAttendance(parsed.data);

  res.json({
    success: true,
    data: rows,
  });
};

const unmarkMemberAttendance = async (req, res) => {
  const parsed = unmarkAttendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid request body', parsed.error.flatten());
  }

  const result = await unmarkAttendance(parsed.data);

  res.json({
    success: true,
    data: result,
  });
};

const exportAttendance = async (req, res) => {
  const parsed = attendanceRangeSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query params', parsed.error.flatten());
  }

  const workbook = await buildAttendanceWorkbook(parsed.data);
  const fileName = `attendance_${parsed.data.from}_to_${parsed.data.to}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  markMemberAttendance,
  unmarkMemberAttendance,
  getAttendanceList,
  exportAttendance,
};
