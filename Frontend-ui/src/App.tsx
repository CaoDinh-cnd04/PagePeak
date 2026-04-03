import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/public/Home";
import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { AuthCallbackPage } from "@/pages/auth/AuthCallback";
import { AuthExternalRegisterPage } from "@/pages/auth/AuthExternalRegister";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmail";
import { DashboardLayout } from "@/pages/dashboard/DashboardLayout";
import { DashboardPage } from "@/pages/dashboard/Dashboard";
import DashboardPages from "@/pages/dashboard/DashboardPages";
import { DashboardSettingsPage } from "@/pages/dashboard/DashboardSettings";
import { DashboardTemplatesPage } from "@/pages/dashboard/DashboardTemplates";
import { DashboardEditorPage } from "@/pages/dashboard/DashboardEditor";
import { DashboardOrdersPage } from "@/pages/dashboard/DashboardOrders";
import DashboardMedia from "@/pages/dashboard/DashboardMedia";
import { DashboardProductsPage } from "@/pages/dashboard/DashboardProducts";
import { DashboardCustomersPage } from "@/pages/dashboard/DashboardCustomers";
import { DashboardFormsPage } from "@/pages/dashboard/DashboardForms";
import { DashboardTagsPage } from "@/pages/dashboard/DashboardTags";
import { DashboardDomainsPage } from "@/pages/dashboard/DashboardDomains";
import { DashboardDataLeadsPage } from "@/pages/dashboard/DashboardDataLeads";
import { DashboardReportsPage } from "@/pages/dashboard/DashboardReports";
import { DashboardIntegrationsPage } from "@/pages/dashboard/DashboardIntegrations";
import { DashboardPricingPage } from "@/pages/dashboard/DashboardPricingPage";

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
          <Route path="plans" element={<DashboardPricingPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
