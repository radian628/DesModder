import {
  GraphStateParser,
  GrapherStateParser,
  itemStateParser,
  tickerParser,
} from "./graphstate.js";
import * as z from "zod";

export const FullStateMessageParser = z
  .object({
    type: z.literal("FullState"),
    state: z.any(), // graphstate, future-proofed
    timestamp: z.number(),
  })
  .passthrough();

export const PartialStateMessageParser = z.object({
  type: z.literal("PartialState"),
  itemsAddedOrChanged: z.array(
    z.object({
      after: z.optional(z.string()), // needed to handle state reordering
      add: z.any(), // itemstate
    })
  ),
  itemsRemoved: z.array(z.string()),
  order: z.array(z.string()),
  settings: z.optional(GrapherStateParser),
  ticker: z.optional(tickerParser),
});

const CollaborativeEditingSessionMessageParser = z.union([
  FullStateMessageParser,
  PartialStateMessageParser,
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
