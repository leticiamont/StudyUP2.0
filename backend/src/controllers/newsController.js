import { db } from "../config/firebase.js";

/**
 * @route POST /api/news
 * @description Cria uma nova notícia/aviso/evento
 * @body { title, content, type, date, time }
 */
export const createNews = async (req, res, next) => {
  try {
    const { title, content, type, date, time } = req.body;

    // Validação básica
    if (!title || !content || !type) {
      return res.status(400).json({ error: "Título, Conteúdo e Tipo são obrigatórios." });
    }

    // Validação extra para Eventos
    if (type === 'event' && (!date || !time)) {
      return res.status(400).json({ error: "Eventos precisam de Data e Hora." });
    }

    const newNewsItem = {
      title,
      content,
      type, // 'event' ou 'notice'
      eventDate: date || null, // Salva a data (YYYY-MM-DD)
      eventTime: time || null, // Salva a hora (HH:MM)
      authorName: "Admin",
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("news").add(newNewsItem);

    res.status(201).json({ id: docRef.id, ...newNewsItem });

  } catch (error) {
    console.error('[newsController:createNews] Erro:', error);
    next(error);
  }
};

/**
 * @route GET /api/news
 * @description Lista as últimas notícias (com suporte a filtros futuros)
 */
export const getNews = async (req, res, next) => {
  try {
    // (No futuro, o pessoal da Web pode mandar ?type=event para pegar só eventos pro calendário)
    const { type } = req.query; 
    
    let query = db.collection("news").orderBy("createdAt", "desc");

    if (type) {
      query = query.where("type", "==", type);
    }

    // Pega as 10 últimas para o mural
    const snapshot = await query.limit(10).get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const newsList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(newsList);

  } catch (error) {
    console.error('[newsController:getNews] Erro:', error);
    // Se der erro de índice (por causa do filtro + order), avisa
    if (error.code === 'failed-precondition') {
       return res.status(500).json({ error: 'Erro de índice no Firebase (Falta índice composto).' });
    }
    next(error);
  }
};

/**
 * @route DELETE /api/news/:id
 */
export const deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID obrigatório." });

    const docRef = db.collection("news").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "Notícia não encontrada." });
    
    await docRef.delete();
    res.status(200).json({ message: "Apagado com sucesso." });

  } catch (error) {
    console.error('[newsController:deleteNews] Erro:', error);
    next(error);
  }
};