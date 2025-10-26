const Comment = require('../models/Comment');
const Problem = require('../models/Problem');

// @desc    Comment yaratish
// @route   POST /api/problems/:problemId/comments
// @access  Private
exports.createComment = async (req, res) => {
  try {
    const { matn, asosiyComment, anonim } = req.body;
    
    // Validatsiya
    if (!matn || matn.trim().length < 5) {
      return res.status(400).json({
        success: false,
        xabar: 'Comment kamida 5 ta belgidan iborat bo\'lishi kerak'
      });
    }
    
    // Problem mavjudligini tekshirish
    const problem = await Problem.findById(req.params.problemId);
    if (!problem || !problem.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi'
      });
    }
    
    // Agar reply bo'lsa, asosiy comment mavjudligini tekshirish
    if (asosiyComment) {
      const parentComment = await Comment.findById(asosiyComment);
      if (!parentComment || !parentComment.aktiv) {
        return res.status(404).json({
          success: false,
          xabar: 'Asosiy comment topilmadi'
        });
      }
    }
    
    // Comment yaratish
    const comment = await Comment.create({
      problem: req.params.problemId,
      muallif: req.user.id,
      matn,
      asosiyComment: asosiyComment || null,
      anonim: anonim === true
    });
    
    await comment.populate('muallif', 'ism familiya avatar');
    
    // Anonim bo'lsa muallif ma'lumotini yashirish
    const response = comment.toObject();
    if (response.anonim) {
      response.muallif = {
        _id: response.muallif._id,
        ism: 'Anonim',
        familiya: 'Foydalanuvchi',
        avatar: null
      };
    }
    
    res.status(201).json({
      success: true,
      xabar: asosiyComment ? 'Javob qo\'shildi' : 'Comment qo\'shildi',
      comment: response
    });
    
  } catch (error) {
    console.error('Comment yaratish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Comment tahrirlash
// @route   PUT /api/comments/:id
// @access  Private (faqat muallif)
exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment || !comment.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Comment topilmadi'
      });
    }
    
    // Faqat muallif tahrirlashi mumkin
    if (comment.muallif.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        xabar: 'Sizda bu commentni tahrirlash huquqi yo\'q'
      });
    }
    
    const { matn } = req.body;
    
    if (!matn || matn.trim().length < 5) {
      return res.status(400).json({
        success: false,
        xabar: 'Comment kamida 5 ta belgidan iborat bo\'lishi kerak'
      });
    }
    
    comment.matn = matn;
    comment.tahrirlangan = true;
    await comment.save();
    
    await comment.populate('muallif', 'ism familiya avatar');
    
    res.status(200).json({
      success: true,
      xabar: 'Comment tahrirlandi',
      comment
    });
    
  } catch (error) {
    console.error('Comment tahrirlash xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Comment o'chirish (soft delete)
// @route   DELETE /api/comments/:id
// @access  Private (faqat muallif)
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        xabar: 'Comment topilmadi'
      });
    }
    
    // Faqat muallif o'chirishi mumkin
    if (comment.muallif.toString() !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        xabar: 'Sizda bu commentni o\'chirish huquqi yo\'q'
      });
    }
    
    comment.aktiv = false;
    await comment.save();
    
    res.status(200).json({
      success: true,
      xabar: 'Comment o\'chirildi'
    });
    
  } catch (error) {
    console.error('Comment o\'chirish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Comment'ga like berish/olib tashlash
// @route   POST /api/comments/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment || !comment.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Comment topilmadi'
      });
    }
    
    const qoshildi = await comment.likeBerish(req.user.id);
    
    res.status(200).json({
      success: true,
      xabar: qoshildi ? 'Like qo\'shildi' : 'Like olib tashlandi',
      likeSoni: comment.likeSoni,
      likeQilgan: qoshildi
    });
    
  } catch (error) {
    console.error('Like berish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Comment'ni javob sifatida belgilash
// @route   POST /api/problems/:problemId/solution/:commentId
// @access  Private (faqat problem muallifi)
exports.markAsSolution = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.problemId);
    
    if (!problem || !problem.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi'
      });
    }
    
    // Faqat problem muallifi belgilashi mumkin
    if (problem.muallif.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        xabar: 'Faqat muammo muallifi javobni belgilashi mumkin'
      });
    }
    
    const comment = await Comment.findById(req.params.commentId);
    
    if (!comment || !comment.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Comment topilmadi'
      });
    }
    
    // Comment shu muammoga tegishli ekanini tekshirish
    if (comment.problem.toString() !== problem._id.toString()) {
      return res.status(400).json({
        success: false,
        xabar: 'Comment bu muammoga tegishli emas'
      });
    }
    
    // Oldingi javobni bekor qilish
    if (problem.yechilganComment) {
      const oldSolution = await Comment.findById(problem.yechilganComment);
      if (oldSolution) {
        oldSolution.javobmi = false;
        await oldSolution.save();
      }
    }
    
    // Yangi javob belgilash
    await comment.javobQilish();
    await problem.yechildiDeb(comment._id);
    
    await comment.populate('muallif', 'ism familiya avatar');
    
    res.status(200).json({
      success: true,
      xabar: 'Javob belgilandi',
      comment,
      problem
    });
    
  } catch (error) {
    console.error('Javob belgilash xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};

// @desc    Problem commentlarini olish
// @route   GET /api/problems/:problemId/comments
// @access  Public
exports.getComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Faqat asosiy commentlar (reply emas)
    const comments = await Comment.find({
      problem: req.params.problemId,
      asosiyComment: null,
      aktiv: true
    })
      .populate('muallif', 'ism familiya avatar')
      .populate({
        path: 'replies',
        match: { aktiv: true },
        populate: { path: 'muallif', select: 'ism familiya avatar' },
        options: { sort: { createdAt: 1 } }
      })
      .sort({ javobmi: -1, likeSoni: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Comment.countDocuments({
      problem: req.params.problemId,
      asosiyComment: null,
      aktiv: true
    });
    
    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      comments
    });
    
  } catch (error) {
    console.error('Commentlarni olish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message
    });
  }
};