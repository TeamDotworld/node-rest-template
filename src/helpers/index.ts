import { Twilio } from "twilio";
import { RoomInstance } from "twilio/lib/rest/video/v1/room";
import { Container } from "typedi";
import multer from "multer";

import config from "@config";
import AccessToken from "twilio/lib/jwt/AccessToken";

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
  let room = twilio.video.rooms(roomName).update({ status: "completed" });
  return room;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  },
});

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default {
  makeid,
  createRoom,
  createToken,
  closeRoom,
  storage,
  formatBytes,
};
