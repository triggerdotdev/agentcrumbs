import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isNamespaceEnabled, parseConfig, resetConfig, getApp, resetApp } from "../env.js";

describe("env", () => {
  const originalEnv = process.env.AGENTCRUMBS;
  const originalAppEnv = process.env.AGENTCRUMBS_APP;

  beforeEach(() => {
    resetConfig();
    resetApp();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENTCRUMBS;
    } else {
      process.env.AGENTCRUMBS = originalEnv;
    }
    if (originalAppEnv === undefined) {
      delete process.env.AGENTCRUMBS_APP;
    } else {
      process.env.AGENTCRUMBS_APP = originalAppEnv;
    }
    resetConfig();
    resetApp();
  });

  it("returns disabled when AGENTCRUMBS is not set", () => {
    delete process.env.AGENTCRUMBS;
    const config = parseConfig();
    expect(config.enabled).toBe(false);
  });

  it("enables all with AGENTCRUMBS=1", () => {
    process.env.AGENTCRUMBS = "1";
    expect(isNamespaceEnabled("anything")).toBe(true);
    expect(isNamespaceEnabled("foo:bar")).toBe(true);
  });

  it("enables all with AGENTCRUMBS=*", () => {
    process.env.AGENTCRUMBS = "*";
    expect(isNamespaceEnabled("anything")).toBe(true);
  });

  it("enables specific namespace with JSON config", () => {
    process.env.AGENTCRUMBS = '{"ns":"auth-service"}';
    expect(isNamespaceEnabled("auth-service")).toBe(true);
    expect(isNamespaceEnabled("api-gateway")).toBe(false);
  });

  it("supports wildcard patterns", () => {
    process.env.AGENTCRUMBS = '{"ns":"auth-*"}';
    expect(isNamespaceEnabled("auth-service")).toBe(true);
    expect(isNamespaceEnabled("auth-oauth")).toBe(true);
    expect(isNamespaceEnabled("api-gateway")).toBe(false);
  });

  it("supports multiple namespaces", () => {
    process.env.AGENTCRUMBS = '{"ns":"auth-*,api-*"}';
    expect(isNamespaceEnabled("auth-service")).toBe(true);
    expect(isNamespaceEnabled("api-gateway")).toBe(true);
    expect(isNamespaceEnabled("worker")).toBe(false);
  });

  it("supports exclusion patterns", () => {
    process.env.AGENTCRUMBS = '{"ns":"* -internal-*"}';
    expect(isNamespaceEnabled("auth-service")).toBe(true);
    expect(isNamespaceEnabled("internal-metrics")).toBe(false);
  });

  it("treats raw non-JSON string as namespace filter", () => {
    process.env.AGENTCRUMBS = "auth-*";
    expect(isNamespaceEnabled("auth-service")).toBe(true);
    expect(isNamespaceEnabled("worker")).toBe(false);
  });

  it("parses port from config", () => {
    process.env.AGENTCRUMBS = '{"ns":"*","port":9999}';
    const config = parseConfig();
    expect(config.enabled).toBe(true);
    if (config.enabled) {
      expect(config.port).toBe(9999);
    }
  });

  it("parses format from config", () => {
    process.env.AGENTCRUMBS = '{"ns":"*","format":"json"}';
    const config = parseConfig();
    expect(config.enabled).toBe(true);
    if (config.enabled) {
      expect(config.format).toBe("json");
    }
  });

  it("parses app from JSON config", () => {
    process.env.AGENTCRUMBS = '{"app":"my-app","ns":"*"}';
    const config = parseConfig();
    expect(config.enabled).toBe(true);
    if (config.enabled) {
      expect(config.app).toBe("my-app");
    }
  });

  describe("getApp", () => {
    it("returns app from JSON config as highest priority", () => {
      process.env.AGENTCRUMBS = '{"app":"json-app","ns":"*"}';
      process.env.AGENTCRUMBS_APP = "env-app";
      resetConfig();
      resetApp();
      expect(getApp()).toBe("json-app");
    });

    it("returns AGENTCRUMBS_APP when no JSON config app", () => {
      process.env.AGENTCRUMBS = '{"ns":"*"}';
      process.env.AGENTCRUMBS_APP = "env-app";
      resetConfig();
      resetApp();
      expect(getApp()).toBe("env-app");
    });

    it("returns AGENTCRUMBS_APP when AGENTCRUMBS=1", () => {
      process.env.AGENTCRUMBS = "1";
      process.env.AGENTCRUMBS_APP = "env-app";
      resetConfig();
      resetApp();
      expect(getApp()).toBe("env-app");
    });

    it("auto-detects from package.json when no explicit config", () => {
      delete process.env.AGENTCRUMBS_APP;
      delete process.env.AGENTCRUMBS;
      resetConfig();
      resetApp();
      const app = getApp();
      // Should find the agentcrumbs package.json in the repo
      expect(app).not.toBe("unknown");
      expect(typeof app).toBe("string");
    });

    it("caches the result", () => {
      process.env.AGENTCRUMBS_APP = "cached-app";
      resetApp();
      expect(getApp()).toBe("cached-app");
      // Change env — should still return cached value
      process.env.AGENTCRUMBS_APP = "different-app";
      expect(getApp()).toBe("cached-app");
    });
  });
});
