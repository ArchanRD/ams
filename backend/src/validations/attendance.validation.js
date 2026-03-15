const { z } = require('zod');
const { dateStringSchema } = require('./common.validation');

const attendanceStatus = z.enum(['PRESENT', 'ABSENT', 'HALF_DAY']);
const prasadamSchema = z.coerce.number().int().min(0).default(0);

const markAttendanceSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
  date: dateStringSchema,
  status: attendanceStatus,
  prasadam: prasadamSchema.optional().default(0),
  overwrite: z.boolean().optional().default(false),
});

const unmarkAttendanceSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
  date: dateStringSchema,
});

const updatePrasadamSchema = z.object({
  memberId: z.string().trim().min(1, 'memberId is required'),
  date: dateStringSchema,
  prasadam: prasadamSchema,
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
  prasadamSchema,
  markAttendanceSchema,
  unmarkAttendanceSchema,
  updatePrasadamSchema,
  attendanceRangeSchema,
};
