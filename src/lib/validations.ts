import { z } from "zod";

/** Requirements surfaced live in the sign-up checklist. Keep the two in sync. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "A number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "A special character (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const strongPassword = z
  .string()
  .min(8, "Password needs at least 8 characters")
  .max(72, "Password can be at most 72 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const registerSchema = z.object({
  name: z.string().min(2, "Name needs at least 2 characters").max(60),
  email: z.string().email("Enter a valid email"),
  password: strongPassword,
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  totp: z.string().optional(), // 2FA code or recovery code, when enabled
});

export const progressSchema = z.object({
  questionId: z.string().cuid(),
  status: z.enum(["TODO", "ATTEMPTED", "SOLVED", "MASTERED"]),
});

export const bookmarkSchema = z
  .object({
    questionId: z.string().cuid().optional(),
    companyId: z.string().cuid().optional(),
    sheetId: z.string().cuid().optional(),
    folder: z.string().max(40).optional(),
  })
  .refine((d) => d.questionId || d.companyId || d.sheetId, {
    message: "A bookmark needs a target",
  });

export const noteSchema = z.object({
  questionId: z.string().cuid(),
  content: z.string().max(50_000),
});

export const revisionSchema = z.object({
  questionId: z.string().cuid(),
  action: z.enum(["schedule", "review", "master", "remove"]),
  grade: z.enum(["easy", "medium", "hard", "forgot"]).optional(),
});

export const questionQuerySchema = z.object({
  company: z.string().optional(),
  sheet: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  status: z.enum(["TODO", "ATTEMPTED", "SOLVED", "MASTERED", "BOOKMARKED"]).optional(),
  recency: z.enum(["30d", "3m", "6m", "1y", "all"]).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(["frequency", "acceptance", "difficulty", "title"]).default("frequency"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent: z.string().max(20).optional(),
  fontSize: z.enum(["sm", "md", "lg"]).optional(),
  reducedMotion: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  dailyGoal: z.number().int().min(1).max(50).optional(),
  publicProfile: z.boolean().optional(),
});
