import * as z from "zod";

export const FutureProofItemStateParser = z
  .object({
    id: z.string(),
  })
  .passthrough();
export type FutureProofItemState = z.infer<typeof FutureProofItemStateParser>;

export const GraphStateChangeParser = z.union([
  z
    .object({
      type: z.literal("AddItem"),
      state: FutureProofItemStateParser,
      after: z.number().optional(),
      order: z.array(z.string()),
    })
    .refine(
      (obj) =>
        // case where expression is inserted at beginning
        obj.after === undefined || // array bounds check
        (obj.after < obj.order.length &&
          obj.after >= 0 &&
          // integer check
          Math.floor(obj.after) === obj.after)
    ),
  z.object({
    type: z.literal("RemoveItem"),
    id: z.string(),
  }),
]);
export type GraphStateChange = z.infer<typeof GraphStateChangeParser>;

export const FutureProofGraphStateParser = z
  .object({
    expressions: z
      .object({
        list: z.array(FutureProofItemStateParser),
      })
      .passthrough(),
  })
  .passthrough();
export type FutureProofGraphState = z.infer<typeof FutureProofGraphStateParser>;

export const FullStateMessageParser = z
  .object({
    type: z.literal("FullState"),
    state: FutureProofGraphStateParser, // graphstate, future-proofed
    timestamp: z.number(),
  })
  .passthrough();

export const PartialStateMessageParser = z.object({
  type: z.literal("PartialState"),
  items: z.array(GraphStateChangeParser),
  ticker: z.optional(z.any()),
  settings: z.optional(z.any()),
});
export type PartialMessageParser = z.infer<typeof PartialStateMessageParser>;

export const SelectExpressionMessageParser = z.object({
  type: z.literal("SelectExpression"),
  id: z.optional(z.string()), // id of the expression being selected; undefined = no selection
  user: z.string(), // user ID
  timestamp: z.number(), // lower timestamp = higher priority
});
export type SelectExpressionMessage = z.infer<
  typeof SelectExpressionMessageParser
>;

const CollaborativeEditingSessionMessageParser = z.union([
  FullStateMessageParser,
  PartialStateMessageParser,
  SelectExpressionMessageParser,
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
  myUserID: z.string(),
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
