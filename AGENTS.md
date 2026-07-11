# AGENTS.md - ZeewBot Development Guide

## Project Overview
- **Project**: ZeewBot - Discord bot for Zeew Space
- **Language**: TypeScript (Node.js)
- **Framework**: discord.js v14
- **Package Manager**: pnpm

---

## Build, Lint, and Test Commands

### Core Commands
| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Compile TypeScript to JavaScript (outputs to `dist/`) |
| `pnpm run dev` | Run bot in development mode with watch |
| `pnpm start` | Run compiled bot from `dist/` |
| `pnpm run lint` | Run ESLint on `src/` |
| `pnpm run lint:fix` | Run ESLint with auto-fix |

### Docker Commands
| Command | Description |
|---------|-------------|
| `make dev` | Start bot in development mode |
| `make prod` | Start bot in production mode |
| `make stop` | Stop all containers |
| `make logs` | View production logs |
| `make logs-dev` | View development logs |
| `make shell` | Open shell in bot container |
| `make clean` | Clean containers, volumes, and images |

### Slash Command Management
| Command | Description |
|---------|-------------|
| `pnpm run manage-commands` | Deploy slash commands |
| `pnpm run clear-commands` | Clear commands from test guild |
| `pnpm run clear-commands:global` | Clear global commands |

### Testing
- **No tests currently implemented**
- When implementing tests: use `pnpm test` (add test framework as needed)

---

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Indent**: 2 spaces

### Formatting Rules (ESLint)
- **Semicolons**: Always required
- **Quotes**: Single quotes only
- **Trailing commas**: Required for multiline objects/arrays
- **Line endings**: LF (configured in project)

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `client`, `getUserById()` |
| Classes/Interfaces | PascalCase | `ZeewBot`, `ICommand` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Files | kebab-case | `commandHandler.ts`, `voiceStateUpdate.ts` |

### Import Order
1. External modules (discord.js, etc.)
2. Local modules (`../`, `./`)
3. Types/interfaces
4. Implementation

```typescript
// 1. External
import { Client, EmbedBuilder } from 'discord.js';

// 2. Local modules
import { CommandHandler } from './handlers/CommandHandler';
import { IBot } from './interfaces/IBot';

// 3. Types/interfaces (if separate)
import type { ICommand } from './interfaces/ICommand';

// 4. Implementation
export class MyClass { }
```

### TypeScript Best Practices
- Use explicit return types for public functions
- Enable `strictNullChecks` - always handle `null`/`undefined`
- Avoid `any` - use `unknown` if type is truly unknown
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer interfaces over types for object shapes

### Error Handling
```typescript
// Use try-catch for async operations
try {
  await someAsyncOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  // Handle gracefully, don't swallow errors
}

// Always type catch parameters
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
}
```

### Discord.js Patterns

#### Command Structure
```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Description'),

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    // Implementation
  },
};
```

#### Using Logger
```typescript
import logger from './utils/logger';

logger.info('Starting bot');
logger.warn('Resource low');
logger.error('Failed operation', error);
```

---

## Project Structure

```
src/
├── index.ts              # Entry point
├── config/
│   └── ZeewBot.ts       # Bot configuration
├── commands/            # Slash commands
│   └── *.ts
├── events/              # Discord events
│   └── *.ts
├── handlers/            # Command/Event handlers
├── interfaces/          # TypeScript interfaces
├── services/            # Business logic
├── utils/               # Utilities (logger, etc.)
└── database/            # Database service
```

---

## Git Conventions

### Commit Messages (Conventional Commits)
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
```

Examples:
- `feat(commands): add ticket command`
- `fix(welcome): resolve welcome message not sending`
- `docs: update API documentation`

---

## Common Issues

### Running Commands
- Bot requires `.env` file with `DISCORD_TOKEN`
- Copy `.env.example` to `.env` before running

### Environment Variables
Required in `.env`:
- `DISCORD_TOKEN` - Bot token

Optional:
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration

---

## Additional Resources
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Full contribution guidelines
- [COMMANDS.md](./docs/COMMANDS.md) - Bot command documentation
- [README.md](./README.md) - Project overview
