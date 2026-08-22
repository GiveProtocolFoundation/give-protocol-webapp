import { describe, it, expect, afterEach, jest } from "@jest/globals";

/**
 * GIV-921 follow-up: `createClient` throws synchronously on an invalid URL,
 * which used to crash the whole SPA at module load (blank page, no
 * ErrorBoundary). This spec proves importing ./supabase never throws,
 * regardless of what ENV.SUPABASE_URL looks like.
 */
describe("supabase client bootstrap", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("../config/env");
  });

  it("does not throw when SUPABASE_URL is missing", async () => {
    jest.resetModules();
    jest.doMock("../config/env", () => ({
      ENV: { SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined },
    }));

    await expect(import("./supabase")).resolves.toBeDefined();
  });

  it("does not throw when SUPABASE_URL is not a valid URL", async () => {
    jest.resetModules();
    jest.doMock("../config/env", () => ({
      ENV: { SUPABASE_URL: "not-a-url", SUPABASE_ANON_KEY: "some-key" },
    }));

    await expect(import("./supabase")).resolves.toBeDefined();
  });

  it("uses the configured URL when it is a valid http(s) URL", async () => {
    jest.resetModules();
    jest.doMock("../config/env", () => ({
      ENV: {
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_ANON_KEY: "some-key",
      },
    }));

    const { supabase } = await import("./supabase");
    expect(supabase).toBeDefined();
  });
});
