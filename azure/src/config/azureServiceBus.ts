import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';
import dotenv from 'dotenv';

dotenv.config();

let serviceBusClient: ServiceBusClient | null = null;
let sender: ServiceBusSender | null = null;

export const getServiceBusSender = async (): Promise<ServiceBusSender | null> => {
  const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
  const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'job-events';

  if (!connectionString) {
    console.warn('Azure Service Bus connection string not configured');
    return null;
  }

  try {
    if (!serviceBusClient) {
      serviceBusClient = new ServiceBusClient(connectionString);
    }

    if (!sender) {
      sender = serviceBusClient.createSender(queueName);
    }

    return sender;
  } catch (error) {
    console.error('Failed to create Service Bus sender:', error);
    return null;
  }
};

export const sendEvent = async (eventName: string, data: any): Promise<void> => {
  const eventSender = await getServiceBusSender();
  if (!eventSender) {
    console.warn('Service Bus sender not available, skipping event');
    return;
  }

  try {
    await eventSender.sendMessages({
      body: {
        eventName,
        data,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`Event sent: ${eventName}`);
  } catch (error) {
    console.error(`Failed to send event ${eventName}:`, error);
  }
};

export const closeServiceBus = async (): Promise<void> => {
  if (sender) {
    await sender.close();
    sender = null;
  }
  if (serviceBusClient) {
    await serviceBusClient.close();
    serviceBusClient = null;
  }
};

