"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import type { User, AuthTokens } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

const GOOGLE_ICON = (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GITHUB_ICON = (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await api.post<{ tokens: AuthTokens; user: User }>(
        "/api/v1/auth/login",
        data
      );
      setUser(res.data.user, res.data.tokens.access_token, res.data.tokens.refresh_token);
      toast.success(`Welcome back, ${res.data.user.display_name.split(" ")[0]}!`);
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Invalid email or password");
    }
  };

  const handleOAuth = (provider: "google" | "github") => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/oauth/${provider}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ letterSpacing: "-0.024em" }}
        >
          Sign in to Helix
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "rgb(var(--color-foreground-muted))" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors"
            style={{ color: "rgb(var(--color-primary))" }}
          >
            Create one free
          </Link>
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgb(var(--color-border))",
            color: "rgb(var(--color-foreground))",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(var(--color-border-strong), 1)";
            e.currentTarget.style.background = "rgb(var(--color-muted))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgb(var(--color-border))";
            e.currentTarget.style.background = "rgb(var(--color-card))";
          }}
        >
          {GOOGLE_ICON}
          <span>Google</span>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("github")}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            background: "rgb(var(--color-card))",
            border: "1px solid rgb(var(--color-border))",
            color: "rgb(var(--color-foreground))",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(var(--color-border-strong), 1)";
            e.currentTarget.style.background = "rgb(var(--color-muted))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgb(var(--color-border))";
            e.currentTarget.style.background = "rgb(var(--color-card))";
          }}
        >
          {GITHUB_ICON}
          <span>GitHub</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 flex items-center"
          aria-hidden="true"
        >
          <div
            className="w-full border-t"
            style={{ borderColor: "rgb(var(--color-border))" }}
          />
        </div>
        <div className="relative flex justify-center">
          <span
            className="px-3 text-xs"
            style={{
              background: "rgb(var(--color-background))",
              color: "rgb(var(--color-foreground-muted))",
            }}
          >
            or continue with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-sm font-medium"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="input"
            {...register("email")}
          />
          <AnimatePresence mode="wait">
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs"
                style={{ color: "rgb(var(--color-danger))" }}
              >
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs transition-colors"
              style={{ color: "rgb(var(--color-foreground-muted))" }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="input pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "rgb(var(--color-foreground-muted))" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <AnimatePresence mode="wait">
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs"
                style={{ color: "rgb(var(--color-danger))" }}
              >
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full mt-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Terms */}
      <p className="mt-6 text-center text-xs leading-relaxed"
        style={{ color: "rgb(var(--color-foreground-muted))" }}>
        By signing in, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>
      </p>
    </motion.div>
  );
}
