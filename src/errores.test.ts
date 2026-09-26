import { expect, test } from "vitest";
import { mensajeErrorFacturacion } from "./errores.js";

const FALLBACK = "Revisa los datos.";

test("no response: blames the service, not the data", () => {
  const m = mensajeErrorFacturacion({ message: "Network Error" }, FALLBACK);
  expect(m).not.toContain("Revisa los datos");
  expect(m).toContain("servicio de facturación");
});

test("service detail is shown as is", () => {
  expect(mensajeErrorFacturacion({ response: { data: { detail: "RUC no autorizado" } } }, FALLBACK)).toBe(
    "RUC no autorizado",
  );
});

test("response without detail, empty detail or non-string detail falls back", () => {
  expect(mensajeErrorFacturacion({ response: { data: {} } }, FALLBACK)).toBe(FALLBACK);
  expect(mensajeErrorFacturacion({ response: { data: { detail: "" } } }, FALLBACK)).toBe(FALLBACK);
  expect(mensajeErrorFacturacion({ response: { data: { detail: { a: 1 } } } }, FALLBACK)).toBe(FALLBACK);
});
