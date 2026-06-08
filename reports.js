const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');

// Helper to get local YYYY-MM-DD
const getLocalDateString = (dateObj) => {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get dashboard metrics and charts based on user role
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const todayStr = getLocalDateString(new Date());

    if (role === 'Admin') {
      // 1. KPI Cards
      const totalEmployees = await User.countDocuments({ role: { $in: ['Employee', 'Manager'] } });
      const activeProjects = await Project.countDocuments({ status: 'In Progress' });
      
      // Attendance percentage today
      const todayAttendance = await Attendance.countDocuments({ date: todayStr, status: { $in: ['Present', 'Late'] } });
      const attendancePct = totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 100;

      // Pending reviews (employees without reviews in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const employeesWithRecentReviews = await Review.distinct('employeeId', { reviewDate: { $gte: thirtyDaysAgo } });
      const allEmployeeIds = await User.find({ role: 'Employee' }).distinct('_id');
      const pendingReviews = allEmployeeIds.length - employeesWithRecentReviews.length;

      // 2. Charts
      // Department distribution
      const deptData = await Employee.aggregate([
        { $group: { _id: '$department', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } }
      ]);

      // Project status analytics
      const statusData = await Project.aggregate([
        { $group: { _id: '$status', value: { $sum: 1 } } },
        { $project: { name: '$_id', value: 1, _id: 0 } }
      ]);

      // Employee growth (by joining date month)
      const growthData = await Employee.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$joiningDate' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } }
      ]);

      // Recent activities feed (combined)
      const recentCheckins = await Attendance.find({ date: todayStr })
        .populate('employeeId', 'name')
        .sort('-checkIn')
        .limit(3);
      
      const recentReviews = await Review.find()
        .populate('employeeId', 'name')
        .populate('managerId', 'name')
        .sort('-createdAt')
        .limit(3);

      const recentProjects = await Project.find()
        .sort('-createdAt')
        .limit(3);

      const activities = [];
      recentCheckins.forEach(c => {
        activities.push({
          id: c._id,
          type: 'attendance',
          message: `${c.employeeId ? c.employeeId.name : 'An employee'} checked in (${c.status})`,
          time: c.checkIn
        });
      });
      recentReviews.forEach(r => {
        activities.push({
          id: r._id,
          type: 'review',
          message: `${r.managerId ? r.managerId.name : 'A manager'} reviewed ${r.employeeId ? r.employeeId.name : 'an employee'} (Score: ${r.overallScore})`,
          time: r.createdAt
        });
      });
      recentProjects.forEach(p => {
        activities.push({
          id: p._id,
          type: 'project',
          message: `New project created: ${p.projectName} (${p.priority})`,
          time: p.createdAt
        });
      });
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));

      return res.json({
        success: true,
        kpis: {
          totalEmployees,
          activeProjects,
          attendancePercentage: attendancePct,
          pendingReviews: Math.max(0, pendingReviews)
        },
        charts: {
          departmentDistribution: deptData,
          projectStatus: statusData,
          employeeGrowth: growthData
        },
        activities: activities.slice(0, 5)
      });
    }

    if (role === 'Manager') {
      // Direct report employee IDs
      const teamEmployees = await Employee.find({ managerId: userId }).populate('user', 'name email');
      const teamUserIds = teamEmployees.map(te => te.user._id);

      // 1. KPI Cards
      const teamCount = teamEmployees.length;
      const assignedProjects = await Project.countDocuments({
        $or: [
          { managerId: userId },
          { assignedEmployees: userId }
        ]
      });

      // Attendance summary today (for direct reports)
      const teamTodayAttendance = await Attendance.countDocuments({
        employeeId: { $in: teamUserIds },
        date: todayStr,
        status: { $in: ['Present', 'Late'] }
      });
      const attendanceSummary = teamCount > 0 ? `${teamTodayAttendance}/${teamCount} Present` : '0/0 Present';

      // Pending reviews (team members without reviews in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const teamReviewed = await Review.distinct('employeeId', {
        employeeId: { $in: teamUserIds },
        reviewDate: { $gte: thirtyDaysAgo }
      });
      const pendingReviews = teamCount - teamReviewed.length;

      // 2. Charts
      // Team Performance Graph (member names vs average review scores)
      const performanceScores = [];
      for (const member of teamEmployees) {
        const memberReviews = await Review.find({ employeeId: member.user._id });
        const avg = memberReviews.length > 0
          ? parseFloat((memberReviews.reduce((sum, r) => sum + r.overallScore, 0) / memberReviews.length).toFixed(2))
          : 0;
        performanceScores.push({
          name: member.user.name,
          score: avg
        });
      }

      // Project progress tracker (projects managed by manager, and status)
      const projectsManaged = await Project.find({ managerId: userId });
      const projectProgress = projectsManaged.map(p => {
        // Calculate progress percentage based on status
        let progress = 0;
        if (p.status === 'In Progress') progress = 40;
        if (p.status === 'Completed') progress = 100;
        if (p.status === 'On Hold') progress = 20;

        return {
          name: p.projectName,
          status: p.status,
          priority: p.priority,
          progress
        };
      });

      // Recent Team Activities
      const teamCheckins = await Attendance.find({
        employeeId: { $in: teamUserIds },
        date: todayStr
      }).populate('employeeId', 'name');

      const teamReviewsList = await Review.find({
        employeeId: { $in: teamUserIds }
      }).populate('employeeId', 'name').sort('-createdAt').limit(5);

      const teamActivities = [];
      teamCheckins.forEach(c => {
        teamActivities.push({
          id: c._id,
          message: `${c.employeeId.name} checked in today at ${new Date(c.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${c.status})`,
          time: c.checkIn
        });
      });
      teamReviewsList.forEach(r => {
        teamActivities.push({
          id: r._id,
          message: `Evaluation submitted for ${r.employeeId.name}. Average score: ${r.overallScore}`,
          time: r.createdAt
        });
      });
      teamActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

      return res.json({
        success: true,
        kpis: {
          teamMembersCount: teamCount,
          assignedProjects,
          attendanceSummary,
          pendingReviews: Math.max(0, pendingReviews)
        },
        charts: {
          teamPerformance: performanceScores,
          projectProgress
        },
        activities: teamActivities.slice(0, 5)
      });
    }

    if (role === 'Employee') {
      // 1. KPI Cards
      const assignedProjectsCount = await Project.countDocuments({ assignedEmployees: userId });
      
      const todayRecord = await Attendance.findOne({ employeeId: userId, date: todayStr });
      const attendanceStatus = todayRecord ? `${todayRecord.status} (In: ${new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : 'Not Checked In';

      const myReviews = await Review.find({ employeeId: userId });
      const avgPerformanceScore = myReviews.length > 0
        ? parseFloat((myReviews.reduce((sum, r) => sum + r.overallScore, 0) / myReviews.length).toFixed(2))
        : 0;

      // Mock upcoming review check (first of next month)
      const nextReviewStr = '1st of ' + new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString([], { month: 'long' });

      // 2. Charts
      // Monthly attendance stats (present, late, absent)
      const myLogs = await Attendance.find({ employeeId: userId }).sort('-date').limit(30);
      const monthlyAttendance = [
        { name: 'Present', value: myLogs.filter(l => l.status === 'Present').length },
        { name: 'Late', value: myLogs.filter(l => l.status === 'Late').length },
        { name: 'Absent', value: myLogs.filter(l => l.status === 'Absent').length }
      ];

      // Performance trend chart (review score history)
      const reviewTrend = myReviews.map(r => ({
        date: new Date(r.reviewDate).toLocaleDateString([], { month: 'short', year: '2-digit' }),
        score: r.overallScore
      })).reverse(); // oldest first

      // Detailed criteria ratings for radial/radar chart representation
      let radarData = [
        { subject: 'Technical', A: 0, fullMark: 5 },
        { subject: 'Communication', A: 0, fullMark: 5 },
        { subject: 'Teamwork', A: 0, fullMark: 5 },
        { subject: 'Problem Solving', A: 0, fullMark: 5 },
        { subject: 'Leadership', A: 0, fullMark: 5 }
      ];

      if (myReviews.length > 0) {
        const latestReview = myReviews[0]; // Sort by date is default newest first
        radarData = [
          { subject: 'Technical', A: latestReview.ratings.technical, fullMark: 5 },
          { subject: 'Communication', A: latestReview.ratings.communication, fullMark: 5 },
          { subject: 'Teamwork', A: latestReview.ratings.teamwork, fullMark: 5 },
          { subject: 'Problem Solving', A: latestReview.ratings.problemSolving, fullMark: 5 },
          { subject: 'Leadership', A: latestReview.ratings.leadership, fullMark: 5 }
        ];
      }

      return res.json({
        success: true,
        kpis: {
          assignedProjects: assignedProjectsCount,
          attendanceStatus,
          performanceScore: avgPerformanceScore,
          upcomingReviews: nextReviewStr
        },
        charts: {
          monthlyAttendance,
          reviewTrend,
          latestRadar: radarData
        }
      });
    }

    res.status(400).json({ success: false, message: 'Invalid role' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
