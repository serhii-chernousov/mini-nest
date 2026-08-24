import http from "node:http";
import { Container } from "./container";
import { Dispatcher } from "./dispatcher";
import { UsersController } from "./modules/users/controller";
import { CONTROLLERS } from "./tokens";

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
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
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
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify([{ field: "body", constraints: ["Invalid JSON"] }]),
        );
      }
    },
  );
}
