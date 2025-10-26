const express = require('express');
const router = express.Router();
const {
  createComment,
  updateComment,
  deleteComment,
  toggleLike,
  markAsSolution,
  getComments
} = require('../controllers/commentController');
const { himoyalash } = require('../middleware/authMiddleware');

// Comment CRUD
router.post('/problems/:problemId/comments', himoyalash, createComment);
router.get('/problems/:problemId/comments', getComments);
router.put('/comments/:id', himoyalash, updateComment);
router.delete('/comments/:id', himoyalash, deleteComment);

// Like
router.post('/comments/:id/like', himoyalash, toggleLike);

// Solution belgilash
router.post('/problems/:problemId/solution/:commentId', himoyalash, markAsSolution);

module.exports = router;