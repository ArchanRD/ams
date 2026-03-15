const ExcelJS = require('exceljs');
const { admin, getFirestore } = require('../config/firebase');
const env = require('../config/env');
const { ApiError } = require('../utils/apiError');
const { mapAttendanceDoc } = require('../utils/firestoreMapper');
const { getMemberById } = require('./member.service');

const ATTENDANCE_COLLECTION = 'attendance';

const getAttendanceDocId = (date, memberId) => `${date}_${memberId}`;

const markAttendance = async ({ memberId, date, status, prasadam = 0, markedBy, overwrite = false }) => {
  const db = getFirestore();
  const member = await getMemberById(memberId);
  const attendanceDocId = getAttendanceDocId(date, memberId);
  const attendanceRef = db.collection(ATTENDANCE_COLLECTION).doc(attendanceDocId);
  const existingDoc = await attendanceRef.get();
  const existingData = existingDoc.exists ? existingDoc.data() : null;

  if (existingDoc.exists && !overwrite) {
    throw new ApiError(
      409,
      'Attendance already marked for this member and date. Pass overwrite=true to update it.'
    );
  }

  const payload = {
    memberId,
    memberName: member.name,
    memberPhone: member.phone,
    date,
    status,
    prasadam:
      typeof prasadam === 'number'
        ? prasadam
        : typeof existingData?.prasadam === 'number'
          ? existingData.prasadam
          : 0,
    markedBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Keep createdAt immutable for updates and set it only once.
  if (!existingDoc.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await attendanceRef.set(payload, { merge: true });

  const savedDoc = await attendanceRef.get();
  return mapAttendanceDoc(savedDoc);
};

const updateAttendancePrasadam = async ({ memberId, date, prasadam, markedBy }) => {
  const db = getFirestore();
  const attendanceDocId = getAttendanceDocId(date, memberId);
  const attendanceRef = db.collection(ATTENDANCE_COLLECTION).doc(attendanceDocId);
  const existingDoc = await attendanceRef.get();

  if (!existingDoc.exists && prasadam === 0) {
    return {
      memberId,
      date,
      status: null,
      prasadam: 0,
      markedBy: null,
      updated: false,
    };
  }

  const member = await getMemberById(memberId);
  const existingData = existingDoc.exists ? existingDoc.data() : null;

  const payload = {
    memberId,
    memberName: member.name,
    memberPhone: member.phone,
    date,
    status: existingData?.status || 'PRESENT',
    prasadam,
    markedBy: existingData?.markedBy || markedBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!existingDoc.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await attendanceRef.set(payload, { merge: true });

  const savedDoc = await attendanceRef.get();
  return mapAttendanceDoc(savedDoc);
};

const unmarkAttendance = async ({ memberId, date }) => {
  const db = getFirestore();
  const attendanceDocId = getAttendanceDocId(date, memberId);
  const attendanceRef = db.collection(ATTENDANCE_COLLECTION).doc(attendanceDocId);
  const existingDoc = await attendanceRef.get();

  if (!existingDoc.exists) {
    return {
      memberId,
      date,
      unmarked: false,
    };
  }

  await attendanceRef.delete();

  return {
    memberId,
    date,
    unmarked: true,
  };
};

const listAttendance = async ({ from, to, limit = 500 }) => {
  const db = getFirestore();

  const snapshot = await db
    .collection(ATTENDANCE_COLLECTION)
    .where('date', '>=', from)
    .where('date', '<=', to)
    .orderBy('date', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => mapAttendanceDoc(doc));
};

const buildAttendanceWorkbook = async ({ from, to }) => {
  const rows = await listAttendance({ from, to, limit: env.MAX_EXPORT_ROWS + 1 });

  if (rows.length > env.MAX_EXPORT_ROWS) {
    throw new ApiError(400, `Export limit reached. Narrow the date range below ${env.MAX_EXPORT_ROWS} records.`);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Member Name', key: 'memberName', width: 24 },
    { header: 'Phone', key: 'memberPhone', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Prasadam', key: 'prasadam', width: 14 },
    { header: 'Marked By (UID)', key: 'markedBy', width: 30 },
  ];

  rows.forEach((row) => {
    worksheet.addRow({
      date: row.date,
      memberName: row.memberName,
      memberPhone: row.memberPhone,
      status: row.status,
      prasadam: row.prasadam,
      markedBy: row.markedBy,
    });
  });

  worksheet.getRow(1).font = { bold: true };

  return workbook;
};

module.exports = {
  markAttendance,
  updateAttendancePrasadam,
  unmarkAttendance,
  listAttendance,
  buildAttendanceWorkbook,
};
