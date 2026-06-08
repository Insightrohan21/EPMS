const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Submit a new employee review (Manager or Admin)
// @route   POST /api/reviews
// @access  Private/Manager/Admin
router.post('/', protect, authorize('Manager', 'Admin'), async (req, res) => {
  try {
    const { employeeId, ratings, comments, recommendations } = req.body;

    if (!employeeId || !ratings || !comments) {
      return res.status(400).json({ success: false, message: 'Please provide employeeId, ratings, and comments' });
    }

    // Verify target employee exists
    const employeeUser = await User.findById(employeeId);
    if (!employeeUser) {
      return res.status(404).json({ success: false, message: 'Target employee user not found' });
    }

    // Verify rating values
    const criteria = ['technical', 'communication', 'teamwork', 'problemSolving', 'leadership'];
    for (const crit of criteria) {
      const val = ratings[crit];
      if (val === undefined || val < 1 || val > 5) {
        return res.status(400).json({ success: false, message: `Rating for '${crit}' must be between 1 and 5` });
      }
    }

    // If manager is writing the review, we can enforce checking if they manage this employee
    if (req.user.role === 'Manager') {
      const profile = await Employee.findOne({ user: employeeId });
      if (profile && profile.managerId && profile.managerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only review employees who report directly to you' });
      }
    }

    const review = await Review.create({
      employeeId,
      managerId: req.user.id,
      ratings,
      comments,
      recommendations: recommendations || ''
    });

    const populatedReview = await Review.findById(review._id)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email');

    res.status(201).json({ success: true, data: populatedReview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get logged-in employee's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
router.get('/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ employeeId: req.user.id })
      .populate('managerId', 'name email')
      .sort('-reviewDate');

    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get reviews for a specific employee
// @route   GET /api/reviews/employee/:userId
// @access  Private
router.get('/employee/:userId', protect, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Permissions check: Employee can view own. Manager can view team. Admin can view all.
    if (req.user.role === 'Employee' && req.user.id !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these reviews' });
    }

    if (req.user.role === 'Manager') {
      const profile = await Employee.findOne({ user: targetUserId });
      if (profile && profile.managerId && profile.managerId.toString() !== req.user.id && req.user.id !== targetUserId) {
        return res.status(403).json({ success: false, message: 'Not authorized to view reviews of employees who do not report to you' });
      }
    }

    const reviews = await Review.find({ employeeId: targetUserId })
      .populate('managerId', 'name email')
      .populate('employeeId', 'name email')
      .sort('-reviewDate');

    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get performance analytics (average by criteria)
// @route   GET /api/reviews/analytics
// @access  Private
router.get('/analytics', protect, async (req, res) => {
  try {
    let queryObj = {};

    // Scope analytics
    if (req.user.role === 'Employee') {
      queryObj.employeeId = req.user.id;
    } else if (req.user.role === 'Manager') {
      const reports = await Employee.find({ managerId: req.user.id }).select('user');
      const employeeUserIds = reports.map(r => r.user);
      queryObj.employeeId = { $in: employeeUserIds };
    }
    // Admin gets all reviews for organization analytics

    const reviews = await Review.find(queryObj);
    
    if (reviews.length === 0) {
      return res.json({
        success: true,
        averages: { technical: 0, communication: 0, teamwork: 0, problemSolving: 0, leadership: 0 },
        overallAverage: 0,
        count: 0
      });
    }

    let sums = { technical: 0, communication: 0, teamwork: 0, problemSolving: 0, leadership: 0 };
    reviews.forEach(r => {
      sums.technical += r.ratings.technical;
      sums.communication += r.ratings.communication;
      sums.teamwork += r.ratings.teamwork;
      sums.problemSolving += r.ratings.problemSolving;
      sums.leadership += r.ratings.leadership;
    });

    const count = reviews.length;
    const averages = {
      technical: parseFloat((sums.technical / count).toFixed(2)),
      communication: parseFloat((sums.communication / count).toFixed(2)),
      teamwork: parseFloat((sums.teamwork / count).toFixed(2)),
      problemSolving: parseFloat((sums.problemSolving / count).toFixed(2)),
      leadership: parseFloat((sums.leadership / count).toFixed(2))
    };

    const overallAverage = parseFloat(
      ((averages.technical + averages.communication + averages.teamwork + averages.problemSolving + averages.leadership) / 5).toFixed(2)
    );

    res.json({
      success: true,
      averages,
      overallAverage,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
