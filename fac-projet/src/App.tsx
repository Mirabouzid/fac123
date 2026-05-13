import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { LoginPage } from "@/components/auth/login-page";
import { CandidateDashboard } from "@/components/candidate/candidate-dashboard";
import { CVUploadForm } from "@/components/candidate/cv-upload-form";
import { JobOffers } from "@/components/candidate/job-offers";
import { EmployerDashboard } from "@/components/employer/employer-dashboard";
import { PostJobForm } from "@/components/employer/post-job-form";
import { JobDetailPage } from "@/components/employer/job-detail";
import { RecruitmentPipeline } from "@/components/employer/recruitment-pipeline";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AuditLog } from "@/components/admin/audit-log";
import { AdminSettings } from "@/components/admin/admin-settings";
import { useAuth } from "@/contexts/AuthContext";

export default function App() {
  const { user, isLoggedIn, logout } = useAuth();

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const role = user?.role;

  return (
    <div className="min-h-screen bg-background">
      <Navbar role={role} onLogout={logout} />

      {/* Main content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Candidate routes */}
          {role === "candidate" && (
            <Routes>
              <Route path="/candidate" element={<CandidateDashboard />} />
              <Route path="/candidate/cv" element={<CVUploadForm />} />
              <Route path="/candidate/jobs" element={<JobOffers />} />
              <Route
                path="/candidate/applications"
                element={<CandidateDashboard />}
              />
              <Route path="*" element={<Navigate to="/candidate" replace />} />
            </Routes>
          )}

          {/* Employer routes */}
          {role === "employer" && (
            <Routes>
              <Route path="/employer" element={<EmployerDashboard />} />
              <Route path="/employer/post-job" element={<PostJobForm />} />
              <Route path="/employer/job/:id" element={<JobDetailPage />} />
              <Route
                path="/employer/pipeline"
                element={<RecruitmentPipeline />}
              />
              <Route
                path="/employer/candidates"
                element={<RecruitmentPipeline />}
              />
              <Route path="/employer/history" element={<EmployerDashboard />} />
              <Route path="*" element={<Navigate to="/employer" replace />} />
            </Routes>
          )}

          {/* Admin routes */}
          {role === "admin" && (
            <Routes>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/offers" element={<AdminDashboard />} />
              <Route path="/admin/candidates" element={<AdminDashboard />} />
              <Route path="/admin/audit" element={<AuditLog />} />
              <Route path="/admin/payments" element={<AdminDashboard />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
}
