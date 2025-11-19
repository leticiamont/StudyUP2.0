import { Router } from 'express';
import { getCommentsForPost, createComment } from '../controllers/commentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, getCommentsForPost);

router.post('/', authMiddleware, createComment);

export default router;