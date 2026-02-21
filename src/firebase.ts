import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const serviceAccountJson = process.env.FIREBASE_CONFIG;
if (!serviceAccountJson) {
  throw new Error("FIREBASE_CONFIG env var is not set");
}
const serviceAccount = JSON.parse(serviceAccountJson);

const app = initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
});

export const db = getFirestore(app);
export const storage = getStorage(app);
