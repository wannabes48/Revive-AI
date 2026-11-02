const MESSAGES: Record<string, string> = {
  task_not_open: "This task is no longer open.",
  not_approved: "You are not approved for this task.",
  not_your_claim: "This item is no longer assigned to you.",
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
};

export const mapRpcError = (msg?: string) => {
  if (!msg) return "Something went wrong. Please try again.";
  const match = Object.entries(MESSAGES).find(([key]) => msg.includes(key));
  return match ? match[1] : msg.replace(/^Error:\s*/, "");
};
