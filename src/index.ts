import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DockerService, DockerConfig } from "./services/docker.js";
import { setupDockerTools } from "./tools/index.js";


// Get Docker configuration from environment variables
function getDockerConfig(): DockerConfig {
    const dockerConfig: DockerConfig = {};
    
    if (process.env.DOCKER_HOST) {
        try {
            // Parsing vars from env
            dockerConfig.host = process.env.DOCKER_HOST;
            dockerConfig.port = parseInt(process.env.DOCKER_PORT as string) || 2375;
            dockerConfig.protocol = process.env.DOCKER_PROTOCOL as 'http' | 'https';
        } catch {
            throw new Error('DOCKER_HOST must be defined as host address, and optionally DOCKER_PORT and DOCKER_PROTOCOL');
        }
    } else {
        // Default configuration
        dockerConfig.host = 'localhost';
        dockerConfig.port = parseInt(process.env.DOCKER_PORT as string) || 2375;
        dockerConfig.protocol = 'http';
    }

    // Add TLS configuration if available
    if (process.env.DOCKER_CERT_PATH) {
        const fs = require('fs');
        const path = require('path');
        const certPath = process.env.DOCKER_CERT_PATH;

        dockerConfig.ca = fs.readFileSync(path.join(certPath, 'ca.pem')).toString();
        dockerConfig.cert = fs.readFileSync(path.join(certPath, 'cert.pem')).toString();
        dockerConfig.key = fs.readFileSync(path.join(certPath, 'key.pem')).toString();
    }

    return dockerConfig;
}

async function main() {
    // Create MCP server instance
    const server = new McpServer({
        name: "docker-agent",
        version: "1.0.0"
    });

    // Initialize services
    const dockerService = new DockerService(getDockerConfig());

    // Setup tools
    await setupDockerTools(server, dockerService);

    // Connect using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Docker Agent MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
