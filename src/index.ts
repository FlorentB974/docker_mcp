import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DockerManager, DockerConfig } from "./services/docker.js";
import { setupDockerTools } from "./tools/index.js";


// Get Docker configurations from environment variables
function getDockerConfigs(): DockerConfig[] {
    const configs: DockerConfig[] = [];
    
    // Check for multiple docker configurations
    // Format: DOCKER_SERVERS=server1:host1:port1:protocol1,server2:host2:port2:protocol2
    if (process.env.DOCKER_SERVERS) {
        const serverConfigs = process.env.DOCKER_SERVERS.split(',');
        
        for (const serverConfig of serverConfigs) {
            const parts = serverConfig.trim().split(':');
            if (parts.length >= 2) {
                const config: DockerConfig = {
                    name: parts[0],
                    host: parts[1],
                    port: parts[2] ? parseInt(parts[2]) : 2375,
                    protocol: (parts[3] as 'http' | 'https') || 'http'
                };
                
                // Check for TLS configuration specific to this server
                const certPathEnv = `DOCKER_CERT_PATH_${parts[0].toUpperCase()}`;
                if (process.env[certPathEnv]) {
                    const fs = require('fs');
                    const path = require('path');
                    const certPath = process.env[certPathEnv];

                    try {
                        config.ca = fs.readFileSync(path.join(certPath, 'ca.pem')).toString();
                        config.cert = fs.readFileSync(path.join(certPath, 'cert.pem')).toString();
                        config.key = fs.readFileSync(path.join(certPath, 'key.pem')).toString();
                    } catch (error) {
                        console.error(`Failed to read TLS certificates for ${parts[0]}:`, error);
                    }
                }
                
                configs.push(config);
            }
        }
    }
    
    // Fallback to single Docker configuration if no DOCKER_SERVERS is specified
    if (configs.length === 0) {
        const dockerConfig: DockerConfig = {};
        
        if (process.env.DOCKER_HOST) {
            try {
                // Parsing vars from env
                dockerConfig.name = 'primary';
                dockerConfig.host = process.env.DOCKER_HOST;
                dockerConfig.port = parseInt(process.env.DOCKER_PORT as string) || 2375;
                dockerConfig.protocol = process.env.DOCKER_PROTOCOL as 'http' | 'https';
            } catch {
                throw new Error('DOCKER_HOST must be defined as host address, and optionally DOCKER_PORT and DOCKER_PROTOCOL');
            }
        } else {
            // Default configuration
            dockerConfig.name = 'localhost';
            dockerConfig.host = 'localhost';
            dockerConfig.port = parseInt(process.env.DOCKER_PORT as string) || 2375;
            dockerConfig.protocol = 'http';
        }

        // Add TLS configuration if available
        if (process.env.DOCKER_CERT_PATH) {
            const fs = require('fs');
            const path = require('path');
            const certPath = process.env.DOCKER_CERT_PATH;

            try {
                dockerConfig.ca = fs.readFileSync(path.join(certPath, 'ca.pem')).toString();
                dockerConfig.cert = fs.readFileSync(path.join(certPath, 'cert.pem')).toString();
                dockerConfig.key = fs.readFileSync(path.join(certPath, 'key.pem')).toString();
            } catch (error) {
                console.error('Failed to read TLS certificates:', error);
            }
        }

        configs.push(dockerConfig);
    }

    return configs;
}

async function main() {
    // Create MCP server instance
    const server = new McpServer({
        name: "docker-agent",
        version: "1.0.0"
    });

    // Initialize Docker manager and services
    const dockerManager = new DockerManager();
    const configs = getDockerConfigs();
    
    // Add all Docker configurations to the manager
    for (const config of configs) {
        try {
            dockerManager.addDockerService(config);
            console.error(`Added Docker server: ${config.name} (${config.host || 'localhost'}:${config.port || 2375})`);
        } catch (error) {
            console.error(`Failed to add Docker server ${config.name}:`, error);
        }
    }

    // Setup tools
    await setupDockerTools(server, dockerManager);

    // Connect using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(`Docker Agent MCP Server running on stdio with ${dockerManager.getDockerServiceNames().length} Docker server(s): ${dockerManager.getDockerServiceNames().join(', ')}`);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
