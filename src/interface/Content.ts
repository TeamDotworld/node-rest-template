import { ContentType, ListingType } from ".prisma/client";

export interface ContentCreateDTO {
  id?: string;
  title: string;
  description?: string | null;
  thumbnail: string;
  url: string;
  original_filename: string;
  format?: string;
  mime?: string;
  size?: string;
  type: ContentType;
  listing: ListingType;
}

export type ContentListDTO = {
  id: string;
  title: string;
  description: string | null;
  original_filename: string;
  thumbnail: string;
  type: ContentType;
  listing: ListingType;
  created_at: Date;
};
