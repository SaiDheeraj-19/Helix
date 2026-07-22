"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import type { User, AuthTokens } from "@/types";

const registerSchema = z
  .object({
    display_name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Please enter a valid email address"),
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_-]+$/, "Letters, numbers, hyphens and underscores only"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[a-z]/, "One lowercase letter")
      .regex(/\d/, "One number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "One special character"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const watchedPassword = watch("password", "");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const res = await api.post<{ tokens: AuthTokens; user: User }>(
        "/api/v1/auth/register",
        {
          email: data.email,
          username: data.username,
          display_name: data.display_name,
          password: data.password,
        }
      );
      setUser(res.data.user, res.data.tokens.access_token, res.data.tokens.refresh_token);
      toast.success("Account created! Welcome to Helix 🎉");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create account");
    }
  };

  const inputStyle = {
    background: "rgb(var(--color-background))",
    border: "1px solid rgb(var(--color-border))",
    borderRadius: "8px",
    color: "rgb(var(--color-foreground))",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="mb-7">
        <h1
          className="text-2xl font-bold"
          style={{ letterSpacing: "-0.024em", color: "rgb(var(--color-foreground))" }}
        >
          Create your account
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "rgb(var(--color-foreground-muted))" }}>
          Already have one?{" "}
          <Link
            href="/login"
            className="font-medium"
            style={{ color: "rgb(var(--color-primary))" }}
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="John Smith"
            className="input"
            {...register("display_name")}
          />
          {errors.display_name && (
            <p className="text-xs" style={{ color: "rgb(var(--color-danger))" }}>
              {errors.display_name.message}
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="reg-username">Username</label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none"
              style={{ color: "rgb(var(--color-foreground-muted))" }}
            >
              @
            </span>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              placeholder="johnsmith"
              className="input pl-7"
              {...register("username")}
            />
          </div>
          {errors.username && (
            <p className="text-xs" style={{ color: "rgb(var(--color-danger))" }}>
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="reg-email">Email address</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="input"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs" style={{ color: "rgb(var(--color-danger))" }}>
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="reg-password">Password</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className="input pr-10"
              {...register("password", {
                onChange: (e) => setPasswordValue(e.target.value),
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "rgb(var(--color-foreground-muted))" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password strength checklist */}
          {(watchedPassword || passwordValue) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-2 gap-1 mt-2"
            >
              {passwordRules.map((rule) => {
                const passed = rule.test(watchedPassword || passwordValue);
                return (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{
                        background: passed
                          ? "rgba(var(--color-success), 0.15)"
                          : "rgb(var(--color-muted))",
                        border: `1px solid ${passed ? "rgba(var(--color-success), 0.3)" : "rgb(var(--color-border))"}`,
                      }}
                    >
                      {passed && (
                        <Check className="w-2 h-2" style={{ color: "rgb(var(--color-success))" }} />
                      )}
                    </div>
                    <span
                      className="text-[11px] leading-tight transition-colors"
                      style={{
                        color: passed
                          ? "rgb(var(--color-success))"
                          : "rgb(var(--color-foreground-muted))",
                      }}
                    >
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}

          {errors.password && (
            <p className="text-xs" style={{ color: "rgb(var(--color-danger))" }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="reg-confirm">Confirm password</label>
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="input"
            {...register("confirm_password")}
          />
          {errors.confirm_password && (
            <p className="text-xs" style={{ color: "rgb(var(--color-danger))" }}>
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full mt-1"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p
        className="mt-5 text-center text-xs leading-relaxed"
        style={{ color: "rgb(var(--color-foreground-muted))" }}
      >
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>
      </p>
    </motion.div>
  );
}
