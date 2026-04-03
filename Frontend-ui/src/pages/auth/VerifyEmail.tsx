import { Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authApi } from "@/lib/shared/api";
import { CheckCircle2, XCircle, Mail, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";

function VerifyEmailInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const isPending = searchParams.get("pending") === "1";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">(
    token ? "loading" : isPending ? "pending" : "error"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const verify = useCallback(async () => {
    if (!token) return;
    try {
      await authApi.verifyEmail(token);
      setStatus("success");
      setMessage("Email của bạn đã được xác thực thành công!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Token không hợp lệ hoặc đã hết hạn.");
    }
  }, [token]);

  useEffect(() => {
    if (token) verify();
  }, [token, verify]);

  const handleResend = async () => {
    if (!emailParam || resending) return;
    setResending(true);
    try {
      await authApi.resendVerification(emailParam);
      setResendDone(true);
    } catch {
      setMessage("Gửi lại email thất bại. Vui lòng thử lại.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/30 to-slate-50 dark:from-slate-950 dark:via-primary-950/20 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-lg">P</span>
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">PagePeak</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Status: Loading (verifying token) */}
          {status === "loading" && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Đang xác thực...</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Vui lòng chờ trong giây lát</p>
            </div>
          )}

          {/* Status: Success */}
          {status === "success" && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Xác thực thành công! 🎉</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{message}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Bạn có thể đăng nhập và bắt đầu sử dụng PagePeak ngay bây giờ.
              </p>
              <Button
                onClick={() => navigate("/login")}
                className="mt-6 inline-flex items-center gap-2"
              >
                Đăng nhập ngay <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Status: Error (invalid/expired token) */}
          {status === "error" && !isPending && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Xác thực thất bại</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {message || "Link xác thực không hợp lệ hoặc đã hết hạn (24 giờ)."}
              </p>
              {emailParam && (
                <div className="mt-6">
                  {resendDone ? (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✅ Đã gửi lại email xác thực! Kiểm tra hộp thư.
                    </p>
                  ) : (
                    <Button
                      onClick={handleResend}
                      disabled={resending}
                      loading={resending}
                      className="inline-flex items-center gap-2"
                    >
                      {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Gửi lại email xác thực
                    </Button>
                  )}
                </div>
              )}
              <div className="mt-4">
                <Link to="/login" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </div>
          )}

          {/* Status: Pending (just registered, check email) */}
          {status === "pending" && (
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kiểm tra email của bạn</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed max-w-sm mx-auto">
                Chúng tôi đã gửi một email xác thực đến
                {emailParam && (
                  <span className="block mt-1 font-semibold text-slate-700 dark:text-slate-200">{emailParam}</span>
                )}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                Nhấn vào link trong email để hoàn tất đăng ký tài khoản.
              </p>

              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  💡 <strong>Không thấy email?</strong> Kiểm tra thư mục <strong>Spam</strong> hoặc <strong>Promotions</strong>.
                  Link có hiệu lực trong <strong>24 giờ</strong>.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {emailParam && (
                  resendDone ? (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✅ Đã gửi lại email xác thực!
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleResend}
                      disabled={resending}
                      loading={resending}
                      className="inline-flex items-center gap-2"
                    >
                      {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Gửi lại email xác thực
                    </Button>
                  )
                )}
                <div>
                  <Link to="/login" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    ← Quay lại đăng nhập
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} PagePeak. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
