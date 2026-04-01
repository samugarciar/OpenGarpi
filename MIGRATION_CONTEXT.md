# OpenGarpi - Contexto de Migración y Estado Actual

Este documento contiene todo el contexto necesario para retomar el desarrollo del proyecto exactamente donde lo dejamos en caso de cambiar de carpeta o reanudar en una nueva conversación.

## Descripción General
**OpenGarpi** es un agente personal local basado en TypeScript. Su única interfaz es un bot de Telegram. Trabaja con Long Polling y está diseñado bajo una arquitectura modular estricta, priorizando seguridad, memoria persistente en la nube y llamadas a herramientas (Tool Calling).

## Stack Tecnológico Actual
- **Framework Bot:** `grammy` (conectado vía Long Polling).
- **Inteligencia Artificial:** SDK oficial de `openai` en crudo, pero apuntando a la API de **Groq** (`llama-3.3-70b-versatile`).
- **Respaldo LLM:** Fallback automático hacia la API de **OpenRouter** si Groq falla.
- **Base de Datos:** **Firebase Admin SDK** (Cloud Firestore).
- **Validación Entorno:** `zod` y `dotenv`.
- **Ejecución y Tipado:** TypeScript ejecutado localmente con `tsx`.

## Estado del Código (Arquitectura Finalizada)
Todo el código base está terminado, 100% tipado y verificado.
1. `src/config.ts`: Valida que el entorno `.env` esté sano (Token, IDs permitidos en base a Whitelist, etc.).
2. `src/bot/middleware.ts`: Bloquea/ignora por completo a cualquier persona que no sea el ID del dueño.
3. `src/bot/handlers.ts`: Atiende `start`, `clear` y el proceso de enviar mensajes. Mantiene el indicador "escribiendo..." en Telegram.
4. `src/db/memory.ts`: Conecta asíncronamente a Firestore con el JSON `service-account.json`. Guarda mensajes en la jerarquía `users/{userId}/messages/` ordenados por marca de tiempo (`timestamp`).
5. `src/agent/loop.ts`: Un bucle `while/for` (máximo 5 iteraciones) que inyecta todo el historial de Firestore al modelo Llama, atrapa la llamada a herramientas (`get_current_time`), la resuelve vía TypeScript y re-inyecta el resultado a la base de datos hasta soltar la respuesta final en texto.

## Siguientes Pasos (Donde lo dejamos)
El proyecto local está terminado. Estábamos a punto de comenzar el **Despliegue a la Nube (Gratis 24/7)** usando la opción que tú recomendaste:

**Objetivo Pendiente: Desplegar en Google Compute Engine (VM e2-micro gratuita)**
Al abrir la nueva conversación, pídele a la IA (yo) que lea este archivo y que comience directamente con estos pasos de despliegue:
1. Crear un archivo `ecosystem.config.cjs` en la raíz para preparar el bot para correr permanentemente en la nube usando el gestor `pm2`.
2. Asistir al usuario para crear la instancia `e2-micro` en la consola Púbica de **Google Cloud** (región us-central1).
3. Subir los archivos del proyecto a esa máquina virtual (ya sea vía SSH, SFTP, o repositorio de GitHub privado).
4. Configurar el archivo `.env` y el `service-account.json` dentro de la máquina remota Ubuntu.
5. Ejecutar allí `npm install` y encender el proceso con `pm2 start ecosystem.config.cjs`.

### Checklists rápidos para ti en el nuevo entorno:
- [ ] No olvides traerte a la nueva carpeta tu archivo `.env` real (recuerda que no se sube a GitHub).
- [ ] No olvides traerte tu archivo confidencial `service-account.json` generado en Firebase a la nueva carpeta.
- [ ] Recuerda hacer un nuevo `npm install` al mover todo el proyecto de lugar.
