import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  copyToClipboard,
  getSystemClipboardCommand,
  resetClipboardAdapter,
  setClipboardAdapter,
  type ClipboardAdapter,
} from "../src/utils/clipboard.js";
import { CliError } from "../src/utils/errors.js";

describe("clipboard utility", () => {
  beforeEach(() => {
    resetClipboardAdapter();
  });

  afterEach(() => {
    resetClipboardAdapter();
  });

  it("getSystemClipboardCommand returns platform specific commands", () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      expect(getSystemClipboardCommand()).toEqual({ cmd: "clip", args: [] });

      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      expect(getSystemClipboardCommand()).toEqual({ cmd: "pbcopy", args: [] });

      Object.defineProperty(process, "platform", { value: "linux", configurable: true });
      expect(getSystemClipboardCommand()).toEqual({ cmd: "xclip", args: ["-selection", "clipboard"] });
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    }
  });

  it("copyToClipboard delegates to custom adapter when registered", async () => {
    let written = "";
    const mockAdapter: ClipboardAdapter = {
      async writeText(text: string) {
        written = text;
      },
    };

    setClipboardAdapter(mockAdapter);
    await copyToClipboard("test scan report");
    expect(written).toBe("test scan report");
  });

  it("handles adapter write failure gracefully with CliError", async () => {
    const failingAdapter: ClipboardAdapter = {
      async writeText() {
        throw new CliError("Failed to copy scan result to clipboard: Clipboard tool 'xclip' is unavailable.");
      },
    };

    setClipboardAdapter(failingAdapter);
    await expect(copyToClipboard("scan output")).rejects.toThrow(CliError);
    await expect(copyToClipboard("scan output")).rejects.toThrow("Failed to copy scan result to clipboard");
  });
});
