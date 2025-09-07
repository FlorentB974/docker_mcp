import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DockerManager, DockerService } from "../services/docker.js";
import { z } from "zod";

// Helper function to get Docker service for container operations
async function getServiceForContainer(
    dockerManager: DockerManager,
    containerId: string,
    serverName?: string
): Promise<{ service: DockerService; serverName: string } | null> {
    if (serverName) {
        const service = dockerManager.getDockerService(serverName);
        if (!service) {
            throw new Error(`Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`);
        }
        return { service, serverName };
    } else {
        // Auto-detect which server has the container
        const result = await dockerManager.findContainerService(containerId);
        if (!result) {
            throw new Error(`Container '${containerId}' not found on any Docker server`);
        }
        return result;
    }
}

export async function setupDockerTools(
    server: McpServer,
    dockerManager: DockerManager
) {
    // List Docker servers
    server.tool(
        "list_docker_servers",
        "List all configured Docker servers",
        {},
        async () => {
            const servers = dockerManager.getDockerServiceNames();
            const serverInfo = [];
            
            for (const serverName of servers) {
                const service = dockerManager.getDockerService(serverName);
                if (service) {
                    serverInfo.push({
                        name: serverName,
                        config: service.getConfig()
                    });
                }
            }
            
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(serverInfo, null, 2)
                }]
            };
        }
    );

    // List containers (from all servers or specific server)
    server.tool(
        "list_containers",
        "List Docker containers from all servers or a specific server",
        {
            all: z.boolean().optional().describe("Include stopped containers"),
            server: z.string().optional().describe("Specific Docker server name (if not provided, lists from all servers)")
        },
        async ({ all = false, server: serverName }) => {
            let containers;
            
            if (serverName) {
                const service = dockerManager.getDockerService(serverName);
                if (!service) {
                    return {
                        content: [{
                            type: "text",
                            text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                        }]
                    };
                }
                containers = await service.listContainers(all);
            } else {
                containers = await dockerManager.listAllContainers(all);
            }
            
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
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                const stats = await result.service.getContainerStats(containerId);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ ...stats, dockerServer: result.serverName }, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Start container
    server.tool(
        "start_container",
        "Start a stopped container",
        {
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                await result.service.startContainer(containerId);
                return {
                    content: [{
                        type: "text",
                        text: `Container ${containerId} started successfully on ${result.serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Stop container
    server.tool(
        "stop_container",
        "Stop a running container",
        {
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                await result.service.stopContainer(containerId);
                return {
                    content: [{
                        type: "text",
                        text: `Container ${containerId} stopped successfully on ${result.serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Restart container
    server.tool(
        "restart_container",
        "Restart a container",
        {
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                await result.service.restartContainer(containerId);
                return {
                    content: [{
                        type: "text",
                        text: `Container ${containerId} restarted successfully on ${result.serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Remove container
    server.tool(
        "remove_container",
        "Remove a container",
        {
            containerId: z.string().describe("Container ID or name"),
            force: z.boolean().optional().describe("Force remove the container"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, force = false, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                await result.service.removeContainer(containerId, force);
                return {
                    content: [{
                        type: "text",
                        text: `Container ${containerId} removed successfully from ${result.serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Inspect container
    server.tool(
        "inspect_container",
        "Get detailed information about a container",
        {
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                const info = await result.service.inspectContainer(containerId);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ ...info, dockerServer: result.serverName }, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Get container logs
    server.tool(
        "get_container_logs",
        "Get container logs",
        {
            containerId: z.string().describe("Container ID or name"),
            tail: z.number().optional().describe("Number of lines to return from the end"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, tail = 100, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }
                
                const logs = await result.service.getContainerLogs(containerId, tail);
                return {
                    content: [{
                        type: "text",
                        text: `=== Logs from ${containerId} on ${result.serverName} ===\n${logs}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // List images
    server.tool(
        "list_images",
        "List Docker images from all servers or a specific server",
        {
            server: z.string().optional().describe("Specific Docker server name (if not provided, lists from all servers)")
        },
        async ({ server: serverName }) => {
            if (serverName) {
                const service = dockerManager.getDockerService(serverName);
                if (!service) {
                    return {
                        content: [{
                            type: "text",
                            text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                        }]
                    };
                }
                const images = await service.listImages();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ server: serverName, images }, null, 2)
                    }]
                };
            } else {
                const allImages = await dockerManager.listAllImages();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(allImages, null, 2)
                    }]
                };
            }
        }
    );

    // List networks
    server.tool(
        "list_networks",
        "List Docker networks from all servers or a specific server",
        {
            server: z.string().optional().describe("Specific Docker server name (if not provided, lists from all servers)")
        },
        async ({ server: serverName }) => {
            if (serverName) {
                const service = dockerManager.getDockerService(serverName);
                if (!service) {
                    return {
                        content: [{
                            type: "text",
                            text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                        }]
                    };
                }
                const networks = await service.listNetworks();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ server: serverName, networks }, null, 2)
                    }]
                };
            } else {
                const allNetworks = await dockerManager.listAllNetworks();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(allNetworks, null, 2)
                    }]
                };
            }
        }
    );

    // List volumes
    server.tool(
        "list_volumes",
        "List Docker volumes from all servers or a specific server",
        {
            server: z.string().optional().describe("Specific Docker server name (if not provided, lists from all servers)")
        },
        async ({ server: serverName }) => {
            if (serverName) {
                const service = dockerManager.getDockerService(serverName);
                if (!service) {
                    return {
                        content: [{
                            type: "text",
                            text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                        }]
                    };
                }
                const volumes = await service.listVolumes();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ server: serverName, volumes }, null, 2)
                    }]
                };
            } else {
                const allVolumes = await dockerManager.listAllVolumes();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(allVolumes, null, 2)
                    }]
                };
            }
        }
    );

    // Pull image
    server.tool(
        "pull_image",
        "Pull a Docker image on a specific server",
        {
            imageName: z.string().describe("Name of the image to pull"),
            server: z.string().describe("Docker server name where to pull the image")
        },
        async ({ imageName, server: serverName }) => {
            const service = dockerManager.getDockerService(serverName);
            if (!service) {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                    }]
                };
            }
            
            try {
                await service.pullImage(imageName);
                return {
                    content: [{
                        type: "text",
                        text: `Image ${imageName} pulled successfully on ${serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Remove image
    server.tool(
        "remove_image",
        "Remove a Docker image from a specific server",
        {
            imageId: z.string().describe("Image ID or name"),
            server: z.string().describe("Docker server name where to remove the image"),
            force: z.boolean().optional().describe("Force remove the image")
        },
        async ({ imageId, server: serverName, force = false }) => {
            const service = dockerManager.getDockerService(serverName);
            if (!service) {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                    }]
                };
            }
            
            try {
                await service.removeImage(imageId, force);
                return {
                    content: [{
                        type: "text",
                        text: `Image ${imageId} removed successfully from ${serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error}`
                    }]
                };
            }
        }
    );

    // Add Docker server
    server.tool(
        "add_docker_server",
        "Add a new Docker server configuration",
        {
            name: z.string().describe("Name identifier for the Docker server"),
            host: z.string().optional().describe("Docker daemon host (not required for socket connections)"),
            port: z.number().optional().describe("Docker daemon port"),
            protocol: z.enum(["http", "https"]).optional().describe("Connection protocol"),
            socketPath: z.string().optional().describe("Path to Docker socket (e.g., /var/run/docker.sock)"),
            certPath: z.string().optional().describe("Path to Docker TLS certificates directory")
        },
        async ({ name, host, port, protocol, socketPath, certPath }) => {
            try {
                const config: any = {
                    name
                };

                // Validate that either host or socketPath is provided
                if (!host && !socketPath) {
                    return {
                        content: [{
                            type: "text",
                            text: "Error: Either 'host' or 'socketPath' must be provided"
                        }]
                    };
                }

                if (socketPath) {
                    config.socketPath = socketPath;
                } else {
                    config.host = host;
                    config.port = port || 2375;
                    config.protocol = protocol || "http";
                }

                if (certPath) {
                    const fs = require('fs');
                    const path = require('path');
                    
                    config.ca = fs.readFileSync(path.join(certPath, 'ca.pem')).toString();
                    config.cert = fs.readFileSync(path.join(certPath, 'cert.pem')).toString();
                    config.key = fs.readFileSync(path.join(certPath, 'key.pem')).toString();
                }

                dockerManager.addDockerService(config);
                
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${name}' added successfully. Configuration: ${JSON.stringify(config, null, 2)}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to add Docker server '${name}': ${error}`
                    }]
                };
            }
        }
    );

    // Remove Docker server
    server.tool(
        "remove_docker_server",
        "Remove a Docker server configuration",
        {
            name: z.string().describe("Name of the Docker server to remove")
        },
        async ({ name }) => {
            const removed = dockerManager.removeDockerService(name);
            if (removed) {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${name}' removed successfully`
                    }]
                };
            } else {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${name}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                    }]
                };
            }
        }
    );

    // Check if container version is outdated
    server.tool(
        "check_updates",
        "Check if a container's image version is outdated by comparing with the latest available version",
        {
            containerId: z.string().describe("Container ID or name"),
            server: z.string().optional().describe("Specific Docker server name (auto-detected if not provided)")
        },
        async ({ containerId, server: serverName }) => {
            try {
                const result = await getServiceForContainer(dockerManager, containerId, serverName);
                if (!result) {
                    return {
                        content: [{
                            type: "text",
                            text: `Container '${containerId}' not found`
                        }]
                    };
                }

                const { service, serverName: detectedServer } = result;

                // Inspect container to get current image
                const containerInfo = await service.inspectContainer(containerId);
                const currentImage = containerInfo.Image;
                const imageName = containerInfo.Config.Image;

                // Pull the latest version of the image
                await service.pullImage(imageName);

                // List images to find the pulled image ID
                const images = await service.listImages();
                const pulledImage = images.find(img => 
                    img.RepoTags && img.RepoTags.includes(imageName)
                );

                if (!pulledImage) {
                    return {
                        content: [{
                            type: "text",
                            text: `Could not find pulled image ${imageName} in image list`
                        }]
                    };
                }

                const pulledImageId = pulledImage.Id;
                const isOutdated = currentImage !== pulledImageId;

                const resultText = isOutdated 
                    ? `Container '${containerId}' on ${detectedServer} is OUTDATED.\nCurrent image: ${currentImage}\nLatest image: ${pulledImageId}\nImage: ${imageName}`
                    : `Container '${containerId}' on ${detectedServer} is UP-TO-DATE.\nImage: ${imageName}\nImage ID: ${currentImage}`;

                return {
                    content: [{
                        type: "text",
                        text: resultText
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error checking container version: ${error}`
                    }]
                };
            }
        }
    );

    // Run Docker Compose
    server.tool(
        "run_docker_compose",
        "Run Docker Compose from provided YAML content on a specific server",
        {
            content: z.string().describe("Docker Compose YAML content"),
            server: z.string().describe("Docker server name where to run the compose"),
            projectName: z.string().optional().describe("Optional project name for the compose")
        },
        async ({ content, server: serverName, projectName }) => {
            const service = dockerManager.getDockerService(serverName);
            if (!service) {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                    }]
                };
            }

            try {
                await service.runDockerCompose(content, projectName);
                return {
                    content: [{
                        type: "text",
                        text: `Docker Compose deployed successfully on ${serverName}${projectName ? ` with project name '${projectName}'` : ''}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error running Docker Compose: ${error}`
                    }]
                };
            }
        }
    );

    // Remove Docker Compose stack by project name
    server.tool(
        "remove_docker_compose",
        "Remove a Docker Compose project by project name on a specific server",
        {
            projectName: z.string().describe("Project name used when deploying the compose"),
            server: z.string().describe("Docker server name where the project was deployed")
        },
        async ({ projectName, server: serverName }) => {
            const service = dockerManager.getDockerService(serverName);
            if (!service) {
                return {
                    content: [{
                        type: "text",
                        text: `Docker server '${serverName}' not found. Available servers: ${dockerManager.getDockerServiceNames().join(', ')}`
                    }]
                };
            }

            try {
                await service.runDockerComposeDown(projectName);
                return {
                    content: [{
                        type: "text",
                        text: `Docker Compose project '${projectName}' removed from ${serverName}`
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error removing Docker Compose project: ${error}`
                    }]
                };
            }
        }
    );
}
