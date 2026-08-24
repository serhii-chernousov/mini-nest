import { Injectable } from "../decorators/injectable";
import { HttpException } from "../types";

const JSON_TYPE = "application/json; charset=utf-8";
const INTERNAL = {
  status: 500,
  type: JSON_TYPE,
  body: JSON.stringify({
    statusCode: 500,
    message: "Internal server error",
  }),
};

@Injectable()
export class ExceptionFilter {
  catch(error: unknown) {
    if (!(error instanceof HttpException)) return INTERNAL;
    return {
      status: error.status,
      type: JSON_TYPE,
      body: JSON.stringify(error.body),
    };
  }
}
