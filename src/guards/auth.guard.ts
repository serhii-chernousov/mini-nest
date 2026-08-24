import { Injectable } from "../decorators/injectable";
import { Guard, RequestContext } from "../types";

@Injectable()
export class AuthGuard implements Guard {
  canActivate(ctx: RequestContext): boolean {
    const header = ctx.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    return typeof value === "string" && value.length > 0;
  }
}
