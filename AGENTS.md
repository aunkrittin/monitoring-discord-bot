# Repository Guidelines

## Project Structure & Module Organization

This is a Node.js Discord monitoring bot. The entry point is `index.js`, which creates the Discord client, loads configuration through `src/config.js`, and imports `src/loader.js`. Runtime event handlers live in `events/`; current handlers include `clientReady.js` and `serverMonitor.js`. Shared monitoring utilities live in `src/`, especially `src/monitor.js` for website, TCP port, and ping checks.

The loader also expects a `commands/` directory with grouped command modules, although this repository does not currently include one. If commands are added, use `commands/<category>/<command>.js` and export at least `name` and `description`.

Secrets are expected in `.env`, which is ignored by git. Monitored services live in `config.services.json`, which is committed so deployments can update service definitions without exposing credentials. Generated Discord message IDs live in ignored `config.runtime.json`. Avoid committing bot tokens, channel IDs, or API credentials.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm start`: run the bot with `node index.js`.
- `npm run dev`: run the bot through `nodemon` for automatic restarts during development.
- `npm test`: currently a placeholder that exits with an error; add a real test command before relying on it in CI.

Before running locally, create `.env` from `.env.example` with the Discord token, channel ID, and Proxmox settings. Update `config.services.json` for monitored services.

## Coding Style & Naming Conventions

Use CommonJS modules (`require`, `module.exports`) to match the existing code. Keep indentation at two spaces, prefer `const`/`let`, and use semicolons. Name event files after Discord event names, for example `ready.js` or `messageCreate.js`, because `src/loader.js` derives the event name from the filename.

Keep monitoring helpers small and export them from `src/monitor.js` or a focused module under `src/`. Use clear camelCase names such as `checkWebsiteStatus` and `checkGameServerStatus`.

## Testing Guidelines

There is no test framework configured yet. For new logic, prefer adding unit tests around pure helper functions in `src/` before testing Discord behavior end to end. A practical convention is `tests/<module>.test.js`, for example `tests/monitor.test.js`. Mock network calls to Discord, Proxmox, and monitored hosts.

## Commit & Pull Request Guidelines

Recent history uses short imperative messages such as `Update config.json.local` and `Create README.md`. Continue with concise, action-oriented subjects, for example `Add port monitor timeout handling`.

Pull requests should describe the behavior change, list manual verification steps (`npm start`, observed Discord embed update, etc.), and call out `.env` or `config.services.json` changes. Include screenshots when Discord embed formatting changes.

## Security & Configuration Tips

Never commit `.env`, `config.json`, bot tokens, or API tokens. Treat generated message IDs and service endpoints as environment-specific. If a credential is exposed, rotate it before merging related changes.
