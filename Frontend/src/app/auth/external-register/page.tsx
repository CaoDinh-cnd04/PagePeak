"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveTokens } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const COUNTRY_CODES = [
  { code: "+84", label: "VN", flag: "🇻🇳" },
  { code: "+66", label: "TH", flag: "🇹🇭" },
  { code: "+65", label: "SG", flag: "🇸🇬" },
  { code: "+1", label: "US", flag: "🇺🇸" },
  { code: "+86", label: "CN", flag: "🇨🇳" },
  { code: "+81", label: "JP", flag: "🇯🇵" },
  { code: "+82", label: "KR", flag: "🇰🇷" },
];

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    const bytes = base64UrlToBytes(payload);
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json) as any;
  } catch {
    return null;
  }
}

export default function ExternalRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ExternalRegisterInner />
    </Suspense>
  );
}

function ExternalRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchMe } = useAuthStore();

  const token = searchParams.get("token") ?? "";
  const payload = useMemo(() => (token ? parseJwtPayload(token) : null), [token]);

  const [countryCode, setCountryCode] = useState("+84");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token && !payload?.email) setError("Thiếu thông tin đăng ký (email). Token có thể hết hạn — vui lòng đăng nhập Google/Facebook lại.");
    if (payload?.name && !workspaceName) setWorkspaceName(`${payload.name}`.slice(0, 40));
  }, [token, payload, workspaceName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!termsAccepted) {
      setError("Bạn cần đồng ý Điều khoản sử dụng & Chính sách bảo mật.");
      return;
    }
    if (!token) {
      setError("Thiếu token đăng ký.");
      return;
    }
    if (!payload?.email) {
      setError("Không đọc được email từ token. Vui lòng quay lại trang đăng nhập và thử đăng nhập Google/Facebook lại.");
      return;
    }
    setSubmitting(true);
    try {
      const phone = phoneNumber.trim()
        ? `${countryCode.replace(/\s/g, "")}${phoneNumber.trim()}`
        : null;
      const res = await fetch(`${API_URL}/api/auth/external-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          phone,
          workspaceName: workspaceName.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string; expiresAt: string };
      saveTokens(data.accessToken, data.refreshToken, data.expiresAt);
      await fetchMe();
      router.replace("/dashboard/pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-[460px] bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Image src="/logo.jpg" alt="PagePeak" width={120} height={36} className="h-9 w-auto object-contain" style={{ width: "auto", height: "2.25rem" }} />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-slate-900">Page</span>
            <span className="text-primary-600">Peak</span>
          </span>
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">Hoàn tất đăng ký</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-2">
          Chúng mình đã lấy thông tin từ {payload?.provider ?? "Google/Facebook"}. Bạn vui lòng bổ sung thêm vài thông tin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <Input label="Email" value={payload?.email ?? ""} disabled />
          <Input label="Tên" value={payload?.name ?? ""} disabled />
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Số điện thoại</label>
            <div className="flex border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm min-w-[100px] focus:outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="912345678"
                className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <Input
            label="Tên workspace"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Ví dụ: Công ty của tôi"
            required
          />

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Tôi đã xem và đồng ý{" "}
              <Link href="/#dieu-khoan" className="text-primary-600 hover:underline">Điều khoản sử dụng</Link>
              {" & "}
              <Link href="/#bao-mat" className="text-primary-600 hover:underline">Chính sách bảo mật</Link>.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
              {error}
              {error.includes("token") || error.includes("Facebook") ? (
                <Link href="/login" className="block mt-2 text-primary-600 font-medium hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              ) : null}
            </p>
          )}

          <Button type="submit" className="w-full" loading={submitting} disabled={!payload?.email}>
            Tạo tài khoản
          </Button>
        </form>
      </div>
    </div>
  );
}

