import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';

// Admin Pages
import EmployeeManagement from './pages/admin/EmployeeManagement';
import AttendanceMonitor from './pages/admin/AttendanceMonitor';
import ProjectManagement from './pages/admin/ProjectManagement';

// Manager Pages
import SubmitReview from './pages/manager/SubmitReview';

// Employee Pages
import TrackAttendance from './pages/employee/TrackAttendance';
import PersonalReviews from './pages/employee/PersonalReviews';

// Shared Pages
import Reports from './pages/Reports';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Private Protected Dashboard Layout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Default landing page */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Admin specific routes */}
              <Route 
                path="employees" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <EmployeeManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="attendance" 
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AttendanceMonitor />
                  </ProtectedRoute>
                } 
              />

              {/* Manager specific routes */}
              <Route 
                path="team-attendance" 
                element={
                  <ProtectedRoute allowedRoles={['Manager', 'Admin']}>
                    <AttendanceMonitor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="reviews" 
                element={
                  <ProtectedRoute allowedRoles={['Manager', 'Admin']}>
                    <SubmitReview />
                  </ProtectedRoute>
                } 
              />

              {/* Employee specific routes */}
              <Route 
                path="track-attendance" 
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <TrackAttendance />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="my-reviews" 
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <PersonalReviews />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="my-projects" 
                element={
                  <ProtectedRoute allowedRoles={['Employee']}>
                    <ProjectManagement />
                  </ProtectedRoute>
                } 
              />

              {/* Shared CRUD routes */}
              <Route 
                path="projects" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                    <ProjectManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="reports" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Catch all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
