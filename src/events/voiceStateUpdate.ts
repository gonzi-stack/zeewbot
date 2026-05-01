import { Events, VoiceState } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';

export const event: IEvent<Events.VoiceStateUpdate> = {
    name: Events.VoiceStateUpdate,

    async execute(client: IBot, oldState: VoiceState, newState: VoiceState) {
        const guildId = oldState.guild.id;

        // --- TTS auto-leave ---
        if (client.ttsService) {
            const ttsSession = client.ttsService.getSession(guildId);
            if (ttsSession) {
                // Si el bot se movió o fue desconectado del canal TTS
                if (oldState.member?.id === client.user?.id) {
                    if (!newState.channelId || newState.channelId !== ttsSession.voiceChannelId) {
                        client.ttsService.leaveChannel(guildId);
                    }
                }

                // Si alguien se salió del canal donde está el bot (TTS)
                if (oldState.channelId === ttsSession.voiceChannelId && newState.channelId !== ttsSession.voiceChannelId) {
                    const channel = oldState.channel;
                    if (channel) {
                        const humans = channel.members.filter(m => !m.user.bot);
                        if (humans.size === 0) {
                            client.ttsService.leaveChannel(guildId);
                        }
                    }
                }
            }
        }

        // --- Música auto-leave ---
        if (client.musicService) {
            const musicQueue = client.musicService.getQueue(guildId);
            if (musicQueue) {
                // Si alguien se salió de un canal de voz, verificar si el bot se quedó solo
                if (oldState.channelId && oldState.channelId !== newState.channelId) {
                    const channel = oldState.channel;
                    if (channel) {
                        // Verificar si el bot está en ese canal
                        const botInChannel = channel.members.has(client.user?.id ?? '');
                        if (botInChannel) {
                            const humans = channel.members.filter(m => !m.user.bot);
                            if (humans.size === 0) {
                                client.musicService.destroy(guildId);
                                client.logger.info(`🎵 Auto-desconectado de voz en guild ${guildId} (canal vacío)`);
                            }
                        }
                    }
                }
            }
        }
    },
};

