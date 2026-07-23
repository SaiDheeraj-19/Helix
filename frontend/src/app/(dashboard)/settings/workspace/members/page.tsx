"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, MoreHorizontal, User, Shield, ShieldAlert, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { organizationsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatRelativeDate, cn } from "@/lib/utils";

const ORG_SLUG = "default"; // TODO: get from context/URL

export default function WorkspaceMembersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const { data, isLoading } = useQuery({
    queryKey: ["org", ORG_SLUG, "members"],
    queryFn: () => organizationsApi.getMembers(ORG_SLUG),
  });

  const members: any[] = (data && (data as any).data) || [];

  const addMemberMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => organizationsApi.addMember(ORG_SLUG, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", ORG_SLUG, "members"] });
      toast.success("Member invited successfully");
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to invite member"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: string }) =>
      organizationsApi.updateMember(ORG_SLUG, membershipId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", ORG_SLUG, "members"] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) => organizationsApi.removeMember(ORG_SLUG, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", ORG_SLUG, "members"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    owner: { label: "Owner", icon: ShieldAlert, color: "text-red-500" },
    admin: { label: "Admin", icon: Shield, color: "text-amber-500" },
    member: { label: "Member", icon: User, color: "text-blue-500" },
    guest: { label: "Guest", icon: User, color: "text-muted-foreground" },
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold mb-1">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this workspace.
          </p>
        </div>
        
        <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
          <Dialog.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
              <Plus className="w-4 h-4" />
              Invite Member
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-popover p-6 shadow-xl">
                <h2 className="text-lg font-semibold mb-1">Invite to Workspace</h2>
                <p className="text-sm text-muted-foreground mb-6">Send an invite link via email.</p>

                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email address</label>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="member">Member (can edit issues)</option>
                      <option value="admin">Admin (can manage settings)</option>
                      <option value="guest">Guest (view only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
                  </Dialog.Close>
                  <button
                    onClick={() => addMemberMutation.mutate({ email: inviteEmail, role: inviteRole })}
                    disabled={!inviteEmail.includes("@") || addMemberMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                  >
                    {addMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Invite
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-32 items-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 border-b border-border font-medium">User</th>
                <th className="px-4 py-3 border-b border-border font-medium">Role</th>
                <th className="px-4 py-3 border-b border-border font-medium">Joined</th>
                <th className="px-4 py-3 border-b border-border font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m: any) => {
                const RoleIcon = ROLE_CONFIG[m.role]?.icon || User;
                const isSelf = m.user_id === user?.id;

                return (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-xs">
                            {(m.display_name || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {m.display_name} {isSelf && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold tracking-wide uppercase">You</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <RoleIcon className={cn("w-3.5 h-3.5", ROLE_CONFIG[m.role]?.color)} />
                        <span className="capitalize">{m.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatRelativeDate(m.joined_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" disabled={m.role === "owner"}>
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" className="z-50 w-48 rounded-xl border border-border bg-popover p-1 shadow-lg">
                            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Change Role</DropdownMenu.Label>
                            {["admin", "member", "guest"].map(role => (
                              <DropdownMenu.Item asChild key={role}>
                                <button
                                  onClick={() => updateRoleMutation.mutate({ membershipId: m.id, role })}
                                  className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer capitalize flex items-center justify-between"
                                >
                                  {role}
                                  {m.role === role && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                              </DropdownMenu.Item>
                            ))}
                            <DropdownMenu.Separator className="h-px bg-border my-1 -mx-1" />
                            <DropdownMenu.Item asChild>
                              <button
                                onClick={() => removeMemberMutation.mutate(m.id)}
                                className="w-full text-left px-2 py-1.5 text-sm rounded-md text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove from workspace
                              </button>
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
