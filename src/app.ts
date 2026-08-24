import http from "node:http";
import { Container } from "./container";
import { Dispatcher } from "./dispatcher";
import { UsersController } from "./modules/users/controller";
import { CONTROLLERS } from "./tokens";

export const MAX_BODY = Number(process.env.MAX_BODY_BYTES ?? 1024 * 1024);

class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
    this.name = "PayloadTooLargeError";
  }
}

export function createApp() {
  const container = new Container();
  container.bind(Container, container);
  container.bind(CONTROLLERS, [UsersController]);
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
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

export function createHttpServer(dispatcher: Dispatcher) {
  return http.createServer(
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      try {
        const body = await readBody(req);
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
          });
          res.end(
            JSON.stringify({ statusCode: 413, message: "Payload Too Large" }),
          );
          req.destroy();
        } else {
          res.writeHead(400, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify([{ field: "body", constraints: ["Invalid JSON"] }]),
          );
        }
      }
    },
  );
}
