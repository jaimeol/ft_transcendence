
Developed by **jaimeol**, [rpisoner](https://github.com/rpisoner), [asandova-ui](https://github.com/asandova-ui) and [jamorale](https://github.com/JaviMoraales)


# ft_transcendence

**ft_transcendence** is a comprehensive full-stack web application developed as a capstone project for the 42 curriculum. It implements a real-time multiplayer gaming platform (Pong, Tic Tac Toe) integrated with social features within a Single Page Application (SPA) architecture, containerized using Docker.

## 📚 Project Objectives

This project demonstrates proficiency in developing a complex web application from the ground up, focusing on:

-   **Full-Stack Development:** Implementing both backend (Node.js/Fastify) and frontend (Vanilla TypeScript) components.
-   **SPA Architecture:** Building a responsive Single Page Application with client-side routing without relying on major frontend frameworks.
-   **Real-time Communication:** Utilizing WebSockets for instant chat messaging and game state synchronization.
-   **Database Management:** Designing and interacting with an SQLite database for persistent storage of user data, game results, and social graphs.
-   **Authentication & Authorization:** Implementing secure user authentication, including session management and integration with third-party OAuth providers (Google).
-   **Game Logic Implementation:** Developing server-authoritative or client-side game logic for multiplayer experiences.
-   **Complex Feature Integration:** Building advanced features such as a tournament system with bracket generation and user statistics tracking.
-   **Containerization:** Leveraging Docker and Docker Compose for consistent development, deployment, and scalability.
-   **Internationalization:** Designing the application to support multiple languages (EN, ES, FR).

## ⚙️ Implemented Features

-   **Authentication:** User registration, login via email/password, and Google OAuth 2.0 integration. Secure session management via cookies.
-   **User Profiles:** View and edit user information (display name, name, birthdate), including avatar image uploads.
-   **Social System:**
    -   Friend request management (send, accept, reject).
    -   Friend list display.
    -   User blocking functionality.
-   **Real-time Chat:** Direct messaging between friends using WebSockets, including game invitations and system notifications.
-   **Pong Game:**
    -   Modes: 1v1 Local, 1v1 vs AI (Easy, Medium, Hard), 2v2 Local vs AI, 2v2 Local PvP.
    -   Real-time gameplay synchronized via canvas rendering.
-   **Tic Tac Toe Game:** 1v1 Local PvP mode.
-   **Tournament System:**
    -   Create and join Pong tournaments.
    -   Automatic bracket generation and progression.
    -   Secure opponent authentication for tournament matches.
    -   Real-time bracket visualization.
-   **Match History & Statistics:**
    -   Persistent storage of match results.
    -   User-specific match history view with filtering.
    -   Dashboard with aggregated statistics (win rate, total games, etc.) and graphical visualizations.
-   **Internationalization:** Frontend translated into English, Spanish, and French using JSON locale files.
-   **Security:** HTTPS enabled using self-signed certificates for development.

## 🛠️ Technical Stack

-   **Backend:** Node.js, Fastify, `better-sqlite3`, bcrypt, WebSockets.
-   **Frontend:** TypeScript (compiled to vanilla JS), HTML5 Canvas, Tailwind CSS, custom SPA router.
-   **Database:** SQLite.
-   **Deployment:** Docker, Docker Compose.

## 🚀 Usage

### Prerequisites

-   Docker Engine
-   Docker Compose

### Setup

1.  **Clone the repository.**
2.  **Environment Configuration:** Create a `.env` file in the project root based on the required variables:
    ```env
    SESSION_SECRET=<generate_a_strong_random_secret>
    GOOGLE_CLIENT_ID=<your_google_cloud_client_id>
    FRONTEND_URL=https://localhost:1234 # Adjust if needed
    NODE_ENV=development # or production
    ```
    **
3.  **HTTPS Certificates:** Ensure SSL certificates (`server.key`, `server.crt`) are present in `backend/certs/`. For development, generate self-signed certificates:
    ```bash
    mkdir -p backend/certs
    openssl req -x509 -newkey rsa:4096 -keyout backend/certs/server.key -out backend/certs/server.crt -sha256 -days 365 -nodes -subj "/CN=localhost"
    ```
    **

### Running the Application

Utilize the provided `Makefile` for streamlined Docker operations:

* **Build & Start (Foreground):** `make all`
* **Build & Start (Background):** `make up-d`
* **Development Mode (Frontend Watcher):** `make dev`
* **Build Images Only:** `make build`
* **Stop Containers:** `make down`
* **View Logs:** `make logs`
* **Clean Environment:** `make clean` (removes containers/networks)
* **Full Clean (includes volumes/images):** `make fclean`
* **Rebuild Everything:** `make re`

Access the application via the configured `FRONTEND_URL` (default: `https://localhost:1234`).

---
