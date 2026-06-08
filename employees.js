const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all managers (for assignment dropdowns)
// @route   GET /api/employees/managers
// @access  Private
router.get('/managers', protect, async (req, res) => {
  try {
    const managers = await User.find({ role: 'Manager' }).select('name email');
    res.json({ success: true, count: managers.length, data: managers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all employees (with search, filter, sorting, pagination)
// @route   GET /api/employees
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let queryObj = {};

    // 1. Text Search (Name, Email, Employee ID)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      
      // Find matching users first
      const users = await User.find({
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } }
        ]
      }).select('_id');
      
      const userIds = users.map(u => u._id);

      queryObj.$or = [
        { user: { $in: userIds } },
        { employeeId: { $regex: searchRegex } }
      ];
    }

    // 2. Filters
    if (req.query.department) {
      queryObj.department = req.query.department;
    }
    if (req.query.designation) {
      queryObj.designation = req.query.designation;
    }
    if (req.query.managerId) {
      queryObj.managerId = req.query.managerId;
    }

    // 3. Sorting
    let sortBy = '-createdAt';
    if (req.query.sort) {
      sortBy = req.query.sort; // e.g. "joiningDate", "-joiningDate", "department"
    }

    // Run query
    const total = await Employee.countDocuments(queryObj);
    
    // Sort logic might require joining user name, but standard sorting on employee fields is easy
    const employees = await Employee.find(queryObj)
      .populate('user', 'name email role')
      .populate('managerId', 'name email')
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: employees.length,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
        total
      },
      data: employees
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single employee details
// @route   GET /api/employees/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // id could be the User ID or Employee MongoDB ID. We handle both for robustness
    let employee = await Employee.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }]
    })
      .populate('user', 'name email role')
      .populate('managerId', 'name email');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create new employee (Admin only)
// @route   POST /api/employees
// @access  Private/Admin
router.post('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      employeeId,
      profilePicture,
      department,
      designation,
      joiningDate,
      contactNumber,
      address,
      managerId
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Check if Employee ID is unique
    const empIdExists = await Employee.findOne({ employeeId });
    if (empIdExists) {
      return res.status(400).json({ success: false, message: 'Employee ID must be unique' });
    }

    // Create User
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Employee'
    });

    // Create Employee Profile
    const employee = await Employee.create({
      user: user._id,
      employeeId,
      profilePicture: profilePicture || '',
      department,
      designation,
      joiningDate: joiningDate || new Date(),
      contactNumber,
      address,
      managerId: managerId || null
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        userId: user._id,
        employeeProfileId: employee._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: employee.employeeId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update employee details (Admin only)
// @route   PUT /api/employees/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      profilePicture,
      department,
      designation,
      joiningDate,
      contactNumber,
      address,
      managerId
    } = req.body;

    // Find Employee Profile (using employee _id or user ID)
    const employee = await Employee.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }]
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Update User Info
    const user = await User.findById(employee.user);
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (role) user.role = role;
      await user.save();
    }

    // Update Employee details
    if (profilePicture !== undefined) employee.profilePicture = profilePicture;
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (joiningDate !== undefined) employee.joiningDate = joiningDate;
    if (contactNumber !== undefined) employee.contactNumber = contactNumber;
    if (address !== undefined) employee.address = address;
    if (managerId !== undefined) employee.managerId = managerId || null;

    await employee.save();

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete employee (Admin only)
// @route   DELETE /api/employees/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const employee = await Employee.findOne({
      $or: [{ _id: req.params.id }, { user: req.params.id }]
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Delete matching User
    await User.findByIdAndDelete(employee.user);

    // Delete Employee record
    await Employee.findByIdAndDelete(employee._id);

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
