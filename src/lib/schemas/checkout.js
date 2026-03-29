import { z } from "zod";

const sudanPhone = z
  .string()
  .trim()
  .regex(/^09\d{8}$/, "phone_format");

export const checkoutShippingSchema = z.object({
  name: z.string().trim().min(3, "name_short"),
  phone: sudanPhone,
  phoneAlt: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^09\d{8}$/.test(v.replace(/\s/g, "")), "phone_alt_format"),
  city: z.string().trim().min(1, "city_required"),
  address: z.string().trim().min(10, "address_short"),
  orderNotes: z.string().trim().max(2000, "notes_long").optional(),
});

export const checkoutPaymentSchema = z.object({
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "BANK_TRANSFER"]),
});
