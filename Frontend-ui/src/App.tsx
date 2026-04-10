import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/public";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { AuthCallbackPage } from "@/pages/auth/AuthCallback";
import { AuthExternalRegisterPage } from "@/pages/auth/AuthExternalRegister";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmail";
import {
  DashboardLayout,
  DashboardPage,
  DashboardPages,
  DashboardMedia,
  DashboardSettingsPage,
  DashboardTemplatesPage,
  DashboardEditorPage,
  DashboardOrdersPage,
  DashboardProductsPage,
  DashboardCustomersPage,
  DashboardFormsPage,
  DashboardTagsPage,
  DashboardDomainsPage,
  DashboardDataLeadsPage,
  DashboardReportsPage,
  DashboardIntegrationsPage,
  DashboardPricingPage,
  DashboardFormGuidePage,
} from "@/pages/dashboard";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/external-register" element={<AuthExternalRegisterPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pages" element={<DashboardPages />} />
          <Route path="settings" element={<DashboardSettingsPage />} />
          <Route path="templates" element={<DashboardTemplatesPage />} />
          <Route path="editor/:id" element={<DashboardEditorPage />} />
          <Route path="media" element={<DashboardMedia />} />
          <Route path="orders" element={<DashboardOrdersPage />} />
          <Route path="products" element={<DashboardProductsPage />} />
          <Route path="customers" element={<DashboardCustomersPage />} />
          <Route path="reports" element={<DashboardReportsPage />} />
          <Route path="forms" element={<DashboardFormsPage />} />
          <Route path="forms/guide" element={<DashboardFormGuidePage />} />
          <Route path="tags" element={<DashboardTagsPage />} />
          <Route path="domains" element={<DashboardDomainsPage />} />
          <Route path="data-leads" element={<DashboardDataLeadsPage />} />
          <Route path="integrations" element={<DashboardIntegrationsPage />} />
          <Route path="plans" element={<DashboardPricingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
