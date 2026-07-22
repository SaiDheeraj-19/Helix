/**
 * Helix — API Service Layer
 * Typed wrappers around the API client for all domain entities.
 */

import { api } from "@/lib/api-client";
import type {
  Project, Workspace, Issue, IssueState, Label,
  Comment, PaginatedData, User,
} from "@/types";

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────

export const projectsApi = {
  list: (wsSlug: string) =>
    api.get<Project[]>(`/api/v1/workspaces/${wsSlug}/projects`),

  get: (wsSlug: string, identifier: string) =>
    api.get<Project>(`/api/v1/workspaces/${wsSlug}/projects/${identifier}`),

  create: (wsSlug: string, data: {
    name: string;
    identifier: string;
    description?: string;
    icon?: string;
    color?: string;
    network?: string;
  }) => api.post<Project>(`/api/v1/workspaces/${wsSlug}/projects`, data),

  update: (projectId: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/v1/projects/${projectId}`, data),

  delete: (projectId: string) =>
    api.delete(`/api/v1/projects/${projectId}`),

  // States
  getStates: (projectId: string) =>
    api.get<IssueState[]>(`/api/v1/projects/${projectId}/states`),

  createState: (projectId: string, data: {
    name: string; color: string; group: string; sequence?: number;
  }) => api.post<IssueState>(`/api/v1/projects/${projectId}/states`, data),

  // Labels
  getLabels: (projectId: string) =>
    api.get<Label[]>(`/api/v1/projects/${projectId}/labels`),

  createLabel: (projectId: string, data: {
    name: string; color: string; description?: string;
  }) => api.post<Label>(`/api/v1/projects/${projectId}/labels`, data),

  // Members
  getMembers: (projectId: string) =>
    api.get<User[]>(`/api/v1/projects/${projectId}/members`),
};

// ─────────────────────────────────────────────
// Issues
// ─────────────────────────────────────────────

export interface IssueFilters {
  state_ids?: string[];
  priority?: string[];
  assignee_ids?: string[];
  label_ids?: string[];
  search?: string;
  order_by?: string;
  page?: number;
  per_page?: number;
}

export const issuesApi = {
  list: (projectId: string, filters: IssueFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.order_by) params.set("order_by", filters.order_by);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    filters.state_ids?.forEach((id) => params.append("state_ids", id));
    filters.priority?.forEach((p) => params.append("priority", p));
    filters.assignee_ids?.forEach((id) => params.append("assignee_ids", id));
    filters.label_ids?.forEach((id) => params.append("label_ids", id));

    return api.get<PaginatedData<Issue>>(
      `/api/v1/projects/${projectId}/issues?${params.toString()}`
    );
  },

  get: (issueId: string) =>
    api.get<Issue>(`/api/v1/issues/${issueId}`),

  create: (projectId: string, data: {
    title: string;
    description?: string;
    description_html?: string;
    priority?: string;
    state_id?: string;
    assignee_ids?: string[];
    label_ids?: string[];
    parent_id?: string;
    estimate?: number;
    due_date?: string;
  }) => api.post<Issue>(`/api/v1/projects/${projectId}/issues`, data),

  update: (issueId: string, data: Partial<Issue & {
    assignee_ids: string[];
    label_ids: string[];
    state_id: string;
    sort_order: number;
  }>) => api.patch<Issue>(`/api/v1/issues/${issueId}`, data),

  delete: (issueId: string) =>
    api.delete(`/api/v1/issues/${issueId}`),

  move: (issueId: string, data: { state_id: string; sort_order: number }) =>
    api.post<Issue>(`/api/v1/issues/${issueId}/move`, data),

  // Comments
  getComments: (issueId: string) =>
    api.get<Comment[]>(`/api/v1/issues/${issueId}/comments`),

  addComment: (issueId: string, data: { content: string; content_html: string }) =>
    api.post<Comment>(`/api/v1/issues/${issueId}/comments`, data),

  updateComment: (commentId: string, data: { content: string; content_html: string }) =>
    api.patch<Comment>(`/api/v1/comments/${commentId}`, data),

  deleteComment: (commentId: string) =>
    api.delete(`/api/v1/comments/${commentId}`),

  // Activities
  getActivities: (issueId: string) =>
    api.get<any[]>(`/api/v1/issues/${issueId}/activities`),

  // Attachments
  getUploadUrl: (issueId: string, data: {
    file_name: string; file_size: number; content_type: string;
  }) => api.post<{ attachment_id: string; upload_url: string; storage_key: string }>(
    `/api/v1/issues/${issueId}/attachments/upload-url`, data
  ),

  getAttachments: (issueId: string) =>
    api.get<any[]>(`/api/v1/issues/${issueId}/attachments`),
};

// ─────────────────────────────────────────────
// Workspaces
// ─────────────────────────────────────────────

export const workspacesApi = {
  create: (orgSlug: string, data: { name: string; slug?: string; description?: string }) =>
    api.post<Workspace>(`/api/v1/orgs/${orgSlug}/workspaces`, data),

  get: (orgSlug: string, wsSlug: string) =>
    api.get<Workspace>(`/api/v1/orgs/${orgSlug}/workspaces/${wsSlug}`),
};

// ─────────────────────────────────────────────
// Organizations
// ─────────────────────────────────────────────

export const organizationsApi = {
  create: (data: { name: string; slug?: string; description?: string }) =>
    api.post(`/api/v1/orgs`, data),

  get: (slug: string) => api.get(`/api/v1/orgs/${slug}`),

  getMembers: (slug: string) => api.get(`/api/v1/orgs/${slug}/members`),

  addMember: (slug: string, data: { email: string; role: string }) =>
    api.post(`/api/v1/orgs/${slug}/members`, data),

  updateMember: (slug: string, membershipId: string, data: { role: string }) =>
    api.patch(`/api/v1/orgs/${slug}/members/${membershipId}`, data),

  removeMember: (slug: string, membershipId: string) =>
    api.delete(`/api/v1/orgs/${slug}/members/${membershipId}`),
};

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────

export const usersApi = {
  me: () => api.get<User>(`/api/v1/users/me`),
  update: (data: Partial<User>) => api.patch<User>(`/api/v1/users/me`, data),
  getAvatarUploadUrl: (data: { file_name: string; content_type: string }) =>
    api.post<{ upload_url: string; avatar_url: string }>(`/api/v1/users/me/avatar/upload-url`, data),
};

// ─────────────────────────────────────────────
// Cycles
// ─────────────────────────────────────────────

export const cyclesApi = {
  list: (wsSlug: string, projectId: string) =>
    api.get<any[]>(`/api/v1/workspaces/${wsSlug}/projects/${projectId}/cycles`),
  create: (wsSlug: string, projectId: string, data: any) =>
    api.post<any>(`/api/v1/workspaces/${wsSlug}/projects/${projectId}/cycles`, data),
  update: (cycleId: string, data: any) =>
    api.patch<any>(`/api/v1/cycles/${cycleId}`, data),
  delete: (cycleId: string) =>
    api.delete(`/api/v1/cycles/${cycleId}`),
};

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────

export const analyticsApi = {
  overview: (projectId: string) =>
    api.get<any>(`/api/v1/analytics/projects/${projectId}/overview`),
  velocity: (projectId: string, weeks: number = 8) =>
    api.get<any[]>(`/api/v1/analytics/projects/${projectId}/velocity?weeks=${weeks}`),
  assigneeWorkload: (projectId: string) =>
    api.get<any[]>(`/api/v1/analytics/projects/${projectId}/assignee-workload`),
};

// ─────────────────────────────────────────────
// AI
// ─────────────────────────────────────────────

export const aiApi = {
  summarizeIssue: (issueId: string) =>
    api.post<{ summary: string; issue_id: string }>(`/api/v1/ai/issues/${issueId}/summarize`, {}),
  suggestLabels: (issueId: string) =>
    api.post<string[]>(`/api/v1/ai/issues/${issueId}/suggest-labels`, {}),
  generateIssues: (data: { description: string; project_id: string; count?: number }) =>
    api.post<any[]>(`/api/v1/ai/issues/generate`, data),
};

