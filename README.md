# Docker Agent MCP Server

This is a Model Context Protocol (MCP) server that provides management and insights for Docker containers, images, networks, and volumes. The agent enables interaction with Docker services through MCP tools.

## Features

- Deploy Docker compose stacks from chat: give the YAML content directly the prompt
- Remove Docker compose stacks by project name
- Multi-server support: Connect to multiple Docker servers simultaneously via TCP or Unix sockets
- Flexible connection methods: Support for TCP connections and Unix socket connections
- List and manage Docker containers across all servers
- Monitor container statistics and performance
- Analyze logs from containers on any server
- Manage images, networks, and volumes
- Real-time container insights
- Auto-detection of container locations across servers

## Prerequisites

- Node.js >= 18
- Docker Engine
- For socket connections: Ensure the Docker socket is accessible (typically `/var/run/docker.sock` on Linux/macOS)
- For remote connections: Docker daemon should be configured to accept TCP connections

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Configuration

The Docker agent now supports connecting to multiple Docker servers simultaneously. You can configure this in several ways:

### Single Docker Server (Legacy Mode)

For backward compatibility, you can still configure a single Docker server using these environment variables:

- `DOCKER_HOST`: Docker daemon host address (e.g., "192.168.1.10")
- `DOCKER_PORT`: Docker daemon port (e.g., "2375")
- `DOCKER_PROTOCOL`: Connection protocol ("http" or "https")
- `DOCKER_CERT_PATH`: Path to TLS certificates directory containing `ca.pem`, `cert.pem`, and `key.pem`

### Multiple Docker Servers

To configure multiple Docker servers, use the `DOCKER_SERVERS` environment variable:

- `DOCKER_SERVERS`: Comma-separated list of server configurations in format:
  - TCP: `name:host:port:protocol`
  - Socket: `name:socket:/path/to/socket`
- `DOCKER_CERT_PATH_{SERVER_NAME}`: TLS certificates path for specific servers (optional)

### Socket Connections

For local Docker daemon connections via Unix socket, you can configure:

- `DOCKER_SOCKET`: Path to Docker socket (e.g., "/var/run/docker.sock")
- Default fallback: If no configuration is provided, the system will automatically try `/var/run/docker.sock` if it exists

Example configurations:

#### Single Server

```json
{
  "servers": {
    "docker-agent": {
      "type": "stdio", 
      "command": "node",
      "args": ["./build/index.js"],
      "env": {
        "DOCKER_HOST": "192.168.1.10",
        "DOCKER_PORT": "2375",
        "DOCKER_PROTOCOL": "http"
      }
    }
  }
}
```

#### Multiple Servers (Mixed TCP and Socket)

```json
{
  "servers": {
    "docker-agent": {
      "type": "stdio",
      "command": "node", 
      "args": ["./build/index.js"],
      "env": {
        "DOCKER_SERVERS": "production:prod.docker.com:2376:https,staging:staging.docker.com:2375:http,local:socket:/var/run/docker.sock",
        "DOCKER_CERT_PATH_PRODUCTION": "/path/to/prod/certs",
        "DOCKER_CERT_PATH_STAGING": "/path/to/staging/certs"
      }
    }
  }
}
```

#### Socket-only Configuration

```json
{
  "servers": {
    "docker-agent": {
      "type": "stdio",
      "command": "node",
      "args": ["./build/index.js"],
      "env": {
        "DOCKER_SOCKET": "/var/run/docker.sock"
      }
    }
  }
}
```

#### Default Behavior

If no configuration is provided, the system will automatically:

1. Try to connect to `/var/run/docker.sock` if it exists
2. Fallback to `localhost:2375` via HTTP if the socket is not available

## Available Tools

### Server Management

- `list_docker_servers`: List all configured Docker servers
- `add_docker_server`: Add a new Docker server configuration at runtime
- `remove_docker_server`: Remove a Docker server configuration

### Container Management

All container tools support an optional `server` parameter to target a specific Docker server. If not provided, the tool will either operate on all servers or auto-detect the container location.

- `list_containers`: List Docker containers from all servers or a specific server
- `get_container_stats`: Get real-time statistics for a container (auto-detects server)
- `start_container`: Start a stopped container (auto-detects server)
- `stop_container`: Stop a running container (auto-detects server)
- `restart_container`: Restart a running container (auto-detects server)
- `remove_container`: Remove a container (auto-detects server)
- `inspect_container`: Get detailed information about a container (auto-detects server)
- `get_container_logs`: Get container logs (auto-detects server)

### Image Management

- `list_images`: List Docker images from all servers or a specific server
- `pull_image`: Pull a Docker image on a specific server (requires server parameter)
- `remove_image`: Remove a Docker image from a specific server (requires server parameter)

### Network & Volume Management

- `list_networks`: List Docker networks from all servers or a specific server
- `list_volumes`: List Docker volumes from all servers or a specific server

### Compose Management

- `run_docker_compose`: Run a Docker Compose YAML provided in the prompt on a specific server
- `remove_docker_compose`: Remove a Docker Compose project by project name on a specific server.

### ⚠️ Safety notes ⚠️

- The MCP server assumes the provided YAML is trusted; it does not perform deep validation beyond writing the file and invoking `docker-compose`.
- Ensure the MCP host has `docker-compose` installed and the user running the MCP process has permission to access the Docker socket or remote daemon.
- If you need credentialed image pulls or private registries, pull images ahead of time using the `pull_image` tool or configure credentials on the target Docker host.

## Testing

To run the tests:

```bash
npx tsc src/test.ts --esModuleInterop --module ES2020 --moduleResolution node --outDir build && node build/test.js
```

Make sure you have Docker running locally or specify a remote Docker host using the environment variables in the Configuration section.

## Usage

1. Start the MCP server:

```bash
npm start
```

2. Connect to the server using any MCP client (e.g. VS Code with GitHub Copilot)

3. Use the available tools to manage your Docker services

## License

MIT
