import { z } from "zod";

export const idSchema = z.uuid();
export const nonNegativeNumber = z.coerce.number().min(0);
export const positiveNumber = z.coerce.number().gt(0);
