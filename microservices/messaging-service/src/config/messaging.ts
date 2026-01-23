import amqp from "amqplib";
import { logger } from "../utils/logger";

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async (): Promise<void> => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const rabbitmqUrl =
        process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
      logger.info(`🔄 Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries})...`);
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
      
      // Create message_events exchange on startup so it's visible in dashboard immediately
      const exchange = 'message_events';
      await channel.assertExchange(exchange, 'topic', { 
        durable: true,
        autoDelete: false 
      });
      logger.info(`✅ Connected to RabbitMQ and created exchange: ${exchange}`);
      
      // Create a default queue bound to the exchange for visibility
      const defaultQueue = 'message.events.all';
      await channel.assertQueue(defaultQueue, { 
        durable: true,
        autoDelete: false 
      });
      await channel.bindQueue(defaultQueue, exchange, '#'); // Bind to all topics
      logger.info(`✅ Created queue: ${defaultQueue} bound to ${exchange}`);
      
      // Create specific queues for each event type (so they're visible in RabbitMQ)
      const messageQueues = [
        { queue: 'message.message_sent', routingKey: 'message.sent' },
        { queue: 'message.message_read', routingKey: 'message.read' },
      ];
      
      for (const { queue: queueName, routingKey } of messageQueues) {
        await channel.assertQueue(queueName, { 
          durable: true,
          autoDelete: false 
        });
        await channel.bindQueue(queueName, exchange, routingKey);
        logger.info(`✅ Created queue: ${queueName} bound to ${exchange}/${routingKey}`);
      }
      
      // Start consuming campaign events (from campaign-service)
      await consumeCampaignEvents();
      
      // Start consuming request events (from request-service)
      await consumeRequestEvents();
      
      // Start consuming message events (from this service itself)
      await consumeMessageEvents();
      
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

// Consumer function to listen to campaign events
export const consumeCampaignEvents = async (): Promise<void> => {
  try {
    const ch = getChannel();
    const exchange = 'campaign_events';
    const queue = 'campaign.events.all';
    
    // Ensure queue exists and is bound
    await ch.assertQueue(queue, { durable: true });
    await ch.bindQueue(queue, exchange, '#'); // Bind to all topics
    
    // Set prefetch to 1 to process one message at a time
    await ch.prefetch(1);
    
    logger.info(`📥 Starting consumer for queue: ${queue}`);
    
    // Consume messages
    await ch.consume(queue, (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          const timestamp = new Date().toISOString();
          
          logger.info(`📨 [CONSUMED] Campaign Event Received:`, {
            routingKey,
            timestamp,
            consumer: 'messaging-service',
            messageId: msg.properties.messageId || 'N/A',
            data: content
          });
          
          // Process different event types
          switch (routingKey) {
            case 'campaign.created':
              logger.info(`   → New campaign created: ${content.campaignId}`);
              // Here you could send notifications, update caches, etc.
              break;
            case 'campaign.status.changed':
              logger.info(`   → Campaign ${content.campaignId} status changed: ${content.oldStatus} → ${content.newStatus}`);
              break;
            case 'campaign.contributed':
              logger.info(`   → Campaign ${content.campaignId} received contribution: $${content.amount}`);
              break;
            case 'campaign.completed':
              logger.info(`   → Campaign ${content.campaignId} completed!`);
              break;
            case 'campaign.deleted':
              logger.info(`   → Campaign ${content.campaignId} deleted`);
              break;
            default:
              logger.info(`   → Unknown event type: ${routingKey}`);
          }
          
          // Acknowledge message (remove from queue)
          ch.ack(msg);
          logger.info(`   ✅ Message acknowledged and removed from queue`);
        } catch (error: any) {
          logger.error(`❌ Error processing message:`, error);
          // Reject message and don't requeue if it's a processing error
          ch.nack(msg, false, false);
        }
      }
    }, {
      noAck: false // Manual acknowledgment
    });
    
    logger.info(`✅ Consumer started and listening for campaign events`);
  } catch (error) {
    logger.error(`❌ Failed to start consumer:`, error);
    throw error;
  }
};

// Consumer function to listen to request events (from request-service)
export const consumeRequestEvents = async (): Promise<void> => {
  try {
    const ch = getChannel();
    const exchange = 'request_events';
    const queue = 'request.events.all';
    
    // Ensure queue exists and is bound
    await ch.assertQueue(queue, { durable: true });
    await ch.bindQueue(queue, exchange, '#'); // Bind to all topics
    
    // Set prefetch to 1 to process one message at a time
    await ch.prefetch(1);
    
    logger.info(`📥 Starting consumer for request events queue: ${queue}`);
    
    // Consume messages
    await ch.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          const timestamp = new Date().toISOString();
          
          logger.info(`📨 [CONSUMED] Request Event Received:`, {
            routingKey,
            timestamp,
            consumer: 'messaging-service',
            messageId: msg.properties.messageId || 'N/A',
            data: content
          });
          
          // Process different request event types
          switch (routingKey) {
            case 'request.created':
              logger.info(`   → Request created: ${content.requestId}`);
              logger.info(`   → From recipient: ${content.recipientId} → For donation: ${content.donationId}`);
              // Here you could:
              // - Send notification to donor
              // - Create a message in the message queue
              // - Trigger email notifications
              break;
            case 'request.status.changed':
              logger.info(`   → Request status changed: ${content.requestId}`);
              logger.info(`   → Status: ${content.oldStatus} → ${content.newStatus}`);
              // Here you could:
              // - Send notification to recipient about approval/rejection
              // - Create a message in the message queue
              // - Update UI in real-time
              break;
            default:
              logger.info(`   → Unknown request event type: ${routingKey}`);
          }
          
          // Delay to make messages visible in RabbitMQ dashboard (2 seconds)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Acknowledge message (remove from queue)
          ch.ack(msg);
          logger.info(`   ✅ Request event acknowledged and removed from queue`);
        } catch (error: any) {
          logger.error(`❌ Error processing request event:`, error);
          // Reject message and don't requeue if it's a processing error
          ch.nack(msg, false, false);
        }
      }
    }, {
      noAck: false // Manual acknowledgment
    });
    
    logger.info(`✅ Request events consumer started and listening`);
  } catch (error) {
    logger.error(`❌ Failed to start request events consumer:`, error);
    throw error;
  }
};

// Consumer function to listen to message events (from this service)
export const consumeMessageEvents = async (): Promise<void> => {
  try {
    const ch = getChannel();
    const exchange = 'message_events';
    const queue = 'message.events.all';
    
    // Ensure queue exists and is bound
    await ch.assertQueue(queue, { durable: true });
    await ch.bindQueue(queue, exchange, '#'); // Bind to all topics
    
    // Set prefetch to 1 to process one message at a time
    await ch.prefetch(1);
    
    logger.info(`📥 Starting consumer for message events queue: ${queue}`);
    
    // Consume messages
    await ch.consume(queue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          const timestamp = new Date().toISOString();
          
          logger.info(`💬 [CONSUMED] Message Event Received:`, {
            routingKey,
            timestamp,
            consumer: 'messaging-service',
            messageId: msg.properties.messageId || 'N/A',
            data: content
          });
          
          // Process different message event types
          switch (routingKey) {
            case 'message.sent':
              logger.info(`   → Message sent: ${content.messageId}`);
              logger.info(`   → From: ${content.senderId} → To: ${content.receiverId}`);
              // Here you could:
              // - Send push notifications
              // - Update real-time subscriptions
              // - Trigger email notifications
              // - Update message counts
              break;
            case 'message.read':
              logger.info(`   → Message read: ${content.messageId}`);
              // Here you could:
              // - Update read receipts
              // - Send read confirmation to sender
              // - Update UI in real-time
              break;
            default:
              logger.info(`   → Unknown message event type: ${routingKey}`);
          }
          
          // Delay to make messages visible in RabbitMQ dashboard (2 seconds)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Acknowledge message (remove from queue)
          ch.ack(msg);
          logger.info(`   ✅ Message event acknowledged and removed from queue`);
        } catch (error: any) {
          logger.error(`❌ Error processing message event:`, error);
          // Reject message and don't requeue if it's a processing error
          ch.nack(msg, false, false);
        }
      }
    }, {
      noAck: false // Manual acknowledgment
    });
    
    logger.info(`✅ Message events consumer started and listening`);
  } catch (error) {
    logger.error(`❌ Failed to start message events consumer:`, error);
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
    const exchange = 'message_events';
    
    // Assert exchange (creates if doesn't exist) - durable so it persists
    await ch.assertExchange(exchange, 'topic', { 
      durable: true,
      autoDelete: false 
    });
    
    // Create a specific queue for this topic so messages show in dashboard
    const queue = `message.${topic.replace(/\./g, '_')}`;
    await ch.assertQueue(queue, { 
      durable: true,
      autoDelete: false 
    });
    await ch.bindQueue(queue, exchange, topic);
    
    // Also ensure a default queue exists and is bound (for visibility)
    const defaultQueue = 'message.events.all';
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

