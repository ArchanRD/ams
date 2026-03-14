const { z } = require('zod');

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const isValidCalendarDate = (value) => {
  if (!isoDateRegex.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() + 1 === month &&
    utcDate.getUTCDate() === day
  );
};

const dateStringSchema = z
  .string()
  .trim()
  .regex(isoDateRegex, 'Date must be in YYYY-MM-DD format')
  .refine((value) => isValidCalendarDate(value), 'Date must be a valid calendar date');

module.exports = {
  dateStringSchema,
};
