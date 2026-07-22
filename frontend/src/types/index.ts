/**
 * Helix — Shared TypeScript Types
 */

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  locale: string;
  is_email_verified: boolean;
  is_onboarded: boolean;
  status: UserStatus;
  created_at: string;
}

export type UserStatus = "active" | "inactive" | "suspended" | "pending_verification";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ─────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  plan: OrgPlan;
  created_at: string;
}

export type OrgPlan = "free" | "pro" | "business" | "enterprise";
export type OrgRole = "owner" | "admin" | "member" | "guest";

// ─────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_default: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// Project
// ─────────────────────────────────────────────

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  identifier: string;    // e.g. "HLX"
  description: string | null;
  icon: string | null;
  color: string;
  status: ProjectStatus;
  network: ProjectNetwork;
  created_at: string;
  updated_at: string;
  member_count: number;
  issue_count: number;
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type ProjectNetwork = "public" | "secret" | "private";

// ─────────────────────────────────────────────
// Issue
// ─────────────────────────────────────────────

export interface Issue {
  id: string;
  project_id: string;
  workspace_id: string;
  sequence_id: number;   // Human-readable: HLX-42
  title: string;
  description: string | null;
  description_html: string | null;
  priority: IssuePriority;
  state: IssueState;
  state_id: string;
  label_ids: string[];
  assignee_ids: string[];
  parent_id: string | null;
  estimate: number | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  sort_order: number;
  sub_issues_count: number;
  attachment_count: number;
  comment_count: number;
  // Eager-loaded relations (present in list/detail responses)
  assignees?: Array<{ id: string; display_name: string; email: string; avatar_url: string | null }>;
  labels?: Array<{ id: string; name: string; color: string }>;
  state_detail?: IssueState;
  created_at: string;
  updated_at: string;
}

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";

export interface IssueState {
  id: string;
  name: string;
  color: string;
  group: IssueStateGroup;
  is_default: boolean;
}

export type IssueStateGroup = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

// ─────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────

export interface Label {
  id: string;
  name: string;
  color: string;
  description: string | null;
  parent_id: string | null;
}

// ─────────────────────────────────────────────
// Comments
// ─────────────────────────────────────────────

export interface Comment {
  id: string;
  issue_id: string;
  content: string;
  content_html: string;
  actor: { id: string; display_name: string; email: string; avatar_url?: string | null };
  edited_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: OrgRole;
  joined_at: string;
}

// ─────────────────────────────────────────────
// Cycles (Sprints)
// ─────────────────────────────────────────────

export interface Cycle {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: CycleStatus;
  start_date: string | null;
  end_date: string | null;
  issue_count: number;
  completed_issue_count: number;
  created_at: string;
}

export type CycleStatus = "draft" | "started" | "completed";

// ─────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

export type NotificationType =
  | "issue_assigned"
  | "issue_mentioned"
  | "issue_updated"
  | "comment_added"
  | "cycle_started"
  | "invitation";

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

export interface PaginatedData<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────

export type ViewType = "list" | "board" | "calendar" | "timeline" | "spreadsheet";
export type ThemeMode = "light" | "dark" | "system";
