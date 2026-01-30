import { z } from "zod";

// Validation schema for login form
export const loginSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Validation schema for registration form
export const registerSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
