import { db } from "../config/firebase.js";

/**
 * @route POST /api/news
 * @description Cria uma nova notícia/aviso
 * @body { title, content, imageUrl (opcional) }
 */
export const createNews = async (req, res, next) => {
  try {
    const { title, content, imageUrl } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Título e Conteúdo são obrigatórios." });
    }

    const newNewsItem = {
      title,
      content,
      imageUrl: imageUrl || null, // URL de um banner/imagem
      authorName: "Admin", // (Hardcoded por enquanto)
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
 * @description Lista as últimas notícias (ex: 5 mais recentes)
 */
export const getNews = async (req, res, next) => {
  try {
    const snapshot = await db.collection("news")
      .orderBy("createdAt", "desc")
      .limit(5) // Pega só as 5 mais recentes para o mural
      .get();

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
    next(error);
  }
};

/**
 * @route DELETE /api/news/:id
 * @description Apaga uma notícia pelo ID
 */
export const deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
       return res.status(400).json({ error: "ID da notícia é obrigatório." });
    }

    const docRef = db.collection("news").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Notícia não encontrada." });
    }
    
    await docRef.delete();
    
    res.status(200).json({ message: "Notícia apagada com sucesso." });

  } catch (error) {
    console.error('[newsController:deleteNews] Erro:', error);
    next(error);
  }
};