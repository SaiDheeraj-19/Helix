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
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full"
    >
      <h1 className="text-[42px] font-normal tracking-tight text-black mb-10 font-serif">
        Sign up
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-black" htmlFor="display_name">
            Full name
          </label>
          <input
            id="display_name"
            type="text"
            autoComplete="name"
            placeholder="John Smith"
            className="w-full px-4 py-3 rounded-[12px] border border-gray-300 bg-white text-black text-[14px] placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
            {...register("display_name")}
          />
          {errors.display_name && <p className="text-xs text-red-500">{errors.display_name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-black" htmlFor="username">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 select-none">
              @
            </span>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="johnsmith"
              className="w-full pl-8 pr-4 py-3 rounded-[12px] border border-gray-300 bg-white text-black text-[14px] placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
              {...register("username")}
            />
          </div>
          {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
        </div>

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
              autoComplete="new-password"
              placeholder="Create a strong password"
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center px-8 py-3 rounded-full bg-black text-white text-[14px] font-medium hover:bg-black/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
          </button>
        </div>
      </form>
      
      <OAuthButtons />

      <div className="mt-10 text-[14px] text-gray-500 font-medium">
        Already have an account?{" "}
        <Link href="/login" className="text-black hover:underline">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}
