import { Injectable } from "../decorators/injectable";
import { ArgumentMetadata } from "../types";
import { BadRequestError } from "./validation.pipe";

@Injectable()
export class ParseIntPipe {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const n = Number.parseInt(String(value), 10);
    if (Number.isNaN(n) || String(n) !== String(value).trim()) {
      throw new BadRequestError([
        {
          field: metadata?.data ?? "value",
          constraints: ["must be an integer"],
        },
      ]);
    }
    return n;
  }
}
