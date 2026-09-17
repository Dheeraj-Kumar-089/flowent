import amqplib from 'amqplib';

const QUEUE = 'auth_notification_queue';
let channel = null;

async function initMQ() {
    if (!process.env.RABBITMQ_URL) return;
    try {
        const connection = await amqplib.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE, { durable: true });
        console.log('[Auth] Connected to RabbitMQ successfully');
    } catch (err) {
        console.warn('[Auth] RabbitMQ not connected, notifications disabled:', err.message);
    }
}

initMQ();

export async function sendAuthNotification(message) {
    if (!channel) return;
    try {
        channel.sendToQueue(
            QUEUE,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );
    } catch (err) {
        console.error('[Auth] Error sending MQ notification:', err.message);
    }
}