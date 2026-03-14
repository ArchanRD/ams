const { admin, getFirestore } = require("../config/firebase");
const env = require("../config/env");
const { ApiError } = require("../utils/apiError");
const { mapMemberDoc } = require("../utils/firestoreMapper");

const MEMBERS_COLLECTION = "members";
const ATTENDANCE_COLLECTION = "attendance";
const DEFAULT_LIST_LIMIT = 100;
const SEARCH_LIST_LIMIT = 20;

const normalizePhone = (phone) => String(phone).replace(/\D/g, "");

const getDateInTimeZone = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const attachAttendanceStatus = async (db, members, date) => {
  if (!members.length) {
    return members;
  }

  const attendanceDate =
    date || getDateInTimeZone(new Date(), env.APP_TIMEZONE);
  const snapshot = await db
    .collection(ATTENDANCE_COLLECTION)
    .where("date", "==", attendanceDate)
    .get();
  const statusByMemberKey = new Map();

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (!data.status) {
      return;
    }

    if (data.memberId) {
      statusByMemberKey.set(`id:${data.memberId}`, data.status);
    }

    if (data.userId) {
      statusByMemberKey.set(`id:${data.userId}`, data.status);
    }

    if (data.memberPhone) {
      statusByMemberKey.set(
        `phone:${normalizePhone(data.memberPhone)}`,
        data.status,
      );
    }

    if (data.userPhone) {
      statusByMemberKey.set(
        `phone:${normalizePhone(data.userPhone)}`,
        data.status,
      );
    }
  });

  return members.map((member) => {
    const normalizedMemberPhone = normalizePhone(member.phone);
    const attendanceStatus =
      statusByMemberKey.get(`id:${member.id}`) ||
      statusByMemberKey.get(`phone:${normalizedMemberPhone}`) ||
      null;

    return {
      ...member,
      attendanceStatus,
    };
  });
};

const findMembers = async (queryText = "", date = undefined) => {
  const db = getFirestore();
  const trimmedQuery = queryText.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const normalizedPhoneQuery = normalizePhone(queryText);

  if (!trimmedQuery) {
    const snapshot = await db
      .collection(MEMBERS_COLLECTION)
      .orderBy("nameLower")
      .limit(DEFAULT_LIST_LIMIT)
      .get();
    const members = snapshot.docs.map((doc) => mapMemberDoc(doc));

    return attachAttendanceStatus(db, members, date);
  }

  const lookups = [
    db
      .collection(MEMBERS_COLLECTION)
      .orderBy("nameLower")
      .startAt(normalizedQuery)
      .endAt(`${normalizedQuery}\uf8ff`)
      .limit(SEARCH_LIST_LIMIT)
      .get(),
    db
      .collection(MEMBERS_COLLECTION)
      .orderBy("areaLower")
      .startAt(normalizedQuery)
      .endAt(`${normalizedQuery}\uf8ff`)
      .limit(SEARCH_LIST_LIMIT)
      .get(),
  ];

  if (normalizedPhoneQuery) {
    lookups.push(
      db
        .collection(MEMBERS_COLLECTION)
        .orderBy("phoneNormalized")
        .startAt(normalizedPhoneQuery)
        .endAt(`${normalizedPhoneQuery}\uf8ff`)
        .limit(SEARCH_LIST_LIMIT)
        .get(),
    );
  }

  const snapshots = await Promise.all(lookups);
  const merged = new Map();

  snapshots.forEach((snapshot) => {
    snapshot.forEach((doc) => {
      merged.set(doc.id, mapMemberDoc(doc));
    });
  });

  const members = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return attachAttendanceStatus(db, members, date);
};

const getMemberById = async (memberId) => {
  const db = getFirestore();
  const memberDoc = await db.collection(MEMBERS_COLLECTION).doc(memberId).get();

  if (!memberDoc.exists) {
    throw new ApiError(404, "Member not found");
  }

  return mapMemberDoc(memberDoc);
};

const createMember = async ({ name, phone, type, area }) => {
  const db = getFirestore();
  const cleanedName = name.trim();
  const cleanedPhone = phone.trim();
  const phoneNormalized = normalizePhone(cleanedPhone);

  if (!phoneNormalized) {
    throw new ApiError(400, "Phone number is invalid");
  }

  // Phone-normalized ID keeps duplicate checks simple and race-safe.
  const memberRef = db.collection(MEMBERS_COLLECTION).doc(phoneNormalized);
  const duplicate = await memberRef.get();

  if (duplicate.exists) {
    return {
      alreadyExists: true,
      member: mapMemberDoc(duplicate),
    };
  }

  const payload = {
    name: cleanedName,
    nameLower: cleanedName.toLowerCase(),
    phone: cleanedPhone,
    phoneNormalized,
    type,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (typeof area === "string" && area.trim()) {
    const cleanedArea = area.trim();
    payload.area = cleanedArea;
    payload.areaLower = cleanedArea.toLowerCase();
  }

  await memberRef.set(payload);
  const createdMemberDoc = await memberRef.get();

  return {
    alreadyExists: false,
    member: mapMemberDoc(createdMemberDoc),
  };
};

const updateMemberById = async (memberId, updates) => {
  const db = getFirestore();
  const memberRef = db.collection(MEMBERS_COLLECTION).doc(memberId);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    throw new ApiError(404, "Member not found");
  }

  const payload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (typeof updates.name === "string") {
    payload.name = updates.name;
    payload.nameLower = updates.name.toLowerCase();
  }

  if (typeof updates.type === "string") {
    payload.type = updates.type;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "area")) {
    const cleanedArea = updates.area?.trim() ?? "";

    if (cleanedArea) {
      payload.area = cleanedArea;
      payload.areaLower = cleanedArea.toLowerCase();
    } else {
      payload.area = admin.firestore.FieldValue.delete();
      payload.areaLower = admin.firestore.FieldValue.delete();
    }
  }

  await memberRef.update(payload);
  const updatedDoc = await memberRef.get();
  return mapMemberDoc(updatedDoc);
};

const listMemberAttendanceRows = async (memberId) => {
  const db = getFirestore();
  const snapshot = await db
    .collection(ATTENDANCE_COLLECTION)
    .where("memberId", "==", memberId)
    .get();

  return snapshot.docs.map((doc) => doc.data());
};

const getMemberAttendanceStatusForDate = async (member, date) => {
  const db = getFirestore();
  const attendanceDate = date || getDateInTimeZone(new Date(), env.APP_TIMEZONE);

  const byMemberIdSnapshot = await db
    .collection(ATTENDANCE_COLLECTION)
    .where("date", "==", attendanceDate)
    .where("memberId", "==", member.id)
    .limit(1)
    .get();

  if (!byMemberIdSnapshot.empty) {
    return byMemberIdSnapshot.docs[0].data().status || null;
  }

  const byPhoneSnapshot = await db
    .collection(ATTENDANCE_COLLECTION)
    .where("date", "==", attendanceDate)
    .where("memberPhone", "==", member.phone)
    .limit(1)
    .get();

  if (!byPhoneSnapshot.empty) {
    return byPhoneSnapshot.docs[0].data().status || null;
  }

  return null;
};

const getMemberDetails = async (memberId, date = undefined) => {
  const member = await getMemberById(memberId);
  const [attendanceStatus, attendanceRows] = await Promise.all([
    getMemberAttendanceStatusForDate(member, date),
    listMemberAttendanceRows(memberId),
  ]);

  const presentDaysCount = attendanceRows.filter(
    (row) => row.status === "PRESENT",
  ).length;

  return {
    ...member,
    attendanceStatus,
    presentDaysCount,
  };
};

const listMemberPresentDaysByMonth = async (memberId, month) => {
  await getMemberById(memberId);
  const attendanceRows = await listMemberAttendanceRows(memberId);

  const presentDays = attendanceRows
    .filter((row) => row.status === "PRESENT" && typeof row.date === "string")
    .map((row) => row.date)
    .filter((dateValue) => dateValue.startsWith(`${month}-`))
    .sort();

  return {
    month,
    days: presentDays,
    presentDaysCount: presentDays.length,
  };
};

module.exports = {
  findMembers,
  createMember,
  getMemberById,
  updateMemberById,
  getMemberDetails,
  listMemberPresentDaysByMonth,
};
