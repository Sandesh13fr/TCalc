export function formatOutput(data) {
  return JSON.stringify(data, null, 2);
}

export function validateInput(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.name || typeof data.name !== "string") return false;
  return true;
}

export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}
