const admin = require('firebase-admin');

let db;
let auth;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    return { db, auth };
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  db = admin.firestore();
  auth = admin.auth();

  console.log('Firebase Admin initialized');
  return { db, auth };
}

function getDB() {
  if (!db) initFirebase();
  return db;
}

function getAuth() {
  if (!auth) initFirebase();
  return auth;
}

module.exports = { initFirebase, getDB, getAuth };
