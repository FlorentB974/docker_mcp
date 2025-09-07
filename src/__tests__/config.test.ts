import { DockerManager, DockerConfig } from '../services/docker';

describe('Configuration Tests', () => {
  describe('DockerConfig validation', () => {
    it('should accept valid socket configuration', () => {
      const config: DockerConfig = {
        name: 'test-socket',
        socketPath: '/var/run/docker.sock'
      };
      
      expect(config.name).toBe('test-socket');
      expect(config.socketPath).toBe('/var/run/docker.sock');
    });

    it('should accept valid TCP configuration', () => {
      const config: DockerConfig = {
        name: 'test-tcp',
        host: 'localhost',
        port: 2375,
        protocol: 'http'
      };
      
      expect(config.name).toBe('test-tcp');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(2375);
      expect(config.protocol).toBe('http');
    });

    it('should accept TLS configuration', () => {
      const config: DockerConfig = {
        name: 'test-tls',
        host: 'secure.docker.com',
        port: 2376,
        protocol: 'https',
        ca: 'ca-cert-content',
        cert: 'client-cert-content', 
        key: 'client-key-content'
      };
      
      expect(config.ca).toBe('ca-cert-content');
      expect(config.cert).toBe('client-cert-content');
      expect(config.key).toBe('client-key-content');
    });
  });

  describe('DockerManager configuration', () => {
    it('should create empty manager', () => {
      const manager = new DockerManager();
      expect(manager.getDockerServiceNames()).toEqual([]);
    });

    it('should add services correctly', () => {
      const manager = new DockerManager();
      const config: DockerConfig = {
        name: 'test-service',
        host: 'localhost'
      };
      
      manager.addDockerService(config);
      expect(manager.getDockerServiceNames()).toContain('test-service');
    });

    it('should remove services correctly', () => {
      const manager = new DockerManager();
      const config: DockerConfig = {
        name: 'test-service',
        host: 'localhost'
      };
      
      manager.addDockerService(config);
      expect(manager.getDockerServiceNames()).toContain('test-service');
      
      const removed = manager.removeDockerService('test-service');
      expect(removed).toBe(true);
      expect(manager.getDockerServiceNames()).not.toContain('test-service');
    });
  });
});
