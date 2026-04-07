

Crea un proyecto web full-stack con las siguientes restricciones técnicas:

  ### Stack
  - **Framework**: Next.js 16+ con App Router (NO Pages Router), React 19, TypeScript 5
  - **UI**: Material UI (MUI) 7 con @emotion/react y @emotion/styled. NO usar Tailwind para componentes (solo si Next.js lo requiere internamente)
  - **Base de datos**: PostgreSQL con Prisma ORM 7+ (@prisma/client, @prisma/adapter-pg, driver pg nativo, dotenv)
    - Prisma 7 ya no soporta `url` en el `datasource` del schema. La conexión se configura en `prisma.config.ts` con `import "dotenv/config"` y `defineConfig({ datasource: { url: process.env["DATABASE_URL"] } })`
  - **Autenticación**: NextAuth.js 4 con @auth/prisma-adapter, estrategia JWT, con DOS métodos de login:
    1. **Credenciales locales**: provider de credenciales con bcryptjs
    2. **VTI (Single Sign-On universitario)**: login externo vía redirect
  - **Testing**: Jest con ts-jest para tests unitarios/API, Playwright para E2E
  - **React Compiler**: Habilitado (babel-plugin-react-compiler en next.config.ts con reactCompiler: true)

  ### Autenticación VTI (SSO externo)
  La VTI es un SSO de la Universidad de Chile. El flujo es:

  1. La página de login muestra un botón "Autenticarse con U-Pasaporte / VTI" que hace redirect a una URL externa configurable via `NEXT_PUBLIC_VTI_LOGIN_URL` (ej: `https://portal.dcc.uchile.cl/vti?app=mi-app`)
  2. El usuario se autentica en la VTI y es redirigido de vuelta a `/api/plogin?jwt=<token>`
  3. La route `/api/plogin` (GET):
     - Verifica el JWT con `jose` (jwtVerify, algoritmo HS256) usando `VTI_JWT_SECRET`
     - Extrae del payload: `identification` (RUT zero-padded con dígito verificador), `email`, `name`, `preferred_username`
     - Parsea el RUT: quita ceros iniciales y el último carácter (dígito verificador)
     - Busca al usuario por RUT en la base de datos
     - Si no existe, crea el usuario con un password inutilizable (randomUUID hasheado) y un perfil vacío
     - Si existe, actualiza el nombre si cambió
     - Genera un session JWT de NextAuth con `encode()` de next-auth/jwt
     - Setea la cookie de sesión (`next-auth.session-token` o `__Secure-next-auth.session-token` si HTTPS)
     - Redirige a `/dashboard`
  4. Dependencia adicional: `jose` para verificación de JWT

  ### Variables de entorno para VTI
  VTI_JWT_SECRET=
  NEXT_PUBLIC_VTI_LOGIN_URL=

  ### Estructura de directorios
  - `src/app/api/` — API routes organizadas por categoría, cada route.ts exporta GET/POST/PUT/DELETE
  - `src/app/api/plogin/route.ts` — Endpoint de callback para VTI SSO
  - `src/app/[seccion]/` — Páginas por sección, con subdirectorio `components/` y `hooks/` por sección
  - `src/app/auth/signin/page.tsx` — Página de login con ambos métodos (VTI + credenciales locales)
  - `src/components/` — Componentes compartidos (dialogs, forms)
  - `src/lib/` — Utilidades core: auth.ts (config NextAuth), prisma.ts (singleton client), theme.ts (temas MUI), i18n/ (traducciones)
  - `prisma/schema.prisma` — Schema único con todos los modelos
  - `e2e/` — Tests E2E con Playwright, con auth.setup.ts que guarda sesión reutilizable

  ### Modelo User mínimo
  ```prisma
  model User {
    id        String   @id @default(cuid())
    name      String?
    fullName  String?
    email     String   @unique
    password  String
    rut       String?  @unique
    roles     String[] @default(["PROFESSOR"])
    profile   Profile?
    @@map("users")
  }

  Convenciones

  - Todas las páginas son "use client" y usan un DashboardLayout compartido
  - Formularios usan MUI Dialogs modales abiertos desde las páginas
  - API routes verifican sesión con getServerSession(authOptions) y buscan el usuario/perfil por email
  - i18n con provider propio (no next-intl): I18nProvider.tsx con traducciones en JSON (es.json, en.json)
  - Prisma: usar prisma db push para desarrollo (NO migrations), prisma generate después de cambios al schema
  - Build config: typescript: { ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true" } para builds rápidos en producción

  Base de datos

  - PostgreSQL local, connection string en DATABASE_URL
  - Schema usa @@map() para nombres de tabla en snake_case
  - Enums de Prisma para valores fijos
  - Relaciones con onDelete: Cascade o SetNull según el caso

  Scripts package.json

  - dev, build, start, lint
  - test (jest), test:e2e (playwright test)
  - prisma:generate, prisma:migrate, prisma:studio

  Archivos de configuración necesarios

  - next.config.ts con reactCompiler y typescript.ignoreBuildErrors condicional
  - playwright.config.ts con auth setup project, storageState, y webServer
  - jest.config.js con ts-jest y path alias @/*

  Inicializa el proyecto con esta estructura, el modelo User, y autenticación funcionando con ambos métodos (credenciales locales + VTI SSO).

  ## UI/UX
  - Diseño moderno que no se vea generico o como un template, con una paleta de colores personalizada (no el azul predeterminado de MUI)