import type { QueryKey } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import { createContext, useContext, useMemo, type ReactNode } from "react";

/** Host sale query keys invalidated after emitting / voiding (ferretería's by default). */
export type VentaQueryKeys = (documentoRef: string | number) => QueryKey[];

const defaultVentaQueryKeys: VentaQueryKeys = (ref) => [["ventas"], [`venta-${ref}`]];

interface FacturacionContextValue {
  client: AxiosInstance;
  ventaQueryKeys: VentaQueryKeys;
}

const FacturacionContext = createContext<FacturacionContextValue | null>(null);

export interface FacturacionProviderProps {
  client: AxiosInstance;
  /**
   * The service writes the comprobante number back into the host sale, so the
   * host's sale queries go stale after emitting or voiding. Return their keys here.
   */
  ventaQueryKeys?: VentaQueryKeys;
  children: ReactNode;
}

export function FacturacionProvider({ client, ventaQueryKeys = defaultVentaQueryKeys, children }: FacturacionProviderProps) {
  const value = useMemo(() => ({ client, ventaQueryKeys }), [client, ventaQueryKeys]);
  return <FacturacionContext.Provider value={value}>{children}</FacturacionContext.Provider>;
}

function useFacturacionContext(): FacturacionContextValue {
  const ctx = useContext(FacturacionContext);
  if (!ctx) throw new Error("Facturación hooks need a <FacturacionProvider client={...}> above them");
  return ctx;
}

/** The axios instance given to the provider (for one-off calls such as `descargarBajaCdr`). */
export const useFacturacionClient = (): AxiosInstance => useFacturacionContext().client;

export const useVentaQueryKeys = (): VentaQueryKeys => useFacturacionContext().ventaQueryKeys;
