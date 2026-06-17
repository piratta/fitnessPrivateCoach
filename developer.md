# PrivateFitness — Guía para Desarrolladores

Stack, arquitectura interna, puntos donde meter la mano y curiosidades útiles para programadores.

---

## 1. Stack

### Backend
| Capa | Tecnología |
|---|---|
| Lenguaje | **Java 17** |
| Framework | **Spring Boot 3.x** (Web, Data JPA, Security, WebSocket) |
| Persistencia | **Hibernate / JPA** sobre **H2** (local, archivo) y **PostgreSQL** (prod, Neon) |
| Seguridad | **Spring Security 6** + JWT (`io.jsonwebtoken`) + BCrypt |
| Build | **Maven** (`pom.xml`) |
| WebSocket | API nativa de Spring (`@EnableWebSocket`) para chat en vivo |

### Frontend
| Capa | Tecnología |
|---|---|
| Lenguaje | JavaScript (ESM) |
| UI | **React 19** |
| Build | **Vite 8** |
| Estado | `useState` / `useEffect` puros (sin Redux ni Zustand) |
| Estilos | CSS plano + utilidades inline (`glass-panel`, `input-field`, `btn-primary`) |
| Linter | ESLint 10 |

### Infra
- **Render** para backend (auto-deploy desde `feature/firstVersion`).
- **Render Static** o equivalente para servir el build de Vite.
- **Neon** (Postgres serverless) como BD de producción, con pooler.
- Imágenes almacenadas **en BD como bytea** (decisión consciente — ver §5).

---

## 2. Estructura del repo

```
privateFitness/
├── pom.xml
├── src/main/java/com/example/
│   ├── fitness/                  ← paquete legacy (entidades antiguas)
│   └── fitnessapp/               ← paquete activo
│       ├── PrivateFitnessApplication.java
│       ├── config/               ← DataSeeder, WebSocketConfig
│       ├── controller/           ← REST + WebSocket controllers
│       ├── dto/                  ← UserDto, ReviewDto, WorkoutDto, ChatMessageDto
│       ├── model/                ← entidades JPA + enums (Role, ReviewStatus)
│       ├── repository/           ← JpaRepository interfaces
│       ├── security/             ← JwtTokenProvider, JwtAuthenticationFilter, SecurityConfig
│       ├── service/              ← ReviewService (FSM), TrainingPlanService, UserFreeService
│       └── websocket/            ← ChatWebSocketHandler
├── src/main/resources/
│   ├── application.yml           ← perfiles default (H2) y prod (Postgres)
│   └── *.html, css/, js/         ← assets estáticos
├── frontend/
│   ├── package.json, vite.config.js
│   └── src/
│       ├── App.jsx               ← router por rol + DialogProvider
│       ├── config.js             ← VITE_API_URL
│       ├── components/
│       │   ├── ui/               ← Dialog (modales), AuthImage
│       │   ├── ClientDashboard.jsx, ClientList.jsx
│       │   ├── ReviewTab.jsx, GalleryTab.jsx
│       │   ├── CoachDashboard.jsx, ReviewManager.jsx
│       │   └── TemplateManager.jsx, WorkoutBuilder.jsx, etc.
│       └── utils/
│           ├── api.js            ← request() central con auto-logout en 401
│           └── chatStore.js      ← REST + WS para chat
└── developer.md, README.md
```

> ⚠️ Coexisten dos paquetes Java: `com.fitnessApp.fitness` (legacy) y `com.fitnessApp.fitnessapp` (actual). **Todo lo nuevo va en `fitnessapp`**. El paquete `fitness` se mantiene porque algunas entidades viejas aún están referenciadas.

---

## 3. Modelo de datos

### Entidades principales (`com.fitnessApp.fitnessapp.model`)
- `User`: cuenta del sistema (rol `COACH`, `PREMIUM_CLIENT`, `FREE_USER`, `SUPER_ADMIN`). Campos clave: `email`, `username`, `passwordHash`, `coach` (self-FK), `routineJson`, `mustChangePassword`, **`onboardingCompleted`** (Boolean nullable), **`nextReviewAt`**, `reviewFrequency`.
- `ProgressLog`: una fila por día. Constraint **`UNIQUE(client_id, log_date)`** — la lógica UPSERT vive en `ProgressLogController#addProgressLog`.
- `Review`: snapshot de una revisión + relación 1:N con `ReviewImage`. Estado FSM en `status` (`ReviewStatus`).
- `ReviewImage`: bytes de la foto + ownership denormalizado (`client_id`) para que la galería sea una sola query.
- `WorkoutSession`, `ChatMessage`, `Routine*`.

### Diagrama lógico (resumido)
```
User (coach) ──< User (client) ──< ProgressLog
                              ──< Review ──< ReviewImage
                              ──< WorkoutSession
                              ──< ChatMessage
```

### FSM de Revisiones
Implementado en `ReviewStatus.canTransitionTo(...)` y aplicado en `ReviewService`:
```
PENDING ─── coach valida ──▶ VALIDATED
VALIDATED ─── cliente acusa ──▶ FEEDBACK_RECEIVED
FEEDBACK_RECEIVED ─── archivar ──▶ ARCHIVED
ARCHIVED ─── (terminal)
```
Cualquier transición fuera de eso → `HTTP 409 Conflict`.

Reglas de creación:
- `now < user.nextReviewAt` → **HTTP 423 Locked**.
- Ya existe una revisión no archivada → **HTTP 409**.

---

## 4. Capa de seguridad

- **JWT HS256** con secret en `jwt.secret` (en prod debería overridarse por env var).
- Filtro `JwtAuthenticationFilter` añade `Authentication` al contexto si el token valida y el subject corresponde a un usuario en BD.
- Si falla, escribe en `request.setAttribute("auth.failureReason", ...)` para que el `AuthenticationEntryPoint` de `SecurityConfig` lo incluya en la respuesta JSON. Esto evita los **403 vacíos** que Spring Security 6 devuelve por defecto.
- `CustomUserDetailsService` busca por **username O email** (los clientes hacen login con un username corto, pero el JWT subject es el email).
- Endpoints protegidos validan ownership en el controlador o en el service (`ReviewService#loadOwnedReview`, etc.).

### Configuración relevante
```java
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()   // preflight CORS
.requestMatchers("/", "/api/auth/**").permitAll()
.requestMatchers("/h2-console/**").permitAll()
.requestMatchers("/ws/chat/**", "/ws/chat").permitAll()
.anyRequest().authenticated()
```
CORS abierto por `setAllowedOriginPatterns("*")` con credenciales — restringir en prod si se separa de Render.

---

## 5. Decisiones interesantes

### 5.1. Imágenes en BD (no en disco)
Las fotos viven en `review_images.data BYTEA`, no en disco ni en S3. Razones:
- **Render free tier** no garantiza disco persistente.
- Volumen esperado bajo (4 fotos × revisión × cliente cada N semanas).
- Backups automáticos van con la BD.
- Mapping JPA con `byte[] + length = 10_485_760` (no `@Lob`) para que Hibernate genere `bytea` en Postgres y `VARBINARY(10MB)` en H2 — `@Lob` mapearía a OID en Postgres, problemático.

Si el volumen crece: migrar a S3 dejando `review_images.url` y un servicio `ImageStorageService` con dos implementaciones.

### 5.2. UPSERT de ProgressLog
La regla “si registras varios pesos el mismo día, gana el último” se implementa en backend:
```java
ProgressLog entity = progressLogRepository.findByClientAndLogDate(client, date)
        .orElseGet(ProgressLog::new);
// merge solo campos no-null del request
```
Con la `UniqueConstraint(client_id, logDate)` como red de seguridad. Además, el frontend filtra los días “solo peso” fuera de la comparativa para que no creen columnas vacías.

### 5.3. `AuthImage` autenticado
`<img src>` no envía Authorization. El componente `AuthImage`:
1. Hace `fetch(url, { headers: Bearer })`.
2. Convierte la respuesta a `Blob` → `URL.createObjectURL(blob)`.
3. Revoca el object URL al desmontar.

Eso permite servir imágenes privadas sin URLs firmadas.

### 5.4. Sistema de diálogos sin librerías
`components/ui/Dialog.jsx` expone `useDialog()` con `alert/confirm/prompt/toast` basados en promesas. El provider mantiene una sola pila visible cada vez. No depende de SweetAlert, MUI, etc. Reemplaza todos los `window.alert/confirm` del proyecto.

### 5.5. WebSocket con fallback REST
`utils/chatStore.js` intenta enviar por WebSocket; si el socket no está abierto, hace `POST /api/chat/...` como respaldo. El handler de servidor expone ambos canales para mantener consistencia.

### 5.6. Auto-logout en 401
`utils/api.js` envuelve `fetch` y, ante 401, limpia el token y recarga. Esto evita estados “zombi” cuando el JWT caduca o cambia el secret entre deploys.

### 5.7. Migración no-destructiva con `ddl-auto: update`
Los campos nuevos (p.ej. `Boolean onboardingCompleted`) se añaden como **nullable** para que Hibernate no intente alterar columnas existentes y rompa el arranque en Postgres prod. Pequeño coste: hay que normalizar con `value != null && value` al leer.

### 5.8. `prepareThreshold=0` en el pooler de Neon
El `application.yml` perfil `prod` añade `prepareThreshold=0` a la URL JDBC para evitar el bug típico de **cached plan must not change result type** del pooler de Neon tras migraciones de esquema.

---

## 6. Endpoints clave

Auth:
- `POST /api/auth/login` → `{ accessToken, user }`.
- `POST /api/auth/change-password` (Bearer).

Usuarios:
- `GET /api/users/me`, `PUT /api/users/me`.
- `POST /api/users/me/complete-onboarding` (UPSERT del primer ProgressLog + arma el lock de revisión).
- `GET /api/users/clients` (coach).
- `POST /api/users/create-client`, `PUT /api/users/clients/{id}`, `POST /api/users/clients/{id}/reset-password`.

Progreso:
- `GET /api/progress/history`, `POST /api/progress` (UPSERT por día).

Revisiones:
- `GET /api/reviews/lock-status` → `{ locked, secondsRemaining, daysRemaining, nextReviewAt }`.
- `GET /api/reviews/active`, `GET /api/reviews/history`, `GET /api/reviews/gallery`.
- `POST /api/reviews`, `POST /api/reviews/{id}/images` (multipart), `DELETE /api/reviews/images/{id}`, `GET /api/reviews/images/{id}` (bytes).
- `POST /api/reviews/{id}/feedback-received` (cliente archiva tras leer feedback).
- Coach: `GET /api/reviews/pending`, `GET /api/reviews/by-client/{id}`, `POST /api/reviews/{id}/validate`.

Workouts: `POST /api/workouts/finish`, `PUT /api/workouts/update/{id}`, `GET /api/workouts/history/me`.

Chat: REST + WebSocket en `/ws/chat?token=...`.

---

## 7. Cómo levantarlo en local

### Backend
```bash
mvn spring-boot:run
```
- Arranca en `http://localhost:8080`.
- BD H2 en `./fitnessdb.mv.db`. Consola H2: `http://localhost:8080/h2-console` (JDBC `jdbc:h2:file:./fitnessdb`, user `sa`, pass `password`).
- `DataSeeder` crea el coach por defecto (`antonio.ortiz@ficticio.com` / `antonio` / `1234`) si la BD está vacía.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- Vite en `http://localhost:5173`.
- API por defecto `http://localhost:8080`. Override con `VITE_API_URL` en `.env.local`.

### Build de prod
```bash
cd frontend && npm run build      # genera frontend/dist
mvn package                       # genera el JAR del backend
```

### Perfil prod
```bash
SPRING_PROFILES_ACTIVE=prod \
DATABASE_URL=jdbc:postgresql://... \
DATABASE_USERNAME=... \
DATABASE_PASSWORD=... \
java -jar target/*.jar
```

---

## 8. Convenciones y notas para contribuir

- **No metas alerts nativos** (`alert`, `window.confirm`, `prompt`). Usa `useDialog()`.
- **Las decisiones críticas las toma el backend**. El frontend solo refleja estados.
- **Toda transición de FSM** debe pasar por `ReviewStatus#canTransitionTo`.
- **Toda subida de imagen** debe ir por `ReviewService#addImage` (valida ownership, MIME, tamaño).
- **No serialices entidades JPA directamente** en los controllers nuevos; usa DTOs (`ReviewDto`, `UserDto`).
- **Test rápido sin BD nueva**: arranca el backend con H2, el seeder lo deja usable.
- **Estilos**: hay un set de utilidades en `frontend/src/index.css` (`glass-panel`, `btn-primary`, `input-field`, `fade-in`). Reutilízalas antes de añadir CSS nuevo.

---

## 9. Próximos pasos / TODOs conocidos

- Coach: conectar `ReviewManager.jsx` al endpoint real `GET /api/reviews/pending` y `POST /api/reviews/{id}/validate` (hoy mezcla mocks).
- PDF personalizado del entrenamiento con `@react-pdf/renderer` (decisión: client-side, sin pasar por el backend).
- Vista entrenamiento en formato tabla nativa para escritorio.
- Notificación push real de mensajes nuevos (hoy solo badge in-app).
- Eliminar el paquete legacy `com.fitnessApp.fitness` cuando ya nada lo referencie.
