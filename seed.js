const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Employee = require('../models/Employee');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Review = require('../models/Review');

const getLocalDateString = (dateObj) => {
  const d = dateObj || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const seedData = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epms';
    await mongoose.connect(connUri);
    console.log('MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany();
    await Employee.deleteMany();
    await Project.deleteMany();
    await Attendance.deleteMany();
    await Review.deleteMany();
    console.log('Database cleared.');

    // Passwords to hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Create Users
    const usersData = [
      { name: 'Sarah Connor', email: 'admin@epms.com', password: hashedPassword, role: 'Admin' },
      { name: 'John Doe', email: 'manager1@epms.com', password: hashedPassword, role: 'Manager' },
      { name: 'Jane Smith', email: 'manager2@epms.com', password: hashedPassword, role: 'Manager' },
      { name: 'Alice Johnson', email: 'employee1@epms.com', password: hashedPassword, role: 'Employee' },
      { name: 'Bob Thompson', email: 'employee2@epms.com', password: hashedPassword, role: 'Employee' },
      { name: 'Charlie Green', email: 'employee3@epms.com', password: hashedPassword, role: 'Employee' },
      { name: 'Diana Prince', email: 'employee4@epms.com', password: hashedPassword, role: 'Employee' }
    ];

    const users = await User.insertMany(usersData);
    console.log('Users created.');

    const admin = users[0];
    const manager1 = users[1];
    const manager2 = users[2];
    const emp1 = users[3];
    const emp2 = users[4];
    const emp3 = users[5];
    const emp4 = users[6];

    // 2. Create Employees details
    const employeesData = [
      {
        user: manager1._id,
        employeeId: 'EMP-1001',
        department: 'Engineering',
        designation: 'Tech Lead',
        joiningDate: new Date('2023-01-15'),
        contactNumber: '555-0101',
        address: '123 Tech Lane, Silicon Valley',
        managerId: null
      },
      {
        user: manager2._id,
        employeeId: 'EMP-1002',
        department: 'Product',
        designation: 'Product Manager',
        joiningDate: new Date('2023-06-10'),
        contactNumber: '555-0102',
        address: '456 Vision Road, New York',
        managerId: null
      },
      {
        user: emp1._id,
        employeeId: 'EMP-2001',
        department: 'Engineering',
        designation: 'Senior Developer',
        joiningDate: new Date('2024-02-01'),
        contactNumber: '555-0201',
        address: '789 Node Way, Boston',
        managerId: manager1._id
      },
      {
        user: emp2._id,
        employeeId: 'EMP-2002',
        department: 'Engineering',
        designation: 'Frontend Developer',
        joiningDate: new Date('2024-05-15'),
        contactNumber: '555-0202',
        address: '321 React Court, Austin',
        managerId: manager1._id
      },
      {
        user: emp3._id,
        employeeId: 'EMP-2003',
        department: 'Product',
        designation: 'UI/UX Designer',
        joiningDate: new Date('2024-03-10'),
        contactNumber: '555-0203',
        address: '654 Figma St, San Francisco',
        managerId: manager2._id
      },
      {
        user: emp4._id,
        employeeId: 'EMP-2004',
        department: 'Product',
        designation: 'QA Engineer',
        joiningDate: new Date('2024-07-20'),
        contactNumber: '555-0204',
        address: '987 Bug Avenue, Seattle',
        managerId: manager2._id
      }
    ];

    await Employee.insertMany(employeesData);
    console.log('Employee profiles created.');

    // 3. Create Projects
    const projectsData = [
      {
        projectName: 'EPMS Re-design',
        description: 'Overhauling the company intranet dashboard system with a new modern responsive React application.',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-08-30'),
        status: 'In Progress',
        priority: 'High',
        managerId: manager1._id,
        assignedEmployees: [emp1._id, emp2._id]
      },
      {
        projectName: 'Mobile Commerce App',
        description: 'Developing a cross-platform retail app for shopping on iOS and Android devices.',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-12-15'),
        status: 'In Progress',
        priority: 'Critical',
        managerId: manager2._id,
        assignedEmployees: [emp3._id, emp4._id]
      },
      {
        projectName: 'Legacy API Migration',
        description: 'Migrating legacy Ruby backends to clean asynchronous Node.js microservices.',
        startDate: new Date('2026-01-10'),
        endDate: new Date('2026-05-20'),
        status: 'Completed',
        priority: 'Medium',
        managerId: manager1._id,
        assignedEmployees: [emp1._id]
      },
      {
        projectName: 'Internal Audit Tool',
        description: 'Creating security auditing scripts to automatically scan servers and code bases for credentials leaks.',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-10-01'),
        status: 'Not Started',
        priority: 'Low',
        managerId: manager2._id,
        assignedEmployees: [emp4._id]
      }
    ];

    await Project.insertMany(projectsData);
    console.log('Projects created.');

    // 4. Create Reviews (Manager 1 reviews emp1 and emp2, Manager 2 reviews emp3 and emp4)
    const reviewsData = [
      {
        employeeId: emp1._id,
        managerId: manager1._id,
        ratings: { technical: 5, communication: 4, teamwork: 4, problemSolving: 5, leadership: 4 },
        comments: 'Excellent senior level contribution. Alice consistently resolves hard architectural issues and designs code to be extremely reusable.',
        recommendations: 'Promote to Lead Developer next cycle. Needs to mentor junior resources more.',
        reviewDate: new Date('2026-05-25')
      },
      {
        employeeId: emp1._id,
        managerId: manager1._id,
        ratings: { technical: 4, communication: 5, teamwork: 5, problemSolving: 4, leadership: 3 },
        comments: 'Alice continues to show outstanding teamwork. Her communication is clean, clear, and proactive.',
        recommendations: 'Encourage technical speaking or writing.',
        reviewDate: new Date('2026-03-15')
      },
      {
        employeeId: emp2._id,
        managerId: manager1._id,
        ratings: { technical: 4, communication: 3, teamwork: 4, problemSolving: 3, leadership: 2 },
        comments: 'Bob produces wonderful styling and frontend designs. He should work on structuring codebases better and speed up deliveries.',
        recommendations: 'Take advanced courses on React architectures and state management.',
        reviewDate: new Date('2026-05-28')
      },
      {
        employeeId: emp3._id,
        managerId: manager2._id,
        ratings: { technical: 5, communication: 4, teamwork: 4, problemSolving: 4, leadership: 3 },
        comments: 'Charlie is an exceptional UI/UX designer. The user interfaces he creates feel very high-end and premium.',
        recommendations: 'Consider leading client-facing user feedback calls.',
        reviewDate: new Date('2026-05-20')
      },
      {
        employeeId: emp4._id,
        managerId: manager2._id,
        ratings: { technical: 3, communication: 4, teamwork: 3, problemSolving: 4, leadership: 4 },
        comments: 'Diana is doing a robust job establishing testing guidelines. We need to work on automating more integrations testing.',
        recommendations: 'Introduce Cypress/Playwright frameworks into the workflow.',
        reviewDate: new Date('2026-05-18')
      }
    ];

    // Note overallScore is calculated automatically pre-validation
    await Review.insertMany(reviewsData);
    console.log('Reviews created.');

    // 5. Create Attendance logs (for the last 15 working days)
    const attendanceRecords = [];
    const teamMembers = [manager1._id, manager2._id, emp1._id, emp2._id, emp3._id, emp4._id];

    // Past 15 calendar days
    for (let i = 0; i < 15; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);

      // Skip weekends (0 = Sunday, 6 = Saturday)
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = getLocalDateString(targetDate);

      teamMembers.forEach(memberId => {
        // Randomly check if present, late, or absent
        const rand = Math.random();
        
        let checkInTime = new Date(targetDate);
        let checkOutTime = new Date(targetDate);
        let status = 'Present';

        if (rand < 0.05) {
          // Absent - don't add record or add with absent status
          status = 'Absent';
          // For Absent, let's create a record with no checkIn/checkOut or skip it.
          // Let's create an absent record (we'll save it without checkIn times or mock them)
          // Mongoose requires checkIn to be required, so we skip checkins for absent or checkin at 00:00
          // Let's just skip generating check-in to represent absent, or we can write it
          return;
        } else if (rand < 0.20) {
          // Late - checkin after 9:30 AM
          status = 'Late';
          const hour = 9;
          const minute = 31 + Math.floor(Math.random() * 25); // 9:31 - 9:55
          checkInTime.setHours(hour, minute, 0, 0);
          checkOutTime.setHours(18, 0 + Math.floor(Math.random() * 30), 0, 0);
        } else {
          // Present - checkin before 9:30 AM
          status = 'Present';
          const hour = 8 + Math.floor(Math.random() * 1); // 8:00 - 8:59
          const minute = Math.floor(Math.random() * 59);
          checkInTime.setHours(hour, minute, 0, 0);
          checkOutTime.setHours(17, 0 + Math.floor(Math.random() * 59), 0, 0);
        }

        // Don't set checkout for today if today and not yet checkout hour
        const isToday = dateStr === getLocalDateString(new Date());
        const record = {
          employeeId: memberId,
          date: dateStr,
          checkIn: checkInTime,
          status
        };

        if (!isToday || new Date().getHours() >= 17) {
          record.checkOut = checkOutTime;
        }

        attendanceRecords.push(record);
      });
    }

    await Attendance.insertMany(attendanceRecords);
    console.log('Attendance logs seeded.');

    console.log('Database Seeding Successful!');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
