import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerService } from "../services/docker.js";
import { z } from "zod";

export async function setupDockerTools(
    server: McpServer,
    dockerService: DockerService
) {
    // List containers
    server.tool(
        "list_containers",
        "List all Docker containers",
        {
            all: z.boolean().optional().describe("Include stopped containers")
        },
        async ({ all = false }) => {
            const containers = await dockerService.listContainers(all);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(containers, null, 2)
                }]
            };
        }
    );

    // Get container stats
    server.tool(
        "get_container_stats",
        "Get real-time statistics for a container",
        {
            containerId: z.string().describe("Container ID or name")
        },
        async ({ containerId }) => {
            const stats = await dockerService.getContainerStats(containerId);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(stats, null, 2)
                }]
            };
        }
    );

    // Start container
    server.tool(
        "start_container",
        "Start a stopped container",
        {
            containerId: z.string().describe("Container ID or name")
        },
        async ({ containerId }) => {
            await dockerService.startContainer(containerId);
            return {
                content: [{
                    type: "text",
                    text: `Container ${containerId} started successfully`
                }]
            };
        }
    );

    // Stop container
    server.tool(
        "stop_container",
        "Stop a running container",
        {
            containerId: z.string().describe("Container ID or name")
        },
        async ({ containerId }) => {
            await dockerService.stopContainer(containerId);
            return {
                content: [{
                    type: "text",
                    text: `Container ${containerId} stopped successfully`
                }]
            };
        }
    );

    // Get container logs
    server.tool(
        "get_container_logs",
        "Get container logs",
        {
            containerId: z.string().describe("Container ID or name"),
            tail: z.number().optional().describe("Number of lines to return from the end")
        },
        async ({ containerId, tail = 100 }) => {
            const logs = await dockerService.getContainerLogs(containerId, tail);
            return {
                content: [{
                    type: "text",
                    text: logs
                }]
            };
        }
    );

    // List images
    server.tool(
        "list_images",
        "List Docker images",
        {},
        async () => {
            const images = await dockerService.listImages();
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(images, null, 2)
                }]
            };
        }
    );

    // List networks
    server.tool(
        "list_networks",
        "List Docker networks",
        {},
        async () => {
            const networks = await dockerService.listNetworks();
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(networks, null, 2)
                }]
            };
        }
    );

    // List volumes
    server.tool(
        "list_volumes",
        "List Docker volumes",
        {},
        async () => {
            const volumes = await dockerService.listVolumes();
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(volumes, null, 2)
                }]
            };
        }
    );



    // Configure Docker connection
    server.tool(
        "configure_docker",
        "Configure Docker connection settings",
        {
            host: z.string().optional().describe("Docker daemon host"),
            port: z.number().optional().describe("Docker daemon port"),
            protocol: z.enum(["http", "https"]).optional().describe("Connection protocol"),
            certPath: z.string().optional().describe("Path to Docker TLS certificates directory")
        },
        async ({ host, port, protocol, certPath }) => {
            let config: any = {};
            
            if (host) {
                config.host = host;
                config.port = port || 2375;
                config.protocol = protocol || "http";

                if (certPath) {
                    const fs = require('fs');
                    const path = require('path');
                    
                    try {
                        config.ca = fs.readFileSync(path.join(certPath, 'ca.pem')).toString();
                        config.cert = fs.readFileSync(path.join(certPath, 'cert.pem')).toString();
                        config.key = fs.readFileSync(path.join(certPath, 'key.pem')).toString();
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `Failed to read TLS certificates from ${certPath}: ${error}`
                            }]
                        };
                    }
                }
            }

            const oldConfig = dockerService.getConfig();
            dockerService = new DockerService(config);
            
            return {
                content: [{
                    type: "text",
                    text: `Docker configuration updated:\nOld config: ${JSON.stringify(oldConfig)}\nNew config: ${JSON.stringify(config)}`
                }]
            };
        }
    );
}
