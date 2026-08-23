import "reflect-metadata";
import { createApp, createHttpServer } from "./app";

const PORT = process.env.PORT ?? 3001;
const { dispatcher } = createApp();

createHttpServer(dispatcher).listen(PORT, function () {
  console.log(`module http, port:${PORT}`);
});
