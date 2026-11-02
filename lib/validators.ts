import { z } from "zod";
import { CATEGORIES } from "./constants";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.string().nullish(),
  expertise: z.string().nullish(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Profile Section Schemas
export const basicsSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(80, "Max 80 characters"),
  headline: z.string().trim().max(100, "Headline max 100 characters").optional().or(z.literal("")),
  bio: z.string().trim().max(800, "Bio max 800 characters").optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  timezone: z.string().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Invalid phone format (e.g. +1 555 123 4567)")
    .optional()
    .or(z.literal("")),
  avatar_url: z.string().trim().url("Please provide a valid image URL").optional().or(z.literal("")),
});

export const expertiseSchema = z.object({
  expertise: z.string().min(1, "Please select your primary expertise"),
  skills: z.array(z.string().trim().min(2, "Min 2 chars").max(30, "Max 30 chars")).max(20, "Max 20 skills"),
  languages: z.array(z.string().trim().min(2, "Min 2 chars").max(30, "Max 30 chars")).max(10, "Max 10 languages"),
});

export const backgroundSchema = z.object({
  education: z
    .array(
      z.object({
        school: z.string().trim().min(2, "School name is required"),
        degree: z.string().trim().min(2, "Degree is required"),
        field: z.string().trim().optional(),
        year: z.coerce.number().int().min(1950, "Invalid year").max(new Date().getFullYear() + 6, "Invalid year"),
      })
    )
    .max(10, "Max 10 education entries"),
  experience: z
    .array(
      z.object({
        company: z.string().trim().min(2, "Company is required"),
        title: z.string().trim().min(2, "Title is required"),
        from: z.string().min(1, "Start year/date is required"),
        to: z.string().optional(),
        summary: z.string().trim().max(400, "Summary max 400 characters").optional(),
      })
    )
    .max(15, "Max 15 experience entries"),
});

export const availabilitySchema = z.object({
  weekly_hours: z.coerce.number().int().min(0).max(168).optional().nullable(),
  linkedin_url: z
    .string()
    .trim()
    .url("LinkedIn URL must start with https://")
    .optional()
    .or(z.literal("")),
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const educationItemSchema = z.object({
  school: z.string().min(1, "School name is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().nullish().default(""),
  year: z.union([z.string(), z.number()]).nullish(),
});

export const experienceItemSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  title: z.string().min(1, "Job title is required"),
  from: z.string().nullish().default(""),
  to: z.string().nullish().default(""),
  summary: z.string().nullish().default(""),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  headline: z.string().max(160, "Headline cannot exceed 160 characters").nullish(),
  phone: z.string().max(30).nullish(),
  expertise: z.string().min(2, "Field of expertise is required"),
  country: z.string().min(2, "Country is required"),
  timezone: z.string().nullish(),
  weekly_hours: z.coerce.number().min(0).max(168).nullish(),
  linkedin_url: z
    .string()
    .trim()
    .url("Please provide a valid LinkedIn URL")
    .or(z.literal(""))
    .nullish()
    .transform((val) => (val ? val : null)),
  avatar_url: z
    .string()
    .trim()
    .url("Please provide a valid image URL")
    .or(z.literal(""))
    .nullish()
    .transform((val) => (val ? val : null)),
  bio: z.string().max(1500, "Bio cannot exceed 1500 characters").nullish(),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  education: z.array(educationItemSchema).default([]),
  experience: z.array(experienceItemSchema).default([]),
});

export const taskSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  description: z.string().min(20, "Detailed description must be at least 20 characters"),
  category: z.string().min(2, "Category is required"),
  pay_min: z.coerce.number().min(0, "Minimum pay must be 0 or more"),
  pay_max: z.coerce.number().min(0, "Maximum pay must be 0 or more"),
  pay_unit: z.string().default("hour"),
  location: z.string().default("Remote"),
  commitment: z.string().min(2, "Commitment is required (e.g. 10-15 hrs/wk)"),
  slots: z.coerce.number().int().min(1, "Slots must be at least 1").default(5),
  status: z.enum(["draft", "open", "closed"]).default("open"),
  pay_model: z.enum(["per_item", "hourly"]).default("per_item"),
  rate_cents: z.coerce.number().int().min(0).optional().nullable(),
  instructions: z.string().optional().nullable(),
  item_schema: z.any().default([]),
  claim_minutes: z.coerce.number().int().min(5, "Min 5 mins").default(60),
  max_open_claims: z.coerce.number().int().min(1).default(1),
  budget_cents: z.coerce.number().int().min(0).optional().nullable(),
});

export const payoutMethodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("wise"),
    email: z.string().email("Please enter a valid Wise email address"),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("payoneer"),
    email: z.string().email("Please enter a valid Payoneer email address"),
    label: z.string().optional(),
  }),
]);

export const applicationSchema = z.object({
  task_id: z.string().uuid("Invalid task identifier"),
  note: z.string().min(10, "Please provide a short brief or cover note on your relevant experience"),
});

export const adminApplicationStatusSchema = z.object({
  status: z.enum(["waitlisted", "approved", "rejected", "withdrawn"]),
  position: z.number().int().min(1).optional(),
  admin_note: z.string().optional(),
});
