import { z } from "zod";

export const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone number is required"),
  deliveryMethod: z.enum(["standard", "express"]),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
