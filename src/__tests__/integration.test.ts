describe('Integration Tests', () => {
  it('should have all necessary dependencies available', () => {
    // Test that core dependencies can be imported
    expect(() => require('@modelcontextprotocol/sdk/server/mcp.js')).not.toThrow();
    expect(() => require('@modelcontextprotocol/sdk/server/stdio.js')).not.toThrow();
    expect(() => require('dockerode')).not.toThrow();
    expect(() => require('zod')).not.toThrow();
  });

  it('should have TypeScript configuration', () => {
    expect(() => require('../../tsconfig.json')).not.toThrow();
  });

  it('should have package.json with correct scripts', () => {
    const pkg = require('../../package.json');
    expect(pkg.scripts).toHaveProperty('build');
    expect(pkg.scripts).toHaveProperty('test');
    expect(pkg.scripts).toHaveProperty('lint');
    expect(pkg.scripts).toHaveProperty('start');
  });
});
