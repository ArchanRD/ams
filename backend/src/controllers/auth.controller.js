const { getAuth } = require('../config/firebase');
const { ApiError } = require('../utils/apiError');
const { verifySessionSchema } = require('../validations/auth.validation');
const { isAllowedAdmin } = require('../services/admin.service');

const verifySession = async (req, res) => {
  const parsed = verifySessionSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid request body', parsed.error.flatten());
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(parsed.data.idToken);
  } catch (error) {
    if (error.code && String(error.code).startsWith('auth/')) {
      throw new ApiError(401, 'Invalid or expired token');
    }
    throw error;
  }
  const isAdmin = await isAllowedAdmin(decodedToken);

  if (!isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }

  res.json({
    success: true,
    data: {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      role: 'admin',
    },
  });
};

module.exports = {
  verifySession,
};
