# 🚀 Flowent - Cloud AI-Powered Sandbox IDE & Execution Engine

Flowent is a cloud-native, AI-driven development environment that dynamically spins up isolated Kubernetes sandbox pods, generates full-stack code via AI agents, provides live in-browser application previews, and offers real-time interactive terminal access.

---

## 🌟 Key Features

- 🤖 **AI Code Generation & Orchestration**: Natural-language to full-stack code generator with real-time Server-Sent Events (SSE) streaming.
- ⚡ **Dynamic Kubernetes Sandboxes**: Programmatically spins up isolated containerized React/Vite environments per project.
- 🖥️ **Live In-Browser Preview**: Real-time hot-reloading preview in an isolated iframe via dynamic subdomain routing (`*.preview.domain`).
- 📁 **Interactive File Explorer & Editor**: Full file tree navigation, multi-file editing, and instant code diff updates.
- 💻 **Real-Time Web Terminal**: WebSocket-powered interactive shell (`xterm.js`) connected directly into sandbox pods.
- 🔀 **Dynamic Ingress & Routing**: Custom router layer for directing traffic to ephemeral sandboxes and agent services.
- 🔐 **Authentication & Notifications**: Microservices for user management, JWT auth, and async notifications via message queues.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    User([User / Browser]) <--> Ingress[NGINX Ingress Controller]
    
    subgraph "Core Microservices"
        Ingress -->|/api/ai| AI[AI Orchestration Service]
        Ingress -->|/api/sandbox| SandboxSvc[Sandbox Server]
        Ingress -->|/api/auth| AuthSvc[Auth Service]
        Ingress -->|*.preview.*| Router[Sandbox Router]
        Ingress -->|*.agent.*| Router
    end
    
    subgraph "Dynamic Kubernetes Pods (Per Project)"
        SandboxSvc -->|K8s API (RBAC)| Pod[Sandbox Pod]
        Pod --> Template[Vite/React App]
        Pod --> Agent[Sandbox Agent API & Terminal]
        Router -->|Proxy Preview| Template
        Router -->|Proxy API & WS| Agent
    end

    AI -->|LLM Prompts & Tools| Agent
```

---

## 📁 Repository Structure

```
flowent/
├── ai-orchestration/      # LLM agent, tool calling, SSE streaming server
├── auth/                  # User authentication & JWT service
├── frontend/              # React + Vite frontend IDE interface
├── notification/          # Notification worker & email/queue integration
├── sandbox/
│   ├── agent/             # In-pod agent for file I/O & WebSocket terminal
│   ├── router/            # Reverse proxy router for dynamic subdomains
│   ├── server/            # K8s manager: dynamically creates Pods & Services
│   ├── sync-agent/        # File synchronization utilities
│   └── template/          # Base React/Vite boilerplate for sandboxes
├── k8s/                   # Kubernetes manifests (Deployments, Services, RBAC, Ingress)
└── skaffold.yml           # Skaffold configuration for local development
```

---

## 🔌 API & Sandbox Reference

### 1. Create a Sandbox Environment
```http
POST /api/sandbox/start
```
**Response:**
```json
{
  "message": "Sandbox environment created successfully",
  "sandboxId": "019f1f11-99c5-73b4-bbc5-cf149225743d",
  "previewUrl": "http://019f1f11-99c5-73b4-bbc5-cf149225743d.preview.localhost"
}
```

### 2. Invoke AI Agent
```http
POST /api/ai/invoke
Content-Type: application/json

{
  "message": "Create a modern responsive snake game with scoreboard",
  "projectId": "019f1f11-99c5-73b4-bbc5-cf149225743d"
}
```
*Streams live progress via SSE (Reading files, Editing files, Terminal commands).*

### 3. Sandbox Agent APIs
* **List Files**: `GET http://<sandboxId>.agent.localhost/list-files`
* **Read Files**: `GET http://<sandboxId>.agent.localhost/read-files?files=src/App.jsx`
* **Update Files**: `PATCH http://<sandboxId>.agent.localhost/update-files`
* **Interactive Terminal**: WebSocket connection to `<sandboxId>.agent.localhost` emitting `terminal-input` and listening on `terminal-output`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Monaco Editor / CodeMirror, Xterm.js, Lucide Icons.
- **Backend & Microservices**: Node.js, Express.js, Socket.IO, Kubernetes Client (`@kubernetes/client-node`).
- **AI & Agentic Framework**: Google Gemini API / OpenAI API, Function Calling / Tool Calling.
- **Infrastructure & Orchestration**: Kubernetes (K3s / Minikube), Docker, NGINX Ingress Controller, Skaffold.
- **Database & Cache**: Redis, MongoDB, RabbitMQ.

---

## 🚀 Quickstart & Local Development

### Prerequisites
- [Docker](https://www.docker.com/)
- [Minikube](https://minikube.sigs.k8s.io/) or [K3d](https://k3d.io/)
- [Skaffold](https://skaffold.dev/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Dheeraj-Kumar-089/flowent.git
   cd flowent
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in `ai-orchestration/`:
   ```env
   PORT=4000
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Start Local Kubernetes Cluster**:
   ```bash
   minikube start
   minikube addons enable ingress
   ```

4. **Run with Skaffold**:
   ```bash
   skaffold dev
   ```
   *Skaffold will build all container images, apply the manifests, and sync code changes in real time.*

---

## ☁️ Cloud Deployment (AWS / Oracle Cloud / DigitalOcean)

To deploy on a cloud VM using **K3s (Lightweight Kubernetes)**:

1. **Install K3s & Ingress Controller on Server**:
   ```bash
   curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik" sh -
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
   ```

2. **Apply Kubernetes Manifests**:
   ```bash
   # 1. Cluster RBAC (allows sandbox-server to spawn pods)
   kubectl apply -f k8s/rbac.yml

   # 2. Deploy Services
   kubectl apply -f k8s/ai-deployment.yml
   kubectl apply -f k8s/ai-service.yml
   kubectl apply -f k8s/sandbox-deployment.yml
   kubectl apply -f k8s/sandbox-service.yml
   kubectl apply -f k8s/router-deployment.yml
   kubectl apply -f k8s/router-service.yml

   # 3. Ingress Routing
   kubectl apply -f k8s/ingress.yml
   ```

3. **Wildcard DNS**:
   Map your server's Public IP to a wildcard DNS (e.g., using `*.preview.<YOUR_IP>.nip.io` and `*.agent.<YOUR_IP>.nip.io`).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
