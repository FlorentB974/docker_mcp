# Docker Agent MCP Server

This is a Model Context Protocol (MCP) server that provides management and insights for Docker containers, images, networks, and volumes. The agent enables interaction with Docker services through MCP tools.

## Features

- List and manage Docker containers
- Monitor container statistics and performance
- Analyze logs
- Manage images, networks, and volumes
- Real-time container insights

## Prerequisites

- Node.js >= 18
- Docker Engine

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

The Docker agent requires the following environment variables in your `mcp.json`:

Required variables:
- `DOCKER_HOST`: Docker daemon host address (e.g., "192.168.1.10")
- `DOCKER_PORT`: Docker daemon port (e.g., "2375")
- `DOCKER_PROTOCOL`: Connection protocol ("http" or "https")

Optional variables:
- `DOCKER_CERT_PATH`: Path to TLS certificates directory containing `ca.pem`, `cert.pem`, and `key.pem`

Example `mcp.json` configuration:
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

## Available Tools

Container Management:
- `list_containers`: List all Docker containers
- `get_container_stats`: Get real-time statistics for a container
- `start_container`: Start a stopped container
- `stop_container`: Stop a running container
- `restart_container`: Restart a running container
- `remove_container`: Remove a container
- `inspect_container`: Get detailed information about a container
- `get_container_logs`: Get container logs

Image Management:
- `list_images`: List Docker images
- `pull_image`: Pull a Docker image
- `remove_image`: Remove a Docker image

Network & Volume Management:
- `list_networks`: List Docker networks
- `list_volumes`: List Docker volumes

Configuration:
- `configure_docker`: Configure Docker connection settings (host, port, protocol, and TLS certificates)

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
