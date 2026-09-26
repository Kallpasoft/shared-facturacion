/** Business fiscal data the host passes in (usually from its Empresa record). */
export interface DatosEmisorInput {
  ruc?: string | null;
  razon_social?: string | null;
}

export interface ValidacionEmisor {
  valido: boolean;
  ruc: string;
  razon_social: string;
}

/**
 * Is the host's fiscal data enough to register the emisor for NubeFact?
 *
 * With direct SUNAT the user types the RUC on screen; with NubeFact there is no
 * such input (the OSE emits with ITS credentials) and RUC / razón social come from
 * the host. The regex matches what the service requires on `POST /config/emisor`:
 * exactly 11 digits. Razón social only needs to be non-empty.
 */
export function validarDatosEmisor(input: DatosEmisorInput | null | undefined): ValidacionEmisor {
  const ruc = (input?.ruc ?? "").trim();
  const razon_social = (input?.razon_social ?? "").trim();
  return { valido: /^\d{11}$/.test(ruc) && razon_social.length > 0, ruc, razon_social };
}
