import http from "node:http";
import { Container } from "./container";
import { Dispatcher } from "./dispatcher";
import { ExceptionFilter } from "./filters/exception.filter";
import { CONTROLLERS, INTERCEPTORS, MIDDLEWARES } from "./tokens";
import { UsersController } from "./controllers/users";
import { AppMiddleware } from "./middleware/app.middlware";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { BadRequestError, PayloadTooLargeError } from "./types";
import {
  getRequestId,
  runWithRequestContext,
  sanitizeRequestId,
} from "./context/request-context";

export const MAX_BODY = Number(process.env.MAX_BODY_BYTES ?? 1024 * 1024);

export function createApp() {
  const container = new Container();
  container.bind(Container, container);
  container.bind(CONTROLLERS, [UsersController]);
  container.bind(MIDDLEWARES, [AppMiddleware]);
  container.bind(INTERCEPTORS, [LoggingInterceptor]);
  const dispatcher = container.resolve(Dispatcher);
  return { container, dispatcher };
}

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let done = false;

    req.on("data", (chunk) => {
      if (done) return;
      length += chunk.length;
      if (length > MAX_BODY) {
        done = true;
        req.pause();
        reject(new PayloadTooLargeError());
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(
          new BadRequestError([
            { field: "body", constraints: ["Invalid JSON"] },
          ]),
        );
      }
    });
    req.on("error", (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

function readRequestId(headers: http.IncomingHttpHeaders): string {
  const raw = headers["x-request-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return sanitizeRequestId(value);
}

function writeResponse(
  res: http.ServerResponse,
  out: { status: number; type: string; body: string },
) {
  res.writeHead(out.status, {
    "Content-Type": out.type,
    "X-Request-Id": getRequestId() ?? "",
  });
  res.end(out.body);
}

export function createHttpServer(
  dispatcher: Dispatcher,
  exceptionFilter = new ExceptionFilter(),
) {
  return http.createServer(
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      await runWithRequestContext(readRequestId(req.headers), async () => {
        try {
          const body = await readBody(req);
          const out = await dispatcher.handle({
            method: req.method ?? "GET",
            url: req.url ?? "/",
            headers: req.headers,
            body,
            params: {},
          });
          writeResponse(res, out);
        } catch (error) {
          writeResponse(res, exceptionFilter.catch(error));
          if (error instanceof PayloadTooLargeError) req.destroy();
        }
      });
    },
  );
}
