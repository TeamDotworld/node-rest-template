import mqtt, { MqttClient, OnMessageCallback } from "mqtt";
import onMessage from "../jobs/mqttCallback";

import config from "../config";
import Logger from "./logger";

export class MqttHandler {
  mqttClient: MqttClient;
  host: string;
  username: string;
  password: string;
  onMessage: OnMessageCallback;

  constructor(onMessage) {
    this.mqttClient = null;
    this.host = config.mqtt.host;
    this.username = config.mqtt.username; // mqtt credentials if these are needed to connect
    this.password = config.mqtt.password;
    this.onMessage = onMessage;
  }

  public connect() {
    // Connect mqtt with credentials (in case of needed, otherwise we can omit 2nd param)
    this.mqttClient = mqtt.connect(this.host, {
      keepalive: 30,
      reconnectPeriod: 1000,
      connectTimeout: 10 * 1000,
      username: this.username,
      password: this.password,
      clientId: "mqtt_client_" + Math.random().toString(16).substr(2, 8), // Client ID should be unique
    });

    // Mqtt error calback
    this.mqttClient.on("error", (err) => {
      Logger.error(`😫 Error in MQTT connection.${err.message}`);
    });

    // Connection callback
    this.mqttClient.on("connect", () => {
      Logger.info(`🤝 MQTT client connected`);
      // this.mqttClient.subscribe(config.mqtt.subscription.split(","), {
      //   qos: 0,
      // });
    });

    // When a message arrives, console.log it
    this.mqttClient.on("message", this.onMessage);

    this.mqttClient.on("close", () => {
      Logger.warn(`😥 MQTT client disconnected`);
    });
  }

  // Sends a mqtt message to topic: mytopic
  public sendMessage(topic, message) {
    Logger.silly(`📤 Topic\t: ${topic}`);
    Logger.silly(`📤 Message\t: ${JSON.stringify(message)}`);
    this.mqttClient.publish(topic, JSON.stringify(message));
  }
}

let mqttClient = new MqttHandler(onMessage);
mqttClient.connect();

export default mqttClient;
