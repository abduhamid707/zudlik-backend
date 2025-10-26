const express = require('express');
const router = express.Router();
const {
  getPopularTags,
  getProblemsByTag,
  getTagsByCategory,
  searchTags
} = require('../controllers/tagsController');

// Public routes
router.get('/popular', getPopularTags);
router.get('/search', searchTags);
router.get('/:tag/problems', getProblemsByTag);
router.get('/category/:category', getTagsByCategory);

module.exports = router;