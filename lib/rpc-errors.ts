const MESSAGES: Record<string, string> = {
  task_not_open: "This task is no longer open.",
  not_approved: "You are not approved for this task.",
  not_your_claim: "This task is no longer assigned to you.",
  already_reviewed: "This was already reviewed.",
  daily_cap_exceeded: "You cannot log more than 12 hours in a day.",
  insufficient_funds: "That is more than your available balance.",
  below_minimum: "The minimum withdrawal is $25.00.",
  payouts_blocked: "Withdrawals are paused on your account. Please contact support.",
  method_not_found: "Choose a valid payout method.",
  method_too_new: "New payout methods can be used after 48 hours for account security.",
  reference_required: "A transaction reference (e.g. Wise transfer ID or Payoneer payment ID) is required.",
  note_required: "A written note or explanation is required.",
  forbidden: "You do not have permission to perform that action.",
  invalid_amount: "Enter an amount greater than $0.00.",
  no_session: "Start the work clock first.",
  session_in_other_task: "You already have a clock running on another task. Stop it first.",
  empty_batch: "Add items before publishing.",
  task_not_ready: "Set the answer form and pay rate before publishing.",
  not_found: "That record no longer exists.",
};

export const mapRpcError = (msg?: string) => {
  if (!msg) return "Something went wrong. Please try again.";
  const match = Object.entries(MESSAGES).find(([key]) => msg.includes(key));
  return match ? match[1] : msg.replace(/^Error:\s*/, "");
};
