import amqp from 'amqplib';
import { logger } from '../utils/logger';

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async (): Promise<void> => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      logger.info(`🔄 Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries})...`);
      connection = await amqp.connect(rabbitmqUrl);
      channel = await connection.createChannel();
      
      // Create donation_events exchange on startup
      const exchange = 'donation_events';
      await channel.assertExchange(exchange, 'topic', { 
        durable: true,
        autoDelete: false 
      });
      logger.info(`✅ Connected to RabbitMQ and created exchange: ${exchange}`);
      
      // Create a default queue bound to the exchange for visibility
      const defaultQueue = 'donation.events.all';
      await channel.assertQueue(defaultQueue, { 
        durable: true,
        autoDelete: false 
      });
      await channel.bindQueue(defaultQueue, exchange, '#'); // Bind to all topics
      logger.info(`✅ Created queue: ${defaultQueue} bound to ${exchange}`);
      
      // Create specific queues for each event type (so they're visible in RabbitMQ)
      const donationQueues = [
        'donation.donation_created',
        'donation.donation_status_changed',
        'donation.donation_deleted',
      ];
      
      for (const queueName of donationQueues) {
        const routingKey = queueName.replace('donation.', '').replace(/_/g, '.');
        await channel.assertQueue(queueName, { 
          durable: true,
          autoDelete: false 
        });
        await channel.bindQueue(queueName, exchange, routingKey);
        logger.info(`✅ Created queue: ${queueName} bound to ${exchange}/${routingKey}`);
      }
      
      // Start consuming other service events
      await consumeOtherEvents();
      
      return; // Success, exit retry loop
    } catch (error: any) {
      logger.error(`❌ Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt < maxRetries) {
        logger.info(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error("❌ Max retries reached. Failed to connect to RabbitMQ.");
        throw error;
      }
    }
  }
};

// Consumer function to listen to other service events
export const consumeOtherEvents = async (): Promise<void> => {
  try {
    const ch = getChannel();
    
    // Consume campaign events
    const campaignExchange = 'campaign_events';
    const campaignQueue = 'campaign.events.all';
    await ch.assertExchange(campaignExchange, 'topic', { durable: true });
    await ch.assertQueue(campaignQueue, { durable: true });
    await ch.bindQueue(campaignQueue, campaignExchange, '#');
    await ch.prefetch(1);
    
    logger.info(`📥 Starting consumer for queue: ${campaignQueue}`);
    
    await ch.consume(campaignQueue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          logger.info(`📨 [CONSUMED] Campaign Event Received:`, {
            routingKey,
            consumer: 'donation-service',
            data: content
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          ch.ack(msg);
        } catch (error: any) {
          logger.error(`❌ Error processing message:`, error);
          ch.nack(msg, false, false);
        }
      }
    }, { noAck: false });
    
    // Consume request events
    const requestExchange = 'request_events';
    const requestQueue = 'request.events.all';
    await ch.assertExchange(requestExchange, 'topic', { durable: true });
    await ch.assertQueue(requestQueue, { durable: true });
    await ch.bindQueue(requestQueue, requestExchange, '#');
    await ch.prefetch(1);
    
    logger.info(`📥 Starting consumer for queue: ${requestQueue}`);
    
    await ch.consume(requestQueue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          logger.info(`📨 [CONSUMED] Request Event Received:`, {
            routingKey,
            consumer: 'donation-service',
            data: content
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          ch.ack(msg);
        } catch (error: any) {
          logger.error(`❌ Error processing message:`, error);
          ch.nack(msg, false, false);
        }
      }
    }, { noAck: false });
    
    logger.info(`✅ Consumers started and listening for campaign and request events`);
  } catch (error) {
    logger.error(`❌ Failed to start consumers:`, error);
    throw error;
  }
};

export const getChannel = (): any => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
};

export const publishEvent = async (topic: string, data: any): Promise<void> => {
  try {
    const ch = getChannel();
    const exchange = 'donation_events';
    
    // Assert exchange (creates if doesn't exist) - durable so it persists
    await ch.assertExchange(exchange, 'topic', { 
      durable: true,
      autoDelete: false 
    });
    
    // Create a specific queue for this topic so messages show in dashboard
    const queue = `donation.${topic.replace(/\./g, '_')}`;
    await ch.assertQueue(queue, { 
      durable: true,
      autoDelete: false 
    });
    await ch.bindQueue(queue, exchange, topic);
    
    // Also ensure a default queue exists and is bound (for visibility)
    const defaultQueue = 'donation.events.all';
    await ch.assertQueue(defaultQueue, { 
      durable: true,
      autoDelete: false 
    });
    await ch.bindQueue(defaultQueue, exchange, '#'); // Bind to all topics
    
    // Publish to exchange with persistent flag
    const messageBuffer = Buffer.from(JSON.stringify(data));
    const published = ch.publish(exchange, topic, messageBuffer, {
      persistent: true,
    });
    
    // Wait for confirmation that message was sent
    if (!published) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryPublished = ch.publish(exchange, topic, messageBuffer, {
        persistent: true,
      });
      if (!retryPublished) {
        logger.warn(`⚠️ Message buffer full, message may be queued: ${exchange}/${topic}`);
      }
    }
    
    // Log the publish with full details
    logger.info(`📤 Published event to ${exchange}/${topic}`);
    logger.info(`   - Routing key: ${topic}`);
    logger.info(`   - Target queue: ${queue}`);
    logger.info(`   - Default queue: ${defaultQueue}`);
    logger.info(`   - Message: ${JSON.stringify(data).substring(0, 150)}`);
  } catch (error) {
    logger.error(`❌ Failed to publish event to ${topic}:`, error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (channel) await channel.close();
  if (connection) await connection.close();
};

