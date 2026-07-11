# 🎯 Gestión de Comandos - ZeewBot

Esta guía te ayudará a gestionar los comandos, especialmente útil cuando tienes comandos antiguos que quieres eliminar.

## 📋 Listar Comandos Actuales

Para ver todos los comandos registrados actualmente:

```bash
pnpm run manage-commands list
```

Esto mostrará:
- Comandos del servidor específico
- Comandos globales (en todos los servidores)
- ID de cada comando

## 🗑️ Eliminar Comandos

### Opción 1: Script Rápido (Recomendado para empezar)

Para eliminar SOLO los comandos del servidor actual:

```bash
pnpm run clear-commands
```

### Opción 2: Administrador Completo

Para más control, usa el administrador de comandos:

```bash
# Ver ayuda
pnpm run manage-commands

# Eliminar comandos del servidor
pnpm run manage-commands clear-guild

# Eliminar comandos globales (¡CUIDADO!)
pnpm run manage-commands clear-global

# Eliminar TODOS los comandos
pnpm run manage-commands clear-all

# Eliminar un comando específico por ID
pnpm run manage-commands remove 1234567890
pnpm run manage-commands remove 1234567890 --global
```

## ⚠️ Advertencias

- **Comandos del servidor**: Solo afectan al servidor configurado en `config.json`
- **Comandos globales**: Afectan a TODOS los servidores donde esté el bot
- Los comandos globales pueden tardar hasta 1 hora en actualizarse
- Los comandos del servidor se actualizan instantáneamente

## 🔄 Proceso Recomendado

1. **Listar comandos actuales**:
   ```bash
   pnpm run manage-commands list
   ```

2. **Eliminar comandos antiguos**:
   ```bash
   pnpm run clear-commands
   ```

3. **Reiniciar el bot**:
   ```bash
   pnpm run dev
   ```

4. **Verificar que los nuevos comandos estén registrados**:
   ```bash
   pnpm run manage-commands list
   ```

## 🆘 Solución de Problemas

### "Los comandos no se eliminan"
- Espera unos minutos, Discord puede tardar en procesar los cambios
- Verifica que estés usando el token correcto en `.env`
- Asegúrate de que el `guildId` en `config.json` sea correcto

### "Aparecen comandos duplicados"
- Probablemente tienes comandos globales Y del servidor con el mismo nombre
- Usa `clear-all` para eliminar todo y empezar de nuevo

### "El bot no responde a los comandos"
- Verifica que el bot tenga permisos de "Usar comandos de aplicación"
- Reinicia Discord (Ctrl+R en desktop)
- Espera unos minutos después de registrar nuevos comandos

## 📝 Notas

- Los comandos del servidor son mejores para desarrollo (actualización instantánea)
- Los comandos globales son mejores para producción (disponibles en todos lados)
- Puedes tener ambos tipos al mismo tiempo, pero no es recomendable
