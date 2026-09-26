import { expect, test } from "vitest";
import { validarDatosEmisor } from "./validar-datos-emisor.js";

const RS = "MI NEGOCIO SAC";

test("11-digit RUC and razón social: valid", () => {
  expect(validarDatosEmisor({ ruc: "20123456789", razon_social: RS }).valido).toBe(true);
});

test.each([
  ["null", null],
  ["undefined", undefined],
  ["empty RUC", { ruc: "", razon_social: RS }],
  ["short RUC", { ruc: "2012345", razon_social: RS }],
  ["RUC with letters", { ruc: "2012345678A", razon_social: RS }],
  ["empty razón social", { ruc: "20123456789", razon_social: "" }],
  ["blank razón social", { ruc: "20123456789", razon_social: "   " }],
])("%s: invalid", (_name, input) => {
  expect(validarDatosEmisor(input).valido).toBe(false);
});

test("trims and returns clean values", () => {
  expect(validarDatosEmisor({ ruc: "  20123456789  ", razon_social: `  ${RS}  ` })).toEqual({
    valido: true,
    ruc: "20123456789",
    razon_social: RS,
  });
});
