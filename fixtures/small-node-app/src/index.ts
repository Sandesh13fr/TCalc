import { serve } from "./server.js";
import type { AppConfig } from "./types.js";

const config: AppConfig = { port: 3000, host: "localhost" };
serve(config);
