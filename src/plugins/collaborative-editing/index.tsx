import {
  CollaborativeEditingSessionMessageToClientParser,
  sessionInfoParser,
} from "./api";
import { CollabIO } from "./collab-io";
import { ItemState } from "./graphstate";
import {
  addExpressionFromState,
  deleteExpression,
  getDesyncedExpressionIDs,
  modifyExpressionFromState,
} from "./util";
import View from "./view";
import { jsx } from "DCGView";
import { Calc } from "globals/window";
import { PluginController } from "plugins/PluginController";
import { z } from "zod";

interface Config {
  hostLink: string;
  displayName: string;
}

export default class CollaborativeEditing extends PluginController<Config> {
  static config = [
    {
      type: "string",
      variant: "text",
      default: "",
      key: "hostLink",
    },
    {
      type: "string",
      variant: "text",
      default: "User",
      key: "displayName",
    },
  ] as const;

  static id = "collaborative-editing";

  static enabledByDefault = false;

  graphstateLoaded = false;

  isCollabEnabled = false;

  sessionInfo?: z.infer<typeof sessionInfoParser>;

  io!: CollabIO;

  afterEnable(): void {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-collab-menu",
      tooltip: "collab-menu",
      iconClass: "dcg-icon-share",
      popup: () => <View plugin={this}></View>,
    });

    const search = new URLSearchParams(window.location.search);

    const collab = search.get("collab");

    if (!collab) return;

    this.io = new CollabIO(collab, this);

    this.isCollabEnabled = true;

    this.io.onReceive((evt) => {
      if (evt.type === "SessionInfo") {
        this.sessionInfo = evt;
      } else if (evt.type === "FullState") {
        this.graphstateLoaded = true;
        console.log("fullstate event");
        const remoteList = evt.state.expressions.list;
        const myList = Calc.getState().expressions.list;
        const mapByIdRemote = new Map(
          remoteList.map((b, i) => [b.id, { state: b, index: i }])
        );

        const { added, changed, removed } = getDesyncedExpressionIDs(
          myList,
          remoteList
        );

        const alreadyBeingModified = new Set([
          ...added,
          ...changed,
          ...removed,
        ]);

        if (remoteList.length === myList.length) {
          for (let i = 0; i < remoteList.length; i++) {
            if (alreadyBeingModified.has(remoteList[i].id)) continue;

            if (Calc.controller.getItemModel(remoteList[i].id)?.index !== i) {
              console.log(remoteList[i].id, "switched places");
              changed.push(remoteList[i].id);
            }
          }
        }

        for (const r of removed) {
          deleteExpression(r);
        }

        const changedFolderIds = new Set<string>();

        for (const id of [...changed, ...added]) {
          const state = mapByIdRemote.get(id).state;
          if (state.type === "folder") {
            changedFolderIds.add(id);
          }
        }

        for (const state of myList) {
          if (changedFolderIds.has(state.folderId)) {
            changed.push(state.id);
          }
        }

        console.log("added", added);
        console.log("changed", changed);
        console.log("removed", removed);

        for (const c of changed) {
          const state = mapByIdRemote.get(c);
          if (!state || state.state.type !== "folder") continue;
          modifyExpressionFromState(state.state, state.index);
        }

        for (const c of changed) {
          const state = mapByIdRemote.get(c);
          if (!state || state.state.type === "folder") continue;
          modifyExpressionFromState(state.state, state.index);
        }

        for (const a of added) {
          const state = mapByIdRemote.get(a);
          if (!state) continue;
          addExpressionFromState(state.state, state.index);
        }

        Calc.controller.updateTheComputedWorld();

        Calc.controller.dispatch({
          type: "tick",
          triggeredByCollab: true,
        });

        Calc.controller.updateTheComputedWorld();

        Calc.controller.dispatch({
          type: "tick",
          triggeredByCollab: true,
        });
      }
    });

    Calc.controller.dispatcher.register((e) => {
      if (!this.graphstateLoaded) return;
      // @ts-expect-error custom flag to prevent loops
      if (e.triggeredByCollab) return;
      if (
        e.type !== "on-evaluator-changes" &&
        e.type !== "set-expression-properties-from-api" &&
        e.type !== "tick" &&
        e.type !== "image-load-success"
      ) {
        this.io.sendFullState({
          type: "FullState",
          state: Calc.getState(),
          timestamp: Date.now(),
        });
      }
    });
  }
}
