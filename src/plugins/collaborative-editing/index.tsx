import { CollaborativeEditingSessionMessageToClientParser } from "./api";
import { ItemState } from "./graphstate";
import {
  addExpressionFromState,
  deleteExpression,
  getDesyncedExpressionIDs,
  modifyExpressionFromState,
} from "./util";
import { jsx } from "DCGView";
import { Calc } from "globals/window";
import { PluginController } from "plugins/PluginController";
import { z } from "zod";

interface Config {
  hostLink: string;
}

export default class CollaborativeEditing extends PluginController<Config> {
  static config = [
    {
      type: "string" as const,
      variant: "text" as const,
      default: "",
      key: "hostLink",
    },
  ];

  static id = "collaborative-editing";

  static enabledByDefault = false;

  afterEnable(): void {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-collab-menu",
      tooltip: "collab-menu",
      iconClass: "dcg-icon-share",
      popup: () => (
        <div class="dcg-popover-interior">
          <button
            onClick={async () => {
              const result = await (
                await fetch(this.settings.hostLink, {
                  body: JSON.stringify({
                    type: "Host",
                    hostKey: "your mom lol",
                  }),
                  headers: { "Content-Type": "application/json" },
                  method: "POST",
                })
              ).json();

              if (result.link) {
                window.location.search = `?collab=${encodeURIComponent(
                  result.link
                )}`;
              }
            }}
          >
            Host
          </button>
        </div>
      ),
    });

    const search = new URLSearchParams(window.location.search);

    const collab = search.get("collab");

    if (!collab) return;

    const ws = new WebSocket(collab);

    ws.addEventListener("message", (event) => {
      const evt = JSON.parse(event.data) as z.infer<
        typeof CollaborativeEditingSessionMessageToClientParser
      >;

      console.log("Received Event", evt);

      if (evt.type === "FullState") {
        const remoteList = evt.state.expressions.list;
        const myList = Calc.getState().expressions.list;
        const mapByIdRemote = new Map(
          remoteList.map((b, i) => [b.id, { state: b, index: i }])
        );

        const { added, changed, removed } = getDesyncedExpressionIDs(
          myList,
          remoteList
        );

        console.log(" stuff to remove", removed);

        for (const r of removed) {
          deleteExpression(r);
        }

        for (const a of added) {
          const state = mapByIdRemote.get(a);
          if (!state) continue;
          addExpressionFromState(state.state, state.index);
        }

        for (const c of changed) {
          const state = mapByIdRemote.get(c);
          if (!state) continue;
          modifyExpressionFromState(state.state, state.index);
        }

        Calc.controller.updateTheComputedWorld();

        Calc.controller.dispatch({
          type: "tick",
          triggeredByCollab: true,
        });
      }
    });

    Calc.controller.dispatcher.register((e) => {
      // @ts-expect-error custom flag to prevent loops
      if (e.triggeredByCollab) return;
      if (
        e.type !== "on-evaluator-changes" &&
        e.type !== "set-expression-properties-from-api" &&
        e.type !== "tick" &&
        e.type !== "image-load-success"
      ) {
        ws.send(
          JSON.stringify({
            type: "FullState",
            state: Calc.getState(),
          })
        );
      }
    });
  }
}
