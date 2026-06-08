const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Helper: Get local YYYY-MM-DD string
const getLocalDateString = (dateObj) => {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get current check-in status of logged-in user
// @route   GET /api/attendance/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const todayStr = getLocalDateString(new Date());
    const attendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: todayStr
    });

    res.json({
      success: true,
      checkedIn: !!attendance,
      checkedOut: !!(attendance && attendance.checkOut),
      attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Daily Check-In
// @route   POST /api/attendance/checkin
// @access  Private
router.post('/checkin', protect, async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: todayStr
    });

    if (attendance) {
      return res.status(400).json({ success: false, message: 'Already checked in for today' });
    }

    // Determine Status (Late if after 9:30 AM local time)
    // 9:30 AM threshold
    const checkInHour = now.getHours();
    const checkInMinute = now.getMinutes();
    let status = 'Present';
    if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 30)) {
      status = 'Late';
    }

    attendance = await Attendance.create({
      employeeId: req.user.id,
      date: todayStr,
      checkIn: now,
      status
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Daily Check-Out
// @route   POST /api/attendance/checkout
// @access  Private
router.post('/checkout', protect, async (req, res) => {
  try {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Find active check-in today
    let attendance = await Attendance.findOne({
      employeeId: req.user.id,
      date: todayStr
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'You have not checked in today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out for today' });
    }

    attendance.checkOut = now;
    await attendance.save();

    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get logged-in user's attendance history
// @route   GET /api/attendance/my-history
// @access  Private
router.get('/my-history', protect, async (req, res) => {
  try {
    const history = await Attendance.find({ employeeId: req.user.id }).sort('-date');

    // Calculate individual attendance rates
    const totalDays = history.length;
    const presentDays = history.filter(h => h.status === 'Present').length;
    const lateDays = history.filter(h => h.status === 'Late').length;
    const absentDays = history.filter(h => h.status === 'Absent').length;

    const rate = totalDays > 0 ? parseFloat((((presentDays + lateDays) / totalDays) * 100).toFixed(1)) : 100;

    res.json({
      success: true,
      stats: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendanceRate: rate
      },
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get team attendance (Manager only)
// @route   GET /api/attendance/team
// @access  Private/Manager
router.get('/team', protect, authorize('Manager', 'Admin'), async (req, res) => {
  try {
    // 1. Find employees reporting to this manager (if manager)
    let employeeUserIds = [];
    if (req.user.role === 'Manager') {
      const reports = await Employee.find({ managerId: req.user.id }).select('user');
      employeeUserIds = reports.map(r => r.user);
    } else {
      // Admin gets everyone
      const employeesList = await Employee.find().select('user');
      employeeUserIds = employeesList.map(r => r.user);
    }

    // 2. Fetch attendance logs for these employees
    const dateQuery = req.query.date || getLocalDateString(new Date());

    const attendanceRecords = await Attendance.find({
      employeeId: { $in: employeeUserIds },
      date: dateQuery
    }).populate('employeeId', 'name email');

    res.json({ success: true, date: dateQuery, count: attendanceRecords.length, data: attendanceRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get organization-wide attendance (Admin only)
// @route   GET /api/attendance/all
// @access  Private/Admin
router.get('/all', protect, authorize('Admin'), async (req, res) => {
  try {
    const filterDate = req.query.date || getLocalDateString(new Date());
    const attendanceRecords = await Attendance.find({ date: filterDate })
      .populate('employeeId', 'name email');

    res.json({ success: true, date: filterDate, count: attendanceRecords.length, data: attendanceRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
