const { getAuth } = require('../config/firebase');
const { ApiError } = require('../utils/apiError');
const { isAllowedAdmin } = require('../services/admin.service');

const getBearerToken = (headerValue) => {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  return headerValue.slice(7).trim();
};

const requireAdminAuth = async (req, res, next) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new ApiError(401, 'Authorization token is missing'));
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const isAdmin = await isAllowedAdmin(decodedToken);

    if (!isAdmin) {
      return next(new ApiError(403, 'Admin access required'));
    }

    req.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };
  } catch (error) {
    if (error.code && String(error.code).startsWith('auth/')) {
      return next(new ApiError(401, 'Invalid or expired token'));
    }

    return next(error);
  }

  return next();
};

module.exports = {
  requireAdminAuth,
};
