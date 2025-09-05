import Docker from 'dockerode';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const docker = new Docker({
  host: process.env.DOCKER_HOST || 'localhost',
  port: parseInt(process.env.DOCKER_PORT || '2735')
});

async function listContainers() {
  try {
    const containers = await docker.listContainers({ all: true });
    console.log(JSON.stringify(containers, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

listContainers();
