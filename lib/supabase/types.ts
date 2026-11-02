import { Database as SupabaseDatabase } from "@/types/supabase";
import { Field } from "@/lib/item-schema";

export type UserRole = "user" | "admin";
export type TaskStatus = "draft" | "open" | "closed";
export type ApplicationStatus = "waitlisted" | "approved" | "rejected" | "withdrawn";

export type LedgerKind = "earning" | "bonus" | "adjustment" | "payout" | "payout_reversal";
export type PayModel = "per_item" | "hourly";
export type ItemStatus = "available" | "claimed" | "submitted" | "completed";
export type SubmissionStatus = "submitted" | "approved" | "rejected" | "revision_requested";
export type TimeStatus = "submitted" | "approved" | "rejected";
export type PayoutMethodType = "mpesa" | "wise" | "payoneer";
export type PayoutStatus = "requested" | "processing" | "paid" | "failed" | "cancelled";

export interface EducationItem {
  school: string;
  degree: string;
  field: string;
  year?: string | number;
}

export interface ExperienceItem {
  company: string;
  title: string;
  from?: string;
  to?: string;
  summary?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  country: string | null;
  expertise: string | null;
  bio: string | null;
  role: UserRole;
  approval_status?: "waitlisted" | "approved" | "rejected";
  kyc_status?: "unverified" | "pending" | "verified" | "rejected";
  country_code?: string | null;
  payout_method_configured?: boolean;
  referral_code?: string;
  referred_by?: string | null;
  headline?: string | null;
  phone?: string | null;
  timezone?: string | null;
  linkedin_url?: string | null;
  weekly_hours?: number | null;
  languages?: string[];
  skills?: string[];
  education?: EducationItem[] | any;
  experience?: ExperienceItem[] | any;
  avatar_url?: string | null;
  payouts_blocked?: boolean;
  terms_accepted_at?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  pay_min: number | null;
  pay_max: number | null;
  pay_unit: string | null;
  location: string | null;
  commitment: string | null;
  slots: number | null;
  status: TaskStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Part 3 additions
  pay_model: PayModel;
  rate_cents: number | null;
  instructions: string | null;
  item_schema: Field[] | any;
  claim_minutes: number;
  max_open_claims: number;
  budget_cents: number | null;
}

export interface Application {
  id: string;
  task_id: string;
  user_id: string;
  status: ApplicationStatus;
  note: string | null;
  position: number | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  // Part 3 additions
  rate_cents?: number | null;
  approved_at?: string | null;
  work_paused?: boolean;
  // joined relations
  task?: Task;
  profile?: Profile;
}

export interface WorkItem {
  id: string;
  task_id: string;
  external_ref: string | null;
  payload: Record<string, any>;
  status: ItemStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  attempts: number;
  created_at: string;
  task?: Task;
}

export interface Submission {
  id: string;
  work_item_id: string;
  task_id: string;
  user_id: string;
  application_id: string;
  answers: Record<string, any>;
  seconds_spent: number | null;
  status: SubmissionStatus;
  score: number | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  earning_cents: number | null;
  created_at: string;
  task?: Task;
  profile?: Profile;
  work_item?: WorkItem;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  application_id: string;
  task_id: string;
  work_date: string;
  minutes: number;
  description: string;
  status: TimeStatus;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  earning_cents: number | null;
  created_at: string;
  task?: Task;
  profile?: Profile;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  kind: LedgerKind;
  amount_cents: number;
  currency: string;
  available_at: string;
  ref_type: string | null;
  ref_id: string | null;
  idempotency_key: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PayoutMethod {
  id: string;
  user_id: string;
  type: PayoutMethodType;
  label: string | null;
  details: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  method_id: string | null;
  method_snapshot: {
    type: PayoutMethodType;
    details: Record<string, any>;
  };
  amount_cents: number;
  fee_cents: number;
  local_currency: string | null;
  local_amount: number | null;
  fx_rate: number | null;
  status: PayoutStatus;
  provider: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  profile?: Profile;
  method?: PayoutMethod;
}

export interface WalletBalance {
  available_cents: number;
  pending_cents: number;
  lifetime_earned_cents: number;
  lifetime_paid_cents: number;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  read_at?: string | null;
  created_at: string;
}

export type ProjectStatus = "active" | "past" | "archived";
export type OnboardingStepType = "kyc" | "terms" | "tax" | "assessment" | "tool_check" | "next_steps";
export type FellowProgressStatus = "locked" | "in_progress" | "pending_review" | "passed" | "failed";
export type EarningsLedgerStatus = "awaiting_payout" | "paid";

export interface Project {
  id: string;
  title: string;
  name?: string;
  slug: string;
  rate_cents_per_hour: number;
  rate_cents_per_task: number;
  hourly_rate_cents?: number;
  description: string;
  is_invite_only: boolean;
  category: string;
  domain?: string;
  status: ProjectStatus;
  participant_count: number;
  tasks_completed?: number;
  total_tasks?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectOnboardingStep {
  id: string;
  project_id: string | null;
  step_index: number;
  title: string;
  estimated_minutes: number;
  step_type: OnboardingStepType;
  instructions: string | null;
  assessment_payload: any;
  passing_score: number;
  created_at: string;
}

export interface FellowOnboardingProgress {
  id: string;
  user_id: string;
  step_id: string;
  status: FellowProgressStatus;
  submitted_payload: any;
  score: number | null;
  updated_at: string;
  created_at: string;
  step?: ProjectOnboardingStep;
}

export interface EarningsLedgerEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  amount_cents: number;
  hours_worked: number;
  period_start: string;
  period_end: string;
  status: EarningsLedgerStatus;
  paid_at: string | null;
  created_at: string;
  project?: Project;
}

export interface ProjectInvitation {
  id: string;
  user_id: string;
  project_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  project?: Project;
}

export interface OpenOpportunity {
  id: string;
  title: string;
  rate_cents_per_hour: number;
  category: string;
  description: string;
  requirements?: string | null;
  is_active: boolean;
  created_at: string;
  user_interest_status?: "submitted" | "under_review" | "accepted" | null;
}

export type Database = SupabaseDatabase;
