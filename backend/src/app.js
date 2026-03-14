const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { apiRoutes } = require('./routes');
const { notFoundMiddleware } = require('./middlewares/notFound.middleware');
const { errorMiddleware } = require('./middlewares/error.middleware');

const app = express();

const normalizeOrigin = (origin) => String(origin).trim().replace(/\/$/, '');

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (env.corsOrigins.includes('*')) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  return env.corsOrigins.includes(normalized);
};

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = { app };
