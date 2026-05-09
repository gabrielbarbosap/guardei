import admin from "firebase-admin";

function getAdminDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (!serviceAccount) throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT não configurado.");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  }
  return admin.firestore();
}

export { getAdminDb };
