import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout/AppLayout';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { AdminProtectedRoute } from './components/guards/AdminProtectedRoute';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SetPasswordPage } from './pages/auth/SetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { ApprovalsPage } from './pages/approvals/ApprovalsPage';
import { LogsPage } from './pages/logs/LogsPage';
import { LibraryPage } from './pages/library/LibraryPage';
import { StoragePage } from './pages/storage/StoragePage';
import { DirectoryPage } from './pages/directory/DirectoryPage';
import { TeamPage } from './pages/team/TeamPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminForgotPasswordPage } from './pages/admin/AdminForgotPasswordPage';
import { AdminResetPasswordPage } from './pages/admin/AdminResetPasswordPage';
import { ClientPortalPage } from './pages/portal/ClientPortalPage';

import { ROUTES } from './constants/routes';

export function AppRoutes() {
  return (
    <Routes>
      {/* Tenant Public Auth & Client Portal Routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={`${ROUTES.RESET_PASSWORD}/:token`} element={<ResetPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path={ROUTES.SET_PASSWORD} element={<SetPasswordPage />} />
      <Route path={`${ROUTES.SET_PASSWORD}/:token`} element={<SetPasswordPage />} />
      <Route path="/auth/set-password" element={<SetPasswordPage />} />
      <Route path="/auth/set-password/:token" element={<SetPasswordPage />} />
      <Route path="/portal" element={<ClientPortalPage />} />
      <Route path="/portal/:code" element={<ClientPortalPage />} />

      {/* Super Admin Dedicated Authentication & Console */}
      <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />
      <Route path={ROUTES.ADMIN_FORGOT_PASSWORD} element={<AdminForgotPasswordPage />} />
      <Route path={ROUTES.ADMIN_RESET_PASSWORD} element={<AdminResetPasswordPage mode="reset" />} />
      <Route path={`${ROUTES.ADMIN_RESET_PASSWORD}/:token`} element={<AdminResetPasswordPage mode="reset" />} />
      <Route path={ROUTES.ADMIN_SET_PASSWORD} element={<AdminResetPasswordPage mode="set" />} />
      <Route path={`${ROUTES.ADMIN_SET_PASSWORD}/:token`} element={<AdminResetPasswordPage mode="set" />} />
      <Route path="/admin/auth/reset-password" element={<AdminResetPasswordPage mode="reset" />} />
      <Route path="/admin/auth/reset-password/:token" element={<AdminResetPasswordPage mode="reset" />} />
      <Route
        path={ROUTES.ADMIN}
        element={
          <AdminProtectedRoute>
            <SuperAdminPage />
          </AdminProtectedRoute>
        }
      />

      {/* Authenticated Workspace App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
        <Route path={ROUTES.TASKS} element={<TasksPage />} />
        <Route path={ROUTES.APPROVALS} element={<ApprovalsPage />} />
        <Route path={ROUTES.LOGS} element={<LogsPage />} />
        <Route path={ROUTES.LIBRARY} element={<LibraryPage />} />
        <Route path={ROUTES.STORAGE} element={<StoragePage />} />
        <Route path={ROUTES.DIRECTORY} element={<DirectoryPage />} />
        <Route path={ROUTES.TEAM} element={<TeamPage />} />
        <Route path={ROUTES.BILLING} element={<BillingPage />} />
        <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

export default AppRoutes;
