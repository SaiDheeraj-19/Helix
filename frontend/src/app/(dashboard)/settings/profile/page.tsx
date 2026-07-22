"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Camera, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  display_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().max(500).optional(),
  timezone: z.string().max(64).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);

  const { data: userData, isLoading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => usersApi.me(),
    enabled: !!user,
  });
  
  const profile = userData?.data;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
      timezone: profile?.timezone || "UTC",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProfileForm> & { avatar_url?: string }) => usersApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      toast.success("Profile updated successfully");
      reset({}, { keepValues: true }); // Reset isDirty state
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large (max 5MB)");
      return;
    }

    try {
      setIsUploading(true);
      // 1. Get presigned URL
      const { data } = await usersApi.getAvatarUploadUrl({
        file_name: file.name,
        content_type: file.type,
      });

      // 2. Upload to MinIO/S3 directly
      await axios.put((data as any).data?.upload_url || (data as any).upload_url, file, {
        headers: {
          "Content-Type": file.type,
        },
      });

      // 3. Update user profile with new avatar URL
      await updateMutation.mutateAsync({ avatar_url: (data as any).data?.avatar_url || (data as any).avatar_url });

    } catch (error) {
      toast.error("Failed to upload avatar");
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-1">Your Profile</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage your personal information and preferences.
      </p>

      {/* Avatar Section */}
      <div className="mb-10 flex items-start gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-medium text-muted-foreground">
                {profile.display_name[0]?.toUpperCase()}
              </span>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 transition-opacity cursor-pointer disabled:cursor-not-allowed",
                isUploading ? "opacity-100" : "group-hover:opacity-100"
              )}
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin mb-1" />
              ) : (
                <>
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Change</span>
                </>
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="pt-2">
          <h3 className="text-sm font-medium">Profile Picture</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-xs">
            We support PNG, JPEG, and WEBP under 5MB. Your avatar will be shown across all workspaces.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Upload image
          </button>
        </div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Display Name</label>
            <input
              {...register("display_name")}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address</label>
            <input
              value={profile.email}
              disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bio</label>
          <textarea
            {...register("bio")}
            placeholder="Tell us a little bit about yourself"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Timezone</label>
          <select
            {...register("timezone")}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Central Europe (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Kolkata">India (IST)</option>
            {/* Add more as needed, skipping exhaustive list for brevity */}
          </select>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
