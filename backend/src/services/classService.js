import { db } from "../config/firebase.js";

const COLLECTION = "classes";

export const createClass = async (classData) => {
  const docRef = await db.collection(COLLECTION).add({
    ...classData,
    createdAt: new Date(),
  });
  return { id: docRef.id, ...classData };
};

export const getClasses = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  const classes = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return classes;
};

export const deleteClass = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
