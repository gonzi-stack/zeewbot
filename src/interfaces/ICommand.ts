import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { IBot } from './IBot';

export interface ICommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommandGroup' | 'addSubcommand'>;
  execute: (interaction: ChatInputCommandInteraction, client: IBot) => Promise<void>;
}
