// @desc    Bitta muammoni olish (commentlar bilan)
// @route   GET /api/problems/:id
// @access  Public
exports.getProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate('muallif', 'ism familiya avatar createdAt')
      .populate({
        path: 'yechilganComment',
        populate: { path: 'muallif', select: 'ism familiya avatar' },
      })
      .lean()

    console.log('problem :', problem)
    if (!problem || !problem.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi',
      })
    }

    // 🆕 Anonim muallif ma'lumotini yashirish
    // Faqat o'z muammosini ko'rayotgan bo'lsa haqiqiy ismini ko'rsatish
    // ✅ Yangi kod
    const isOwner =
      req.user &&
      req.user._id &&
      req.user._id.toString() === problem.muallif._id.toString()

    if (problem.anonim && !isOwner && problem.muallif) {
      problem.muallif = {
        _id: problem.muallif._id,
        ism: 'Anonim',
        familiya: 'Foydalanuvchi',
        avatar: null,
      }
    }

    // Ko'rishlar sonini oshirish
    await Problem.findByIdAndUpdate(req.params.id, { $inc: { korishlar: 1 } })
    problem.korishlar += 1

    // Commentlarni olish (faqat asosiy commentlar, replies yo'q)
    const comments = await Comment.find({
      problem: problem._id,
      asosiyComment: null,
      aktiv: true,
    })
      .populate('muallif', 'ism familiya avatar')
      .populate({
        path: 'replies',
        match: { aktiv: true },
        populate: { path: 'muallif', select: 'ism familiya avatar' },
        options: { sort: { createdAt: 1 } },
      })
      .sort({ javobmi: -1, likeSoni: -1, createdAt: -1 })
      .lean()

    // 🆕 Commentlarda ham anonimlikni tekshirish
    const processedComments = comments.map((comment) => {
      const isCommentOwner =
        req.user &&
        req.user._id &&
        req.user._id.toString() === comment.muallif._id.toString()

      if (comment.anonim && !isCommentOwner && comment.muallif) {
        comment.muallif = {
          _id: comment.muallif._id,
          ism: 'Anonim',
          familiya: 'Foydalanuvchi',
          avatar: null,
        }
      }

      // Replies'da ham anonimlik
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map((reply) => {
          const isReplyOwner =
            req.user &&
            req.user._id &&
            req.user._id.toString() === reply.muallif._id.toString()

          if (reply.anonim && !isReplyOwner && reply.muallif) {
            reply.muallif = {
              _id: reply.muallif._id,
              ism: 'Anonim',
              familiya: 'Foydalanuvchi',
              avatar: null,
            }
          }

          return reply
        })
      }

      return comment
    })

    res.status(200).json({
      success: true,
      problem,
      comments: processedComments,
      commentlarSoni: comments.length,
    })
  } catch (error) {
    console.error('Muammoni olish xatosi:', error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}
const Problem = require('../models/Problem')
const Comment = require('../models/Comment')

// @desc    Yangi muammo yaratish
// @route   POST /api/problems
// @access  Private
exports.createProblem = async (req, res) => {
  try {
    const { sarlavha, tavsif, kategoriya, tags, anonim } = req.body

    // Validatsiya
    if (!sarlavha || sarlavha.trim().length < 10) {
      return res.status(400).json({
        success: false,
        xabar: "Sarlavha kamida 10 ta belgidan iborat bo'lishi kerak",
      })
    }

    if (!tavsif || tavsif.trim().length < 20) {
      return res.status(400).json({
        success: false,
        xabar: "Muammo tavsifi kamida 20 ta belgidan iborat bo'lishi kerak",
      })
    }

    // Tags validatsiya
    let validTags = []
    if (tags && Array.isArray(tags)) {
      validTags = tags
        .filter((tag) => tag && typeof tag === 'string')
        .map((tag) => tag.toLowerCase().trim())
        .filter((tag) => tag.length > 0 && tag.length <= 30)
        .slice(0, 5) // Maksimum 5 ta
    }

    // Yangi muammo yaratish
    const problem = await Problem.create({
      muallif: req.user.id,
      sarlavha,
      tavsif,
      kategoriya: kategoriya || 'boshqa',
      tags: validTags,
      anonim: anonim === true,
    })

    // Muallif ma'lumotlarini populate qilish
    await problem.populate('muallif', 'ism familiya avatar')

    // Problem'ni JSON object'ga aylantirish
    const problemObj = problem.toObject()

    // Agar anonim bo'lsa, muallif ma'lumotini yashirish
    if (problemObj.anonim) {
      problemObj.muallif = {
        _id: problemObj.muallif._id,
        ism: 'Anonim',
        familiya: 'Foydalanuvchi',
        avatar: null,
      }
    }

    res.status(201).json({
      success: true,
      xabar: 'Muammo muvaffaqiyatli yaratildi!',
      problem: problemObj,
    })
  } catch (error) {
    console.error('Muammo yaratish xatosi:', error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}

// @desc    Barcha muammolarni olish (pagination bilan)
// @route   GET /api/problems
// @access  Public
exports.getProblems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Filter
    const filter = { aktiv: true }

    // Kategoriya bo'yicha filter
    if (req.query.kategoriya) {
      filter.kategoriya = req.query.kategoriya
    }

    // Holat bo'yicha filter
    if (req.query.holat) {
      filter.holat = req.query.holat
    }

    // 🆕 Tag bo'yicha filter
    if (req.query.tag) {
      filter.tags = req.query.tag.toLowerCase()
    }

    // Search
    if (req.query.qidiruv) {
      filter.$text = { $search: req.query.qidiruv }
    }

    // Sort
    let sort = { createdAt: -1 } // Default: yangilar birinchi

    if (req.query.sort === 'populyar') {
      sort = { korishlar: -1 }
    } else if (req.query.sort === 'commentlar') {
      sort = { commentlarSoni: -1 }
    }

    // Query
    const problems = await Problem.find(filter)
      .populate('muallif', 'ism familiya avatar')
      .populate('yechilganComment', 'matn muallif')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean() // Performance uchun

    // 🆕 Anonim muallif ma'lumotlarini yashirish
    const processedProblems = problems.map((problem) => {
      if (problem.anonim && problem.muallif) {
        return {
          ...problem,
          muallif: {
            _id: problem.muallif._id,
            ism: 'Anonim',
            familiya: 'Foydalanuvchi',
            avatar: null,
          },
        }
      }
      return problem
    })

    // Jami muammolar soni
    const total = await Problem.countDocuments(filter)

    res.status(200).json({
      success: true,
      count: processedProblems.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      problems: processedProblems,
    })
  } catch (error) {
    console.error('Muammolarni olish xatosi:', error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}

// @desc    Bitta muammoni olish (commentlar bilan)
// @route   GET /api/problems/:id
// @access  Public
// exports.getProblem = async (req, res) => {
//   try {
//     const problem = await Problem.findById(req.params.id)
//       .populate('muallif', 'ism familiya avatar createdAt')
//       .populate({
//         path: 'yechilganComment',
//         populate: { path: 'muallif', select: 'ism familiya avatar' },
//       })

//     if (!problem || !problem.aktiv) {
//       return res.status(404).json({
//         success: false,
//         xabar: 'Muammo topilmadi',
//       })
//     }

//     // Ko'rishlar sonini oshirish
//     await problem.korishniOshir()

//     // Commentlarni olish (faqat asosiy commentlar, replies yo'q)
//     const comments = await Comment.find({
//       problem: problem._id,
//       asosiyComment: null,
//       aktiv: true,
//     })
//       .populate('muallif', 'ism familiya avatar')
//       .populate({
//         path: 'replies',
//         match: { aktiv: true },
//         populate: { path: 'muallif', select: 'ism familiya avatar' },
//         options: { sort: { createdAt: 1 } },
//       })
//       .sort({ javobmi: -1, likeSoni: -1, createdAt: -1 }) // Javob birinchi, keyin like bo'yicha

//     res.status(200).json({
//       success: true,
//       problem,
//       comments,
//       commentlarSoni: comments.length,
//     })
//   } catch (error) {
//     console.error('Muammoni olish xatosi:', error)
//     res.status(500).json({
//       success: false,
//       xabar: 'Server xatosi',
//       xato: error.message,
//     })
//   }
// }

// @desc    Muammoni tahrirlash
// @route   PUT /api/problems/:id
// @access  Private (faqat muallif)
exports.updateProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)

    if (!problem || !problem.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi',
      })
    }

    // Faqat muallif tahrirlashi mumkin
    if (
      problem.muallif.toString() !== req.user.id &&
      req.user.rol !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        xabar: "Sizda bu muammoni tahrirlash huquqi yo'q",
      })
    }

    const { sarlavha, tavsif, kategoriya } = req.body

    if (sarlavha) problem.sarlavha = sarlavha
    if (tavsif) problem.tavsif = tavsif
    if (kategoriya) problem.kategoriya = kategoriya

    await problem.save()
    await problem.populate('muallif', 'ism familiya avatar')

    res.status(200).json({
      success: true,
      xabar: 'Muammo tahrirlandi',
      problem,
    })
  } catch (error) {
    console.error('Muammoni tahrirlash xatosi:', error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}

// @desc    Muammoni o'chirish (soft delete)
// @route   DELETE /api/problems/:id
// @access  Private (faqat muallif)
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)

    if (!problem) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi',
      })
    }

    // Faqat muallif o'chirishi mumkin
    if (
      problem.muallif.toString() !== req.user.id &&
      req.user.rol !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        xabar: "Sizda bu muammoni o'chirish huquqi yo'q",
      })
    }

    problem.aktiv = false
    await problem.save()

    res.status(200).json({
      success: true,
      xabar: "Muammo o'chirildi",
    })
  } catch (error) {
    console.error("Muammoni o'chirish xatosi:", error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}

// @desc    Muammoni yopish (yechildi deb belgilash)
// @route   PUT /api/problems/:id/close
// @access  Private (faqat muallif)
exports.closeProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)

    if (!problem || !problem.aktiv) {
      return res.status(404).json({
        success: false,
        xabar: 'Muammo topilmadi',
      })
    }

    // Faqat muallif yopishi mumkin
    if (problem.muallif.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        xabar: 'Faqat muammo muallifi yopishi mumkin',
      })
    }

    problem.holat = 'yopilgan'
    await problem.save()

    res.status(200).json({
      success: true,
      xabar: 'Muammo yopildi',
      problem,
    })
  } catch (error) {
    console.error('Muammoni yopish xatosi:', error)
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    })
  }
}

// @desc    Foydalanuvchining muammolari
// @route   GET /api/problems/user/:userId
// @access  Public
exports.getUserProblems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const problems = await Problem.find({
      muallif: req.params.userId,
      aktiv: true,
    })
      .populate('muallif', 'ism familiya avatar')
      .populate('yechilganComment', 'matn muallif') // ✅ Yechilgan comment
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // ✅ Performance uchun

    // ✅ Anonim muallif ma'lumotlarini yashirish
    const processedProblems = problems.map((problem) => {
      if (problem.anonim && problem.muallif) {
        return {
          ...problem,
          muallif: {
            _id: problem.muallif._id,
            ism: 'Anonim',
            familiya: 'Foydalanuvchi',
            avatar: null,
          },
        };
      }
      return problem;
    });

    const total = await Problem.countDocuments({
      muallif: req.params.userId,
      aktiv: true,
    });

    res.status(200).json({
      success: true,
      count: processedProblems.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      problems: processedProblems, // ✅ Processed problems
    });
  } catch (error) {
    console.error('Foydalanuvchi muammolarini olish xatosi:', error);
    res.status(500).json({
      success: false,
      xabar: 'Server xatosi',
      xato: error.message,
    });
  }
};