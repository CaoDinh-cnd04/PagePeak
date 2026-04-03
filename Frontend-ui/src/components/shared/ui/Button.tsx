import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "group relative overflow-hidden inline-flex items-center justify-center font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-500",
    secondary:
      "bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    outline:
      "border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 dark:text-primary-300 dark:border-primary-400 dark:hover:bg-slate-800",
    ghost:
      "text-slate-700 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-200 dark:hover:bg-slate-800",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-500",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled ?? loading}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-white/20 transition-transform duration-500 ease-out group-hover:translate-x-[0%]" />
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="relative z-10">{children}</span>
      )}
    </button>
  );
}
