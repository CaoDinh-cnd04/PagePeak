"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchMe } = useAuthStore();
  const [message, setMessage] = useState("Đang xử lý...");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const expiresAt = searchParams.get("expiresAt");
    const error = searchParams.get("error");

    if (error) {
      setMessage(error === "no_email" ? "Không lấy được email." : "Đăng nhập thất bại.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    if (!accessToken || !refreshToken) {
      setMessage("Thiếu thông tin đăng nhập.");
      setTimeout(() => router.replace("/login"), 2000);
      return;
    }

    saveTokens(accessToken, refreshToken, expiresAt ?? new Date().toISOString());
    fetchMe()
      .then(() => {
        setMessage("Đăng nhập thành công!");
        router.replace("/dashboard");
      })
      .catch(() => {
        setMessage("Lỗi xác thực.");
        setTimeout(() => router.replace("/login"), 2000);
      });
  }, [searchParams, router, fetchMe]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-700 dark:text-slate-200">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-200">Đang xử lý...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
