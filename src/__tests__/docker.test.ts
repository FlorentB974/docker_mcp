import { DockerService, DockerManager, DockerConfig } from '../services/docker';
import { jest } from '@jest/globals';

// Mock dockerode
const mockDockerInstance = {
  listContainers: jest.fn(),
  getContainer: jest.fn(),
  listImages: jest.fn(),
  pull: jest.fn(),
  getImage: jest.fn(),
  listNetworks: jest.fn(),
  listVolumes: jest.fn()
};

jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => mockDockerInstance);
});

describe('DockerService', () => {
  let dockerService: DockerService;
  let mockDocker: any;

  beforeEach(() => {
    mockDocker = mockDockerInstance;
    dockerService = new DockerService({ name: 'test-server', host: 'localhost', port: 2375 });
    // Replace the internal docker instance with our mock
    (dockerService as any).docker = mockDocker;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getName', () => {
    it('should return the configured name', () => {
      expect(dockerService.getName()).toBe('test-server');
    });

    it('should generate a name from host if not provided', () => {
      const service = new DockerService({ host: 'example.com' });
      expect(service.getName()).toBe('example.com');
    });

    it('should generate a name from socket path if not provided', () => {
      const service = new DockerService({ socketPath: '/var/run/docker.sock' });
      expect(service.getName()).toContain('socket');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config = dockerService.getConfig();
      expect(config).toEqual({
        name: 'test-server',
        host: 'localhost',
        port: 2375
      });
    });
  });

  describe('listContainers', () => {
    it('should list all containers when all=true', async () => {
      const mockContainers = [
        {
          Id: 'container1',
          Names: ['/test-container'],
          Image: 'nginx:latest',
          State: 'running',
          Status: 'Up 1 hour',
          Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: 'tcp' }],
          Created: 1640995200
        }
      ];

      mockDocker.listContainers.mockResolvedValue(mockContainers);

      const result = await dockerService.listContainers(true);

      expect(mockDocker.listContainers).toHaveBeenCalledWith({ all: true });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'container1',
        name: 'test-container',
        image: 'nginx:latest',
        state: 'running',
        status: 'Up 1 hour',
        ports: [{ privatePort: 80, publicPort: 8080, type: 'tcp' }],
        created: new Date(1640995200 * 1000),
        dockerServer: 'test-server'
      });
    });

    it('should list only running containers when all=false', async () => {
      mockDocker.listContainers.mockResolvedValue([]);

      await dockerService.listContainers(false);

      expect(mockDocker.listContainers).toHaveBeenCalledWith({ all: false });
    });
  });

  describe('container operations', () => {
    const containerId = 'test-container-id';
    let mockContainer: any;

    beforeEach(() => {
      mockContainer = {
        start: jest.fn(),
        stop: jest.fn(),
        restart: jest.fn(),
        remove: jest.fn(),
        inspect: jest.fn(),
        logs: jest.fn(),
        stats: jest.fn()
      };
      mockDocker.getContainer.mockReturnValue(mockContainer);
    });

    it('should start a container', async () => {
      await dockerService.startContainer(containerId);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it('should stop a container', async () => {
      await dockerService.stopContainer(containerId);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.stop).toHaveBeenCalled();
    });

    it('should restart a container', async () => {
      await dockerService.restartContainer(containerId);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.restart).toHaveBeenCalled();
    });

    it('should remove a container', async () => {
      await dockerService.removeContainer(containerId, true);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('should inspect a container', async () => {
      const mockInspectResult = { Name: '/test-container', State: 'running' };
      mockContainer.inspect.mockResolvedValue(mockInspectResult);

      const result = await dockerService.inspectContainer(containerId);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(result).toBe(mockInspectResult);
    });

    it('should get container logs', async () => {
      const mockLogs = Buffer.from('test log output');
      mockContainer.logs.mockResolvedValue(mockLogs);

      const result = await dockerService.getContainerLogs(containerId, 50);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
      expect(mockContainer.logs).toHaveBeenCalledWith({
        stdout: true,
        stderr: true,
        tail: 50
      });
      expect(result).toBe('test log output');
    });

    it('should get container stats', async () => {
      const mockStats = {
        cpu_stats: {
          cpu_usage: { total_usage: 1000000 },
          system_cpu_usage: 2000000,
          online_cpus: 2
        },
        precpu_stats: {
          cpu_usage: { total_usage: 500000 },
          system_cpu_usage: 1000000
        },
        memory_stats: {
          usage: 134217728,
          limit: 268435456,
          stats: { cache: 67108864 }
        },
        networks: {
          eth0: {
            rx_bytes: 1024,
            tx_bytes: 2048
          }
        }
      };

      mockContainer.inspect.mockResolvedValue({ Name: '/test-container' });
      mockContainer.stats.mockResolvedValue(mockStats);

      const result = await dockerService.getContainerStats(containerId);

      expect(result).toEqual({
        id: containerId,
        name: 'test-container',
        cpuPercentage: 100, // (1000000 - 500000) / (2000000 - 1000000) * 2 * 100
        memoryUsage: {
          used: 67108864, // 134217728 - 67108864
          limit: 268435456,
          percentage: 25 // (67108864 / 268435456) * 100
        },
        networkIO: {
          rx_bytes: 1024,
          tx_bytes: 2048
        },
        dockerServer: 'test-server'
      });
    });
  });

  describe('image operations', () => {
    it('should list images', async () => {
      const mockImages = [
        { Id: 'image1', RepoTags: ['nginx:latest'] },
        { Id: 'image2', RepoTags: ['redis:alpine'] }
      ];

      mockDocker.listImages.mockResolvedValue(mockImages);

      const result = await dockerService.listImages();

      expect(mockDocker.listImages).toHaveBeenCalled();
      expect(result).toBe(mockImages);
    });

    it('should pull an image', async () => {
      const imageName = 'nginx:latest';

      await dockerService.pullImage(imageName);

      expect(mockDocker.pull).toHaveBeenCalledWith(imageName);
    });

    it('should remove an image', async () => {
      const imageId = 'image123';
      const mockImage = { remove: jest.fn() };

      mockDocker.getImage.mockReturnValue(mockImage);

      await dockerService.removeImage(imageId, true);

      expect(mockDocker.getImage).toHaveBeenCalledWith(imageId);
      expect(mockImage.remove).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('network and volume operations', () => {
    it('should list networks', async () => {
      const mockNetworks = [
        { Id: 'network1', Name: 'bridge' },
        { Id: 'network2', Name: 'host' }
      ];

      mockDocker.listNetworks.mockResolvedValue(mockNetworks);

      const result = await dockerService.listNetworks();

      expect(mockDocker.listNetworks).toHaveBeenCalled();
      expect(result).toBe(mockNetworks);
    });

    it('should list volumes', async () => {
      const mockVolumes = {
        Volumes: [
          { Name: 'volume1', Driver: 'local' },
          { Name: 'volume2', Driver: 'local' }
        ]
      };

      mockDocker.listVolumes.mockResolvedValue(mockVolumes);

      const result = await dockerService.listVolumes();

      expect(mockDocker.listVolumes).toHaveBeenCalled();
      expect(result).toBe(mockVolumes.Volumes);
    });
  });
});

describe('DockerManager', () => {
  let dockerManager: DockerManager;

  beforeEach(() => {
    dockerManager = new DockerManager();
  });

  describe('service management', () => {
    it('should add a Docker service', () => {
      const config: DockerConfig = { name: 'test-server', host: 'localhost' };

      dockerManager.addDockerService(config);

      expect(dockerManager.getDockerServiceNames()).toContain('test-server');
      expect(dockerManager.getDockerService('test-server')).toBeDefined();
    });

    it('should remove a Docker service', () => {
      const config: DockerConfig = { name: 'test-server', host: 'localhost' };

      dockerManager.addDockerService(config);
      const removed = dockerManager.removeDockerService('test-server');

      expect(removed).toBe(true);
      expect(dockerManager.getDockerServiceNames()).not.toContain('test-server');
    });

    it('should return false when removing non-existent service', () => {
      const removed = dockerManager.removeDockerService('non-existent');

      expect(removed).toBe(false);
    });

    it('should get all Docker services', () => {
      const config1: DockerConfig = { name: 'server1', host: 'host1' };
      const config2: DockerConfig = { name: 'server2', host: 'host2' };

      dockerManager.addDockerService(config1);
      dockerManager.addDockerService(config2);

      const services = dockerManager.getAllDockerServices();

      expect(services.size).toBe(2);
      expect(services.has('server1')).toBe(true);
      expect(services.has('server2')).toBe(true);
    });
  });

  describe('findContainerService', () => {
    it('should find the service containing a specific container', async () => {
      const config: DockerConfig = { name: 'test-server', host: 'localhost' };
      dockerManager.addDockerService(config);

      const service = dockerManager.getDockerService('test-server');
      if (service) {
        // Mock the service's listContainers method
        jest.spyOn(service, 'listContainers').mockResolvedValue([
          {
            id: 'container1',
            name: 'test-container',
            image: 'nginx:latest',
            state: 'running',
            status: 'Up 1 hour',
            ports: [],
            created: new Date(),
            dockerServer: 'test-server'
          }
        ]);

        const result = await dockerManager.findContainerService('container1');

        expect(result).toBeDefined();
        expect(result?.serverName).toBe('test-server');
        expect(result?.service).toBe(service);
      }
    });

    it('should return null when container is not found', async () => {
      const config: DockerConfig = { name: 'test-server', host: 'localhost' };
      dockerManager.addDockerService(config);

      const service = dockerManager.getDockerService('test-server');
      if (service) {
        jest.spyOn(service, 'listContainers').mockResolvedValue([]);

        const result = await dockerManager.findContainerService('non-existent');

        expect(result).toBeNull();
      }
    });
  });
});
