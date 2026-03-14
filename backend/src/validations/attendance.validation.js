const { z } = require('zod');
const { dateStringSchema } = require('./common.validation');

const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'HALF_DAY']);

const markAttendanceSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
  date: dateStringSchema,
  status: attendanceStatus,
  overwrite: z.boolean().optional().default(false),
});

const unmarkAttendanceSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
  date: dateStringSchema,
});

const attendanceRangeSchema = z
  .object({
    from: dateStringSchema,
    to: dateStringSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: '`from` date should be less than or equal to `to` date',
    path: ['from'],
  });

module.exports = {
  attendanceStatus,
  markAttendanceSchema,
  unmarkAttendanceSchema,
  attendanceRangeSchema,
};
