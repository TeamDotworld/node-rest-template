import { Twilio } from "twilio";
import { RoomInstance } from "twilio/lib/rest/video/v1/room";
import { Container } from "typedi";
import multer from "multer";
import jwt from "jsonwebtoken";
import axios, { AxiosRequestConfig } from "axios"

import config from "../config";
import AccessToken from "twilio/lib/jwt/AccessToken";
import { User, Device, Call, PrismaClient } from "@prisma/client";
import { TokenPayload } from "../interface/User";

const prisma = new PrismaClient();
const VideoGrant = AccessToken.VideoGrant;

const makeid = (length: number): string => {
  let result: string[] = [];
  const characters: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(
      characters.charAt(Math.floor(Math.random() * charactersLength))
    );
  }
  return result.join("");
};

const createRoom = async (name: string): Promise<RoomInstance> => {
  let twilio: Twilio = Container.get("twilio");
  let room = twilio.video.rooms.create({
    uniqueName: name,
    type: "peer-to-peer",
  });

  return room;
};

const createToken = async (
  room_id: string,
  identity: string
): Promise<string> => {
  const token: AccessToken = new AccessToken(
    config.twilio.account_sid,
    config.twilio.api_key,
    config.twilio.api_secret
  );

  token.identity = identity;

  const videoGrant = new VideoGrant({
    room: room_id,
  });

  token.addGrant(videoGrant);

  return token.toJwt();
};

const closeRoom = async (roomName: string): Promise<RoomInstance> => {
  let twilio: Twilio = Container.get("twilio");
  let checkRoom = await twilio.video.rooms(roomName).fetch();
  if ((checkRoom).status !== "completed") {
    return twilio.video.rooms(roomName).update({ status: "completed" });
  }
  return checkRoom;
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "uploads/");
  },
  filename: function (_req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  },
});

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function generateLoginToken(user: User): string {
  var privateKey = config.keys.private.replace(/\\n/gm, "\n");

  var token = jwt.sign({ id: user.id, email: user.email }, privateKey, {
    expiresIn: "3d",
    algorithm: "RS256",
  });
  return token;
}

function verifyMagicLink(token: string): TokenPayload {
  var decoded = jwt.verify(token, config.magic.key);
  return decoded as TokenPayload;
}

async function notifyUsers(users: string | any[], device: Device) {
  try {
    let i = 0;
    let userNotConnected: Call;
    async function notify() {
      if (i < users.length) {
        if (i) {
          userNotConnected = await prisma.call.findFirst({
            where: {
              status: "IN_PROGRESS",
              from: users[i - 1].id,
              // to: [device.id],
            }
          });
        }
        if (userNotConnected) {
          clearInterval(closeTimeInterval);
          return null;
        } else {
          if (users[i]?.fcm_tokens.length) {
            let data = JSON.stringify({
              to: users[i]?.fcm_tokens[0],
              data: {
                title: `Incoming call`,
                body: `You have a incoming call from ${device.name}`,
                icon: "firebase-logo.png",
                data: {
                  // todo :change url when front end is done
                  url: `devices/${device.id}/${device.os_type}`,
                },
                actions: [
                  {
                    title: "Accept",
                    action: "accept",
                    icon: "icons/heart.png",
                  },
                  {
                    title: "Reject",
                    action: "reject",
                    icon: "icons/cross.png",
                  },
                ],
              },
              webpush: {
                headers: {
                  Urgency: "high",
                  TTL: "4000",
                },
              },
            });

            let config: AxiosRequestConfig = {
              method: "POST",
              url: "https://fcm.googleapis.com/fcm/send",
              headers: {
                Authorization: `key=${process.env.SERVER_KEY}`,
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
              data: data,
            };

            let response = await axios(config);
            i++;
            return response.data;
          } else {
            i++;
            return "Got an error from IAM";
          }
        }
      } else {
        clearInterval(closeTimeInterval);
        return null;
      }
    }
    await notify();
    let closeTimeInterval = setInterval(async () => {
      notify();
    }, 15000);
  } catch (error) {
    // logger.error(error.message || 'Notification sending process Stoped', { backtrace: error });
    return;
  }
}

async function notifySecuritys(securityList: Device[], device: Device) {
  try {
    let i = 0;
    let userNotConnected: Call;
    async function notify() {
      if (i < securityList.length) {
        if (i) {
          userNotConnected = await prisma.call.findFirst({
            where: {
              status: "IN_PROGRESS",
              from: securityList[i - 1].id,
              // to: [device.id],
            }
          });
        }
        if (userNotConnected) {
          clearInterval(closeTimeInterval);
          return null;
        } else {
          let data = JSON.stringify({
            to: securityList[i].fcm_token,
            collapse_key: "type_a",
            data: {
              device_id: device.id,
              device_name: device.name,
            },
          });

          var config: AxiosRequestConfig = {
            method: "post",
            url: "https://fcm.googleapis.com/fcm/send",
            headers: {
              Authorization: `key=${process.env.SERVER_KEY}`,
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
            data: data,
          };

          let response = await axios(config);
          i++;
          return response.data;
        }
      } else {
        clearInterval(closeTimeInterval);
        return null;
      }
    }

    await notify();
    let closeTimeInterval = setInterval(async () => {
      notify();
    }, 15000);
  } catch (error) {
    // logger.error(error.message || 'Notification sending process Stoped', { backtrace: error });
  }
}

export default {
  makeid,
  createRoom,
  createToken,
  closeRoom,
  storage,
  formatBytes,
  generateLoginToken,
  verifyMagicLink,
  notifySecuritys,
  notifyUsers
};
