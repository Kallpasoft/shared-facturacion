# @kallpasoft/facturacion

Tipos, cliente axios y hooks de TanStack Query para hablar con el **servicio maestro de
facturación** (`ferreteria-system/services/facturacion/`): configuración del emisor, emisión de
comprobantes, comunicación de baja y series fiscales. **Sin UI**: cada producto pone sus pantallas,
sus botones y sus toasts.

**Lo usan:** `ferreteria-system` (origen) · `foody`. `auto-system` tiene su propia copia del módulo
y queda pendiente de migrar.

## Por qué existe

El módulo `frontend/src/modules/facturacion/` estaba copiado en tres productos y ya divergía:
foody no tenía `useSetProvider`, `useAltaEmisor`, `useVerificarAutorizacion` ni las series, y su
`useConsultarBaja` seguía siendo una query que se disparaba al montar. Es la regla de dos de
`/02-code/CLAUDE.md`: a la segunda copia se extrae.

## Uso

```tsx
import { createFacturacionClient, FacturacionProvider, useEmitirComprobante } from "@kallpasoft/facturacion";

const facturacionClient = createFacturacionClient({
  baseURL: "...",            // ver la tabla de abajo
  onUnauthorized: async () => {
    try {
      await authApi.post("/api/v1/auth/refresh"); // contra el ERP del producto
      return true;                                // reintenta la petición una vez
    } catch {
      window.location.href = "/login";
      return false;
    }
  },
});

<FacturacionProvider client={facturacionClient}>
  <App />
</FacturacionProvider>
```

| Producto | `baseURL` | Auth |
|---|---|---|
| ferretería | URL del servicio de facturación (su variable de entorno de hoy) | cookie JWT compartida (`withCredentials`) |
| foody | su proxy de backend, `/api/v1/facturacion` | el proxy agrega la clave interna; el navegador nunca la ve |

### El refresh en 401

`onUnauthorized` recibe el error y devuelve si se reintenta. El paquete no sabe renovar la sesión
porque el servicio verifica tokens pero no los emite: eso lo hace el ERP de cada producto. Si llegan
varios 401 a la vez, se llama **una sola vez** y todos esperan ese resultado. Cada petición se
reintenta como máximo una vez. Redirigir al login es decisión del producto.

### Claves de la venta del host

Emitir, anular o reconsultar una baja escribe en la venta del host, así que el paquete invalida sus
queries. Por defecto son las de ferretería (`["ventas"]` y `` [`venta-${ref}`] ``). Si el producto
usa otras, se pasan al Provider:

```tsx
<FacturacionProvider client={c} ventaQueryKeys={(ref) => [["ventas"], ["venta", ref]]}>
```

### Series con espejo en el host

`useCrearSerieFiscal` y `useActualizarSerieFiscal` escriben en el servicio e invalidan
`facturacionKeys.series`. Si el producto guarda un espejo local (ferretería:
`comprobante_serie`), lo resincroniza en `afterWrite`, que corre dentro de la mutación:

```ts
useCrearSerieFiscal({
  afterWrite: async () => {
    await api.post("/api/v1/comprobante-series/sincronizar");
    await qc.invalidateQueries({ queryKey: ["comprobante-series"] });
  },
});
```

## Qué quedó fuera y por qué

- **Componentes** (`EmitirComprobanteButton`, `SunatConfigForm`, `FacturacionPage`...): dependen de
  la librería de UI, los toasts y los datos de cada producto (`@/components/ui`, `use-toast`,
  `Empresa`). Sacarlos al paquete obligaría a compartir también el design system.
- **Toasts**: ningún hook muestra mensajes. El producto los pone en `onSuccess` / `onError` de
  `mutate`, y para el texto de error usa `mensajeErrorFacturacion(e, fallback)`.
- **Variables de entorno**: el paquete no lee `import.meta.env`. La `baseURL` la pasa el producto.

## Desarrollo

```bash
npm install && npm run build && npm test && npm run typecheck
```

Repo propio público `Kallpasoft/shared-facturacion`: sin secretos, nombres de secrets, URLs de
entornos ni lógica de un producto. Para publicar: subir `version`, commitear,
`git tag -a vX.Y.Z -m "..." && git push --tags`, y cada consumidor sube su pin.
