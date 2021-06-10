import { Status, PrismaClient } from ".prisma/client";
import { Packet } from "mqtt-packet";
import { Container } from "typedi";
import Logger from "../loaders/logger";

enum Topic {
  WILL = "/dotworld/beambox/will",
}

export interface WillMessage {
  device_id: string;
  status: Status;
}

function onMessage(topic: string, payload: Buffer, packet: Packet) {
  Logger.info("🛸 Received : " + payload.toString());

  switch (topic) {
    case Topic.WILL:
      processWill(payload);
      break;
    default:
      Logger.info("📥 Unknown message received");
  }
}

async function processWill(payload: Buffer) {
  try {
    const prisma: PrismaClient = Container.get("prisma");
    let data: WillMessage = JSON.parse(payload.toString());
    await prisma.device.update({
      where: {
        id: data.device_id,
      },
      data: {
        status: data.status,
      },
    });
  } catch (err) {
    Logger.error(err);
  }
}

export default onMessage;
