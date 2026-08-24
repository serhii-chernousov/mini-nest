import { describe, expect, it } from "vitest";
import { ExceptionFilter } from "../src/filters/exception.filter";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
} from "../src/types";

const filter = new ExceptionFilter();

function parse(body: string) {
  return JSON.parse(body) as unknown;
}

describe("ExceptionFilter", () => {
  it("мапить NotFoundError на 404 з осмисленим повідомленням", () => {
    const out = filter.catch(new NotFoundError("User 7 not found"));
    expect(out.status).toBe(404);
    expect(parse(out.body)).toEqual({
      statusCode: 404,
      message: "User 7 not found",
    });
  });

  it("мапить ForbiddenError на 403", () => {
    const out = filter.catch(new ForbiddenError());
    expect(out.status).toBe(403);
    expect(parse(out.body)).toEqual({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("мапить BadRequestError на 400 зі списком полів", () => {
    const errors = [{ field: "email", constraints: ["Invalid email"] }];
    const out = filter.catch(new BadRequestError(errors));
    expect(out.status).toBe(400);
    expect(parse(out.body)).toEqual(errors);
  });

  it("мапить PayloadTooLargeError на 413", () => {
    const out = filter.catch(new PayloadTooLargeError());
    expect(out.status).toBe(413);
    expect(parse(out.body)).toEqual({
      statusCode: 413,
      message: "Payload Too Large",
    });
  });

  it("мапить невідому помилку на 500 без повідомлення і стека", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at users.ts:12:3";
    const out = filter.catch(err);
    expect(out.status).toBe(500);
    expect(out.body).not.toMatch(/boom|at .*\.ts:/);
    expect(parse(out.body)).toEqual({
      statusCode: 500,
      message: "Internal server error",
    });
  });
});
