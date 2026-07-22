"use client";

/**
 * Helix — OAuth Callback Page
 * The backend redirects here after OAuth with tokens in the URL params.
 * URL format: /oauth/callback?access_token=...&refresh_token=...&user=<json>
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, clearAuth } = useAuthStore();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const error = searchParams.get("error");
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const userParam = searchParams.get("user");

    if (error) {
      setStatus("error");
      setErrorMsg(
        error === "access_denied"
          ? "Access was denied. Please try again."
          : decodeURIComponent(error)
      );
      return;
    }

    if (!accessToken || !userParam) {
      setStatus("error");
      setErrorMsg("Authentication failed — missing tokens from server response.");
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      setUser(user, accessToken, refreshToken ?? undefined);
      setStatus("success");
      setTimeout(() => router.push("/"), 800);
    } catch {
      clearAuth();
      setStatus("error");
      setErrorMsg("Failed to parse authentication response. Please try again.");
    }
  }, [searchParams, setUser, clearAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 p-8"
      >
        {status === "loading" && (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              H
            </div>
            <div className="flex justify-center mt-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Completing sign-in…</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </motion.div>
            <h2 className="text-base font-semibold">Signed in successfully!</h2>
            <p className="text-sm text-muted-foreground">Taking you to your workspace…</p>
          </>
        )}

        {status === "error" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto"
            >
              <AlertCircle className="w-8 h-8 text-red-500" />
            </motion.div>
            <h2 className="text-base font-semibold">Authentication failed</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{errorMsg}</p>
            <button
              onClick={() => router.push("/login")}
              className="mt-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Back to login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
