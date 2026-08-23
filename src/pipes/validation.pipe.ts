import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Injectable } from "../decorators/injectable";
import { ArgumentMetadata } from "../types";

const SKIP = new Set<Function>([Object, String, Number, Boolean, Array]);

function flatten(errors: ValidationError[]) {
  return errors.map((e) => ({
    field: e.property,
    constraints: Object.values(e.constraints ?? {}),
  }));
}

@Injectable()
export class ValidationPipe {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    const metatype = metadata?.metatype;

    if (!metatype || SKIP.has(metatype)) return value;
    const instance = plainToInstance(metatype as new () => object, value);
    const errors = await validate(instance as object);
    if (errors.length > 0) {
      throw new BadRequestError(flatten(errors));
    }
    return instance;
  }
}

export class BadRequestError extends Error {
  constructor(
    public readonly errors: { field: string; constraints: string[] }[],
  ) {
    super("Bad Request");
  }
}
