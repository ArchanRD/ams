const { z } = require('zod');
const { dateStringSchema } = require('./common.validation');

const memberTypeSchema = z.enum(['devotee', 'volunteer']);

const listMembersSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  date: dateStringSchema.optional(),
});

const monthStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Month should be in YYYY-MM format')
  .refine((value) => {
    const month = Number(value.slice(5, 7));
    return month >= 1 && month <= 12;
  }, 'Month should have a valid month number');

const memberDetailsQuerySchema = z.object({
  date: dateStringSchema.optional(),
});

const memberPresentDaysQuerySchema = z.object({
  month: monthStringSchema,
});

const createMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name should be at least 2 characters').max(100),
  phone: z.string().trim().min(7, 'Phone number is too short').max(20),
  type: memberTypeSchema,
  area: z.string().trim().max(100).optional(),
});

const updateMemberSchema = z
  .object({
    name: z.string().trim().min(2, 'Name should be at least 2 characters').max(100).optional(),
    type: memberTypeSchema.optional(),
    area: z.string().trim().max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required to update member',
  });

module.exports = {
  memberTypeSchema,
  listMembersSchema,
  memberDetailsQuerySchema,
  memberPresentDaysQuerySchema,
  createMemberSchema,
  updateMemberSchema,
};
