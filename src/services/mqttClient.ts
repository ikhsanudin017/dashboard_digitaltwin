import mqtt from 'mqtt';
import type { MqttClient, IClientOptions } from 'mqtt';
import type { QoS } from 'mqtt-packet';

export type MessageHandler = (topic: string, payload: unknown) => void;

export interface Subscription {
  topic: string;
  qos?: QoS;
}

export interface ConnectOptions {
  url: string;
  options?: IClientOptions;
  subscriptions?: Subscription[];
}

export class MQTTService {
  private client: MqttClient | null = null;
  private handlers = new Set<MessageHandler>();
  private connected = false;

  async connect({ url, options, subscriptions = [] }: ConnectOptions): Promise<void> {
    if (this.client && this.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(url, {
        protocolVersion: 5,
        reconnectPeriod: 2000,
        keepalive: 60,
        clean: true,
        ...options
      });

      this.client = client;

      const handleConnect = () => {
        this.connected = true;
        subscriptions.forEach(({ topic, qos = 0 }) => {
          client.subscribe(topic, { qos }, (_err) => {
            if (_err) {
              console.warn(`[mqtt] failed to subscribe to ${topic}`, _err);
            }
          });
        });
        resolve();
      };

      const handleError = (err: Error) => {
        this.connected = false;
        client.end(true);
        this.client = null;
        reject(err);
      };

      client.once('connect', handleConnect);
      client.once('error', handleError);

      client.on('message', (topic, buffer) => {
        let payload: unknown;
        try {
          payload = JSON.parse(buffer.toString());
        } catch {
          payload = buffer.toString();
        }
        this.handlers.forEach((handler) => handler(topic, payload));
      });

      client.on('close', () => {
        this.connected = false;
      });
    });
  }

  addHandler(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  removeHandler(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  subscribe(topic: string, qos: QoS = 0) {
    if (!this.client) return;
    this.client.subscribe(topic, { qos }, (_err) => {
      if (_err) {
        console.warn(`[mqtt] failed to subscribe to ${topic}`, _err);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await new Promise<void>((resolve) => {
      this.client?.end(true, {}, () => {
        this.client = null;
        this.connected = false;
        resolve();
      });
    });
  }

  get isConnected() {
    return this.connected;
  }
}

export const mqttService = new MQTTService();
