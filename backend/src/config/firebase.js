import admin from "firebase-admin";
import { readFileSync } from "fs";

// Lê as credenciais do arquivo serviceAccountKey.json
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf-8")
);

// Inicializa o Firebase Admin (evita inicializar mais de uma vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Firestore
const db = admin.firestore();

// Exporta nomeado para ficar mais organizado
export { db, admin };
