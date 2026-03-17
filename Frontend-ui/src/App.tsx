import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/Home";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { DashboardLayout } from "@/pages/DashboardLayout";
import { DashboardPage } from "@/pages/Dashboard";
import DashboardPages from "@/pages/DashboardPages";
import { DashboardSettingsPage } from "@/pages/DashboardSettings";
import { DashboardTemplatesPage } from "@/pages/DashboardTemplates";
import { DashboardEditorPage } from "@/pages/DashboardEditor";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pages" element={<DashboardPages />} />
          <Route path="settings" element={<DashboardSettingsPage />} />
          <Route path="templates" element={<DashboardTemplatesPage />} />
          <Route path="editor/:id" element={<DashboardEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
