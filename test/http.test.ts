import http from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, createHttpServer } from "../src/app";
import { Container } from "../src/container";
import { PARAMS } from "../src/tokens";
import { CreateUserDto } from "../src/dto/create-user.dto";
import { Dispatcher } from "../src/dispatcher";
import { UsersController } from "../src/modules/users/controller";
import { UsersService } from "../src/modules/users/servise";
import { ParseIntPipe } from "../src/pipes/parse-int.pipe";

async function listen(server: http.Server) {
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("server has no port");
  }
  return `http://127.0.0.1:${address.port}`;
}

describe("HTTP", () => {
  let server: http.Server;
  let base: string;
  let container: Container;
  let dispatcher: Dispatcher;
  let usersService: UsersService;

  beforeAll(async () => {
    ({ container, dispatcher } = createApp());
    usersService = container.resolve(UsersService);
    server = createHttpServer(dispatcher);
    base = await listen(server);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function request(path: string, init?: RequestInit) {
    const res = await fetch(`${base}${path}`, init);
    const text = await res.text();
    return { status: res.status, text };
  }

  it("склеює префікс контролера з @Get(':id') — GET /users/42", async () => {
    const { status, text } = await request("/users/42");
    expect(status).toBe(200);
    expect(text).toMatch(/42/);
  });

  it("@Param підставляє id аргументом, а не з req", async () => {
    const spy = vi.spyOn(usersService, "userById");
    await request("/users/42");
    expect(spy).toHaveBeenCalledWith(42);
  });

  it("@Query підставляє limit окремим аргументом як number", async () => {
    const spy = vi.spyOn(usersService, "list");
    const { status, text } = await request("/users?limit=5");
    expect(status).toBe(200);
    expect(spy).toHaveBeenCalledWith(5);
    expect(JSON.parse(text)).toHaveLength(5);
  });

  it("@Body передає розпарсений JSON у метод", async () => {
    const spy = vi.spyOn(usersService, "createUser");
    const payload = { email: "ann@test.com", name: "Ann" };
    await request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatchObject(payload);
  });

  it("невалідний DTO дає 400 і тіло містить email", async () => {
    const { status, text } = await request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(status).toBe(400);
    expect(text).toMatch(/email/);
    const errors = JSON.parse(text) as { field: string; constraints: string[] }[];
    expect(errors.some((e) => e.field === "email")).toBe(true);
    expect(errors[0]).toHaveProperty("constraints");
  });

  it("валідний DTO доходить як instanceof CreateUserDto і дає 201", async () => {
    const spy = vi.spyOn(usersService, "createUser");
    const { status } = await request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ann@test.com", name: "Ann" }),
    });
    expect(status).toBe(201);
    expect(spy.mock.calls[0][0]).toBeInstanceOf(CreateUserDto);
  });

  it("контролер отримує той самий singleton UsersService, що й контейнер", () => {
    const controller = container.resolve(UsersController);
    expect(controller).toBe(container.resolve(UsersController));
    expect(controller["usersService"]).toBe(usersService);
    expect(container.resolve(UsersService)).toBe(usersService);
  });

  it("невідомий маршрут дає 404", async () => {
    const { status, text } = await request("/nope");
    expect(status).toBe(404);
    expect(text).toBe("Not Found");
  });

  it("ParseIntPipe пише ім'я query-параметра в 400", async () => {
    const { status, text } = await request("/users?limit=abc");
    expect(status).toBe(400);
    expect(text).toMatch(/limit/);
  });
});

describe("параметр-декоратори", () => {
  it("записують мапу { index: { type, name } } у метадані методу", () => {
    const meta = Reflect.getOwnMetadata(
      PARAMS,
      UsersController.prototype,
      "userById",
    );
    expect(meta[0]).toEqual({
      type: "param",
      name: "id",
      pipes: [ParseIntPipe],
    });
  });

  it("вішають pipes на той самий індекс, не дістаючи значення самі", () => {
    const meta = Reflect.getOwnMetadata(
      PARAMS,
      UsersController.prototype,
      "list",
    );
    expect(meta[0]).toEqual({
      type: "query",
      name: "limit",
      pipes: [ParseIntPipe],
    });
  });
});

describe("HTTP: ліміт тіла", () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    const { dispatcher } = createApp();
    server = createHttpServer(dispatcher, { bodyLimit: 64 });
    base = await listen(server);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const big = JSON.stringify({ email: "ann@test.com", name: "A".repeat(200) });
  const headers = { "Content-Type": "application/json" };

  it("тіло понад ліміт (Content-Length) → 413 і Connection: close", async () => {
    const res = await fetch(`${base}/users`, { method: "POST", headers, body: big });
    const text = await res.text();
    expect(res.status).toBe(413);
    expect(res.headers.get("connection")).toBe("close");
    const errors = JSON.parse(text) as { field: string; constraints: string[] }[];
    expect(errors[0].field).toBe("body");
    expect(text).toMatch(/Payload Too Large/);
  });

  it("тіло понад ліміт без Content-Length (chunked) → 413", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const res = await fetch(`${base}/users`, {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(res.status).toBe(413);
    expect(res.headers.get("connection")).toBe("close");
  });

  it("після 413 сервер далі обслуговує запити", async () => {
    const res = await fetch(`${base}/users/1`);
    expect(res.status).toBe(200);
  });

  it("тіло в межах ліміту проходить як раніше → 201", async () => {
    const small = JSON.stringify({ email: "a@b.co", name: "A" });
    expect(small.length).toBeLessThanOrEqual(64);
    const res = await fetch(`${base}/users`, { method: "POST", headers, body: small });
    expect(res.status).toBe(201);
  });
});
