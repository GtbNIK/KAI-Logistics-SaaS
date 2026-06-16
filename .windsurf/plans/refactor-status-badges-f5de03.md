# Plan de Refactorización de Badges de Estado

Refactorizar los archivos de configuración de cotizaciones, notas de entrega y avisos de cobro para centralizar la lógica de los estados y evitar duplicación interna.

## 1. Refactorización de `quoteConfig.jsx`
- Definir una constante `QUOTE_STATUS_MAP` al inicio del archivo.
- Reemplazar la definición local dentro del `render` de la columna de estado.
- Sincronizar las opciones del filtro de estado para usar la misma constante.

## 2. Refactorización de `deliveryNoteConfig.jsx`
- Definir una constante `DELIVERY_NOTE_STATUS_MAP` al inicio del archivo.
- Reemplazar la definición local dentro del `render`.
- Actualizar `statusFilterOptions` para que dependa de la nueva constante.

## 3. Refactorización de `paymentNoticeConfig.jsx`
- Definir una constante `PAYMENT_NOTICE_STATUS_MAP` al inicio del archivo.
- Reemplazar la definición local dentro del `render`.

## Próximos pasos (Futuro)
- Una vez validados estos cambios, aplicar el mismo patrón al resto de los archivos de configuración (`payableConfig`, `receivableConfig`, etc.) y eventualmente crear un archivo global de estados.
