const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const {
	listMembers,
	createNewMember,
	getMemberImportTemplate,
	importMembers,
	getMemberDetailsById,
	getMemberPresentDaysByMonth,
	updateMember,
} = require('../controllers/members.controller');

const router = express.Router();

router.get('/', asyncHandler(listMembers));
router.post('/', asyncHandler(createNewMember));
router.get('/import/template', asyncHandler(getMemberImportTemplate));
router.post(
	'/import',
	express.raw({
		type: [
			'application/octet-stream',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		],
		limit: '10mb',
	}),
	asyncHandler(importMembers),
);
router.get('/:memberId/present-days', asyncHandler(getMemberPresentDaysByMonth));
router.get('/:memberId', asyncHandler(getMemberDetailsById));
router.patch('/:memberId', asyncHandler(updateMember));

module.exports = { membersRoutes: router };
