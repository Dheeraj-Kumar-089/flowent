import Redis from 'ioredis';
import { deletePod } from '../kubernetes/pod.js';
import { deleteService } from '../kubernetes/service.js';

const redis = new Redis(process.env.REDIS_URL);
// two instance is needed - one to write the key and one to listen the exired event
const subscriber = new Redis(process.env.REDIS_URL);

export async function createSandboxKey(sandboxId) {
    await redis.set(`sandbox:${sandboxId}`, JSON.stringify({
        status: 'active'
    }), "EX", 60 * 20) // Key expires in 20 minutes;
}

subscriber.config('SET', 'notify-keyspace-events', 'Ex');  // this line should be written to listen the expired event of redis

subscriber.subscribe('__keyevent@0__:expired')  // it will listen the expired event

subscriber.on('message', async (channel, key) => {
    console.log(`Key expired: ${key}`);

    /**
     *  sandbox:019e4104-020b-764e-b366-74ee0429d36a
     * 
     * 1st index will be sandbox id
     */
    const sandboxId = key.split(':')[ 1 ];

    // Delete the associated Kubernetes resources
    await deletePod(sandboxId);
    await deleteService(sandboxId);
})

export default { subscriber }