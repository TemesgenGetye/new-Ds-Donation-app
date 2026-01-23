import amqp from "amqplib";

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async (): Promise<void> => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const rabbitmqUrl =
        process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
      console.log(`🔄 Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries})...`);
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
      
      // Create exchange on startup so it's visible in dashboard immediately
      const exchange = 'campaign_events';
      await channel.assertExchange(exchange, 'topic', { 
        durable: true,
        autoDelete: false 
      });
      console.log(`✅ Connected to RabbitMQ and created exchange: ${exchange}`);
      
      // Create a default queue bound to the exchange for visibility
      const defaultQueue = 'campaign.events.all';
      await channel.assertQueue(defaultQueue, { 
        durable: true,
        autoDelete: false 
      });
      await channel.bindQueue(defaultQueue, exchange, '#'); // Bind to all topics
      console.log(`✅ Created queue: ${defaultQueue} bound to ${exchange}`);
      
      // Create specific queues for each event type (so they're visible in RabbitMQ)
      const campaignQueues = [
        { queue: 'campaign.campaign_created', routingKey: 'campaign.created' },
        { queue: 'campaign.campaign_status_changed', routingKey: 'campaign.status.changed' },
        { queue: 'campaign.campaign_contributed', routingKey: 'campaign.contributed' },
        { queue: 'campaign.campaign_completed', routingKey: 'campaign.completed' },
        { queue: 'campaign.campaign_deleted', routingKey: 'campaign.deleted' },
      ];
      
      for (const { queue: queueName, routingKey } of campaignQueues) {
        await channel.assertQueue(queueName, { 
          durable: true,
          autoDelete: false 
        });
        await channel.bindQueue(queueName, exchange, routingKey);
        console.log(`✅ Created queue: ${queueName} bound to ${exchange}/${routingKey}`);
      }
      
      // Start consuming other service events
      await consumeOtherEvents();
      
      return; // Success, exit retry loop
    } catch (error: any) {
      console.error(`❌ Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error("❌ Max retries reached. Failed to connect to RabbitMQ.");
    throw error;
      }
    }
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

export const publishEvent = async (topic: string, data: any): Promise<void> => {
  try {
    const ch = getChannel();
    const exchange = 'campaign_events';
    
    // Assert exchange (creates if doesn't exist) - durable so it persists
    await ch.assertExchange(exchange, 'topic', { 
      durable: true,
      autoDelete: false 
    });
    
    // Create a specific queue for this topic so messages show in dashboard
    const queue = `campaign.${topic.replace(/\./g, '_')}`;
    await ch.assertQueue(queue, { 
      durable: true,
      autoDelete: false 
    });
    await ch.bindQueue(queue, exchange, topic);
    
    // Also ensure the default queue exists and is bound (for visibility)
    const defaultQueue = 'campaign.events.all';
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
      // If buffer is full, wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryPublished = ch.publish(exchange, topic, messageBuffer, {
        persistent: true,
      });
      if (!retryPublished) {
        console.warn(`⚠️ Message buffer full, message may be queued: ${exchange}/${topic}`);
      }
    }
    
    // Log the publish with full details
    console.log(`📤 Published event to ${exchange}/${topic}`);
    console.log(`   - Routing key: ${topic}`);
    console.log(`   - Target queue: ${queue}`);
    console.log(`   - Default queue: ${defaultQueue}`);
    console.log(`   - Message: ${JSON.stringify(data).substring(0, 150)}`);
  } catch (error) {
    console.error(`❌ Failed to publish event to ${topic}:`, error);
    throw error;
  }
};

// Consumer function to listen to other service events
export const consumeOtherEvents = async (): Promise<void> => {
  try {
    const ch = getChannel();
    
    // Consume donation events
    const donationExchange = 'donation_events';
    const donationQueue = 'donation.events.all';
    await ch.assertExchange(donationExchange, 'topic', { durable: true });
    await ch.assertQueue(donationQueue, { durable: true });
    await ch.bindQueue(donationQueue, donationExchange, '#');
    await ch.prefetch(1);
    
    console.log(`📥 Starting consumer for queue: ${donationQueue}`);
    
    await ch.consume(donationQueue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          console.log(`📨 [CONSUMED] Donation Event Received:`, {
            routingKey,
            consumer: 'campaign-service',
            data: content
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          ch.ack(msg);
        } catch (error: any) {
          console.error(`❌ Error processing message:`, error);
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
    
    console.log(`📥 Starting consumer for queue: ${requestQueue}`);
    
    await ch.consume(requestQueue, async (msg: any) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          console.log(`📨 [CONSUMED] Request Event Received:`, {
            routingKey,
            consumer: 'campaign-service',
            data: content
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          ch.ack(msg);
        } catch (error: any) {
          console.error(`❌ Error processing message:`, error);
          ch.nack(msg, false, false);
        }
      }
    }, { noAck: false });
    
    console.log(`✅ Consumers started and listening for donation and request events`);
  } catch (error) {
    console.error(`❌ Failed to start consumers:`, error);
    throw error;
  }
};

export const closeConnection = async (): Promise<void> => {
  if (channel) await channel.close();
  if (connection) await connection.close();
};
