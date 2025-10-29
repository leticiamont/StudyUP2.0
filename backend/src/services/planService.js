// src/services/planService.js
import { db } from "../config/firebase.js";

/**
 * Service para CRUD de planos de aula (collection "plans").
 * Usamos createdAt e updatedAt em ISO string para simplicidade.
 */

const COLLECTION = "plans";

const planService = {
  async createPlan(data) {
    const payload = {
      name: data.name || "Plano sem nome",
      description: data.description || "",
      level: data.level || "",
      duration: data.duration || "",
      createdBy: data.createdBy || null,
      createdAt: new Date().toISOString(),
      lessons: Array.isArray(data.lessons) ? data.lessons : [],
      meta: data.meta || {}, // campo opcional para extras
    };

    const docRef = await db.collection(COLLECTION).add(payload);
    return { id: docRef.id, ...payload };
  },

  async getAllPlans() {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getPlanById(id) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async updatePlan(id, data) {
    const updatePayload = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.lessons !== undefined && { lessons: data.lessons }),
      updatedAt: new Date().toISOString(),
      meta: data.meta || undefined,
    };

    // Remove undefined keys
    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

    await db.collection(COLLECTION).doc(id).update(updatePayload);
    const updated = await db.collection(COLLECTION).doc(id).get();
    return { id: updated.id, ...updated.data() };
  },

  async deletePlan(id) {
    await db.collection(COLLECTION).doc(id).delete();
    return { message: "Plano deletado com sucesso", id };
  }
};

export default planService;
