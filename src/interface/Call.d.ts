import { LiveType } from ".prisma/client";

export interface Room {
  name: string;
  sid: string;
}

export type LiveStreamCreateDTO = {
  name: string;
  description: string;
  type: LiveType;
  need_record: Boolean;
};

export type AccessTokenDTO = {
  room_id: string;
  access_token: string;
};
