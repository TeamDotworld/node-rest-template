import { Inject, Service } from "typedi";
import { Logger, stream } from "winston";
import { Like, LiveStream, LiveType, PrismaClient } from "@prisma/client";
import { EventDispatcher } from "event-dispatch";
import { Container } from "typedi";

import config from "@config";
import events from "../subscribers/events";
import { v4 as uuidv4 } from "uuid";
import { AccessTokenDTO, LiveStreamCreateDTO } from "@interface/Call";
import helper from "@helpers/index";
import user from "@api/v1/user";
import { MqttHandler } from "../loaders/mqtt";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class CallService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async ListLiveStream(user_id: string): Promise<LiveStream[]> {
    this.logger.silly("Listing live stream");

    let liveStreams = await prisma.liveStream.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                type: LiveType.PUBLIC,
              },
              {
                created_by: {
                  id: user_id,
                },
              },
            ],
          },
        ],
      },
      include: {
        created_by: {
          select: {
            first_name: true,
            avatar: true,
          },
        },
      },
    });

    return liveStreams ? liveStreams : [];
  }

  public async GetLiveStream(id: string): Promise<LiveStream> {
    this.logger.silly("Getting live stream with id/path " + id);

    let liveStream = await prisma.liveStream.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                id: id,
              },
              {
                path: id,
              },
              {
                room_id: id,
              },
            ],
          },
        ],
      },
      include: {
        created_by: {
          select: {
            first_name: true,
            avatar: true,
          },
        },
      },
    });

    if (!liveStream) throw new Error("Unable to find stream with id " + id);

    return liveStream;
  }

  public async CreateLiveStream(
    user_id: string,
    data: LiveStreamCreateDTO
  ): Promise<LiveStream> {
    this.logger.silly("Creating live stream");

    const roomName: string = uuidv4();
    let url = helper.makeid(14);

    let live = await prisma.liveStream.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        started: false,
        path: url,
        room_id: roomName,
        created_by: {
          connect: {
            id: user_id,
          },
        },
      },
    });

    return live;
  }

  public async StartLiveStream(
    user_id: string,
    path: string
  ): Promise<LiveStream> {
    this.logger.silly("Starting room");

    let stream = await prisma.liveStream.findFirst({
      where: {
        AND: [
          {
            created_user_id: user_id,
          },
          {
            path,
          },
        ],
      },
    });
    if (!stream) throw new Error("You don't have a stream created for this id");
    if (stream.ended) throw new Error("This stream was already ended.");

    let room = await helper.createRoom(stream.room_id);

    stream.room_id = room.uniqueName;
    stream.started = true;
    stream.start_time = new Date();
    stream.ended = false;

    let updated = await prisma.liveStream.update({
      where: {
        path,
      },
      data: stream,
      include: {
        created_by: {
          select: {
            first_name: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  public async EndLiveStream(
    user_id: string,
    path: string
  ): Promise<LiveStream> {
    this.logger.silly("Ending room");

    let stream = await prisma.liveStream.findFirst({
      where: {
        AND: [
          {
            created_user_id: user_id,
          },
          {
            path,
          },
        ],
      },
    });
    if (!stream) throw new Error("You don't have a stream created for this id");
    if (!stream.started) throw new Error("This steam hasn't started yet.");
    if (stream.ended) throw new Error("This steam is already ended");

    stream.ended = true;
    stream.end_time = new Date();

    let updated = await prisma.liveStream.update({
      where: {
        path,
      },
      data: stream,
    });

    try {
      await helper.closeRoom(stream.room_id);
    } catch (err) {
      this.logger.error("Unable to close the room");
    }

    return updated;
  }

  public async GenerateAccessToken(
    requested_user: string,
    path: string
  ): Promise<AccessTokenDTO> {
    this.logger.silly("Starting room");
    let liveStream = await prisma.liveStream.findFirst({
      where: {
        path: path,
      },
    });

    if (!liveStream)
      throw new Error("You don't have a stream created for this id");

    if (
      liveStream.created_user_id !== requested_user &&
      liveStream.type === LiveType.PRIVATE
    ) {
      throw new Error("You don't have access to live stream");
    }

    if (!liveStream.started) {
      throw new Error("This steam hasn't started yet");
    }

    if (liveStream.ended) {
      throw new Error("This live stream has ended");
    }

    let token = await helper.createToken(liveStream.room_id, requested_user);

    let resp: AccessTokenDTO = {
      room_id: liveStream.room_id,
      access_token: token,
    };

    return resp;
  }

  public async GetComments(
    user_id: string,
    path: string,
    after: Date
  ): Promise<LiveStream | null> {
    this.logger.silly("Starting room");

    let stream = await prisma.liveStream.findFirst({
      where: {
        AND: [
          {
            created_user_id: user_id,
          },
          {
            path,
          },
          {
            comments: {
              some: {
                created_at: {
                  gte: after,
                },
              },
            },
          },
        ],
      },
      include: {
        comments: true,
      },
    });

    return stream;
  }

  public async LikeStream(
    user_id: string,
    stream_id: string,
    like: boolean
  ): Promise<Like> {
    this.logger.silly("Liking live stream " + stream_id);

    let data = await prisma.like.findUnique({
      where: {
        User_Content_Like_Constrain: {
          content_id: "",
          user_id: user_id,
          live_stream_id: stream_id,
        },
      },
    });

    if (like && !data) {
      let data = await prisma.like.create({
        data: {
          live: {
            connect: {
              id: stream_id,
            },
          },
          user: {
            connect: {
              id: user_id,
            },
          },
        },
      });
      return data;
    } else if (like && data) {
      throw new Error("You have already liked this stream");
    } else {
      let data = await prisma.like.delete({
        where: {
          User_Content_Like_Constrain: {
            content_id: "",
            user_id: user_id,
            live_stream_id: stream_id,
          },
        },
      });
      return data;
    }
  }

  public async BroadcastStream(
    user_id: string,
    stream_id: string,
    devices: string[]
  ): Promise<LiveStream> {
    this.logger.silly("Broadcasting live stream");
    const mqtt: MqttHandler = Container.get("mqtt");

    let allowed = await prisma.device.findMany({
      where: {
        AND: [
          {
            users: {
              some: {
                devices: {
                  some: {
                    id: {
                      in: devices,
                    },
                  },
                },
              },
            },
          },
          {
            blocked: false,
          },
        ],
      },
    });

    if (!allowed || allowed.length == 0) {
      throw new Error("No devices allowed/ you have access to ");
    }

    let liveStream = await prisma.liveStream.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                id: stream_id,
              },
              {
                path: stream_id,
              },
            ],
          },
          {
            OR: [
              {
                type: LiveType.PUBLIC,
              },
              {
                created_by: {
                  id: user_id,
                },
              },
            ],
          },
        ],
      },
      include: {
        created_by: {
          select: {
            first_name: true,
            avatar: true,
          },
        },
      },
    });

    allowed.forEach((device) => {
      mqtt.sendMessage(`/dotworld/beambox/${device.id}`, {
        id: liveStream.id,
        type: "LIVE",
        room_id: liveStream.room_id,
        record_url: liveStream.record_url,
      });
    });

    return liveStream;
  }
}
