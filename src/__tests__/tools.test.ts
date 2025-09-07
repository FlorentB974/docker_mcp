import { setupDockerTools } from '../tools/index';
import { DockerManager } from '../services/docker';
import { jest } from '@jest/globals';

// Mock the MCP server
const mockServer = {
  tool: jest.fn()
};

describe('setupDockerTools', () => {
  let dockerManager: DockerManager;
  let server: any;

  beforeEach(() => {
    jest.clearAllMocks();
    dockerManager = new DockerManager();
    server = mockServer;
  });

  it('should register all expected Docker tools', async () => {
    await setupDockerTools(server, dockerManager);

    // Verify all expected tools are registered
    const expectedTools = [
      'list_docker_servers',
      'list_containers',
      'get_container_stats',
      'start_container',
      'stop_container',
      'restart_container',
      'remove_container',
      'inspect_container',
      'get_container_logs',
      'list_images',
      'list_networks',
      'list_volumes',
      'pull_image',
      'remove_image',
      'add_docker_server',
      'remove_docker_server',
      'check_updates',
      'run_docker_compose',
      'remove_docker_compose'
    ];

    expect(mockServer.tool).toHaveBeenCalledTimes(expectedTools.length);
    
    expectedTools.forEach(toolName => {
      expect(mockServer.tool).toHaveBeenCalledWith(
        toolName,
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  it('should register tools with proper descriptions and schemas', async () => {
    await setupDockerTools(server, dockerManager);

    const toolCalls = mockServer.tool.mock.calls;
    
    // Check that list_containers tool has proper parameters
    const listContainersCall = toolCalls.find((call: any[]) => call[0] === 'list_containers');
    expect(listContainersCall).toBeDefined();
    expect(listContainersCall![1]).toContain('containers');
    expect(listContainersCall![2]).toHaveProperty('all');
    expect(listContainersCall![2]).toHaveProperty('server');

    // Check that start_container tool has proper parameters
    const startContainerCall = toolCalls.find((call: any[]) => call[0] === 'start_container');
    expect(startContainerCall).toBeDefined();
    expect(startContainerCall![1]).toContain('Start');
    expect(startContainerCall![2]).toHaveProperty('containerId');
    expect(startContainerCall![2]).toHaveProperty('server');
  });

  it('should create working tool handlers', async () => {
    // Mock DockerManager methods to avoid actual Docker calls
    jest.spyOn(dockerManager, 'getDockerServiceNames').mockReturnValue(['test-server']);
    jest.spyOn(dockerManager, 'getDockerService').mockReturnValue({
      getName: () => 'test-server',
      getConfig: () => ({ name: 'test-server', host: 'localhost' })
    } as any);

    await setupDockerTools(server, dockerManager);

    // Verify that a tool handler was registered and can be called
    const listServersCall = mockServer.tool.mock.calls.find((call: any[]) => call[0] === 'list_docker_servers');
    expect(listServersCall).toBeDefined();
    
    const handler = listServersCall![3];
    expect(typeof handler).toBe('function');
    
    // Test the handler can be called without throwing
    const result = await (handler as Function)({});
    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
  });
});
