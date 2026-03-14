const { Router } = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const {
	listMembers,
	createNewMember,
	getMemberDetailsById,
	getMemberPresentDaysByMonth,
	updateMember,
} = require('../controllers/members.controller');

const router = Router();

router.get('/', asyncHandler(listMembers));
router.post('/', asyncHandler(createNewMember));
router.get('/:memberId/present-days', asyncHandler(getMemberPresentDaysByMonth));
router.get('/:memberId', asyncHandler(getMemberDetailsById));
router.patch('/:memberId', asyncHandler(updateMember));

module.exports = { membersRoutes: router };
