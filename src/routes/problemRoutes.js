const express = require('express');
const router = express.Router();
const {
  createProblem,
  getProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  closeProblem,
  getUserProblems
} = require('../controllers/problemController');
const { himoyalash, optionalHimoyalash } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getProblems);
router.get('/user/:userId', getUserProblems);

// Private/Public hybrid - token optional
router.get('/:id', optionalHimoyalash, getProblem);// Token bo'lsa check qiladi, yo'qsa ham ishlaydi

// Private routes
router.post('/', himoyalash, createProblem);
router.put('/:id', himoyalash, updateProblem);
router.delete('/:id', himoyalash, deleteProblem);
router.put('/:id/close', himoyalash, closeProblem);

module.exports = router;