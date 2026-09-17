import Redis from 'ioredis';
import { deletePod } from '../kubernetes/pod.js';
import { deleteService } from '../kubernetes/service.js';

const REDIS_URL = process.env.REDIS_URL;
const TTL_SECONDS = 60 * 20; // 20 minutes

let redis = null;
let subscriber = null;

if (!REDIS_URL) {
    // Without this guard ioredis silently falls back to 127.0.0.1:6379 and
    // reconnect-loops forever inside the pod, which looks like a hang.
    console.warn('[Sandbox Redis] REDIS_URL not set. Sandbox TTL cleanup is disabled.');
} else {
    const opts = { maxRetriesPerRequest: 3, enableOfflineQueue: false };

    redis = new Redis(REDIS_URL, opts);
    subscriber = new Redis(REDIS_URL, opts);

    redis.on('error', (err) => console.error('[Sandbox Redis] client error:', err.message));
    subscriber.on('error', (err) => console.error('[Sandbox Redis] subscriber error:', err.message));

    subscriber.on('ready', async () => {
        try {
            // Managed Redis providers often forbid CONFIG SET. Not fatal.
            await subscriber.config('SET', 'notify-keyspace-events', 'Ex');
        } catch (err) {
            console.warn('[Sandbox Redis] Could not set notify-keyspace-events:', err.message);
        }
        try {
            await subscriber.subscribe('__keyevent@0__:expired');
            console.log('[Sandbox Redis] Subscribed to key-expiry events');
        } catch (err) {
            console.error('[Sandbox Redis] Subscribe failed:', err.message);
        }
    });

    subscriber.on('message', async (channel, key) => {
        if (!key.startsWith('sandbox:')) return;
        const sandboxId = key.split(':')[ 1 ];
        console.log(`[Sandbox Redis] TTL expired, reaping sandbox ${sandboxId}`);
        await deletePod(sandboxId);
        await deleteService(sandboxId);
    });
}

export async function createSandboxKey(sandboxId) {
    if (!redis) return;
    try {
        await redis.set(`sandbox:${sandboxId}`, JSON.stringify({ status: 'active' }), 'EX', TTL_SECONDS);
    } catch (err) {
        console.error('[Sandbox Redis] createSandboxKey failed:', err.message);
    }
}

export async function refreshSandboxKey(sandboxId) {
    if (!redis) return;
    try {
        await redis.expire(`sandbox:${sandboxId}`, TTL_SECONDS);
    } catch (err) {
        console.error('[Sandbox Redis] refreshSandboxKey failed:', err.message);
    }
}

export default { redis, subscriber };
