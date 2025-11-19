import { db, admin } from '../config/firebase.js'; //

const POST_COLLECTION = 'forumPosts';
const COMMENT_COLLECTION = 'forumComments';

/**
 * @description Busca todos os comentários de um post específico
 * @route GET /api/forum/posts/:postId/comments
 */
export const getCommentsForPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const snapshot = await db.collection(COMMENT_COLLECTION)
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc') 
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(comments);

  } catch (error) {
    console.error('[commentController:getComments] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
};

/**
 * @description Cria um novo comentário (resposta) num post
 * @route POST /api/forum/posts/:postId/comments
 */
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const { uid, name, displayName, role } = req.user; 

    if (!text) {
      return res.status(400).json({ error: 'O texto do comentário é obrigatório.' });
    }

    let authorName = name || displayName || 'Utilizador Anónimo';
    if (role === 'professor' || role === 'teacher') {
      authorName = `Professor ${authorName}`;
    }

    const newComment = {
      postId: postId, 
      text: text,
      authorName: authorName, 
      authorId: uid,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    const postRef = db.collection(POST_COLLECTION).doc(postId);

    const batch = db.batch();

    const commentRef = db.collection(COMMENT_COLLECTION).doc();
    batch.set(commentRef, newComment);

    batch.update(postRef, {
      commentCount: admin.firestore.FieldValue.increment(1)
    });

    await batch.commit();

    res.status(201).json({ id: commentRef.id, ...newComment });

  } catch (error) {
    console.error('[commentController:createComment] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao criar comentário.' });
  }
};