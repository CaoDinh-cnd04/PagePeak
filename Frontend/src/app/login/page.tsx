"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoginFeatureCarousel } from "@/components/auth/LoginFeatureCarousel";
import { defaultLoginFeatureSlides } from "@/data/loginFeatureSlides";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

const COUNTRY_CODES = [
  { code: "+84", label: "VN", flag: "🇻🇳" },
  { code: "+1", label: "US", flag: "🇺🇸" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+81", label: "JP", flag: "🇯🇵" },
  { code: "+82", label: "KR", flag: "🇰🇷" },
  { code: "+86", label: "CN", flag: "🇨🇳" },
  { code: "+65", label: "SG", flag: "🇸🇬" },
  { code: "+66", label: "TH", flag: "🇹🇭" },
];

declare global {
  interface Window {
    grecaptcha?: {
      getResponse: () => string;
      reset: () => void;
    };
  }
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const errorParam = searchParams.get("error");
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const { login, register, fetchMe, isLoading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+84");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsLogin(mode !== "register");
  }, [mode]);

  useEffect(() => {
    if (errorParam === "external_signin_failed") setError("Đăng nhập Google/Facebook thất bại.");
    else if (errorParam === "no_email") setError("Không lấy được email từ tài khoản.");
    else if (errorParam === "account_disabled") setError("Tài khoản đã bị khóa.");
  }, [errorParam]);

  const getRecaptchaToken = (): string | undefined => {
    if (typeof window === "undefined" || !window.grecaptcha) return undefined;
    const token = window.grecaptcha.getResponse();
    return token || undefined;
  };

  const resetRecaptcha = () => {
    if (typeof window !== "undefined" && window.grecaptcha) window.grecaptcha.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!termsAccepted) {
          setError("Bạn cần đồng ý Điều khoản sử dụng & Chính sách bảo mật.");
          return;
        }
        if (RECAPTCHA_SITE_KEY) {
          const token = getRecaptchaToken();
          if (!token) {
            setError("Vui lòng xác thực reCAPTCHA (Tôi không phải là người máy).");
            return;
          }
        }
        const phone = phoneNumber.trim() ? `${countryCode.replace(/\s/g, "")}${phoneNumber.trim()}` : undefined;
        await register(email, password, fullName, phone, RECAPTCHA_SITE_KEY ? getRecaptchaToken() : undefined);
        resetRecaptcha();
      }
      router.push("/dashboard/pages");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "EMAIL_VERIFICATION_REQUIRED" || msg === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&pending=1`);
        return;
      }
      setError(msg || (isLogin ? "Đăng nhập thất bại." : "Đăng ký thất bại."));
      if (!isLogin) resetRecaptcha();
    }
  };

  const googleUrl = `${API_URL}/api/auth/google`;
  const facebookUrl = `${API_URL}/api/auth/facebook`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {RECAPTCHA_SITE_KEY && (
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="lazyOnload"
        />
      )}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch">
        {/* Panel trái: giới thiệu tính năng (có thể thay nội dung từ admin sau) */}
        <div className="hidden lg:flex lg:w-[50%] lg:min-w-0 lg:flex-col lg:justify-center lg:px-12 xl:px-16 lg:py-12 bg-gradient-to-br from-primary-50 to-slate-100 border-r border-slate-200 dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
          <div className="lg:max-w-md xl:max-w-lg w-full">
            <p className="text-[46px] font-bold text-primary-600 uppercase tracking-wider mb-4 text-center leading-tight">Tính năng mới</p>
            <LoginFeatureCarousel slides={defaultLoginFeatureSlides} />
          </div>
        </div>
        {/* Mobile: carousel thu gọn phía trên form */}
        <div className="lg:hidden py-6 px-4 bg-gradient-to-b from-primary-50/80 to-transparent dark:from-slate-900/80">
          <p className="text-center text-2xl font-bold text-primary-600 uppercase tracking-wider mb-3">Tính năng PagePeak</p>
          <div className="max-w-sm mx-auto h-[200px] overflow-hidden rounded-lg">
            <LoginFeatureCarousel slides={defaultLoginFeatureSlides} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-6 lg:py-8">
        <div className="w-full max-w-[420px] bg-white rounded-xl shadow-lg border border-slate-200 p-8 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex justify-end mb-2">
            <ThemeToggle />
          </div>
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <Image src="/logo.jpg" alt="PagePeak" width={120} height={36} className="h-9 w-auto object-contain" style={{ width: "auto", height: "2.25rem" }} />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-slate-900 dark:text-slate-100">Page</span>
              <span className="text-primary-600">Peak</span>
            </span>
          </Link>

          <div className="mb-6">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 relative overflow-hidden">
              <div
                className={`absolute top-1 bottom-1 w-1/2 rounded-lg bg-primary-600 transition-transform duration-300 ease-out ${
                  isLogin ? "translate-x-0" : "translate-x-full"
                }`}
              />
              <Link
                href="/login"
                className={`relative z-10 text-center text-sm font-semibold py-2 rounded-lg transition ${
                  isLogin ? "text-white" : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Đăng nhập
              </Link>
              <Link
                href="/login?mode=register"
                className={`relative z-10 text-center text-sm font-semibold py-2 rounded-lg transition ${
                  !isLogin ? "text-white" : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Đăng ký
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mt-5">
            {isLogin ? "Đăng nhập" : "Đăng ký tài khoản miễn phí"}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Tên tài khoản"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tên bạn hoặc tên shop, tên công ty"
                required
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLogin ? "you@example.com" : "Nhập email"}
              required
            />
            {!isLogin && (
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border-r border-slate-300 text-slate-700 text-sm min-w-[90px] focus:outline-none"
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
                    placeholder="091 234 56 78"
                    className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            )}
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu {!isLogin && "(ít nhất 8 ký tự)"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "" : "Nhập mật khẩu"}
                  minLength={isLogin ? undefined : 8}
                  required
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {!isLogin && RECAPTCHA_SITE_KEY && (
              <div className="w-full">
                <div ref={recaptchaRef} className="g-recaptcha" data-sitekey={RECAPTCHA_SITE_KEY} />
                <p className="mt-1 text-xs text-slate-500">
                  Bảo mật bởi reCAPTCHA —{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Bảo mật</a>
                  {" · "}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Điều khoản</a>
                </p>
              </div>
            )}
            {!isLogin && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600">
                  Tôi đã xem và đồng ý{" "}
                  <Link href="/#dieu-khoan" className="text-primary-600 hover:underline">Điều khoản sử dụng</Link>
                  {" & "}
                  <Link href="/#bao-mat" className="text-primary-600 hover:underline">Chính sách bảo mật</Link>
                  {" "}của PagePeak.
                </span>
              </label>
            )}
            {isLogin && (
              <div className="text-right">
                <Link href="/#lien-he" className="text-sm text-primary-600 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}
            <Button type="submit" className="w-full" loading={isLoading}>
              {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm text-slate-500 mb-3">
              {isLogin ? "Hoặc đăng nhập bằng" : "Hoặc đăng ký bằng"}
            </p>
            <div className="flex gap-3">
              <a
                href={googleUrl}
                className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition dark:border-slate-700"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-[-110%] bg-primary-50 dark:bg-slate-700/40 transition-transform duration-500 ease-out group-hover:translate-x-[0%]" />
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </a>
              <a
                href={facebookUrl}
                className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition dark:border-slate-700"
              >
                <span className="pointer-events-none absolute inset-0 translate-x-[-110%] bg-primary-50 dark:bg-slate-700/40 transition-transform duration-500 ease-out group-hover:translate-x-[0%]" />
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? (
              <>
                Bạn chưa có tài khoản PagePeak?{" "}
                <Link href="/login?mode=register" className="text-primary-600 font-medium hover:underline">
                  Đăng ký ngay
                </Link>
              </>
            ) : (
              <>
                Bạn đã có tài khoản?{" "}
                <Link href="/login" className="text-primary-600 font-medium hover:underline">
                  Đăng nhập
                </Link>
              </>
            )}
          </p>
        </div>
        </div>
      </div>

      <footer className="py-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/#dieu-khoan" className="hover:text-slate-700 dark:hover:text-slate-200">Điều khoản sử dụng</Link>
          <Link href="/#bao-mat" className="hover:text-slate-700 dark:hover:text-slate-200">Chính sách bảo mật</Link>
          <Link href="/#lien-he" className="hover:text-slate-700 dark:hover:text-slate-200">Trợ giúp</Link>
        </div>
      </footer>
    </div>
  );
}
