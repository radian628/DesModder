import { GrapherStateParser, itemStateParser, tickerParser, } from "./graphstate.js";
import * as z from "zod";
var CollaborativeEditingSessionMessageParser = z.union([
    z
        .object({
        type: z.literal("FullState"),
        state: z.any(), // GraphStateParser.passthrough(),
    })
        .passthrough(),
    z.object({
        type: z.literal("PartialState"),
        items: z.array(itemStateParser),
        settings: z.optional(GrapherStateParser),
        ticker: z.optional(tickerParser),
    }),
]);
export var CollaborativeEditingSessionMessageToServerParser = z.union([
    CollaborativeEditingSessionMessageParser,
    z.object({
        type: z.literal("Close"),
        key: z.string(),
    }),
]);
export var CollaborativeEditingSessionMessageToClientParser = z.union([
    CollaborativeEditingSessionMessageParser,
    z.object({
        type: z.literal("Close"),
    }),
]);
export var CollaborativeEditingMessageToServerParser = z.object({
    type: z.literal("Host"),
    password: z.optional(z.string()),
    hostKey: z.string(),
});
export var CollaborativeEditingMessageToClientParser = z.object({
    type: z.literal("HostReply"),
    link: z.string(),
});
