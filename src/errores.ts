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
