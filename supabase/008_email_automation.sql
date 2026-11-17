-- Align onboarding progress storage with the fixed step IDs and statuses used by the app.
ALTER TABLE public.fellow_onboarding_progress
  DROP CONSTRAINT IF EXISTS fellow_onboarding_progress_step_id_fkey;

ALTER TABLE public.fellow_onboarding_progress
  ALTER COLUMN step_id TYPE TEXT USING step_id::TEXT;

ALTER TABLE public.fellow_onboarding_progress
  DROP CONSTRAINT IF EXISTS fellow_onboarding_progress_status_check;

ALTER TABLE public.fellow_onboarding_progress
  ADD CONSTRAINT fellow_onboarding_progress_status_check
  CHECK (status IN (
    'locked',
    'in_progress',
    'pending_review',
    'in_review',
    'passed',
    'completed',
    'failed',
    'not_started'
  ));

CREATE TABLE IF NOT EXISTS public.email_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_key)
);

ALTER TABLE public.email_notifications_log ENABLE ROW LEVEL SECURITY;
