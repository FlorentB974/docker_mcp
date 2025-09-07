import Docker from 'dockerode';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';

export interface DockerConfig {
    name?: string;  // Identifier for the Docker server
    host?: string;
    port?: number;
    protocol?: 'http' | 'https';
    socketPath?: string;  // Path to Docker socket (e.g., /var/run/docker.sock)
    ca?: string;
    cert?: string;
    key?: string;
}

export interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    state: string;
    status: string;
    ports: Array<{
        privatePort: number;
        publicPort?: number;
        type: string;
    }>;
    created: Date;
    dockerServer?: string;  // Which Docker server this container is from
}

export interface ContainerStats {
    id: string;
    name: string;
    cpuPercentage: number;
    memoryUsage: {
        used: number;
        limit: number;
        percentage: number;
    };
    networkIO: {
        rx_bytes: number;
        tx_bytes: number;
    };
    dockerServer?: string;  // Which Docker server this container is from
}

export class DockerService {
    private docker: Docker;
    private config: DockerConfig;

    constructor(config: DockerConfig = {}) {
        this.config = { ...config };
        
        if (config.socketPath) {
            // Use Unix socket connection
            this.docker = new Docker({ socketPath: config.socketPath });
        } else if (config.host) {
            // Use TCP connection
            const dockerOpts: Docker.DockerOptions = {
                host: config.host,
                port: config.port || 2375,
                protocol: config.protocol || 'http'
            };

            // Add TLS configuration if provided
            if (config.ca && config.cert && config.key) {
                dockerOpts.ca = config.ca;
                dockerOpts.cert = config.cert;
                dockerOpts.key = config.key;
            }

            this.docker = new Docker(dockerOpts);
        } else {
            // Default to local socket
            this.docker = new Docker();
        }
        
        // Set default name if not provided
        if (!this.config.name) {
            if (this.config.socketPath) {
                this.config.name = `socket-${this.config.socketPath.replace(/[/\\]/g, '_')}`;
            } else {
                this.config.name = config.host || 'localhost';
            }
        }
    }

    getName(): string {
        return this.config.name || 'localhost';
    }

    getConfig(): DockerConfig {
        return { ...this.config };
    }

    async listContainers(all: boolean = false): Promise<ContainerInfo[]> {
        const containers = await this.docker.listContainers({ all });
        return containers.map(container => ({
            id: container.Id,
            name: container.Names[0].replace(/^\//, ''),
            image: container.Image,
            state: container.State,
            status: container.Status,
            ports: container.Ports.map(port => ({
                privatePort: port.PrivatePort,
                publicPort: port.PublicPort,
                type: port.Type
            })),
            created: new Date(container.Created * 1000),
            dockerServer: this.getName()
        }));
    }

    async getContainerStats(containerId: string): Promise<ContainerStats> {
        const container = this.docker.getContainer(containerId);
        const stats = await container.stats({ stream: false });
        
        // Calculate CPU percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuPercentage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

        // Calculate memory usage
        const memoryUsed = stats.memory_stats.usage - stats.memory_stats.stats.cache;
        const memoryLimit = stats.memory_stats.limit;
        const memoryPercentage = (memoryUsed / memoryLimit) * 100;

        return {
            id: containerId,
            name: (await container.inspect()).Name.replace(/^\//, ''),
            cpuPercentage,
            memoryUsage: {
                used: memoryUsed,
                limit: memoryLimit,
                percentage: memoryPercentage
            },
            networkIO: {
                rx_bytes: stats.networks?.eth0?.rx_bytes || 0,
                tx_bytes: stats.networks?.eth0?.tx_bytes || 0
            },
            dockerServer: this.getName()
        };
    }

    async startContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.start();
    }

    async stopContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.stop();
    }

    async restartContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.restart();
    }

    async removeContainer(containerId: string, force: boolean = false): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.remove({ force });
    }

    async inspectContainer(containerId: string): Promise<any> {
        const container = this.docker.getContainer(containerId);
        return container.inspect();
    }

    async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
        const container = this.docker.getContainer(containerId);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail
        });
        return logs.toString();
    }

    async listImages(): Promise<Docker.ImageInfo[]> {
        return this.docker.listImages();
    }

    async pullImage(imageName: string): Promise<void> {
        await this.docker.pull(imageName);
    }

    async removeImage(imageId: string, force: boolean = false): Promise<void> {
        const image = this.docker.getImage(imageId);
        await image.remove({ force });
    }

    async listNetworks(): Promise<Docker.NetworkInspectInfo[]> {
        const networks = await this.docker.listNetworks();
        return networks;
    }

    async listVolumes(): Promise<Docker.VolumeInspectInfo[]> {
        const volumes = await this.docker.listVolumes();
        return volumes.Volumes;
    }

    async runDockerCompose(content: string, projectName?: string): Promise<void> {
        const tempDir = os.tmpdir();
        const fileName = `docker-compose-${Date.now()}.yml`;
        const filePath = `${tempDir}/${fileName}`;

        fs.writeFileSync(filePath, content);

        const args = ['-f', filePath, 'up', '-d'];
        if (projectName) {
            args.unshift('-p', projectName);
        }

        return new Promise((resolve, reject) => {
            const child = spawn('docker-compose', args, { cwd: tempDir });
            child.on('close', (code: number) => {
                fs.unlinkSync(filePath);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker-compose exited with code ${code}`));
                }
            });
            child.on('error', reject);
        });
    }

    async runDockerComposeDown(projectName: string): Promise<void> {
        // Use docker-compose with project name to bring the stack down
        const args = ['-p', projectName, 'down', '-v'];
        return new Promise((resolve, reject) => {
            const child = spawn('docker-compose', args, { cwd: os.tmpdir() });
            child.on('close', (code: number) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`docker-compose down exited with code ${code}`));
                }
            });
            child.on('error', reject);
        });
    }
}

export class DockerManager {
    private services: Map<string, DockerService> = new Map();

    addDockerService(config: DockerConfig): void {
        const service = new DockerService(config);
        this.services.set(service.getName(), service);
    }

    removeDockerService(name: string): boolean {
        return this.services.delete(name);
    }

    getDockerService(name: string): DockerService | undefined {
        return this.services.get(name);
    }

    getAllDockerServices(): Map<string, DockerService> {
        return new Map(this.services);
    }

    getDockerServiceNames(): string[] {
        return Array.from(this.services.keys());
    }

    async listAllContainers(all: boolean = false): Promise<ContainerInfo[]> {
        const allContainers: ContainerInfo[] = [];
        
        for (const [name, service] of this.services.entries()) {
            try {
                const containers = await service.listContainers(all);
                allContainers.push(...containers);
            } catch (error) {
                console.error(`Failed to list containers from ${name}:`, error);
            }
        }
        
        return allContainers;
    }

    async listAllImages(): Promise<{server: string, images: Docker.ImageInfo[]}[]> {
        const allImages: {server: string, images: Docker.ImageInfo[]}[] = [];
        
        for (const [name, service] of this.services.entries()) {
            try {
                const images = await service.listImages();
                allImages.push({ server: name, images });
            } catch (error) {
                console.error(`Failed to list images from ${name}:`, error);
            }
        }
        
        return allImages;
    }

    async listAllNetworks(): Promise<{server: string, networks: Docker.NetworkInspectInfo[]}[]> {
        const allNetworks: {server: string, networks: Docker.NetworkInspectInfo[]}[] = [];
        
        for (const [name, service] of this.services.entries()) {
            try {
                const networks = await service.listNetworks();
                allNetworks.push({ server: name, networks });
            } catch (error) {
                console.error(`Failed to list networks from ${name}:`, error);
            }
        }
        
        return allNetworks;
    }

    async listAllVolumes(): Promise<{server: string, volumes: Docker.VolumeInspectInfo[]}[]> {
        const allVolumes: {server: string, volumes: Docker.VolumeInspectInfo[]}[] = [];
        
        for (const [name, service] of this.services.entries()) {
            try {
                const volumes = await service.listVolumes();
                allVolumes.push({ server: name, volumes });
            } catch (error) {
                console.error(`Failed to list volumes from ${name}:`, error);
            }
        }
        
        return allVolumes;
    }

    // Helper method to find which Docker service contains a specific container
    async findContainerService(containerId: string): Promise<{service: DockerService, serverName: string} | null> {
        for (const [name, service] of this.services.entries()) {
            try {
                const containers = await service.listContainers(true);
                const container = containers.find(c => c.id === containerId || c.name === containerId);
                if (container) {
                    return { service, serverName: name };
                }
            } catch (error) {
                // Continue to next service
            }
        }
        return null;
    }
}
