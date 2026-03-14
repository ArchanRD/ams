const env = require('../config/env');
const { getFirestore } = require('../config/firebase');

const ADMINS_COLLECTION = 'admins';

const normalizeEmail = (email) => (email ? String(email).trim().toLowerCase() : null);

const isActiveAdminRecord = (data) => {
  if (!data) {
    return false;
  }

  return data.active !== false && data.role === 'admin';
};

const checkAdminDoc = async (db, docId) => {
  if (!docId) {
    return false;
  }

  const adminDoc = await db.collection(ADMINS_COLLECTION).doc(docId).get();

  if (!adminDoc.exists) {
    return false;
  }

  return isActiveAdminRecord(adminDoc.data());
};

const isAllowedAdmin = async (decodedToken) => {
  const email = normalizeEmail(decodedToken.email);

  if (email && env.adminEmails.has(email)) {
    return true;
  }

  const db = getFirestore();

  const directChecks = [checkAdminDoc(db, decodedToken.uid)];
  if (email) {
    directChecks.push(checkAdminDoc(db, email));
  }

  const directResults = await Promise.all(directChecks);
  if (directResults.some(Boolean)) {
    return true;
  }

  const fieldLookups = [db.collection(ADMINS_COLLECTION).where('uid', '==', decodedToken.uid).limit(1).get()];
  if (email) {
    fieldLookups.push(db.collection(ADMINS_COLLECTION).where('email', '==', email).limit(1).get());
  }

  const lookupSnapshots = await Promise.all(fieldLookups);

  return lookupSnapshots.some((snapshot) =>
    snapshot.docs.some((doc) => isActiveAdminRecord(doc.data()))
  );
};

module.exports = {
  isAllowedAdmin,
};
