import z from "zod";
import { Injectable } from "../decorators/injectable";
import { ArgumentMetadata, BadRequestError, Ctor } from "../types";

@Injectable()
export class ZodValidationPipe {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema = (metadata.metatype as { schema?: z.ZodType })?.schema;
    if (!schema) return value;

    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || (metadata.data ?? "value"),
          constraints: [issue.message],
        })),
      );
    }
    const Metatype = metadata.metatype as Ctor | undefined;
    if (typeof Metatype === "function") {
      return Object.assign(new Metatype() as object, parsed.data as object);
    }
    return parsed.data;
  }
}
