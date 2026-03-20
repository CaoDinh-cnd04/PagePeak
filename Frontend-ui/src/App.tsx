import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/Home";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { AuthCallbackPage } from "@/pages/AuthCallback";
import { AuthExternalRegisterPage } from "@/pages/AuthExternalRegister";
import { VerifyEmailPage } from "@/pages/VerifyEmail";
import { DashboardLayout } from "@/pages/DashboardLayout";
import { DashboardPage } from "@/pages/Dashboard";
import DashboardPages from "@/pages/DashboardPages";
import { DashboardSettingsPage } from "@/pages/DashboardSettings";
import { DashboardTemplatesPage } from "@/pages/DashboardTemplates";
import { DashboardEditorPage } from "@/pages/DashboardEditor";
import { DashboardOrdersPage } from "@/pages/DashboardOrders";
import DashboardMedia from "@/pages/DashboardMedia";
import { DashboardProductsPage } from "@/pages/DashboardProducts";
import { DashboardCustomersPage } from "@/pages/DashboardCustomers";
import { DashboardFormsPage } from "@/pages/DashboardForms";
import { DashboardTagsPage } from "@/pages/DashboardTags";
import { DashboardDomainsPage } from "@/pages/DashboardDomains";
import { DashboardDataLeadsPage } from "@/pages/DashboardDataLeads";
import { DashboardReportsPage } from "@/pages/DashboardReports";
import { DashboardIntegrationsPage } from "@/pages/DashboardIntegrations";

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
          <Route path="tags" element={<DashboardTagsPage />} />
          <Route path="domains" element={<DashboardDomainsPage />} />
          <Route path="data-leads" element={<DashboardDataLeadsPage />} />
          <Route path="integrations" element={<DashboardIntegrationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
