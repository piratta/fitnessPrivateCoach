# PrivateFitness — Tu Entrenador Personal en el Bolsillo

PrivateFitness es la plataforma que conecta a un entrenador con sus clientes en un único lugar: rutinas, mediciones, fotos de progreso, revisiones periódicas, chat en tiempo real y facturación. Olvídate de Excels, PDFs sueltos y mensajes perdidos por WhatsApp.

> **Estado:** desplegada en `fitnessprivatecoach.onrender.com`. Versión activa: refactor de revisiones (FSM), galería e integridad de datos.

---

## 👤 Para el Cliente

### 1. Onboarding inteligente
- En tu **primer inicio de sesión** la app te pide que cambies la contraseña temporal.
- A continuación abre un **cuestionario inicial** (peso, altura, edad, medidas, sueño, estrés, digestiones).
- Esas medidas quedan guardadas en BD como tu **primer registro de progreso**, y se activa la cuenta atrás hasta tu siguiente revisión.

### 2. Entrenamiento del día
- **Previsualización solo-lectura**: antes de empezar puedes ver todos los ejercicios del día (series, repeticiones, peso esperado del entrenador, notas) sin riesgo de tocar nada.
- **Modo entrenamiento**: pulsas “Empezar”, arranca el cronómetro y registras peso y reps de cada serie.
- **Descansos automáticos**: al completar una serie, se inicia un timer de descanso visible en la cabecera.
- **Flexibilidad**: puedes marcar series como omitidas o el día entero como descanso sin penalización.
- **Re-edición**: una vez finalizado el entrenamiento puedes modificar series concretas con el botón ✏️ (se persiste vía PUT).

### 3. Progreso y mediciones
- **Peso diario**: lo registras de un toque desde la pestaña Progreso.
- **UPSERT por día**: si registras varios pesos el mismo día, solo se guarda el último — *no se crea una columna nueva*.
- **Medidas completas**: peso, cintura, cadera, cuello, bíceps, pierna.
- **Comparativa de medidas**: tabla con diferencia entre fechas; los días con solo peso (sin medidas corporales) **no aparecen** en la comparativa, así que no “ensucian” la tabla.
- **Gráficas de evolución**: peso, adherencia, volumen total levantado y gráficas individuales por cada medida corporal.

### 4. Revisiones con máquina de estados
- Flujo controlado por backend: **PENDING → VALIDATED → FEEDBACK_RECEIVED → ARCHIVED**.
- **Envío**: rellenas medidas + comentarios y subes fotos (frontal, lateral izq., lateral der., espalda).
- **Cámara móvil**: puedes hacer las fotos al momento desde el móvil (acceso directo a la cámara trasera).
- **Galería del PC**: alternativamente, las eliges desde tu carrete.
- **Mientras evalúa el entrenador**: ves tu revisión enviada en modo lectura.
- **Cuando el entrenador valida**: aparece su feedback en la misma pantalla.
- **“Marcar feedback recibido”**: archiva la revisión en tu historial y activa un **candado con cuenta atrás** (días/horas/min) hasta la próxima revisión permitida según tu periodicidad (semanal, bisemanal, 3 semanas, mensual, bimensual).
- **Historial completo** plegable: cada revisión guarda medidas, comentarios, feedback y fotos.

### 5. Galería
- Nueva pestaña con **todas las fotos que has subido en tus revisiones**.
- Vista miniatura con fecha y zoom a tamaño completo al tocar.
- Las imágenes se sirven con autenticación (no son públicas) y se cachean en el cliente.

### 6. Chat directo
- Chat estilo WhatsApp con tu entrenador, en tiempo real vía **WebSocket**.
- **Notificación con badge rojo** cuando hay mensajes nuevos sin leer.
- Fallback automático a REST si el WebSocket cae.

---

## 👨‍🏫 Para el Entrenador

### 1. Mis Clientes
- Listado con búsqueda, filtros, orden por columnas.
- **Modal de detalle** por cliente: objetivo, peso actual, cumplimiento, próxima revisión, periodicidad, estrategia de progresión.
- **Editar nombre y email** del cliente desde el mismo modal.
- **Regenerar contraseña**: genera una contraseña temporal aleatoria; el cliente deberá cambiarla en su próximo inicio de sesión. Las credenciales se muestran en un modal copiable.
- Cambiar **periodicidad de revisiones** y **estrategia de progresión** (UPSERT instantáneo).

### 2. Asignar Rutina
- Constructor visual de rutinas día a día.
- **Peso esperado opcional** por ejercicio: puede dejarse vacío o indicar la carga objetivo, que el cliente verá en la previsualización.
- Crear rutina a mano o partir de una plantilla.

### 3. Plantillas
- Galería de plantillas reutilizables (Hipertrofia 4 días, Fuerza Full Body, etc.).
- Crear, duplicar y editar plantillas.

### 4. Revisiones
- Bandeja con revisiones pendientes de validar (`PENDING`) de tus propios clientes.
- Ver medidas, comentarios y fotos enviadas.
- Escribir feedback y **validar** la revisión (PENDING → VALIDATED). A partir de ahí, el cliente debe acusar recibo para archivarla y activar su bloqueo.

### 5. Mensajes
- Vista consolidada de chats por cliente, con contador de no leídos.

### 6. Facturación
- Listado de clientes con su plan de facturación (Mensual, Trimestral, Semestral, Anual) y estado.

### 7. Perfil del entrenador
- El entrenador puede entrar a su perfil y editar nombre, apellidos, fecha de nacimiento y correo.

---

## 🛠 Aplicación

- **Sin alerts nativos**: todos los `alert/confirm/prompt` del navegador están reemplazados por un sistema propio de **modales y toasts** (`<DialogProvider>`) con promesas (`await dialog.alert(...)`, `await dialog.confirm(...)`).
- **Vista en formato tabla** del entrenamiento.
- **Sesión 401 = relogin automático**: si el token caduca, la app limpia credenciales y vuelve al login sin romperse.
- **CORS** y multipart configurados para subida de imágenes hasta 8MB por archivo.
- **Persistencia**: base de datos H2 en local (`./fitnessdb.mv.db`) y PostgreSQL (Neon) en producción con el perfil `prod`.

---

## 🔒 Integridad y seguridad

- JWT (HS256, 1 día) en `Authorization: Bearer …`.
- Spring Security 6 con filtros stateless, `AuthenticationEntryPoint` JSON que devuelve **401** real y `accessDeniedHandler` que devuelve 403 con motivo, no respuestas vacías.
- BCrypt para hashing de contraseñas.
- Endpoints sensibles validan **ownership**: un cliente solo accede a sus revisiones/imágenes, un coach solo a las de sus clientes.
- `ProgressLog` con `UNIQUE(client_id, log_date)` para garantizar que **no haya duplicados** por día.
- Flujo de revisiones controlado por backend: el frontend nunca decide transiciones; las hace cumplir el `ReviewService` con guards (`HTTP 409` si la transición es inválida, `HTTP 423 Locked` si la revisión todavía no toca).
- Operaciones críticas en `@Transactional` (subida de imágenes, archivado de revisión, etc.).

---

## 🚀 Empezar a usarla

1. Pide al entrenador tu **usuario** y **contraseña temporal**.
2. Entra en `https://fitnessprivatecoach.onrender.com` desde el navegador del móvil (puedes “añadir a pantalla de inicio” para que se comporte como app).
3. Cambia la contraseña en el primer inicio.
4. Completa el cuestionario inicial.
5. ¡Empieza a entrenar!

Si eres **desarrollador**, mira [`developer.md`](./developer.md) para tecnologías, arquitectura y cómo levantar el entorno.
