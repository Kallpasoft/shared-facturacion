import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useFacturacionClient } from "../context.js";
import { facturacionKeys } from "../keys.js";
import type { ActualizarSerieRequest, CrearSerieRequest, SeriesResponse, TipoComprobante } from "../types.js";

/** Mirror of the service's `ck_serie_prefijo`, plus the prefix per tipo. */
const RE_SERIE_FISCAL: Record<TipoComprobante, RegExp> = {
  factura: /^F[A-Z0-9]{3}$/,
  boleta: /^B[A-Z0-9]{3}$/,
};

/** Narrows a host document type (which may include e.g. "nota_venta") to a fiscal one. */
export const esTipoFiscal = (t: string): t is TipoComprobante => t in RE_SERIE_FISCAL;

export const serieFiscalValida = (tipo: TipoComprobante, serie: string) => RE_SERIE_FISCAL[tipo].test(serie);

type ErrorApi = AxiosError<{ detail?: string }>;

export interface SerieMutationOptions {
  /**
   * Awaited inside the mutation after the service write, e.g. to resync a host-side
   * mirror of the series before the mutation settles.
   */
  afterWrite?: () => Promise<unknown>;
}

/** Fiscal series of the tenant. The service numbers them: this is the source of truth. */
export function useSeries() {
  const api = useFacturacionClient();
  return useQuery<SeriesResponse>({
    queryKey: facturacionKeys.series,
    queryFn: async () => (await api.get("/series")).data,
  });
}

export function useCrearSerieFiscal({ afterWrite }: SerieMutationOptions = {}) {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<void, ErrorApi, CrearSerieRequest>({
    mutationFn: async (body) => {
      await api.post("/series", body);
      await afterWrite?.();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: facturacionKeys.series }),
  });
}

export function useActualizarSerieFiscal({ afterWrite }: SerieMutationOptions = {}) {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<void, ErrorApi, ActualizarSerieRequest>({
    mutationFn: async ({ serie, ...body }) => {
      await api.patch(`/series/${serie}`, body);
      await afterWrite?.();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: facturacionKeys.series }),
  });
}
