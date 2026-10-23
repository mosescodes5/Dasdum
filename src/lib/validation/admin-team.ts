import { z } from "zod";

const role = z.enum(["super_admin", "manager", "editor", "support"]);

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(191),
  role,
});

export const updateTeamMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    role: role.optional(),
    isActive: z.boolean().optional(),
    resetPassword: z.literal(true).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(10, "Use at least 10 characters").max(200),
});
