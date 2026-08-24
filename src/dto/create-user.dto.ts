import z from "zod";

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});

export class CreateUserDto {
  static schema = CreateUserSchema;
  email!: string;
  name!: string;
}
