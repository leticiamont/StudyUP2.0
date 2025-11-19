import { Router } from 'express';
import { getAllPosts, createPost, likePost } from '../controllers/postController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// (Protegido por middleware: só quem está logado pode ver os posts)
router.get('/', authMiddleware, getAllPosts);
// (Protegido por middleware: só quem está logado pode criar um post)
router.post('/', authMiddleware, createPost);
router.post('/:postId/like', authMiddleware, likePost);

export default router;