# Monitoring Servers

Configuration is split into:

- `.env`: private Discord and Proxmox credentials.
- `config.services.json`: monitored services.
- `config.runtime.json`: generated Discord message IDs, ignored by git.

Service `type` supports `website` and `port`.

## Development

- `npm run dev`: run TypeScript directly with `tsx`.
- `npm run check`: type-check the project.
- `npm run build`: compile to `dist/`.
- `npm start`: run compiled output from `dist/index.js`.

# Image
![image](https://github.com/user-attachments/assets/61bd8e98-ec44-4446-a077-4b65bec6c747)
