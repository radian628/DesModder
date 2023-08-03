import CollaborativeEditing from ".";
import {
  CollaborativeEditingSessionMessageToClientParser,
  FullStateMessageParser,
  PartialStateMessageParser,
} from "./api";
import { generateListDiff } from "./diff";
import { GraphState } from "./graphstate";
import { getDesyncedExpressionIDs, itemStateEq } from "./util";
import { Calc } from "globals/window";
import { z } from "zod";

export type ReceiveHandler = (
  s: z.infer<typeof CollaborativeEditingSessionMessageToClientParser>
) => void;

// export function getPartialStateMessage(
//   oldState: GraphState,
//   newState: GraphState
// ): z.infer<typeof PartialStateMessageParser> {
//   const { added, removed, order } = generateListDiff(
//     oldState.expressions.list,
//     newState.expressions.list,
//     (t) => t.id,
//     (a, b) => itemStateEq(a, b)
//   );

//   return {
//     type: "PartialState",
//     itemsAddedOrChanged: added,
//     itemsRemoved: removed,
//     order,
//   };
// }

export class CollabIO {
  ws: WebSocket;
  plugin: CollaborativeEditing;
  receiveHandler!: ReceiveHandler;

  constructor(link: string, plugin: CollaborativeEditing) {
    this.ws = new WebSocket(link);
    this.plugin = plugin;

    this.ws.addEventListener("error", (e) => {
      Calc.controller._showToast({
        message: "Error encountered during connection!",
        hideAfter: -1,
      });
    });

    this.ws.addEventListener("close", () => {
      Calc.controller._showToast({
        message:
          "You have lost connection with the server. Assuming you are connected to the internet and the server is still running, refresh the page to rejoin.",
        hideAfter: -1,
      });
    });

    this.ws.addEventListener("open", () => {
      this.ws.send(
        JSON.stringify({
          type: "Join",
          displayName: this.plugin.settings.displayName,
        })
      );
    });
  }

  sendFullState(msg: z.infer<typeof FullStateMessageParser>) {
    this.ws.send(JSON.stringify(msg));
  }

  sendPartialState(msg: z.infer<typeof PartialStateMessageParser>) {
    this.ws.send(JSON.stringify(msg));
  }

  onReceive(handler: ReceiveHandler) {
    this.ws.addEventListener("message", (event) => {
      const evt = JSON.parse(event.data) as z.infer<
        typeof CollaborativeEditingSessionMessageToClientParser
      >;
      handler(evt);
    });
  }
}
