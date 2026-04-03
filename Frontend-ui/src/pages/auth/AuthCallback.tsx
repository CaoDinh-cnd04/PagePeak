import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { saveTokens } from "@/lib/shared/auth";
import { useAuthStore } from "@/stores/shared/authStore";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const expiresAt = searchParams.get("expiresAt");

    if (!accessToken || !refreshToken || !expiresAt) {
      navigate("/login?error=callback_missing_tokens", { replace: true });
      return;
    }

    saveTokens(accessToken, refreshToken, expiresAt);
    fetchMe().then(() => {
      navigate("/dashboard", { replace: true });
    });
  }, [searchParams, navigate, fetchMe]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Đang đăng nhập...</p>
      </div>
    </div>
  );
}
