import {
  CollaborativeEditingSessionMessageToClientParser,
  sessionInfoParser,
} from "./api";
import { DiffMaker, applyDiffItem } from "./collab";
import { CollabIO } from "./collab-io";
import { getObjectDiff } from "./diff";
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

  diffMaker = new DiffMaker();

  hasPendingChanges = false;

  isDragDropping = false;

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
        const diff = this.diffMaker.onReceiveRemoteState(evt.state);
        console.log("received remote state!", evt.state, diff);

        for (const diffItem of diff.listChanges) {
          applyDiffItem(diffItem);
        }

        if (diff.ticker !== "NOCHANGE") {
          if (diff.ticker === undefined) {
            Calc.controller.listModel.ticker.open = false;
          } else {
            Calc.controller.listModel.ticker.open = true;
            Object.assign(Calc.controller.listModel.ticker, diff.ticker);
          }
        }

        Calc.controller.updateTheComputedWorld();

        Calc.controller.dispatch({
          type: "tick",
          // @ts-expect-error for preventing event loops
          triggeredByCollab: true,
        });

        if (diff.settings) {
          console.log("diffsettings", diff.settings);
          Calc.controller.getGrapher().setGrapherState(diff.settings);
        }

        this.diffMaker.onAfterReceiveRemoteState();
      }
    });

    setInterval(() => {
      if (!this.hasPendingChanges) return;
      if (this.isDragDropping) return;
      const changes = this.diffMaker.getAndClearCurrentChanges();
      console.log("sending changes", changes);
      this.io.sendPartialState({
        type: "PartialState",
        items: changes.listChanges,
        ticker: changes.ticker,
        settings: changes.settings,
      });
      this.hasPendingChanges = false;
    }, 250);

    Calc.controller.dispatcher.register((e) => {
      // if (!this.graphstateLoaded) return;
      // @ts-expect-error custom flag to prevent loops
      if (e.triggeredByCollab) return;

      if (e.type === "start-dragdrop") this.isDragDropping = true;
      if (e.type === "stop-dragdrop") this.isDragDropping = false;

      if (
        e.type !== "on-evaluator-changes" &&
        e.type !== "set-expression-properties-from-api" &&
        e.type !== "tick" &&
        e.type !== "image-load-success"
      ) {
        // this.io.sendFullState({
        //   type: "FullState",
        //   state: Calc.getState(),
        //   timestamp: Date.now(),
        // });
        this.hasPendingChanges = true;
      }
    });
  }
}
