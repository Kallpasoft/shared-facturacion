import type { AxiosAdapter } from "axios";
import { expect, test, vi } from "vitest";
import { createFacturacionClient } from "./client.js";

/** Adapter that answers 401 until `authed` flips, then 200. */
function fakeServer() {
  const state = { authed: false, calls: 0 };
  const adapter: AxiosAdapter = async (config) => {
    state.calls++;
    const status = state.authed ? 200 : 401;
    const res = { data: { ok: state.authed }, status, statusText: "", headers: {}, config };
    if (status === 401) throw Object.assign(new Error("401"), { config, response: res, isAxiosError: true });
    return res;
  };
  return { state, adapter };
}

test("401 → onUnauthorized once for concurrent requests, then retries", async () => {
  const { state, adapter } = fakeServer();
  const onUnauthorized = vi.fn(async () => {
    state.authed = true;
    return true;
  });
  const client = createFacturacionClient({ baseURL: "http://x", onUnauthorized });
  client.defaults.adapter = adapter;

  const [a, b] = await Promise.all([client.get("/config"), client.get("/comprobantes")]);
  expect(a.data.ok && b.data.ok).toBe(true);
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test("onUnauthorized false → original 401 rejects, no retry", async () => {
  const { state, adapter } = fakeServer();
  const client = createFacturacionClient({ baseURL: "http://x", onUnauthorized: async () => false });
  client.defaults.adapter = adapter;

  await expect(client.get("/config")).rejects.toMatchObject({ response: { status: 401 } });
  expect(state.calls).toBe(1);
});

test("still 401 after refresh → rejects instead of looping", async () => {
  const { state, adapter } = fakeServer();
  const onUnauthorized = vi.fn(async () => true);
  const client = createFacturacionClient({ baseURL: "http://x", onUnauthorized });
  client.defaults.adapter = adapter;

  await expect(client.get("/config")).rejects.toMatchObject({ response: { status: 401 } });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  expect(state.calls).toBe(2);
});
