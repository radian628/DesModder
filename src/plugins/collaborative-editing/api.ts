import {
  GraphStateParser,
  GrapherStateParser,
  itemStateParser,
  tickerParser,
} from "./graphstate.js";
import * as z from "zod";

const CollaborativeEditingSessionMessageParser = z.union([
  z
    .object({
      type: z.literal("FullState"),
      state: z.any(), // graphstate, future-proofed
      timestamp: z.number(),
    })
    .passthrough(),
  z.object({
    type: z.literal("PartialState"),
    items: z.array(itemStateParser),
    settings: z.optional(GrapherStateParser),
    ticker: z.optional(tickerParser),
  }),
]);

export const CollaborativeEditingSessionMessageToServerParser = z.union([
  CollaborativeEditingSessionMessageParser,
  z.object({
    type: z.literal("Close"),
    key: z.string(),
  }),
  z.object({
    type: z.literal("Join"),
    displayName: z.string(),
  }),
]);

export const sessionInfoParser = z.object({
  type: z.literal("SessionInfo"),
  usersOnline: z.array(z.string()),
});

export const CollaborativeEditingSessionMessageToClientParser = z.union([
  CollaborativeEditingSessionMessageParser,
  z.object({
    type: z.literal("Close"),
  }),
  sessionInfoParser,
]);

export const CollaborativeEditingMessageToServerParser = z.object({
  type: z.literal("Host"),
  password: z.optional(z.string()),
  hostKey: z.string(),
});

export const CollaborativeEditingMessageToClientParser = z.object({
  type: z.literal("HostReply"),
  link: z.string(),
});
