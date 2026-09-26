import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacturacionClient } from "../context.js";
import { facturacionKeys } from "../keys.js";
import type {
  AltaEmisorRequest,
  AutorizacionSunat,
  FacturacionConfig,
  ProviderKind,
  ResultadoAlta,
  SaveSunatConfigRequest,
} from "../types.js";

const KEY = facturacionKeys.config;

/** Tenant configuration state (provider + emisor data, no secrets). */
export function useFacturacionConfig() {
  const api = useFacturacionClient();
  return useQuery<FacturacionConfig>({
    queryKey: KEY,
    // Changes rarely, and every mutation below invalidates it; 5 min saves CORS preflights.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await api.get("/config")).data,
  });
}

/** Saves the SUNAT config (and optionally the provider). */
export function useSaveSunatConfig() {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; registro?: ResultadoAlta }, unknown, SaveSunatConfigRequest>({
    mutationFn: async (body) => (await api.post("/config/sunat", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Changes only the emission provider. Own endpoint because `/config/sunat` always
 * requires ruc / razon_social / sol_user, which NubeFact does not use.
 */
export function useSetProvider() {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, unknown, ProviderKind>({
    mutationFn: async (provider) => (await api.put("/config/provider", { provider })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Registers the emisor's fiscal data without SUNAT credentials (NubeFact path).
 * Without it the tenant has no registry row and its first emission dies with 409.
 */
export function useAltaEmisor() {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; registro?: ResultadoAlta }, unknown, AltaEmisorRequest>({
    mutationFn: async (body) => (await api.post("/config/emisor", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Turns automatic emission on/off. */
export function useSetAutoEmitir() {
  const api = useFacturacionClient();
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, unknown, boolean>({
    mutationFn: async (auto_emitir) => (await api.put("/config/auto-emitir", { auto_emitir })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Authorization probe against SUNAT. A mutation on purpose: it goes out to SUNAT,
 * so it only runs when someone asks, never on mount or window focus.
 */
export function useVerificarAutorizacion() {
  const api = useFacturacionClient();
  return useMutation<AutorizacionSunat, unknown, void>({
    mutationFn: async () => (await api.get("/config/sunat/verificar")).data,
  });
}
