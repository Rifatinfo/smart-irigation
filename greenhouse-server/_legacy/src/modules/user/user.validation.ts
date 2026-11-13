import {z} from "zod";

// Validation schema for creating a new user 
const createUserValidationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long" ).optional(),
  
  email: z
    .email( "Invalid email address"),
  
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long" ),
  
});
const createAdminValidationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long" ).optional(),
  
  email: z
    .email( "Invalid email address"),
  
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long" ),
  phone : z.string().min(11, "Phone must be at least 11 characters long" ).optional(),
  
});

export const UserValidation = {
  createUserValidationSchema,
  createAdminValidationSchema
};
