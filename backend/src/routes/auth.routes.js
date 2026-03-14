const { Router } = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { verifySession } = require('../controllers/auth.controller');

const router = Router();

router.post('/verify-session', asyncHandler(verifySession));

module.exports = { authRoutes: router };
