const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all projects (role-specific filtering)
// @route   GET /api/projects
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let queryObj = {};

    // Role-based scoping
    if (req.user.role === 'Employee') {
      // Employees only see projects they are assigned to
      queryObj.assignedEmployees = req.user.id;
    } else if (req.user.role === 'Manager') {
      // Managers see projects they manage or are assigned to
      queryObj.$or = [
        { managerId: req.user.id },
        { assignedEmployees: req.user.id }
      ];
    }
    // Admins see all projects (queryObj remains empty)

    const projects = await Project.find(queryObj)
      .populate('managerId', 'name email')
      .populate('assignedEmployees', 'name email')
      .sort('-createdAt');

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single project details
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('managerId', 'name email')
      .populate('assignedEmployees', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Role-based visibility check
    if (
      req.user.role === 'Employee' &&
      !project.assignedEmployees.some(emp => emp._id.toString() === req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this project' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create project (Admin or Manager)
// @route   POST /api/projects
// @access  Private/Admin/Manager
router.post('/', protect, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { projectName, description, startDate, endDate, status, priority, managerId, assignedEmployees } = req.body;

    // Use current user as manager if managerId is not specified and user is a Manager
    const actualManagerId = managerId || (req.user.role === 'Manager' ? req.user.id : null);

    if (!actualManagerId) {
      return res.status(400).json({ success: false, message: 'Please assign a reporting manager' });
    }

    const project = await Project.create({
      projectName,
      description,
      startDate,
      endDate,
      status: status || 'Not Started',
      priority: priority || 'Medium',
      managerId: actualManagerId,
      assignedEmployees: assignedEmployees || []
    });

    const populatedProject = await Project.findById(project._id)
      .populate('managerId', 'name email')
      .populate('assignedEmployees', 'name email');

    res.status(201).json({ success: true, data: populatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update project (Admin or Manager)
// @route   PUT /api/projects/:id
// @access  Private/Admin/Manager
router.put('/:id', protect, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // If manager, verify they manage this project
    if (req.user.role === 'Manager' && project.managerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this project' });
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('managerId', 'name email').populate('assignedEmployees', 'name email');

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Assign team members to project (Admin or Manager)
// @route   PUT /api/projects/:id/assign
// @access  Private/Admin/Manager
router.put('/:id/assign', protect, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const { assignedEmployees } = req.body;
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify manager ownership
    if (req.user.role === 'Manager' && project.managerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to assign resources to this project' });
    }

    project.assignedEmployees = assignedEmployees;
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('managerId', 'name email')
      .populate('assignedEmployees', 'name email');

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete project (Admin only)
// @route   DELETE /api/projects/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
