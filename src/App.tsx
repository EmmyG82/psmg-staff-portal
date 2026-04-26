import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import RosterPage from "@/pages/RosterPage";
import MessagesPage from "@/pages/MessagesPage";
import UnavailabilityPage from "@/pages/UnavailabilityPage";
import ProfilePage from "@/pages/ProfilePage";
import StaffManagementPage from "@/pages/StaffManagementPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/NotFound";

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes — wrapped in AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/unavailability" element={<UnavailabilityPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/staff" element={<StaffManagementPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
