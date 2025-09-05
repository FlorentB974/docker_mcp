import Docker from 'dockerode';

export interface DockerConfig {
    host?: string;
    port?: number;
    protocol?: 'http' | 'https';
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
}

export class DockerService {
    private docker: Docker;
    private config: DockerConfig;

    constructor(config: DockerConfig = {}) {
        this.config = config;
        
        if (config.host) {
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
            created: new Date(container.Created * 1000)
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
            }
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
}
