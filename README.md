# ERP Import Services - Proyecto

Sistema ERP/CRM para gestión logística internacional.

## Estructura del Proyecto

```
ERP_Logistica/
├── backend/              # API Node.js + Express
│   ├── prisma/          # Esquema de Base de Datos
│   ├── src/
│   │   ├── config/      # Configuraciones (DB, etc.)
│   │   ├── controllers/ # Lógica de negocio
│   │   ├── middleware/  # Auth, validaciones
│   │   ├── routes/      # Endpoints de la API
│   │   ├── utils/       # Utilidades (JWT, etc.)
│   │   └── server.js    # Servidor Express
│   └── .env             # Variables de entorno
│
└── frontend/            # Aplicación React + Vite
    ├── src/
    └── .env
```

## Requisitos Previos

- Node.js v18+
- PostgreSQL (local) o cuenta en Supabase (producción)
- npm o yarn

## Configuración Local

### 1. Backend

```bash
cd backend
npm install
```

Crea tu archivo `.env` basado en `.env.example`:

```bash
# Copia el archivo de ejemplo
copy .env.example .env

# Edita .env con tus credenciales de PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/erp_logistica_dev?schema=public"
JWT_SECRET="tu-secreto-ultra-seguro"
```

Genera el cliente de Prisma y corre las migraciones:

```bash
npm run prisma:generate
npm run migrate:dev
```

Inicia el servidor:

```bash
npm run dev
```

El backend correrá en `http://localhost:3000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend correrá en `http://localhost:5173`

## Scripts Disponibles

### Backend

- `npm run dev` - Modo desarrollo (nodemon)
- `npm run migrate:dev` - Crear migración en desarrollo
- `npm run prisma:studio` - Abrir GUI de Prisma para ver la BD

### Frontend

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build

## Stack Tecnológico

- **Backend**: Node.js, Express, Prisma ORM, JWT
- **Frontend**: React, Vite, TailwindCSS, Axios, React Router
- **Base de Datos**: PostgreSQL (Local: pgAdmin | Producción: Supabase)

## Autor

Neil - neil@example.com
