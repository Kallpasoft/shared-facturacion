import { expect, test } from "vitest";
import { clasificarErrorEmision, mensajeErrorFacturacion } from "./errores.js";

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

const resp = (status: number, detail: unknown) => ({ response: { status, data: { detail } } });

test("clasificarErrorEmision: 502/503/504 are temporal and keep the raw text apart", () => {
  for (const s of [502, 503, 504]) {
    const r = clasificarErrorEmision(resp(s, "Client.0111 Clave SOL ..."));
    expect(r.clase).toBe("temporal");
    expect(r.titulo).toBe("No se pudo emitir por ahora");
    expect(r.mensaje).not.toContain("Clave SOL");
    expect(r.detalleTecnico).toBe("Client.0111 Clave SOL ...");
  }
});

test("clasificarErrorEmision: no response is sin_conexion", () => {
  const r = clasificarErrorEmision({ message: "Network Error" });
  expect(r.clase).toBe("sin_conexion");
  expect(r.mensaje).toContain("quedaron guardados");
});

test("clasificarErrorEmision: other statuses are rechazo with the service message", () => {
  const r = clasificarErrorEmision(resp(400, "RUC no autorizado"));
  expect(r).toMatchObject({ clase: "rechazo", mensaje: "RUC no autorizado", detalleTecnico: "RUC no autorizado" });
});

test("clasificarErrorEmision: object and 422 list details become strings", () => {
  expect(clasificarErrorEmision(resp(409, { mensaje: "Ya emitida" })).mensaje).toBe("Ya emitida");
  expect(clasificarErrorEmision(resp(422, [{ msg: "falta serie" }, { msg: "falta tipo" }])).mensaje).toBe(
    "falta serie · falta tipo",
  );
  expect(clasificarErrorEmision(resp(500, {}), "Fallback").mensaje).toBe("Fallback");
});
