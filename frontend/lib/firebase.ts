import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

const firebaseConfig = {
  apiKey: firebaseEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: firebaseEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: firebaseEnv.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const getMissingConfig = () => {
  const missing = requiredConfig.filter((key) => !firebaseEnv[key]);
  return missing;
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export const getFirebaseApp = () => {
  if (app) {
    return app;
  }

  const missing = getMissingConfig();
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(", ")}`);
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
};

export const getFirebaseAuth = () => {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
};

export const getFirebaseDb = () => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }

  return db;
};

export const getClientAnalytics = async () => {
  // Analytics should run only in supported browsers.
  if (typeof window === "undefined") {
    return null;
  }

  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (!(await isSupported())) {
    return null;
  }

  return getAnalytics(getFirebaseApp());
};
