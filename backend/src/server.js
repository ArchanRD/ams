const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const env = require('./config/env');
const { app } = require('./app');

app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

app.listen(env.PORT, () => {
  console.log(`Attendance backend listening on port ${env.PORT}`);
});
