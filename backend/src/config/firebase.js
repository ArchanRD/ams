const admin = require('firebase-admin');
const env = require('./env');

let firebaseApp;

const getCredential = () => {
  const hasServiceAccount = env.FIREBASE_PROJECT_ID;

  if (hasServiceAccount) {
    return admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Firebase private key in env usually stores newlines as \\n.
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  return admin.credential.applicationDefault();
};

const getFirebaseApp = () => {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: getCredential(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  return firebaseApp;
};

const getFirestore = () => getFirebaseApp().firestore();
const getAuth = () => getFirebaseApp().auth();

module.exports = {
  getAuth,
  getFirestore,
  admin,
};
