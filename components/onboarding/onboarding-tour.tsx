"use client";

import * as React from "react";
import { driver, type Driver } from "driver.js";
import { completeOnboardingTourAction } from "@/actions/onboarding";

interface OnboardingTourProps {
  hasCompletedTour?: boolean;
}

export function OnboardingTour({ hasCompletedTour = false }: OnboardingTourProps) {
  const driverRef = React.useRef<Driver | null>(null);

  React.useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(15, 23, 42, 0.65)",
      popoverClass: "revive-tour-popover",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Finish Tour ✓",
      progressText: "{{current}} of {{total}}",
      onDestroyed: () => {
        completeOnboardingTourAction().catch((err) =>
          console.warn("Tour complete sync notice:", err)
        );
      },
      steps: [
        {
          element: '[data-tour="nav-tabs"]',
          popover: {
            title: "Welcome to your Fellow Workspace",
            description:
              "Navigate seamlessly between active AI Work, your assigned client Projects, transparent Payments analytics, and Colleague Referrals.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: '[data-tour="onboarding-gate"]',
          popover: {
            title: "Complete Your Verification & Assessments",
            description:
              "Complete the sequential verification checklist: sovereign identity confirmation via Didit.me, tax setup, terms, and timed domain assessments.",
            side: "bottom",
            align: "center",
          },
        },
        {
          element: '[data-tour="project-invites"]',
          popover: {
            title: "Project Invitations & Open Roles",
            description:
              "Review priority invitations to high-compensation client projects and submit your interest for domain-specific opportunities.",
            side: "top",
            align: "start",
          },
        },
        {
          element: '[data-tour="earnings-sidebar"]',
          popover: {
            title: "Track Payouts & Weekly Hours",
            description:
              "Monitor your earnings in real time: funds awaiting payout, total cleared balance, tasks finished, and verified hours logged this week.",
            side: "left",
            align: "start",
          },
        },
        {
          element: '[data-tour="payout-setup"]',
          popover: {
            title: "Configure Your Payout Method",
            description:
              "Connect your direct deposit or bank routing method in the Payments tab so cleared evaluation earnings disburse smoothly.",
            side: "left",
            align: "end",
          },
        },
      ],
    });

    driverRef.current = driverObj;

    // Automatic trigger for first-time visitors
    if (!hasCompletedTour) {
      const timer = setTimeout(() => {
        // Ensure DOM elements are mounted before starting tour
        const firstEl = document.querySelector('[data-tour="nav-tabs"]');
        if (firstEl) {
          driverObj.drive();
        }
      }, 800);
      return () => clearTimeout(timer);
    }

    // Custom event listener for manual re-triggering from Help / Support menu
    const handleStartTour = () => {
      driverObj.drive();
    };

    window.addEventListener("start-onboarding-tour", handleStartTour);
    return () => {
      window.removeEventListener("start-onboarding-tour", handleStartTour);
      driverObj.destroy();
    };
  }, [hasCompletedTour]);

  return (
    <style jsx global>{`
      .revive-tour-popover.driver-popover {
        background-color: #ffffff;
        color: #0f172a;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        padding: 1.25rem;
        max-width: 380px;
        font-family: inherit;
      }
      .revive-tour-popover .driver-popover-title {
        font-size: 0.95rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #0f172a;
        margin-bottom: 0.35rem;
      }
      .revive-tour-popover .driver-popover-description {
        font-size: 0.8125rem;
        line-height: 1.45;
        color: #64748b;
        margin-bottom: 1rem;
      }
      .revive-tour-popover .driver-popover-progress-text {
        font-size: 0.75rem;
        font-weight: 700;
        color: #0f766e;
        background: #ccfbf1;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
      }
      .revive-tour-popover .driver-popover-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f5f9;
      }
      .revive-tour-popover .driver-popover-navigation-btns {
        display: flex;
        gap: 0.4rem;
      }
      .revive-tour-popover .driver-popover-next-btn {
        background-color: #0f766e;
        color: #ffffff;
        border: none;
        border-radius: 9999px;
        padding: 0.35rem 0.9rem;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      .revive-tour-popover .driver-popover-next-btn:hover {
        background-color: #115e59;
      }
      .revive-tour-popover .driver-popover-prev-btn {
        background-color: #f1f5f9;
        color: #475569;
        border: none;
        border-radius: 9999px;
        padding: 0.35rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
      .revive-tour-popover .driver-popover-prev-btn:hover {
        background-color: #e2e8f0;
      }
      .revive-tour-popover .driver-popover-close-btn {
        color: #94a3b8;
        padding: 0.25rem;
        cursor: pointer;
      }
      .revive-tour-popover .driver-popover-close-btn:hover {
        color: #0f172a;
      }
      .revive-tour-popover .driver-popover-arrow {
        border-color: #ffffff;
      }
    `}</style>
  );
}

export default OnboardingTour;
