import { z } from "zod";

export const trialRequestSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  companyName: z.string().trim().min(3).max(150),
  email: z.email(),
  phone: z.string().trim().min(8).max(30),
  city: z.string().trim().max(120).optional(),
  requestedSubdomain: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
