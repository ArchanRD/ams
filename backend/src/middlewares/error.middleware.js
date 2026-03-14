const errorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  const payload = {
    success: false,
    message: error.message || 'Internal server error',
  };

  if (error.details) {
    payload.details = error.details;
  }

  res.status(statusCode).json(payload);
};

module.exports = {
  errorMiddleware,
};
