import http from "node:http";
import { Container } from "./container";
import { Dispatcher } from "./dispatcher";
import { UsersController } from "./modules/users/controller";
import { CONTROLLERS } from "./tokens";

export const DEFAULT_BODY_LIMIT = 1024 * 1024; // 1 MiB

export class PayloadTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super("Payload Too Large");
  }
}

export function createApp() {
  const container = new Container();
  container.bind(Container, container);
  container.bind(CONTROLLERS, [UsersController]);
  const dispatcher = container.resolve(Dispatcher);
  return { container, dispatcher };
}

function readBody(req: http.IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > limit) {
      return reject(new PayloadTooLargeError(limit));
    }

    const chunks: Buffer[] = [];
    let received = 0;

    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    };
    const onData = (chunk: Buffer) => {
      received += chunk.length;
      if (received > limit) {
        cleanup();
        req.pause();
        return reject(new PayloadTooLargeError(limit));
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

export function createHttpServer(
  dispatcher: Dispatcher,
  { bodyLimit = DEFAULT_BODY_LIMIT }: { bodyLimit?: number } = {},
) {
  return http.createServer(
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      try {
        const body = await readBody(req, bodyLimit);
        const out = await dispatcher.handle(
          req.method as "GET" | "POST",
          req.url ?? "/",
          body,
        );
        res.writeHead(out.status, { "Content-Type": out.type });
        res.end(out.body);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          res.writeHead(413, {
            "Content-Type": "application/json; charset=utf-8",
            Connection: "close",
          });
          res.end(
            JSON.stringify([
              { field: "body", constraints: ["Payload Too Large"] },
            ]),
          );
          return;
        }
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify([{ field: "body", constraints: ["Invalid JSON"] }]),
        );
      }
    },
  );
}
