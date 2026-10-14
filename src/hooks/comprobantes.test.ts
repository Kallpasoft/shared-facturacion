import axios, { type AxiosAdapter } from "axios";
import { expect, test, vi } from "vitest";
import { descargarEmisionCdr, descargarEmisionXml } from "./comprobantes.js";

/** Fake service + minimal DOM: records the path asked and the file "saved". */
function setup(body: Record<string, string>) {
  const pedidos: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    pedidos.push(config.url ?? "");
    return { data: body, status: 200, statusText: "", headers: {}, config };
  };
  const a = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal("document", { createElement: () => a, body: { appendChild: vi.fn() } });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  return { api: axios.create({ adapter }), pedidos, a };
}

test("descargarEmisionCdr pide /comprobantes/:ref/cdr y guarda con el nombre del servicio", async () => {
  const { api, pedidos, a } = setup({ filename: "R-F001-7.zip", cdr_zip_base64: btoa("zip") });
  await descargarEmisionCdr(api, 42);
  expect(pedidos).toEqual(["/comprobantes/42/cdr"]);
  expect(a.download).toBe("R-F001-7.zip");
  expect(a.click).toHaveBeenCalledOnce();
});

test("descargarEmisionXml pide /comprobantes/:ref/xml y cae al nombre por defecto", async () => {
  const { api, pedidos, a } = setup({ filename: "", xml_zip_base64: btoa("zip") });
  await descargarEmisionXml(api, 42);
  expect(pedidos).toEqual(["/comprobantes/42/xml"]);
  expect(a.download).toBe("xml-42.zip");
});
