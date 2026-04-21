Developed by **jaimeol**, [rpisoner](https://github.com/rpisoner), [asandova-ui](https://github.com/asandova-ui), and [jamorale](https://github.com/JaviMoraales)

# ft_transcendence

`ft_transcendence` is a **full-stack web application** built as a 42 final project, combining **real-time gameplay, authentication, chat, social features, and session-based user flows** inside a custom web stack.

This repository is closer to a complete product prototype than to a small isolated exercise: it integrates backend APIs, a custom frontend SPA, persistent data, WebSockets, multiplayer logic, and Docker-based local orchestration.

## Technical stack

### Backend

- **Node.js / Fastify**
- **better-sqlite3**
- **WebSockets**
- **multipart uploads**
- **cookie + session handling**
- **Google sign-in integration**

### Frontend

- **TypeScript**
- **Tailwind CSS**
- custom SPA routing
- browser-based game and profile flows

### Local orchestration

- **Docker Compose**
- separate `backend` and `frontend` services
- HTTPS for local development
- bind-mounted development workflow

## What the application includes

From the current codebase, the platform includes:

- local authentication and Google authentication
- session-based access control
- user profiles and avatar uploads
- friend requests and social graph management
- real-time direct chat over WebSockets
- Pong game modes
- Tic-Tac-Toe
- match history and statistics
- tournament creation, joining, and progression
- multilingual UI support

## Repository structure

```text
ft_transcendence/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, users, friends, chat, matches, tournaments
│   │   ├── db.js
│   │   ├── schema.sql
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/               # router, pages, game screens, UI logic
│   ├── public/
│   └── package.json
├── data/                  # local SQLite database and uploads
├── docker-compose.yml
└── Makefile
```

## Local setup

### Prerequisites

- Docker Engine
- Docker Compose

### Environment

Create a `.env` file in the project root with the variables your environment requires, for example:

```env
SESSION_SECRET=<generate_a_strong_random_secret>
GOOGLE_CLIENT_ID=<your_google_cloud_client_id>
FRONTEND_URL=https://localhost:1234
NODE_ENV=development
```

### HTTPS certificates

The backend expects certificates in `backend/certs/`. For local development, you can generate self-signed certificates:

```bash
mkdir -p backend/certs
openssl req -x509 -newkey rsa:4096 \
  -keyout backend/certs/server.key \
  -out backend/certs/server.crt \
  -sha256 -days 365 -nodes \
  -subj "/CN=localhost"
```

## Run locally

### Standard startup

```bash
make
```

### Development mode

```bash
make dev
```

Useful commands:

```bash
make up-d
make build
make logs
make down
make clean
make fclean
make re
```

Default local access:

- [https://localhost:1234](https://localhost:1234)

## Why it is technically relevant

What makes this project strong is the amount of integration involved:

- backend APIs and persistent data
- session handling and auth flows
- real-time messaging
- multiplayer and match tracking
- tournament logic
- frontend routing and stateful navigation
- containerized local orchestration

It is a solid example of a **full-stack, feature-rich application** built with meaningful engineering scope rather than a single isolated demo.
