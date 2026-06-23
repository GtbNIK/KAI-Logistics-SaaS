# Plan de Refactorización de Badges de Estado - Parte 2

Continuar con la refactorización de los archivos de configuración restantes para centralizar los mapas de estado y mejorar la mantenibilidad.

## 1. Refactorización de `payableConfig.jsx` (Cuentas por Pagar)
- Definir `PAYABLE_STATUS_MAP` al inicio del archivo.
- Reemplazar la definición local de `statusMap` en la columna de estado.

## 2. Refactorización de `receivableConfig.jsx` (Cuentas por Cobrar)
- Definir `RECEIVABLE_STATUS_MAP` al inicio del archivo.
- Reemplazar la definición local de `statusMap` en la columna de estado.

## 3. Refactorización de `serviceConfig.jsx` (Servicios)
- Centralizar el estado de "Activo/Inactivo" en una constante `SERVICE_STATUS_MAP`.
- Asegurar que `serviceTypeLabels` siga las mismas convenciones de limpieza si es necesario.

## Resumen del enfoque
- Seguir el principio **DRY** (Don't Repeat Yourself).
- Facilitar la futura migración a un sistema de estados global.
- Mantener la funcionalidad visual intacta para el usuario final.
