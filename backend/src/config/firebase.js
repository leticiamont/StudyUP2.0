// src/config/firebase.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: key,
    }),
  });
}

const db = admin.firestore();
export { admin, db };
export default admin;
