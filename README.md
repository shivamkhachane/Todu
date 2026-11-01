# Todu

Todu is a React task planner with account sign-in, text and date filtering, date sorting, task creation, floating-window task editing, completion and deletion with undo, and date-range export. The interface supports light and dark themes and adapts to mobile screens.

## Run locally

Install dependencies and start the backend and frontend in separate terminals:

```sh
npm install
npm run server
npm start
```

The backend listens on port `5000`; the Create React App development server proxies API requests to it. The frontend reads the production API URL from [`public/config.js`](./public/config.js).

## Authentication and API

The backend hashes passwords with Node's scrypt implementation. Existing base64-encoded passwords are upgraded to salted scrypt hashes on the user's next successful login. New registrations require passwords of at least eight characters.

Login and registration return a signed bearer token that expires after 30 minutes. The frontend keeps the token in `sessionStorage` so a page refresh in the same tab can restore the session. Because JavaScript can access session storage, keep the frontend free of cross-site scripting vulnerabilities. Signing out revokes the token while the backend process is running; after a backend restart, any token remains valid only until its short expiration.

Task endpoints require the bearer token and derive the account from the verified token rather than trusting an email supplied by the browser:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/tasks`
- `POST /api/tasks`

Completed state remains an optional `completed` property on each task. Existing records without it remain open tasks. The Express service and file storage are in [`server.js`](./server.js).

For local development, the server creates an ephemeral session secret if `SESSION_SECRET` is not set; sessions stop working when the server restarts. On Render, set `SESSION_SECRET` to a unique random value of at least 32 characters before deploying the backend. For example, generate one in PowerShell with:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

The Render blueprint declares this as a manually configured secret. Do not commit the value to the repository.

## Production and deployment

Build the static site with:

```sh
npm run build
```

The `homepage` setting in `package.json` configures the GitHub Pages repository base path. To publish the build using the configured `gh-pages` script, run:

```sh
npm run deploy
```

The API origin used by the deployed frontend is configured in [`public/config.js`](./public/config.js). The backend deployment configuration remains in [`render.yaml`](./render.yaml).

Deploy the backend before the frontend: the updated frontend requires the new authenticated task API. Configure `SESSION_SECRET` in the Render dashboard, deploy the backend, then publish the GitHub Pages build. Do not expose the new frontend to users while Render is still running the older unauthenticated API.

Run backend authentication tests with:

```sh
npm run test:server
```
