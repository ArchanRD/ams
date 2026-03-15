const { ApiError } = require('../utils/apiError');
const {
  createMemberSchema,
  listMembersSchema,
  memberDetailsQuerySchema,
  memberPresentDaysQuerySchema,
  updateMemberSchema,
} = require('../validations/members.validation');
const {
  findMembers,
  createMember,
  getMemberDetails,
  listMemberPresentDaysByMonth,
  updateMemberById,
} = require('../services/member.service');
const {
  buildImportTemplate,
  importMembersFromBuffer,
} = require('../services/import.service');

const listMembers = async (req, res) => {
  const parsed = listMembersSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query params', parsed.error.flatten());
  }

  const members = await findMembers(parsed.data.search, parsed.data.date);

  res.json({
    success: true,
    data: members,
  });
};

const createNewMember = async (req, res) => {
  const parsed = createMemberSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid request body', parsed.error.flatten());
  }

  const result = await createMember(parsed.data);

  if (result.alreadyExists) {
    return res.status(200).json({
      success: true,
      data: result.member,
      meta: {
        created: false,
      },
    });
  }

  return res.status(201).json({
    success: true,
    data: result.member,
    meta: {
      created: true,
    },
  });
};

const getMemberImportTemplate = async (req, res) => {
  const workbook = await buildImportTemplate();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="members_import_template.xlsx"'
  );

  await workbook.xlsx.write(res);
  res.end();
};

const importMembers = async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new ApiError(400, 'Upload a non-empty Excel file.');
  }

  const result = await importMembersFromBuffer(req.body, req.auth.uid);

  res.json({
    success: true,
    data: result,
  });
};

const updateMember = async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  if (!memberId) {
    throw new ApiError(400, 'Invalid member id');
  }

  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid request body', parsed.error.flatten());
  }

  const member = await updateMemberById(memberId, parsed.data);

  res.json({
    success: true,
    data: member,
  });
};

const getMemberDetailsById = async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  if (!memberId) {
    throw new ApiError(400, 'Invalid member id');
  }

  const parsed = memberDetailsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query params', parsed.error.flatten());
  }

  const member = await getMemberDetails(memberId, parsed.data.date);

  res.json({
    success: true,
    data: member,
  });
};

const getMemberPresentDaysByMonth = async (req, res) => {
  const memberId = String(req.params.memberId || '').trim();
  if (!memberId) {
    throw new ApiError(400, 'Invalid member id');
  }

  const parsed = memberPresentDaysQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query params', parsed.error.flatten());
  }

  const presentDays = await listMemberPresentDaysByMonth(
    memberId,
    parsed.data.month,
  );

  res.json({
    success: true,
    data: presentDays,
  });
};

module.exports = {
  listMembers,
  createNewMember,
  getMemberImportTemplate,
  importMembers,
  updateMember,
  getMemberDetailsById,
  getMemberPresentDaysByMonth,
};
