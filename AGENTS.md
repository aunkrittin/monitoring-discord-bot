# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript Node.js Discord monitoring bot. The entry point is `index.ts`, which creates the Discord client, loads configuration through `src/config.ts`, and imports `src/loader.ts`. Runtime event handlers live in `events/`; current handlers include `clientReady.ts` and `serverMonitor.ts`. Shared monitoring utilities live in `src/`, especially `src/monitors.ts` for website, TCP port, and ping checks.

The loader also expects a `commands/` directory with grouped command modules, although this repository does not currently include one. If commands are added, use `commands/<category>/<command>.ts` and export at least `name` and `description`.

Secrets are expected in `.env`, which is ignored by git. Monitored services live in `config.services.json`, which is committed so deployments can update service definitions without exposing credentials. Generated Discord message IDs live in ignored `config.runtime.json`. Avoid committing bot tokens, channel IDs, or API credentials.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: run the bot through `tsx watch` for automatic restarts during development.
- `npm run check`: type-check the TypeScript project.
- `npm run build`: compile TypeScript to `dist/`.
- `npm start`: run the compiled bot with `node dist/index.js`.
- `npm test`: currently runs the type-check command.

Before running locally, create `.env` from `.env.example` with the Discord token, channel ID, and Proxmox settings. Update `config.services.json` for monitored services.

## Coding Style & Naming Conventions

Use TypeScript modules (`import`, `export`) and keep CommonJS compiler output for production. Keep indentation at two spaces, prefer `const`/`let`, and use semicolons. Name event files after Discord event names, for example `clientReady.ts` or `messageCreate.ts`, because `src/loader.ts` derives the event name from the filename.

Keep monitoring helpers small and export them from focused modules under `src/`. Use clear camelCase names such as `checkWebsiteStatus` and `checkPortStatus`.

## Testing Guidelines

There is no test framework configured yet. For new logic, prefer adding unit tests around pure helper functions in `src/` before testing Discord behavior end to end. A practical convention is `tests/<module>.test.ts`, for example `tests/monitors.test.ts`. Mock network calls to Discord, Proxmox, and monitored hosts.

## Commit & Pull Request Guidelines

Recent history uses short imperative messages such as `Update config.json.local` and `Create README.md`. Continue with concise, action-oriented subjects, for example `Add port monitor timeout handling`.

Pull requests should describe the behavior change, list manual verification steps (`npm start`, observed Discord embed update, etc.), and call out `.env` or `config.services.json` changes. Include screenshots when Discord embed formatting changes.

## Security & Configuration Tips

Never commit `.env`, `config.json`, bot tokens, or API tokens. Treat generated message IDs and service endpoints as environment-specific. If a credential is exposed, rotate it before merging related changes.
