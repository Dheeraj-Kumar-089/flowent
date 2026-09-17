import amqplib from 'amqplib';

const QUEUE = 'auth_notification_queue';
let channel = null;

if (process.env.RABBITMQ_URL) {
    try {
        const connection = await amqplib.connect(process.env.RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(QUEUE, { durable: true });
        console.log('[Notification MQ] Connected to RabbitMQ');
    } catch (e) {
        console.warn('[Notification MQ] Could not connect to RabbitMQ:', e.message);
    }
}

export default channel;