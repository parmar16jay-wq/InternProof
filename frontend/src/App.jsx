import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppChrome from "./AppChrome";

// =========================
// GENERAL
// =========================
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// =========================
// STUDENT
// =========================
import StudentDashboard from "./pages/StudentDashboard";
import ProfilePage from "./pages/ProfilePage";
import AvailableInternships from "./pages/AvailableInternships";
import MyApplications from "./pages/MyApplications";
import MyInternship from "./pages/MyInternship";
import MyTasks from "./pages/MyTasks";
import MyProgress from "./pages/MyProgress";
import Certificate from "./pages/Certificate";
import Messages from "./pages/Messages";

// =========================
// COMPANY
// =========================
import CompanyDashboard from "./pages/CompanyDashboard";
import CreateInternship from "./pages/CreateInternship";
import CompanyInternships from "./pages/CompanyInternships";
import CompanyApplications from "./pages/CompanyApplications";
import CompanyStudents from "./pages/CompanyStudents";
import CompanyMessages from "./pages/CompanyMessages";
import CompanyCertificates from "./pages/CompanyCertificates";
import CompanyTasks from "./pages/CompanyTasks";

// =========================
// COLLEGE
// =========================
import CollegeDashboard from "./pages/CollegeDashboard";
import CollegeStudents from "./pages/CollegeStudents";
import CollegeInternships from "./pages/CollegeInternships";
import CollegeApplications from "./pages/CollegeApplications";
import CollegeProgress from "./pages/CollegeProgress";
import CollegeCertificates from "./pages/CollegeCertificates";
import CollegeReports from "./pages/CollegeReports";

// =========================
// ADMIN
// =========================
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminInternships from "./pages/AdminInternships";
import AdminCompanies from "./pages/AdminCompanies";
import AdminColleges from "./pages/AdminColleges";
import AdminReports from "./pages/AdminReports";
import AdminVerification from "./pages/AdminVerification";
import AdminCertificates from "./pages/AdminCertificates";


function App() {
  return (
    <BrowserRouter>
      <AppChrome><Routes>

        {/* =====================================================
            GENERAL ROUTES
        ===================================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />


        {/* =====================================================
            STUDENT ROUTES
        ===================================================== */}

        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/internships"
          element={<AvailableInternships />}
        />

        <Route
          path="/student/applications"
          element={<MyApplications />}
        />

        <Route
          path="/student/internship"
          element={<MyInternship />}
        />

        <Route
          path="/student/tasks"
          element={<MyTasks />}
        />

        <Route
          path="/student/progress"
          element={<MyProgress />}
        />

        <Route
          path="/student/certificate"
          element={<Certificate />}
        />

        <Route
          path="/student/messages"
          element={<Messages />}
        />

        <Route path="/student/profile" element={<ProfilePage role="student" />} />


        {/* =====================================================
            COMPANY ROUTES
        ===================================================== */}

        <Route
          path="/company/dashboard"
          element={<CompanyDashboard />}
        />

        <Route
          path="/company/internships/create"
          element={<CreateInternship />}
        />

        <Route
          path="/company/internships"
          element={<CompanyInternships />}
        />

        <Route
          path="/company/applications"
          element={<CompanyApplications />}
        />

        <Route
          path="/company/students"
          element={<CompanyStudents />}
        />

        <Route
          path="/company/messages"
          element={<CompanyMessages />}
        />

        <Route
          path="/company/certificates"
          element={<CompanyCertificates />}
        />

        <Route
          path="/company/tasks"
          element={<CompanyTasks />}
        />

        <Route path="/company/profile" element={<ProfilePage role="company" />} />


        {/* =====================================================
            COLLEGE ROUTES
        ===================================================== */}

        <Route
          path="/college/dashboard"
          element={<CollegeDashboard />}
        />

        <Route
          path="/college/students"
          element={<CollegeStudents />}
        />

        <Route
          path="/college/internships"
          element={<CollegeInternships />}
        />

        <Route
          path="/college/applications"
          element={<CollegeApplications />}
        />

        <Route
          path="/college/progress"
          element={<CollegeProgress />}
        />

        <Route
          path="/college/certificates"
          element={<CollegeCertificates />}
        />

        <Route
          path="/college/reports"
          element={<CollegeReports />}
        />

        <Route path="/college/profile" element={<ProfilePage role="college" />} />


        {/* =====================================================
            ADMIN ROUTES
        ===================================================== */}

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        <Route
          path="/admin/internships"
          element={<AdminInternships />}
        />

        <Route
          path="/admin/companies"
          element={<AdminCompanies />}
        />

        <Route
          path="/admin/colleges"
          element={<AdminColleges />}
        />

        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />

        <Route
          path="/admin/verification"
          element={<AdminVerification />}
        />

        <Route
          path="/admin/certificates"
          element={<AdminCertificates />}
        />

      </Routes></AppChrome>
    </BrowserRouter>
  );
}

export default App;
