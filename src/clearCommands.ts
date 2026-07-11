import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import logger from './utils/logger';
import config from '../config.json';

// Validar variables de entorno
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not defined in environment variables');
  process.exit(1);
}

async function clearCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    logger.info('🗑️  Iniciando eliminación de comandos...');

    // Obtener ID del bot
    const application = await rest.get(Routes.oauth2CurrentApplication()) as any;
    const clientId = application.id;

    logger.info(`Bot ID: ${clientId}`);
    logger.info(`Guild ID: ${config.guildId}`);

    // Eliminar comandos del servidor específico
    logger.info('Eliminando comandos del servidor...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: [] }
    );
    logger.info('✅ Comandos del servidor eliminados');

    // Preguntar si también quiere eliminar comandos globales
    logger.info('\n⚠️  ¿También quieres eliminar comandos GLOBALES?');
    logger.info('Esto afectará a TODOS los servidores donde esté el bot.');
    logger.info('Si quieres eliminar comandos globales, ejecuta: pnpm run clear-commands:global');

  } catch (error) {
    logger.error('Error al eliminar comandos:', error);
    process.exit(1);
  }
}

// Función para eliminar comandos globales
async function clearGlobalCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    logger.info('🗑️  Eliminando comandos GLOBALES...');

    // Obtener ID del bot
    const application = await rest.get(Routes.oauth2CurrentApplication()) as any;
    const clientId = application.id;

    // Eliminar comandos globales
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );

    logger.info('✅ Comandos globales eliminados');
  } catch (error) {
    logger.error('Error al eliminar comandos globales:', error);
    process.exit(1);
  }
}

// Verificar si se pasó el argumento --global
const isGlobal = process.argv.includes('--global');

if (isGlobal) {
  logger.warn('⚠️  ADVERTENCIA: Vas a eliminar comandos GLOBALES');
  logger.warn('Esto afectará a TODOS los servidores donde esté el bot.');
  logger.warn('Presiona Ctrl+C en los próximos 5 segundos para cancelar...');
  
  setTimeout(() => {
    clearGlobalCommands();
  }, 5000);
} else {
  clearCommands();
}
