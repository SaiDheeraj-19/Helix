"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import type { User, AuthTokens } from "@/types";
import { OAuthButtons } from "../OAuthButtons";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      <h1 className="text-[42px] font-normal tracking-tight text-black mb-10 font-serif">
        Sign in
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-black" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            className="w-full px-4 py-3 rounded-[12px] border border-gray-300 bg-white text-black text-[14px] placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-black" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-[12px] border border-gray-300 bg-white text-black text-[14px] placeholder-gray-400 focus:outline-none focus:border-black transition-colors pr-12"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center px-8 py-3 rounded-full bg-black text-white text-[14px] font-medium hover:bg-black/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
          </button>
          
          <Link
            href="/forgot-password"
            className="text-[14px] font-medium text-gray-500 hover:text-black transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </form>
      
      <OAuthButtons />

      <div className="mt-10 text-[14px] text-gray-500 font-medium">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-black hover:underline">
          Sign up
        </Link>
      </div>
    </motion.div>
  );
}
