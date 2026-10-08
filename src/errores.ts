/**
 * Human-readable message for a facturación service failure.
 *
 * The service always answers `{ detail }`, so a business error carries its text.
 * The case that matters is a missing `response`: axios leaves it out when there
 * was **no HTTP response** (service down, CORS rejected, wrong baseURL). Treating
 * that as a data error ("check the data and retry") sends the user hunting for a
 * typo that does not exist.
 */
export function mensajeErrorFacturacion(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: unknown } } };

  if (!err?.response) {
    return "No se pudo contactar al servicio de facturación: no respondió. Verifica que esté disponible.";
  }
  const detail = err.response.data?.detail;
  return typeof detail === "string" && detail ? detail : fallback;
}

export type ClaseErrorEmision = "temporal" | "sin_conexion" | "rechazo";

export interface ErrorEmision {
  clase: ClaseErrorEmision;
  /** Short toast title. */
  titulo: string;
  /** Text for the cashier. Never names the provider; `rechazo` carries the service message. */
  mensaje: string;
  /** Raw provider text, for support. Empty when the failure had no response. */
  detalleTecnico: string;
}

/**
 * `detail` arrives as a string, `{ motivo | mensaje }` or a Pydantic 422 list.
 * Handing the object or array to a toast as a React child crashes the render, so
 * everything is reduced to a string here.
 */
function textoDeDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : ""))
      .filter(Boolean)
      .join(" · ");
  }
  if (detail && typeof detail === "object") {
    const o = detail as Record<string, unknown>;
    if (typeof o.mensaje === "string") return o.mensaje;
    if (typeof o.motivo === "string") return o.motivo;
  }
  return "";
}

/**
 * Classifies a failed emission: 502/503/504 are transient (SUNAT or the path to
 * it; the sale and its reserved number are fine), no response means the server was
 * not reached, anything else is a rejection or data to fix.
 */
export function clasificarErrorEmision(e: unknown, fallback = "No se pudo emitir el comprobante"): ErrorEmision {
  const err = e as { response?: { status?: number; data?: { detail?: unknown } } };
  const status = err?.response?.status;
  const texto = textoDeDetail(err?.response?.data?.detail);

  if (!err?.response) {
    return {
      clase: "sin_conexion",
      titulo: "Sin conexión",
      mensaje:
        "No se pudo llegar al servidor. La venta y el cobro quedaron guardados; emite el comprobante cuando vuelva la conexión.",
      detalleTecnico: "",
    };
  }
  if (status === 502 || status === 503 || status === 504) {
    return {
      clase: "temporal",
      titulo: "No se pudo emitir por ahora",
      mensaje:
        "SUNAT no respondió a la validación del comprobante. No es un problema de esta venta: el número reservado se conserva. Espera unos minutos y vuelve a intentar.",
      detalleTecnico: texto,
    };
  }
  return { clase: "rechazo", titulo: "Error al emitir", mensaje: texto || fallback, detalleTecnico: texto };
}
