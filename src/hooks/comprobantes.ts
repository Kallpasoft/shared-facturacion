import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { useFacturacionClient, useVentaQueryKeys, type VentaQueryKeys } from "../context.js";
import { facturacionKeys } from "../keys.js";
import type {
  AnularComprobanteRequest,
  BajaCdrResponse,
  BajaResult,
  ComprobanteListItem,
  ComprobanteResult,
  EmitirComprobanteRequest,
} from "../types.js";

const KEY = facturacionKeys.comprobantes;

/** The service writes back into the host sale, so the sale and the list go stale. */
function invalidar(qc: QueryClient, ventaQueryKeys: VentaQueryKeys, documentoRef: string | number) {
  for (const queryKey of ventaQueryKeys(documentoRef)) qc.invalidateQueries({ queryKey });
  qc.invalidateQueries({ queryKey: KEY });
}

/**
 * Is there an emission in flight for this sale? Reads React Query's GLOBAL mutation
 * state, so it sees an auto-emission fired from a page that already unmounted and
 * prevents a duplicate emission from a second click.
 */
export function useEmitiendoComprobante(documentoRef: string | number): boolean {
  return (
    useIsMutating({
      mutationKey: facturacionKeys.emitir,
      predicate: (m) =>
        String((m.state.variables as EmitirComprobanteRequest | undefined)?.documento_ref) === String(documentoRef),
    }) > 0
  );
}

/** Emits a comprobante (factura/boleta) for a host sale. */
export function useEmitirComprobante() {
  const api = useFacturacionClient();
  const ventaQueryKeys = useVentaQueryKeys();
  const qc = useQueryClient();
  return useMutation<ComprobanteResult, unknown, EmitirComprobanteRequest>({
    // Keyed so `useEmitiendoComprobante` can find it from another page.
    mutationKey: facturacionKeys.emitir,
    mutationFn: async (body) => (await api.post("/comprobantes", body)).data,
    onSuccess: (_data, v) => invalidar(qc, ventaQueryKeys, v.documento_ref),
  });
}

/** Voids (comunicación de baja) a comprobante accepted by SUNAT. */
export function useAnularComprobante() {
  const api = useFacturacionClient();
  const ventaQueryKeys = useVentaQueryKeys();
  const qc = useQueryClient();
  return useMutation<BajaResult, unknown, AnularComprobanteRequest>({
    mutationFn: async (body) => (await api.post("/comprobantes/baja", body)).data,
    onSuccess: (_data, v) => invalidar(qc, ventaQueryKeys, v.documento_ref),
  });
}

/**
 * Re-checks a baja ticket and persists the outcome. A GET modeled as a mutation
 * because it CHANGES state (the service may write `de_baja` into the sale), and it
 * must be fired by hand, never on mount.
 */
export function useConsultarBaja() {
  const api = useFacturacionClient();
  const ventaQueryKeys = useVentaQueryKeys();
  const qc = useQueryClient();
  return useMutation<BajaResult, unknown, string | number>({
    mutationFn: async (ref) => (await api.get(`/comprobantes/baja/${ref}/estado`)).data,
    onSuccess: (_data, ref) => invalidar(qc, ventaQueryKeys, ref),
  });
}

/**
 * Downloads the baja CDR zip. Auth travels with axios (cookie / proxy), so the
 * base64 is fetched and the Blob built client-side; a plain <a href> would not
 * carry it. Throws the axios error (404/409) for the caller to report.
 */
export async function descargarBajaCdr(api: AxiosInstance, documentoRef: string | number): Promise<void> {
  const { data } = await api.get<BajaCdrResponse>(`/comprobantes/baja/${documentoRef}/cdr`);
  const bytes = Uint8Array.from(atob(data.cdr_zip_base64), (ch) => ch.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = data.filename || `constancia-baja-${documentoRef}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Comprobantes issued by the tenant. */
export function useComprobantes() {
  const api = useFacturacionClient();
  return useQuery<{ items: ComprobanteListItem[] }>({
    queryKey: KEY,
    queryFn: async () => (await api.get("/comprobantes")).data,
  });
}

/** One comprobante. */
export function useComprobante(id: string | null) {
  const api = useFacturacionClient();
  return useQuery<ComprobanteListItem>({
    queryKey: [...KEY, id],
    enabled: !!id,
    queryFn: async () => (await api.get(`/comprobantes/${id}`)).data,
  });
}
