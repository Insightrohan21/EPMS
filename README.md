# Employee Performance Management System (EPMS)

EPMS is a professional, modern, full-stack enterprise platform built to streamline staff directory lookup, daily attendance logging (with late tracking), team project assignment, and quarterly performance reviews via a role-based access dashboard (Admin, Manager, Employee).

---

## Technical Stack

- **Frontend**: React.js (Vite), Tailwind CSS (v3.4), React Router, Axios, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js, JWT, BcryptJS
- **Database**: MongoDB + Mongoose ODM

---

## Folder Structure

```
project 56/
├── backend/                  # Node + Express Server
│   ├── config/               # Database Connection
│   ├── middleware/           # Authentication & RBAC Guard
│   ├── models/               # MongoDB Schemas (User, Employee, Project, etc.)
│   ├── routes/               # API Route Handlers
│   ├── scripts/              # Seeding utilities
│   ├── .env                  # Configuration Environment values
│   └── server.js             # Entry Point
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Shared UI Components (Layout, Modals, StatCard)
│   │   ├── context/          # Context Providers (Auth, Theme)
│   │   ├── pages/            # Role-scoped Dashboards and Features
│   │   └── App.jsx           # Routing & Guards Coordinator
│   └── tailwind.config.js    # Utility CSS styling config
└── README.md                 # Deployment & API Documentation
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or a remote MongoDB Atlas URI)

### Installation & Run

1. **Clone & Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
   *Verify that a `.env` file exists with the following variables:*
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/epms
   JWT_SECRET=epms_secret_key_123
   JWT_EXPIRE=30d
   NODE_ENV=development
   ```

2. **Seed Mock Database**:
   Populate users (Admin, Managers, Employees), 15 days of attendance registers, projects, and ratings.
   ```bash
   npm run seed
   ```

3. **Start Backend**:
   ```bash
   npm run dev
   ```
   *Server starts at `http://localhost:5000`*

4. **Setup & Start Frontend**:
   In a separate terminal:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Client application starts at `http://localhost:5173`*

---

## API Documentation

All request bodies are JSON. Protected routes require a header `Authorization: Bearer <JWT_TOKEN>`.

### Authentication
- `POST /api/auth/register` - Register a new user (Auto-creates Employee profile).
- `POST /api/auth/login` - Authenticate credentials, return JWT and user profile.
- `GET /api/auth/me` - Fetch profile details of current logged-in user.
- `POST /api/auth/forgot-password` - Update password directly.

### Employee Management
- `GET /api/employees` (Protected) - List employees (Supports `search`, `department`, `managerId`, `sort`, `page`).
- `GET /api/employees/managers` (Protected) - Fetch all Managers (for dropdown pickers).
- `GET /api/employees/:id` (Protected) - Get single employee details.
- `POST /api/employees` (Protected/Admin) - Create user + employee profile.
- `PUT /api/employees/:id` (Protected/Admin) - Update employee profile and user name/email.
- `DELETE /api/employees/:id` (Protected/Admin) - Delete employee and credentials.

### Project Management
- `GET /api/projects` (Protected) - Retrieve projects (scoped to user role: Employee sees assigned, Manager sees owned, Admin sees all).
- `GET /api/projects/:id` (Protected) - Fetch detailed project settings and timelines.
- `POST /api/projects` (Protected/Admin/Manager) - Create a project and assign manager.
- `PUT /api/projects/:id` (Protected/Admin/Manager) - Edit project properties.
- `PUT /api/projects/:id/assign` (Protected/Admin/Manager) - Re-allocate assigned employee list.
- `DELETE /api/projects/:id` (Protected/Admin) - Remove project.

### Attendance Management
- `GET /api/attendance/status` (Protected) - Fetch today's check-in/out log for current user.
- `POST /api/attendance/checkin` (Protected) - Check in for today (Sets 'Late' status if after 9:30 AM).
- `POST /api/attendance/checkout` (Protected) - Clock out for today.
- `GET /api/attendance/my-history` (Protected) - List check-in calendar logs and presence ratios.
- `GET /api/attendance/team` (Protected/Manager/Admin) - Show daily reports presence sheet for selected date.
- `GET /api/attendance/all` (Protected/Admin) - View global logs for selected date.

### Performance Review System
- `POST /api/reviews` (Protected/Manager/Admin) - Submit star ratings (1-5) on technical, communication, teamwork, problem solving, and leadership skills.
- `GET /api/reviews/my-reviews` (Protected) - Get current user's evaluations history.
- `GET /api/reviews/employee/:userId` (Protected) - Get review details for specific staff member.
- `GET /api/reviews/analytics` (Protected) - Compile rating averages (scoped to role).

### Unified Dashboard Analytics
- `GET /api/reports/dashboard` (Protected) - Consolidated endpoint returning KPI metrics, activity feeds, and charts depending on role.

---

## Test Accounts (Password: `password123`)

- **HR Admin**: `admin@epms.com`
- **Engineering Manager**: `manager1@epms.com`
- **Product Manager**: `manager2@epms.com`
- **Senior Developer**: `employee1@epms.com`
- **Frontend Developer**: `employee2@epms.com`
