const toISO = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  return null;
};

const mapMemberDoc = (doc) => {
  const data = doc.data();

  return {
    id: doc.id,
    name: data.name,
    phone: data.phone,
    type: data.type,
    area: data.area,
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  };
};

const mapAttendanceDoc = (doc) => {
  const data = doc.data();

  return {
    id: doc.id,
    memberId: data.memberId || data.userId,
    memberName: data.memberName || data.userName,
    memberPhone: data.memberPhone || data.userPhone,
    date: data.date,
    status: data.status,
    markedBy: data.markedBy,
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  };
};

module.exports = {
  mapMemberDoc,
  mapAttendanceDoc,
};
