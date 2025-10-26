const Problem = require('../models/Problem');

// @desc    Populyar tag'larni olish
// @route   GET /api/tags/popular
// @access  Public
exports.getPopularTags = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    // Aggregation pipeline - barcha tag'larni sanash
    const tags = await Problem.aggregate([
      { $match: { aktiv: true } },
      { $unwind: '$tags' },
      { 
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: tags.length,
      tags
    });
    
  } catch (error) {
    console.error('Popular tags olish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Tag bo'yicha muammolarni olish
// @route   GET /api/tags/:tag/problems
// @access  Public
exports.getProblemsByTag = async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const problems = await Problem.find({
      tags: tag,
      aktiv: true
    })
      .populate('muallif', 'ism familiya avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Anonim muallif ma'lumotlarini yashirish
    const processedProblems = problems.map(problem => {
      if (problem.anonim && problem.muallif) {
        return {
          ...problem,
          muallif: {
            _id: problem.muallif._id,
            ism: 'Anonim',
            familiya: 'Foydalanuvchi',
            avatar: null
          }
        };
      }
      return problem;
    });
    
    const total = await Problem.countDocuments({
      tags: tag,
      aktiv: true
    });
    
    res.status(200).json({
      success: true,
      tag,
      count: processedProblems.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      problems: processedProblems
    });
    
  } catch (error) {
    console.error('Tag bo\'yicha muammolar olish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Kategoriya bo'yicha populyar tag'lar
// @route   GET /api/tags/category/:category
// @access  Public
exports.getTagsByCategory = async (req, res) => {
  try {
    const kategoriya = req.params.category;
    const limit = parseInt(req.query.limit) || 10;
    
    const tags = await Problem.aggregate([
      { 
        $match: { 
          aktiv: true,
          kategoriya: kategoriya
        }
      },
      { $unwind: '$tags' },
      { 
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      kategoriya,
      count: tags.length,
      tags
    });
    
  } catch (error) {
    console.error('Kategoriya tag\'larini olish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Tag qidirish (auto-complete uchun)
// @route   GET /api/tags/search
// @access  Public
exports.searchTags = async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        xabar: 'Qidiruv so\'zi kamida 2 ta belgidan iborat bo\'lishi kerak'
      });
    }
    
    const tags = await Problem.aggregate([
      { $match: { aktiv: true } },
      { $unwind: '$tags' },
      { 
        $match: {
          tags: { $regex: query.toLowerCase(), $options: 'i' }
        }
      },
      { 
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          count: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      query,
      count: tags.length,
      tags
    });
    
  } catch (error) {
    console.error('Tag qidirish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};