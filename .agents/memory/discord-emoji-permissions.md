---
name: Permisos de emojis en Discord
description: Restricción por servidor para que el bot pueda crear emojis personalizados.
---

El permiso **Gestionar expresiones** se evalúa por servidor. Un bot puede conectarse correctamente y sincronizar todos los emojis en un servidor mientras recibe `Missing Permissions (50013)` en otro.

**Why:** La sincronización se ejecuta para cada servidor disponible del bot y la autorización no se hereda entre servidores.

**How to apply:** Al verificar nuevos servidores, habilitar el permiso en el rol del bot en cada servidor y revisar los logs de sincronización por `guildId` antes de validar los menús.