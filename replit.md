# Marvel Rivals Discord Bot

Bot de Discord que registra a los jugadores de Marvel Rivals cuando entran a un canal de voz, solicitando su rol, personaje e ID de juego.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `RENDER_PUBLIC_URL` — URL base pública del servicio en Render; habilita un ping a `/api/healthz` al iniciar y cada 5 minutos.
- Required secret: `DISCORD_TOKEN` — token privado del bot de Discord

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/lib/discord.ts` — eventos de voz, panel de registro y componentes interactivos de Discord.
- `artifacts/api-server/src/routes/` — estado HTTP del servidor y del bot.

## Architecture decisions

- El bot usa componentes nativos de Discord y modales para que el ID de juego no se publique durante la captura.
- El estado de registros vive en memoria para este primer MVP; se reemplazará por PostgreSQL si se requiere conservarlo tras reinicios.
- Cada usuario tiene una selección aislada para evitar que entradas simultáneas mezclen roles y personajes.

## Product

- Publica un panel cuando un jugador entra a un canal de voz.
- Permite seleccionar Vanguard, Duelist o Strategist y un personaje disponible.
- Solicita el ID de Marvel Rivals en un modal privado y publica la ficha final en el chat del canal.
- Los mensajes públicos del bot son temporales: el panel se elimina al iniciar el registro y las listas se limpian automáticamente; las conversaciones normales no se borran.
- `!list` muestra temporalmente la lista del canal y elimina también el mensaje del comando.
- Las listas de personajes están separadas en varios menús cuando un rol supera el límite de 25 opciones de Discord.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
