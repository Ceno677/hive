import type {Config} from '../shared/config.js';
import type {Executor} from './docker.js';
import {DockerExecutor} from './docker.js';
import {RemoteExecutor} from './remote.js';
export function createExecutor(c:Config):Executor{
 if(c.EXECUTION_ENABLED==='true'&&c.EXECUTION_URL&&c.EXECUTION_TOKEN)return new RemoteExecutor(c.EXECUTION_URL,c.EXECUTION_TOKEN);
 return new DockerExecutor(c.SANDBOX_IMAGE,c.EXECUTION_ENABLED==='true');
}
