/** Only boleta and factura are sent to SUNAT: a nota de venta is not a fiscal document. */
export type TipoComprobante = "factura" | "boleta";

export interface EmitirComprobanteRequest {
  documento_ref: string | number;
  tipo: TipoComprobante;
  serie?: string;
  enviar_al_cliente?: boolean;
}

/** Emission environment: "beta" is the SUNAT sandbox, with no fiscal validity. */
export type Ambiente = "beta" | "prod";

export interface ComprobanteResult {
  id: string;
  estado: string;
  tipo: TipoComprobante;
  serie: string;
  numero: number;
  numero_comprobante: string;
  ambiente: Ambiente;
  aceptada_por_sunat: boolean | null;
  sunat_description: string | null;
  url: string | null;
  pdf_zip_base64: string | null;
}

/** Body of POST /comprobantes/baja (voiding / comunicación de baja to SUNAT). */
export interface AnularComprobanteRequest {
  documento_ref: string | number;
  motivo: string;
  cancelar_venta?: boolean;
}

/** Status of a comunicación de baja before SUNAT. */
export type EstadoBaja = "aceptado" | "pendiente" | "rechazado" | "error";

/** Result of POST /comprobantes/baja and GET /comprobantes/baja/{ref}/estado. */
export interface BajaResult {
  documento_ref: string;
  tipo: TipoComprobante;
  serie: string;
  numero: number;
  numero_comprobante: string;
  estado_baja: EstadoBaja;
  ticket: string | null;
  sunat_description: string | null;
  fecha_baja: string | null;
  cancelar_venta: boolean;
}

/** Response of GET /comprobantes/baja/{ref}/cdr (proof of the voiding). */
export interface BajaCdrResponse {
  documento_ref: string;
  numero_comprobante: string;
  estado_baja: string | null;
  filename: string;
  cdr_zip_base64: string;
}

export interface ComprobanteListItem {
  id: string;
  tipo: TipoComprobante;
  serie: string;
  numero: number;
  estado: string;
  ambiente: Ambiente;
  aceptada_por_sunat: boolean | null;
  /** null = no baja started; "aceptado" = voided before SUNAT. */
  estado_baja: EstadoBaja | null;
  /**
   * Why it was not accepted. `errors` comes from the provider (NubeFact);
   * `sunat_description` from direct emission. Without it a rejection says nothing
   * in the list and the reason only lived in a toast that closed itself.
   */
  errors: string | null;
  sunat_description: string | null;
  url: string | null;
  total: number | null;
  documento_ref: string;
  created_at: string;
}

export type ProviderKind = "sunat" | "nubefact";
export type SunatEndpoint = "beta" | "prod";

/** Configuration state (no secrets) returned by GET /config. */
export interface FacturacionConfig {
  provider: ProviderKind;
  /** When true, boleta/factura sales are emitted automatically when registered. */
  auto_emitir: boolean;
  sunat: {
    ruc: string;
    razon_social: string;
    domicilio_fiscal: string;
    ubigeo: string;
    codigo_anexo: string;
    sol_user: string;
    endpoint: SunatEndpoint;
    cert_cargado: boolean;
    /** Certificate expiry (ISO), or null if the .pfx could not be read. */
    cert_expira_at: string | null;
  } | null;
}

/**
 * Response of GET /config/sunat/verificar: is the SOL user still authorized to
 * send comprobantes? Answered WITHOUT emitting anything.
 *
 * `sin_respuesta` is not a verdict: SUNAT could not be reached and the
 * permission may be perfectly fine.
 */
export interface AutorizacionSunat {
  estado: "autorizado" | "no_autorizado" | "sin_respuesta";
  codigo: string | null;
  hint: string | null;
  fault: string | null;
  ruc: string;
  sol_user: string;
  endpoint: SunatEndpoint;
}

/** Body of POST /config/sunat. Secrets are optional on updates. */
export interface SaveSunatConfigRequest {
  ruc: string;
  razon_social: string;
  domicilio_fiscal?: string;
  ubigeo?: string;
  codigo_anexo?: string;
  sol_user: string;
  sol_pass?: string;
  cert_pfx_base64?: string;
  cert_pass?: string;
  endpoint: SunatEndpoint;
  provider?: ProviderKind;
}

/** Body of POST /config/emisor: registers the emisor without SUNAT credentials (OSE path). */
export interface AltaEmisorRequest {
  ruc: string;
  razon_social: string;
  domicilio_fiscal?: string;
  ubigeo?: string;
  codigo_anexo?: string;
  endpoint: SunatEndpoint;
}

/** Why the emisor registration did not go through even though the config was saved. */
export type MotivoOmisionAlta =
  | "ruc_ya_registrado"
  | "ruc_divergente"
  | "cert_distinto"
  | "ya_emitio"
  | "sin_host_api_url"
  | "host_no_permitido"
  | "entorno_local"
  | "error_interno";

/**
 * Result of registering the tenant in the master facturación service, carried in
 * the response of `POST /config/sunat` and `POST /config/emisor`.
 *
 * Show it: `omitido` means the credentials WERE saved but the tenant is NOT
 * enabled to emit; otherwise the user finds out at the first 409, with the sale
 * already charged.
 */
export type ResultadoAlta =
  | { estado: "creado"; registryId: string }
  | { estado: "existente" }
  | { estado: "omitido"; motivo: MotivoOmisionAlta; detalle: string };

/** A fiscal series as returned by GET /series (one row per series and ambiente). */
export interface SerieFiscal {
  serie: string;
  tipo_doc: string;
  tipo: TipoComprobante;
  ambiente: Ambiente;
  correlativo: number;
  longitud: number;
  activo: boolean;
  es_default: boolean;
}

/** Response of GET /series. */
export interface SeriesResponse {
  ok: true;
  registro: { ambiente_default: Ambiente; modo_correlativo: string };
  series: SerieFiscal[];
}

/** Body of POST /series. */
export interface CrearSerieRequest {
  tipo: TipoComprobante;
  serie: string;
  longitud?: number;
  es_default?: boolean;
  /** Last number ALREADY issued by the previous system (migration). Only on create. */
  correlativo?: number;
}

/** Body of PATCH /series/{serie}. `correlativo` is not editable by design. */
export interface ActualizarSerieRequest {
  serie: string;
  es_default?: true;
  activo?: boolean;
  longitud?: number;
}
