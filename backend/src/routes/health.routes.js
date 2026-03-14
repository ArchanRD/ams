const { Router } = require('express');
const env = require('../config/env');

const router = Router();

const getDateInTimeZone = (date, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

router.get('/', (req, res) => {
  const now = new Date();

  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'attendance-backend',
      timestamp: now.toISOString(),
      timezone: env.APP_TIMEZONE,
      businessDate: getDateInTimeZone(now, env.APP_TIMEZONE),
    },
  });
});

module.exports = { healthRoutes: router };
