export const defaultConfig = {
  inputPath: "./data/input.json",
  outputPath: "./data/output.json",
  maxRetries: 3,
  timeout: 5000,
  verbose: false,
};

let cachedConfig = null;

export async function loadConfig(overrides = {}) {
  if (cachedConfig) {
    return { ...cachedConfig, ...overrides };
  }
  cachedConfig = { ...defaultConfig };
  return { ...cachedConfig, ...overrides };
}

export function resetConfig() {
  cachedConfig = null;
}

export function getApiEndpoint() {
  return process.env.API_URL || "http://localhost:3000";
}
