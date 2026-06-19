# PrivateFitness — Guía para Desarrolladores

Stack, arquitectura interna, puntos donde meter la mano y curiosidades útiles para programadores.

---

## 1. Stack

### Backend
| Capa | Tecnología |
|---|---|
| Lenguaje | **Java 25** (pom.xml compilado con `--enable-preview` si aplica; Lombok bloqueado en `1.18.40` para compatibilidad) |
| Framework | **Spring Boot 3.x** (Web, Data JPA, Security, WebSocket) |
| Persistencia | **Hibernate / JPA** sobre **H2** (local, archivo `./fitnessdb.mv.db`) y **PostgreSQL** (prod, Neon) |
| Seguridad | **Spring Security 6** + JWT HS256 (`io.jsonwebtoken`) + BCrypt |
| Build | **Maven** (`pom.xml`) |
| WebSocket | API nativa de Spring (`@EnableWebSocket`) para chat en vivo |
| Entidades | Lombok (`@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`) |

### Frontend
| Capa | Tecnología |
|---|---|
| Lenguaje | JavaScript ESM |
| UI | **React 19** |
| Build | **Vite 8** |
| Estado | `useState` / `useEffect` puros — sin Redux, Zustand ni Context masivo |
| Estilos | CSS plano + utilidades inline (`glass-panel`, `input-field`, `btn-primary`, `fade-in`) |
| Linter | ESLint 10 |

### Infra
- **Render** para el backend (auto-deploy desde la rama activa).
- **Neon** (Postgres serverless) como BD de producción, con pooler.
- Imágenes de revisiones almacenadas **en BD como `byte[]`** (ver §5.1).

---

## 2. Estructura del repo

```
privateFitness/
├── pom.xml
├── src/main/java/com/fitnessApp/
│   ├── PrivateFitnessApplication.java
│   ├── core/
│   │   ├── config/
│   │   │   ├── DataSeeder.java         ← crea el coach por defecto si la BD está vacía
│   │   │   ├── SecurityConfig.java
│   │   │   └── WebSocketConfig.java
│   │   └── security/
│   │       ├── JwtTokenProvider.java
│   │       ├── JwtAuthenticationFilter.java
│   │       └── CustomUserDetailsService.java  ← busca por username O email
│   └── feature/
│       ├── auth/                        ← AuthController, AuthService, DTOs
│       ├── user/
│       │   ├── User.java                ← entidad principal (ver §3)
│       │   ├── UserDto.java
│       │   ├── UserController.java
│       │   ├── UserService.java
│       │   ├── UserRepository.java
│       │   └── Role.java               ← COACH, PREMIUM_CLIENT, FREE_USER, SUPER_ADMIN
│       ├── workout/
│       │   ├── WorkoutSession.java      ← sesión de entrenamiento guardada
│       │   ├── WorkoutController.java
│       │   ├── WorkoutService.java      ← lógica de historial de pesos entre rutinas
│       │   ├── RoutineTemplate.java     ← entidad de plantillas
│       │   ├── RoutineTemplateController.java
│       │   ├── Exercise.java            ← catálogo de ejercicios custom
│       │   ├── ExerciseController.java
│       │   └── SetLog.java              ← log de series individuales
│       ├── progress/                    ← ProgressLog (UPSERT por día)
│       ├── review/                      ← Review, ReviewImage, ReviewService (FSM)
│       └── chat/                        ← ChatMessage, ChatController, WebSocket handler
├── src/main/resources/
│   └── application.yml                  ← perfil default H2 + perfil prod Postgres
├── frontend/
│   ├── package.json, vite.config.js
│   └── src/
│       ├── App.jsx                      ← router por rol + DialogProvider
│       ├── config.js                    ← API_BASE_URL (VITE_API_URL o localhost:8080)
│       ├── index.css                    ← design system: variables, utilidades, responsive
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Dialog.jsx           ← sistema de modales/toasts sin librerías externas
│       │   │   └── AuthImage.jsx        ← fetch autenticado → objectURL para imágenes privadas
│       │   ├── Login.jsx
│       │   ├── ClientDashboard.jsx      ← panel del cliente (2800+ líneas, ver §4)
│       │   ├── ClientList.jsx           ← lista + modal de detalle de clientes
│       │   ├── ClientProfile.jsx        ← perfil propio del cliente
│       │   ├── CoachDashboard.jsx       ← panel del entrenador con nav de pestañas
│       │   ├── WorkoutBuilder.jsx       ← constructor de rutinas + asignación
│       │   ├── TemplateManager.jsx      ← galería de plantillas
│       │   ├── ExercisesManager.jsx     ← CRUD catálogo de ejercicios
│       │   ├── SearchableExerciseSelect.jsx ← selector con búsqueda + caché invalidable
│       │   ├── ReviewManager.jsx        ← bandeja de revisiones del entrenador
│       │   ├── ReviewTab.jsx            ← flujo de revisión del cliente (FSM)
│       │   ├── GalleryTab.jsx           ← galería de fotos del cliente
│       │   ├── InitialQuestionnaire.jsx ← cuestionario de onboarding
│       │   ├── AdminDashboard.jsx       ← panel SUPER_ADMIN
│       │   └── BillingManager.jsx       ← facturación
│       └── utils/
│           ├── api.js                   ← request() central con auto-logout en 401
│           └── chatStore.js             ← REST + WS para chat
└── developer.md, README.md
```

---

## 3. Modelo de datos

### Entidad `User`
Campo clave del sistema. Roles: `COACH`, `PREMIUM_CLIENT`, `FREE_USER`, `SUPER_ADMIN`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | Generado automáticamente |
| `email` | String | Único, no nulo |
| `username` | String | Único; se genera al crear cliente (1ª letra nombre + hasta 5 del apellido) |
| `passwordHash` | String | BCrypt |
| `name` | String | Solo el nombre de pila |
| `lastName` | String | Apellidos |
| `role` | Enum | COACH / PREMIUM_CLIENT / FREE_USER / SUPER_ADMIN |
| `coach` | User FK | Self-FK; el cliente apunta al entrenador |
| `mustChangePassword` | boolean | true → el login fuerza cambio de contraseña |
| `onboardingCompleted` | Boolean | null/false → muestra cuestionario inicial |
| `routineJson` | TEXT | JSON de la rutina activa |
| `nextRoutineJson` | TEXT | JSON de la rutina programada (visible pero no activa) |
| `routineUpdatedAt` | LocalDateTime | Fecha del último cambio de rutina (para el cálculo de semana activa) |
| `goal` | String | Objetivo del cliente |
| `status` | String | "Activo" / "Inactivo" |
| `reviewFrequency` | String | Semanal / Bisemanal / 3 Semanas / Mensual / Bimensual |
| `progressionStrategy` | String | Sobrecarga Progresiva / Mantenimiento / Descarga, etc. |
| `nextReviewAt` | LocalDateTime | Momento desde el que se permite la siguiente revisión |
| `lastReviewDate` | LocalDateTime | Última revisión registrada |
| `birthDate` | LocalDate | Fecha de nacimiento |
| `videoLink` | String | Enlace de vídeo opcional |
| `createdAt` | LocalDateTime | Inmutable, asignado al persistir |

### Otras entidades

- **`ProgressLog`**: una fila por `(client_id, log_date)`. Constraint `UNIQUE` — el UPSERT vive en `ProgressLogController`.
- **`WorkoutSession`**: sesión de entrenamiento finalizada. Campos: `dayName`, `durationSeconds`, `totalVolume`, `completedSets`, `completionPercentage`, `logsJson`, `commentsJson`, `videoLinksJson`, `stress`, `fatigue`, `motivation`, `sleepHours`, `digestions`.
- **`SetLog`**: log de una serie individual ligado a `WorkoutSession`.
- **`RoutineTemplate`**: plantilla reutilizable del entrenador. Campos: `title`, `description`, `routineJson`.
- **`Exercise`**: ejercicio del catálogo custom del entrenador. Campos: `name`, `description`, `coach` (FK).
- **`Review`** + **`ReviewImage`**: revisión periódica. Estado FSM en `ReviewStatus`.
- **`ChatMessage`**: mensaje de chat.

### Diagrama lógico (resumido)
```
User (coach) ──< User (client) ──< ProgressLog
                               ──< Review ──< ReviewImage
                               ──< WorkoutSession ──< SetLog
                               ──< ChatMessage
Coach ──< RoutineTemplate
Coach ──< Exercise (catálogo)
```

### FSM de Revisiones
Implementado en `ReviewStatus` y aplicado en `ReviewService`:
```
PENDING ─── coach valida ──▶ VALIDATED
VALIDATED ─── cliente acusa recibo ──▶ FEEDBACK_RECEIVED
FEEDBACK_RECEIVED ─── archivar ──▶ ARCHIVED (terminal)
```
- Cualquier transición fuera de ese orden → `HTTP 409 Conflict`.
- `now < user.nextReviewAt` al crear → `HTTP 423 Locked`.
- Ya existe revisión no archivada al crear → `HTTP 409`.

---

## 4. Frontend — puntos de atención

### 4.1. `ClientDashboard.jsx` — TDZ crítica
Este componente tiene más de 2 800 líneas. **Regla de oro**: `useState` de cualquier variable que se use en un cálculo derivado (fuera de un efecto o función) **debe declararse ANTES** de ese cálculo. El bundle de Vite con tree-shaking puede reordenar código y el `const` de `useState` cae en TDZ si la variable se referencia antes de su `useState`.

Error conocido (ya corregido): `selectedDay` se usaba en `activeDayNotes` antes de su `useState`. Síntoma en prod: `Uncaught ReferenceError: Cannot access 'X' before initialization`.

Orden correcto:
```js
// ✅ Primero el useState
const [selectedDay, setSelectedDay] = useState('');
// Luego los derivados que lo usan
const activeDayNotes = currentRoutineObj?.[`${selectedDay}_notes`] ?? '';
```

### 4.2. Lógica de semana activa en el cliente
`todaySessionsByDay` mapea día real de ejecución → sesión de esa semana. La ventana se calcula como `[max(lunes de la semana, routineUpdatedAt), domingo]`. Esto evita que sesiones de la rutina anterior "bloqueen" días de la nueva.

### 4.3. Autogeneración de username al crear cliente
El `UserService` genera el username al crear un cliente:
- 1ª letra del nombre + hasta 5 letras del primer apellido.
- Si el primer apellido tiene menos de 5 letras, se completa con letras del segundo.
- Si ya existe el username, se añade un sufijo numérico.

### 4.4. Siguiente rutina (`nextRoutineJson`)
El entrenador puede asignar una rutina activa (`routineJson`) y programar la siguiente (`nextRoutineJson`). El cliente la ve en modo solo lectura. Al activarla, `WorkoutService` guarda el historial de pesos de la rutina actual antes de sobrescribirla.

### 4.5. Notas del entrenador por día
El JSON de rutina admite claves `{día}_notes` (p.ej. `"Lunes_notes": "Calentar bien..."`) que el cliente ve destacadas antes de empezar el entrenamiento. `routineDays` las filtra con `.filter(day => !day.endsWith('_notes'))`.

### 4.6. Catálogo de ejercicios (`ExercisesManager` + `SearchableExerciseSelect`)
`SearchableExerciseSelect` cachea los ejercicios custom en memoria. `ExercisesManager` llama a `refreshCustomExerciseCache()` después de cada mutación para que el constructor de rutinas los vea sin recargar la página.

### 4.7. Dropdown "Ejercicios" en la navbar del entrenador
El menú desplegable usa un portal (`createPortal`) para escapar del `overflow: hidden` de la barra de navegación. Calcula la posición con `getBoundingClientRect()` en el momento de abrirse y se cierra al hacer scroll o resize.

### 4.8. Nombres separados (nombre / apellidos)
El cliente se crea con nombre y apellidos **por separado** en el backend (`name`, `lastName`). La API `/api/users/me` devuelve ambos campos. El `ClientDashboard` solo muestra `name` (sin `lastName`) en la cabecera del panel del cliente.

---

## 5. Decisiones técnicas relevantes

### 5.1. Imágenes en BD (no en disco)
Las fotos viven en `review_images.data BYTEA`, no en disco ni en S3. Razones:
- Render free tier no garantiza disco persistente.
- Volumen esperado bajo (4 fotos × revisión × cliente cada N semanas).
- Backups automáticos van con la BD.
- Mapping JPA con `byte[]` y `length = 10_485_760` (no `@Lob`) para que Hibernate genere `bytea` en Postgres y `VARBINARY(10MB)` en H2. `@Lob` mapearía a OID en Postgres, problemático.

Si el volumen crece: migrar a S3 dejando `review_images.url` y un servicio `ImageStorageService` con dos implementaciones.

### 5.2. UPSERT de ProgressLog
"Si registras varios pesos el mismo día, gana el último":
```java
ProgressLog entity = progressLogRepository.findByClientAndLogDate(client, date)
    .orElseGet(ProgressLog::new);
// merge solo campos no-null del request
```
Respaldado por `UNIQUE(client_id, log_date)` como red de seguridad.

### 5.3. `AuthImage` autenticado
`<img src>` no envía `Authorization`. El componente `AuthImage`:
1. Hace `fetch(url, { headers: Bearer })`.
2. Convierte la respuesta a `Blob` → `URL.createObjectURL(blob)`.
3. Revoca el object URL al desmontar.

### 5.4. Sistema de diálogos sin librerías externas
`components/ui/Dialog.jsx` expone `useDialog()` con `alert/confirm/prompt/toast` basados en promesas. No depende de SweetAlert, MUI ni librerías de UI. **Nunca uses `window.alert` / `window.confirm`** — usa `await dialog.alert(...)` / `await dialog.confirm(...)`.

### 5.5. WebSocket con fallback REST
`utils/chatStore.js` intenta enviar por WebSocket; si el socket no está abierto, hace `POST /api/chat` como respaldo. El handler de servidor expone ambos canales.

### 5.6. Auto-logout en 401
`utils/api.js` envuelve `fetch` y, ante 401, limpia el token y recarga. Evita estados "zombi" cuando el JWT caduca o cambia el secret entre deploys.

### 5.7. Migración no-destructiva con `ddl-auto: update`
Los campos nuevos se añaden como **nullable** para que Hibernate no intente alterar columnas existentes y rompa el arranque en Postgres prod. Coste: hay que normalizar con `value != null && value` al leer.

### 5.8. `prepareThreshold=0` en Neon
El `application.yml` perfil `prod` añade `prepareThreshold=0` a la URL JDBC para evitar el bug clásico de `cached plan must not change result type` del pooler de Neon tras migraciones de esquema.

### 5.9. Historial de pesos al cambiar rutina
`WorkoutService` guarda los últimos pesos registrados por el cliente (extraídos de `WorkoutSession`) antes de que el entrenador sobreescriba su `routineJson`. Esto permite que el entrenador tenga referencia histórica y que el cliente no pierda su progreso de cargas.

### 5.10. Lombok en Java 25
`pom.xml` bloquea Lombok en `1.18.40` para que compile correctamente bajo JDK 25. No actualices sin probar primero que las anotaciones generan código sin errores.

---

## 6. Endpoints clave

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | `{ accessToken, user }` |
| POST | `/api/auth/change-password` | Cambia la contraseña (Bearer) |

### Usuarios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users/me` | Perfil del usuario autenticado |
| PUT | `/api/users/me` | Actualizar perfil propio |
| POST | `/api/users/me/complete-onboarding` | Primer ProgressLog + lock de revisión |
| GET | `/api/users/clients` | Clientes del coach |
| POST | `/api/users/create-client` | Crear cliente (genera username automático) |
| PUT | `/api/users/clients/{id}` | Editar datos del cliente |
| POST | `/api/users/clients/{id}/reset-password` | Contraseña temporal |

### Rutinas / Plantillas / Ejercicios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/templates` | Lista de plantillas del coach |
| POST | `/api/templates` | Crear plantilla |
| PUT | `/api/templates/{id}` | Editar plantilla |
| DELETE | `/api/templates/{id}` | Eliminar plantilla |
| GET | `/api/exercises` | Catálogo de ejercicios custom |
| POST | `/api/exercises` | Añadir ejercicio |
| PUT | `/api/exercises/{id}` | Renombrar ejercicio |
| DELETE | `/api/exercises/{id}` | Eliminar ejercicio |

### Workouts
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/workouts/finish` | Guardar sesión finalizada |
| PUT | `/api/workouts/update/{id}` | Actualizar sesión (edición post-entreno) |
| GET | `/api/workouts/history/me` | Historial de sesiones del cliente |

### Progreso
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/progress/history` | Historial de ProgressLog |
| POST | `/api/progress` | UPSERT por día |

### Revisiones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reviews/lock-status` | `{ locked, secondsRemaining, nextReviewAt }` |
| GET | `/api/reviews/active` | Revisión activa del cliente |
| GET | `/api/reviews/history` | Historial de revisiones |
| GET | `/api/reviews/gallery` | Todas las imágenes del cliente |
| POST | `/api/reviews` | Crear revisión |
| POST | `/api/reviews/{id}/images` | Subir foto (multipart) |
| DELETE | `/api/reviews/images/{id}` | Borrar foto |
| GET | `/api/reviews/images/{id}` | Bytes de la foto (autenticado) |
| POST | `/api/reviews/{id}/feedback-received` | Cliente acusa recibo → ARCHIVED |
| GET | `/api/reviews/pending` | Revisiones pendientes (coach) |
| GET | `/api/reviews/by-client/{id}` | Historial de un cliente (coach) |
| POST | `/api/reviews/{id}/validate` | Coach valida → VALIDATED |

### Chat
- REST: `GET /api/chat/{email}`, `POST /api/chat`
- WebSocket: `/ws/chat?token=...`

---

## 7. Cómo levantarlo en local

### Backend
```bash
mvn spring-boot:run
```
- Arranca en `http://localhost:8080`.
- BD H2 en `./fitnessdb.mv.db` (persistente entre reinicios).
- Consola H2: `http://localhost:8080/h2-console` — JDBC `jdbc:h2:file:./fitnessdb`, user `sa`, pass `password`.
- `DataSeeder` crea el coach por defecto si la BD está vacía:
  - Email: `antonio.ortiz@ficticio.com`
  - Username: `antonio`
  - Contraseña: `1234`

> ⚠️ Si la BD se borra, los clientes que existían se pierden. El seeder solo crea el coach; los clientes deben crearse desde el panel del entrenador.

### Frontend
```bash
cd frontend
npm install      # solo la primera vez
npm.cmd run dev  # en Windows si npm.ps1 está bloqueado
```
- Vite en `http://localhost:5173`.
- API por defecto `http://localhost:8080`. Override con `VITE_API_URL` en `.env.local`.

> ⚠️ En Windows, si PowerShell bloquea `npm`, usa siempre `npm.cmd run dev`.

### Build de producción
```bash
cd frontend && npm.cmd run build   # genera frontend/dist
mvn package                        # genera el JAR del backend
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

## 8. Convenciones para contribuir

- **Nunca uses alerts nativos** (`alert`, `window.confirm`, `prompt`). Siempre `useDialog()`.
- **El backend toma todas las decisiones críticas**. El frontend solo refleja estados.
- **Toda transición FSM** pasa por `ReviewStatus#canTransitionTo`.
- **Toda subida de imagen** pasa por `ReviewService#addImage` (valida ownership, MIME, tamaño).
- **No serialices entidades JPA** directamente en controllers nuevos; usa DTOs.
- **Campos nuevos en User** → añádilos como nullable para compatibilidad con Postgres prod.
- **`useState` antes de derivados**: en `ClientDashboard.jsx` (y componentes similares) declara siempre el `useState` antes de cualquier variable que lo use en el render path — evita el TDZ en el bundle minificado.
- **Estilos**: usa las utilidades de `frontend/src/index.css` (`glass-panel`, `btn-primary`, `input-field`, `fade-in`, `scrollable-tabs`) antes de añadir CSS nuevo.
- **Username al crear cliente**: la lógica de generación vive en `UserService`. Si cambias el formato, actualiza también el tooltip del modal de creación en `ClientList.jsx`.

---

## 9. TODOs conocidos / Próximos pasos

- Eliminar el fichero de test temporal `PrivateFitnessApplicationTests.java` (añadido para debug de BD).
- Notificación push real de mensajes nuevos (actualmente solo badge in-app).
- Migración a S3 si el volumen de imágenes crece significativamente.
- Vista de entrenamiento en formato tabla nativa para escritorio (actualmente disponible como modal/PDF).
- Panel de estadísticas del entrenador: cumplimiento agregado de todos los clientes, evolución media de métricas.
- Eliminar paquete legacy `com.fitnessApp.fitness` cuando nada lo referencie.
