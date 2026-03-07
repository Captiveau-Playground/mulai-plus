# Mulai Plus

Mulai Plus is a modern web application built with a monorepo architecture, featuring a Next.js frontend and a Hono backend.

## 🚀 Tech Stack

- **Monorepo**: [Turborepo](https://turbo.build/)
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Frontend**: [Next.js](https://nextjs.org/) (React)
- **Backend**: [Hono](https://hono.dev/)
- **API Communication**: [oRPC](https://orpc.unstack.io/) (Type-safe RPC with OpenAPI)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/) & [Supabase](https://supabase.com/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Deployment**: Docker, GitHub Container Registry (GHCR), GitHub Actions

## 📂 Project Structure

```bash
.
├── apps/
│   ├── web/          # Next.js Frontend Application
│   └── server/       # Hono Backend API Server
├── packages/
│   ├── api/          # Shared API Logic & Routers (oRPC)
│   ├── auth/         # Authentication Logic (Better Auth)
│   ├── config/       # Shared Configurations
│   ├── db/           # Database Schema, Migrations & Seeds
│   └── env/          # Environment Variables Validation
└── docker-compose.staging.yml # Docker Compose for Staging
```

## 🛠️ Prerequisites

- **Bun** (v1.2+) installed on your machine.
- **Docker** (optional, for running containerized environment).

## ⚡ Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Captiveau-Playground/mulai-plus.git
    cd mulai-plus
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Environment Setup:**
    Create `.env` files in `apps/web` and `apps/server` based on `.env.example`.
    
    You'll need valid credentials for:
    - Database (Supabase/Postgres)
    - Authentication Secrets
    - Payment Gateway Keys (if applicable)

4.  **Run Development Server:**
    ```bash
    bun dev
    ```
    This command starts both the frontend and backend concurrently using Turbo.

## 📜 Available Scripts

- `bun dev` - Start development server for all apps.
- `bun build` - Build all apps.
- `bun check` - Lint and format code using Biome.
- `bun db:push` - Push schema changes to the database.
- `bun db:studio` - Open Drizzle Studio to view database.
- `bun docker:stage` - Run the application in Docker (staging mode).

## 🚢 CI/CD & Deployment

The project uses GitHub Actions for Continuous Integration and Deployment.

- **Trigger**: Pushes to `staging` branch.
- **Process**:
  1.  **Build**: Creates Docker images for `web` and `server`.
  2.  **Push**: Uploads images to **GitHub Container Registry (GHCR)**.
  3.  **Deploy**: Connects to the VPS via SSH, pulls the latest images, and restarts the containers.

### Docker Layer Caching
The CI/CD pipeline is optimized with Docker Layer Caching to speed up build times by reusing unchanged layers.

## 🔒 Security Note

- **Environment Variables**: Sensitive keys are managed via GitHub Secrets and injected into the VPS during deployment.
- **Portainer**: If using Portainer for management, ensure it is secured behind a VPN or strong authentication, as environment variables are visible in container inspection.
