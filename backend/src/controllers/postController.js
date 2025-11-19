import { db, admin } from '../config/firebase.js';

const POST_COLLECTION = 'forumPosts';

/**
 * @description Busca todos os posts
 */
export const getAllPosts = async (req, res) => {
  try {
    const { filter, turmaId } = req.query;
    const { uid } = req.user; 
    let query = db.collection(POST_COLLECTION);

    if (turmaId) {
      query = query.where('turmaId', '==', turmaId);
    } 

    if (filter === 'me') {
      query = query.where('authorId', '==', uid);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);

  } catch (error) {
    console.error('[postController:getAllPosts] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao buscar posts.' });
  }
};
/**
 * @description Cria um novo post no fórum
 */
export const createPost = async (req, res) => {
  try {
    const { text, turmaId } = req.body;
    const { uid, name, displayName, role } = req.user; 

    if (!text || !turmaId) {
      return res.status(400).json({ error: 'O texto e o turmaId são obrigatórios.' });
    }

    let authorName = name || displayName || 'Utilizador Anónimo';
    if (role === 'professor' || role === 'teacher') {
      authorName = `Professor ${authorName}`;
    }

    const newPost = {
      text: text,
      authorName: authorName, 
      authorId: uid,
      turmaId: turmaId,
      createdAt: new Date().toISOString(),
      likedBy: [], 
      commentCount: 0,
    };

    const docRef = await db.collection(POST_COLLECTION).add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });

  } catch (error) {
    console.error('[postController:createPost] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao criar post.' });
  }
};
/**
 * @description Adiciona ou remove um like de um post
 * @route POST /api/forum/posts/:postId/like
 */
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { uid } = req.user; 

    const postRef = db.collection(POST_COLLECTION).doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post não encontrado.' });
    }

    const postData = postDoc.data();
    const likedByArray = postData.likedBy || []; 

    if (likedByArray.includes(uid)) {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayRemove(uid)
      });
      res.status(200).json({ success: true, message: 'Post descurtido.' });
    } else {
      await postRef.update({
        likedBy: admin.firestore.FieldValue.arrayUnion(uid)
      });
      res.status(200).json({ success: true, message: 'Post curtido.' });
    }
    } catch (error) {
    console.error('[postController:likePost] Erro:', error.message);
    res.status(500).json({ error: 'Erro ao processar a curtida.' });
  }
};