/**
 * Transactional Email HTML Templates styled in Revive AI Brand Palette
 * Primary: #0F766E (Deep Teal)
 * Accent: #F59E0B (Warm Amber)
 * Background: #F7FAF9
 * Foreground: #0B2B2B
 * Muted: #E5EFEC
 * Border: #D3E2DE
 * Text Muted: #5B7773
 */

function getBaseStyles(): string {
  return `
    body {
      margin: 0;
      padding: 32px 16px;
      background-color: #F7FAF9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0B2B2B;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #D3E2DE;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(11, 43, 43, 0.04);
    }
    .header {
      padding: 32px 32px 20px;
      border-bottom: 1px solid #E5EFEC;
    }
    .logo {
      display: inline-block;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0B2B2B;
      text-decoration: none;
    }
    .logo span {
      color: #0F766E;
    }
    .content {
      padding: 32px;
    }
    h1 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 22px;
      font-weight: 700;
      color: #0B2B2B;
      line-height: 1.3;
    }
    p {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 15px;
      line-height: 1.6;
      color: #5B7773;
    }
    .lead {
      color: #0B2B2B;
      font-size: 16px;
      font-weight: 500;
    }
    .btn {
      display: inline-block;
      background-color: #0F766E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 12px;
      margin-bottom: 8px;
      text-align: center;
    }
    .badge-amber {
      display: inline-block;
      background-color: #FEF3C7;
      color: #78350F;
      border: 1px solid #FDE68A;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .badge-teal {
      display: inline-block;
      background-color: #CCFBF1;
      color: #0F766E;
      border: 1px solid #99F6E4;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .badge-red {
      display: inline-block;
      background-color: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .note-box {
      background-color: #F7FAF9;
      border-left: 3px solid #0F766E;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 20px 0;
      color: #0B2B2B;
      font-size: 14px;
      line-height: 1.5;
    }
    .footer {
      padding: 24px 32px;
      background-color: #F7FAF9;
      border-top: 1px solid #E5EFEC;
      font-size: 12px;
      color: #5B7773;
      line-height: 1.5;
    }
    .footer a {
      color: #0F766E;
      text-decoration: underline;
    }
  `;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://joinreviveai.com"
  );
}

/**
 * 1. Welcome Email: sent after signup confirmation
 */
export function welcomeEmail(name: string): string {
  const siteUrl = getSiteUrl();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <h1>Welcome, ${name}!</h1>
      <p class="lead">Your contributor account on Revive AI is active and confirmed.</p>
      <p>Revive AI is an expert evaluation platform connecting specialists in medicine, law, software engineering, and scientific research with cutting-edge frontier AI evaluation tasks.</p>
      <p>To maximize your chances of quick approval on task waitlists, make sure your profile includes your primary field of expertise, country, and professional bio.</p>
      
      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/tasks" class="btn">Explore Available Tasks</a>
      </div>

      <p style="font-size: 13px; margin-top: 20px;">
        You can also visit your <a href="${siteUrl}/profile" style="color: #0F766E; font-weight: 600;">Profile Settings</a> anytime to update your credentials.
      </p>
    </div>
    <div class="footer">
      Revive AI &bull; Expert Tasking & Benchmark Platform<br>
      This email was sent to confirm your new registration.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 2. Application Received Email:
 * Includes task title, "you're on the waitlist", and link to /applications
 */
export function applicationReceivedEmail(name: string, taskTitle: string): string {
  const siteUrl = getSiteUrl();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <h1>Application Received</h1>
      <p class="lead">Hi ${name}, your application for <strong>${taskTitle}</strong> was submitted successfully.</p>
      
      <div style="margin: 20px 0;">
        <span class="badge-amber">Status: You're on the waitlist</span>
      </div>

      <p>Your qualifications and brief have been queued for administrative review. Project leads evaluate applicants to ensure balanced domain expertise and project slot quotas.</p>
      
      <p>You can monitor your live waitlist queue standing and review updates anytime from your contributor workspace.</p>

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/applications" class="btn">View My Applications</a>
      </div>
    </div>
    <div class="footer">
      Revive AI &bull; Track all your submissions on <a href="${siteUrl}/applications">reviveai.com/applications</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 3. Status Update Email:
 * Approved or not selected, with the admin note if present, plus link to /applications
 */
export function applicationStatusChangedEmail(
  name: string,
  taskTitle: string,
  status: "approved" | "rejected" | "waitlisted" | "withdrawn",
  adminNote?: string | null
): string {
  const siteUrl = getSiteUrl();
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  const statusBadge = isApproved
    ? `<span class="badge-teal">Approved</span>`
    : isRejected
    ? `<span class="badge-red">Not Selected</span>`
    : `<span class="badge-amber">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;

  const headline = isApproved
    ? "Application Approved!"
    : isRejected
    ? "Application Update: Not Selected"
    : `Application Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  const bodyMessage = isApproved
    ? `Congratulations! Your application for <strong>${taskTitle}</strong> has been approved by the platform administrators. You are now officially enrolled for this benchmark task.`
    : isRejected
    ? `Thank you for your application and interest in <strong>${taskTitle}</strong>. We have concluded candidate selection for this intake batch and your application was not selected at this time.`
    : `Your waitlist submission for <strong>${taskTitle}</strong> has been updated to <strong>${status}</strong>.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline} - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <h1>${headline}</h1>
      <p class="lead">Hi ${name},</p>
      <p>${bodyMessage}</p>

      <div style="margin: 16px 0;">
        ${statusBadge}
      </div>

      ${
        adminNote && adminNote.trim() !== ""
          ? `
          <div class="note-box">
            <strong style="display: block; margin-bottom: 4px; color: #0F766E;">Reviewer Note:</strong>
            ${adminNote.trim()}
          </div>
          `
          : ""
      }

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/applications" class="btn">View Application Details</a>
      </div>

      <p style="font-size: 13px; color: #5B7773;">
        ${
          isApproved
            ? "Visit your dashboard to review task instructions and compensation milestones."
            : "You can apply to other open tasks matching your domain expertise anytime."
        }
      </p>
    </div>
    <div class="footer">
      Revive AI &bull; Manage your applications and standing at <a href="${siteUrl}/applications">reviveai.com/applications</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}


/**
 * 4. Onboarding Step Completed & Next Step Unlocked Email
 * Triggered automatically after KYC approval, Tax setup, Terms, Assessments, and Tech checks
 */
export function onboardingStepCompletedEmail(
  name: string,
  completedStepLabel: string,
  nextStepLabel: string | null,
  progressPercent: number
): string {
  const siteUrl = getSiteUrl();
  const isAllComplete = !nextStepLabel || progressPercent >= 100;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboarding Progress Update - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge-teal">${isAllComplete ? "Onboarding 100% Complete" : `Progress: ${progressPercent}% Complete`}</span>
      </div>
      <h1>${isAllComplete ? "You're Ready to Start Tasking!" : `Step Completed: ${completedStepLabel}`}</h1>
      <p class="lead">Great work, ${name}.</p>
      <p>Your <strong>${completedStepLabel}</strong> milestone has been verified and recorded on your contributor profile.</p>

      ${
        isAllComplete
          ? `<div class="note-box">
               <strong style="display: block; margin-bottom: 4px; color: #0F766E;">Full Workspace Unlocked:</strong>
               All identity, compliance, and screening requirements are complete. You can now claim active evaluation tasks and earn payouts.
             </div>`
          : `<div class="note-box">
               <strong style="display: block; margin-bottom: 4px; color: #0F766E;">Up Next in Your Checklist:</strong>
               <strong>${nextStepLabel}</strong> is now unlocked and ready for you to complete.
             </div>`
      }

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/dashboard?tab=ai-work" class="btn">
          ${isAllComplete ? "Browse Active Projects" : `Continue to ${nextStepLabel}`}
        </a>
      </div>
    </div>
    <div class="footer">
      Revive AI &bull; Contributor Onboarding &amp; Compliance<br>
      Manage your progress anytime at <a href="${siteUrl}/dashboard">joinreviveai.com</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 5. Start Your Assessment Email
 * Triggered when KYC + Terms are cleared or via automated 24h nudge
 */
export function startAssessmentEmail(
  name: string,
  assessmentTitle = "Project Screening Assessment",
  estimatedMinutes = 10
): string {
  const siteUrl = getSiteUrl();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Assessment is Unlocked - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge-amber">Action Required &bull; ~${estimatedMinutes} mins</span>
      </div>
      <h1>Start Your Screening Assessment</h1>
      <p class="lead">Hi ${name}, your <strong>${assessmentTitle}</strong> is unlocked and waiting.</p>
      <p>Passing this benchmark evaluation qualifies you for paid hourly and per-task AI training projects on Revive AI.</p>
      
      <div class="note-box">
        <strong style="display: block; margin-bottom: 4px; color: #0F766E;">Tips Before You Begin:</strong>
        &bull; Ensure you have an uninterrupted ${estimatedMinutes}-minute window.<br>
        &bull; Read the evaluation rubric carefully and provide detailed justifications.<br>
        &bull; All responses must be 100% original human analysis.
      </div>

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/dashboard?tab=ai-work" class="btn">Start Assessment Now</a>
      </div>
    </div>
    <div class="footer">
      Revive AI &bull; Expert Tasking &amp; Benchmark Platform<br>
      Questions? Visit <a href="${siteUrl}/dashboard">joinreviveai.com</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 6. Finish Your Profile Reminder Email
 * Triggered automatically for users with incomplete KYC, tax setup, or domain bio
 */
export function finishProfileReminderEmail(
  name: string,
  missingItems: string[]
): string {
  const siteUrl = getSiteUrl();
  const checklistHtml = missingItems
    .map((item) => `&bull; <strong>${item}</strong>`)
    .join("<br>");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Contributor Profile - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge-amber">Incomplete Profile</span>
      </div>
      <h1>Finish Setting Up Your Profile</h1>
      <p class="lead">Hi ${name}, you're just a few minutes away from unlocking paid AI evaluation projects.</p>
      <p>Project leads prioritize contributors with verified identities and complete domain profiles when assigning new high-rate cohorts.</p>

      <div class="note-box">
        <strong style="display: block; margin-bottom: 6px; color: #0F766E;">Remaining Steps:</strong>
        ${checklistHtml}
      </div>

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/dashboard?tab=ai-work" class="btn">Complete My Profile</a>
      </div>
    </div>
    <div class="footer">
      Revive AI &bull; Contributor Operations<br>
      Update your settings at <a href="${siteUrl}/profile">joinreviveai.com/profile</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 7. Project Availability Reminder Email
 * Triggered when new projects open or a user has pending project invitations
 */
export function projectAvailabilityReminderEmail(
  name: string,
  projects: Array<{
    title: string;
    rateLabel: string;
    description: string;
  }>
): string {
  const siteUrl = getSiteUrl();

  const projectCardsHtml = projects
    .map(
      (p) => `
      <div style="border: 1px solid #D3E2DE; border-radius: 10px; padding: 16px; margin-bottom: 12px; background-color: #F7FAF9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #0B2B2B; font-size: 15px;">${p.title}</strong>
          <span style="color: #0F766E; font-weight: 700; font-size: 13px;"> &bull; ${p.rateLabel}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #5B7773;">${p.description}</p>
      </div>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Projects Available - Revive AI</title>
  <style>${getBaseStyles()}</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Revive<span>AI</span></div>
    </div>
    <div class="content">
      <div style="margin-bottom: 16px;">
        <span class="badge-teal">Open Task Quota Available</span>
      </div>
      <h1>Projects Matching Your Profile Are Live</h1>
      <p class="lead">Hi ${name}, new AI evaluation tasks are open for contributor onboarding.</p>
      <p>Spots fill on a rolling basis as fellows complete their project screenings. Review the active opportunities below:</p>

      <div style="margin: 20px 0;">
        ${projectCardsHtml}
      </div>

      <div style="margin: 24px 0 16px;">
        <a href="${siteUrl}/dashboard?tab=projects" class="btn">View &amp; Accept Projects</a>
      </div>
    </div>
    <div class="footer">
      Revive AI &bull; Project Matching &amp; Allocations<br>
      View all projects at <a href="${siteUrl}/dashboard?tab=projects">joinreviveai.com</a>.
    </div>
  </div>
</body>
</html>
  `.trim();
}