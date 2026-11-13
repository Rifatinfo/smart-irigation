import { z } from "zod";

const update = z.object({
    name: z.string().optional(),
    phone: z.string().optional()
});


export const adminValidationSchemas = {
    update
}