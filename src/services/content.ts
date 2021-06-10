import { Inject, Service } from "typedi";
import { Logger } from "winston";
import {
  Content,
  ContentType,
  Like,
  ListingType,
  LiveStream,
  LiveType,
  PrismaClient,
} from "@prisma/client";
import { EventDispatcher } from "event-dispatch";
import { Container } from "typedi";

import config from "@config";
import events from "../subscribers/events";
import { v4 as uuidv4 } from "uuid";
import { ContentCreateDTO, ContentListDTO } from "@interface/Content";
import helper from "@helpers/index";
import user from "@api/v1/user";

let eventDispatcher = new EventDispatcher();

const prisma = new PrismaClient();

@Service()
export default class ContentService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async ListContents(user_id: string): Promise<ContentListDTO[]> {
    this.logger.silly("Listing contents");

    let contents = await prisma.content.findMany({
      where: {
        OR: [
          {
            listing: ListingType.PUBLIC,
          },
          {
            user: {
              id: user_id,
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        original_filename: true,
        thumbnail: true,
        type: true,
        listing: true,
        created_at: true,
        user: {
          select: {
            id: true,
            first_name: true,
            avatar: true,
          },
        },
      },
    });

    return contents ? contents : [];
  }

  public async GetContents(
    user_id: string,
    content_id: string
  ): Promise<Content> {
    this.logger.silly("Selecting content " + content_id);

    let content = await prisma.content.findFirst({
      where: {
        id: content_id,
        OR: [
          {
            listing: ListingType.PUBLIC,
          },
          {
            user: {
              id: user_id,
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    return content;
  }

  public async LikeContent(
    user_id: string,
    content_id: string,
    like: boolean
  ): Promise<Like> {
    this.logger.silly("Liking content " + content_id);

    let data = await prisma.like.findUnique({
      where: {
        User_Content_Like_Constrain: {
          content_id: content_id,
          user_id: user_id,
          live_stream_id: "",
        },
      },
    });

    if (like && !data) {
      let data = await prisma.like.create({
        data: {
          content: {
            connect: {
              id: content_id,
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
      throw new Error("You have already liked this content");
    } else {
      let data = await prisma.like.delete({
        where: {
          User_Content_Like_Constrain: {
            content_id: content_id,
            user_id: user_id,
            live_stream_id: "",
          },
        },
      });
      return data;
    }
  }

  public async CreateContent(
    user_id: string,
    data: ContentCreateDTO
  ): Promise<Content> {
    this.logger.silly("Listing live stream");

    let content = await prisma.content.create({
      data: {
        title: data.title,
        description: data.description,
        user: {
          connect: {
            id: user_id,
          },
        },
        type: data.type,
        listing: data.listing,
        thumbnail: data.thumbnail,
        url: data.url,
        original_filename: data.original_filename,
        format: data.format,
        mimetype: data.mime,
        size: data.size,
      },
    });

    return content;
  }
}
