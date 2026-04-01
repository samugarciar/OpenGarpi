# OpenGarpi

OpenGarpi es un agente personal de Inteligencia Artificial diseñado para funcionar localmente, comunicándose de forma exclusiva a través de Telegram. Está construido desde cero usando TypeScript, dando prioridad a la simplicidad, el control y la seguridad.

## Arquitectura del Proyecto

El proyecto está diseñado de forma modular. A pesar de su ligereza, incluye herramientas complejas como base de datos persistente, invocación de herramientas (Tool Calling) por parte de la IA, y sistemas de respaldo de LLM de forma autónoma.

A continuación, explico detalladamente cómo interactúan las piezas:

### 1. Sistema de Entrada (El Bot de Telegram)
La única vía de comunicación con OpenGarpi es tu chat de Telegram.
- **`src/index.ts`**: Es el entry-point de nuestra aplicación. Aquí se inicializa la instancia de `Bot` proveída por \`grammy\`. Actúa como un bucle infinito escuchando (Long Polling) cualquier actualización desde los servidores de Telegram.
- **`src/bot/middleware.ts`**: **(Seguridad Primaria)**. Antes de que cualquier mensaje sea procesado, este archivo verifica el remitente (`ctx.from.id`). Si no coincide con la lista blanca (\`TELEGRAM_ALLOWED_USER_IDS\`), la ejecución se detiene instantáneamente y el mensaje se ignora de forma silenciosa para evitar descubrir que el bot está activo.
- **`src/bot/handlers.ts`**: Atrapa los comandos y mensajes de texto autorizados (ej. `/start`, `/clear`). Cuando recibes un mensaje normal, este se deriva al cerebro del programa (`processUserMessage`).

### 2. Memoria Persistente (Firebase Firestore)
A diferencia de los bots simples que olvidan el contexto, OpenGarpi tiene memoria.
- **`src/db/memory.ts`**: Usamos `firebase-admin` para almacenar el historial directamente en la nube usando Firebase Firestore.
  - La colección `users/{userId}/messages/` guarda todos los mensajes de forma individual con un formato compatible con el estándar de OpenAI.
  - Guarda roles clave: `user` (lo que tú dices), `assistant` (lo que la IA piensa o dice), y `tool` (los resultados de las herramientas).
  - Al recuperar la memoria con `getHistory`, obtenemos los últimos N documentos ordenados cronológicamente por `timestamp`, sirviendo de "Contexto" para la IA.

### 3. El Cerebro LLM y su Respaldo
El agente no dependerá de un solo proveedor que pueda caerse o limitar el uso.
- **`src/llm/client.ts`**: Expone una función genérica `generateCompletion`.
  - **Uso Primario (Groq)**: Por defecto, invoca a `llama-3.3-70b-versatile` por su altísima velocidad y bajo coste/gratuidad.
  - **Fallback (OpenRouter)**: Si por algún motivo Groq llega al límite de peticiones (Rate Limit) o se cae, un bloque `try-catch` capturará el error e *inmediatamente* replicará la pregunta hacia OpenRouter para procesarlo con un modelo de reserva (garantizando que OpenGarpi no se quede "congelado").

### 4. Bucle del Agente (Agent Loop)
Esta es la capa donde ocurre la "magia". El agente no responde solo de forma directa, sino que primero razona si necesita ejecutar acciones.
- **`src/agent/loop.ts`**: El bucle (un loop con límite máximo configurable, ej. 5 iteraciones) actúa así:
  1. Alimenta al LLM con el nuevo mensaje + el historial desde Firestore.
  2. Si el LLM decide que debe usar una herramienta (ej. ve que le preguntaste la hora), en vez de devolver texto plano devuelve un `tool_call`.
  3. El código atrapa ese "deseo" y ejecuta la función local de TypeScript correspondiente.
  4. La respuesta de esa TypeScript local se inyecta en la base de datos indicando "Soy la herramienta informando que la hora es X".
  5. Se **repite** el bucle de forma interna. El LLM ahora lee la base de datos, entiende qué hora es en realidad, y ahora sí genera la respuesta de texto plano que lees en tu chat.

### 5. Configuración y Seguridad de Variables
- **`src/config.ts`**: Extrae todo tu archivo `.env`. Usamos \`zod\` para garantizar que en tiempo de compilación tu bot no inicie si hay algo mal configurado (como olvidar tu Token de Telegram). Las credenciales de Firebase se inicializan automáticamente mediante la configuración por defecto de Google Cloud, permitiendo una integración transparente con servicios como Firestore.

## Estructura de Carpetas

\`\`\`
├── .env                  # Tus llaves secretas locales
├── .env.example          # Plantilla para copias de seguridad
├── package.json          # Dependencias y scripts de arranque
├── tsconfig.json         # Configuración estricta de TypeScript
└── src/
    ├── index.ts          # Inicio de todo el sistema
    ├── config.ts         # Wrapper seguro del .env
    ├── db/
    │   └── memory.ts     # Abstracción de base de datos a consultas Firestore (Firebase)
    ├── llm/
    │   └── client.ts     # Wrapper LLM con Fallback dual
    ├── agent/
    │   ├── loop.ts       # Ciclo de pensamiento MAX_ITERATIONS
    │   └── tools.ts      # Definición de funciones (ej. get_current_time)
    └── bot/
        ├── middleware.ts # Firewall local de cuentas de Telegram
        └── handlers.ts   # Controles de Telegram (typing action, strings)
\`\`\`

## Escalar OpenGarpi en el Futuro

Esta arquitectura está intencionalmente pensada para ser el cimiento. Para evolucionar el bot solo debes:
1. **Añadir Habilidades**: Crear nuevas funciones en `src/agent/tools.ts`, y de forma automática el LLM empezará a saber usarlas.
2. **Transcripción**: Conectar \`ffmpeg\` y un bloque en `src/bot/handlers.ts` que escuche eventos del tipo `message:voice` antes de enviarlos al `agent loop`.

*(Cualquier anomalía de reinicio rápido en terminal (ej. Ctrl+C), puede generar reintentos de peticiones API. Asegúrate de verificar siempre tu archivo `.env` antes del arranque en caso de errores de autenticación.)*
