import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { saveTokens } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export function AuthExternalRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const [phone, setPhone] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-red-600 dark:text-red-400 mb-4">Liên kết không hợp lệ hoặc đã hết hạn.</p>
          <Link to="/login" className="text-primary-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await fetch(`${API_URL}/api/auth/external-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          phone: phone.trim() || null,
          workspaceName: workspaceName.trim() || null,
        }),
      }).then((r) => r.json());

      if (data.error) throw new Error(data.error);

      saveTokens(data.accessToken, data.refreshToken, data.expiresAt);
      await fetchMe();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <img src="/logo.jpg" alt="PagePeak" className="h-9 w-auto object-contain" />
            <span className="text-lg font-bold">
              <span className="text-slate-900 dark:text-slate-100">Page</span>
              <span className="text-primary-600">Peak</span>
            </span>
          </Link>

          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center mb-2">
            Hoàn tất đăng ký
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-6">
            Bạn đã đăng nhập bằng Google. Điền thêm thông tin (tùy chọn) để hoàn tất.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Số điện thoại"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
            />
            <Input
              label="Tên workspace"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace của tôi"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Đang xử lý..." : "Hoàn tất"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
