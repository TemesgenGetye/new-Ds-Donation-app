import amqp from "amqplib";

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const rabbitmqUrl =
      process.env.RABBITMQ_URL || "amqp://admin:admin@localhost:5672";
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

export const getChannel = (): any => {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not initialized. Call connectRabbitMQ() first."
    );
  }
  return channel;
};

export const publishEvent = async (
  topic: string,
  data: any
): Promise<void> => {
  try {
    const ch = getChannel();
    await ch.assertQueue(topic, { durable: true });
    ch.sendToQueue(topic, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    console.log(`📤 Published event to ${topic}:`, data);
  } catch (error) {
    console.error(`❌ Failed to publish event to ${topic}:`, error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (channel) await channel.close();
  if (connection) await connection.close();
};

