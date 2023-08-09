import {
  CollaborativeEditingSessionMessageToClientParser,
  SelectExpressionMessage,
  sessionInfoParser,
} from "./api";
import { DiffMaker, applyDiffItem } from "./collab";
import { CollabIO } from "./collab-io";
import { getObjectDiff } from "./diff";
import { ItemState } from "./graphstate";
import "./index.less";
import {
  CSSClassToggler,
  ElementToggler,
  addExpressionFromState,
  deleteExpression,
  getDesyncedExpressionIDs,
  modifyExpressionFromState,
} from "./util";
import View from "./view";
import { jsx } from "DCGView";
import { Calc } from "globals/window";
import { PluginController } from "plugins/PluginController";
import { hookIntoFunction } from "utils/listenerHelpers";
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

  lastKnownSelectedExpressionID?: string;

  timeOfLastSelectChange = 0;

  selectedExprIDs = new Map<string, SelectExpressionMessage>();

  selectedExprElements = new ElementToggler(
    (el) => {
      el.dataset.isRemoteSelected = "true";
    },
    (el) => {
      delete el.dataset.isRemoteSelected;
    }
  );

  maybeUpdateSelectedExpression() {
    const selectedExpressionID = Calc.controller.getSelectedItem()?.id;
    if (this.lastKnownSelectedExpressionID !== selectedExpressionID) {
      this.timeOfLastSelectChange = Date.now();
      this.lastKnownSelectedExpressionID = selectedExpressionID;
      this.io.sendChangeSelect(
        selectedExpressionID,
        this.timeOfLastSelectChange
      );
    }
  }

  lastVertKeyPressed: "Up" | "Down" = "Up";

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      this.lastVertKeyPressed = e.key === "ArrowUp" ? "Up" : "Down";
    }
  };

  afterDisable(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  afterEnable(): void {
    // document.addEventListener("keydown", this.onKeyDown);

    Calc.controller.dispatcher.register((e) => {
      if (e.type !== "on-special-key-pressed") return;
      if (e.key === "Up" || e.key === "Down") {
        this.lastVertKeyPressed = e.key;
      }
    });

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

        let idNum = 1;
        hookIntoFunction(
          Calc.controller,
          "generateId",
          "collaborative-editing",
          0,
          (stop) => {
            stop(`${this.sessionInfo?.myUserID}-${idNum++}`);
          }
        );
      } else if (evt.type === "FullState") {
        const diff = this.diffMaker.onReceiveRemoteState(evt.state);

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
          Calc.controller.getGrapher().setGrapherState(diff.settings);
        }

        this.diffMaker.onAfterReceiveRemoteState();
      } else if (evt.type === "SelectExpression") {
        console.log("select", evt);

        if (evt.id === undefined) {
          this.selectedExprIDs.delete(evt.user);
          this.selectedExprElements.remove(evt.user);
        } else {
          this.selectedExprIDs.set(evt.user, evt);
          const elem = Calc.controller.getItemModel(evt.id)?.dcgView?.rootNode;
          if (elem) {
            this.selectedExprElements.apply(evt.user, elem);
          }
        }
        console.log(this.selectedExprIDs);
      }
    });

    setInterval(() => {
      if (!this.hasPendingChanges) return;
      if (this.isDragDropping) return;
      const changes = this.diffMaker.getAndClearCurrentChanges();
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

      this.maybeUpdateSelectedExpression();

      const selectedItem = Calc.controller.getSelectedItem();

      const selectedItemInfo = Array.from(this.selectedExprIDs.entries()).find(
        (e) => {
          return e[1].id === selectedItem?.id;
        }
      )?.[1];

      if (
        selectedItemInfo &&
        selectedItemInfo.timestamp < this.timeOfLastSelectChange
      ) {
        Calc.controller.dispatch({
          type: "set-focus-location",
          location: {
            type: "expression",
            id: Calc.controller.getItemModelByIndex(
              (Calc.controller.getSelectedItem()?.index ?? 1) +
                (this.lastVertKeyPressed === "Up" ? -1 : 1)
            )?.id,
          },
        });
        this.maybeUpdateSelectedExpression();
      }

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
