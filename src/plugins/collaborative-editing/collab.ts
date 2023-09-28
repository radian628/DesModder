import { Calc } from "#globals";
import { FutureProofGraphState, GraphStateChange } from "./api";
import { generateListDiff, getObjectDiff } from "./diff";
import { GrapherState, ItemState } from "./graphstate";
import { addExpressionFromState, itemStateEq } from "./util";
import { Ticker } from "@desmodder/graph-state";

export function applyDiffItem(diffItem: GraphStateChange) {
  if (diffItem.type === "AddItem") {
    let index: number | undefined;
    const order = diffItem.order;
    let indexIntoOrder = diffItem.after;

    // try to find an expression to put this one after
    while (index === undefined) {
      if (indexIntoOrder === undefined || indexIntoOrder < 0) {
        index = -1;
        break;
      }
      index = Calc.controller.getItemModel(order[indexIntoOrder])?.index;
      indexIntoOrder--;
    }

    addExpressionFromState(
      diffItem.state as unknown as ItemState,
      // index + 1 instead of index because we're inserting
      // *after* the given element
      index + 1
    );
  } else if (diffItem.type === "RemoveItem") {
    const model = Calc.controller.getItemModel(diffItem.id);
    if (!model) return;
    Calc.controller._removeExpressionSynchronously(model);
  }
}

export function generateGraphStateDiff(
  oldState: FutureProofGraphState,
  newState: FutureProofGraphState
) {
  const localChangeList: GraphStateChange[] = [];

  const diff = generateListDiff(
    oldState.expressions.list,
    newState.expressions.list,
    (t) => t.id,
    (a, b) => itemStateEq(a as unknown as ItemState, b as unknown as ItemState)
  );

  for (const rem of diff.removed) {
    localChangeList.push({ type: "RemoveItem", id: rem });
  }

  for (const add of diff.added) {
    localChangeList.push({
      type: "AddItem",
      state: add.add,
      after: add.after,
      order: diff.order,
    });
  }

  return localChangeList;
}

export function graphStateChangeKey(change: GraphStateChange) {
  return change.type === "AddItem" ? change.state.id : change.id;
}

// remove all elements of A that are in B
export function subtractDiff(a: GraphStateChange[], b: GraphStateChange[]) {
  const affected = new Set(b.map(graphStateChangeKey));

  return a.filter((e) => !affected.has(graphStateChangeKey(e)));
}

export class DiffMaker {
  stateAtLastSend: FutureProofGraphState;
  localChangeList: GraphStateChange[];
  oldState: FutureProofGraphState;
  changedTicker?: Ticker | "NOCHANGE" = "NOCHANGE";
  changedSettings?: GrapherState;

  constructor() {
    this.stateAtLastSend = this.getState();
    this.oldState = this.getState();
    this.localChangeList = [];
  }

  getState() {
    return Calc.getState() as unknown as FutureProofGraphState;
  }

  stageChanges() {
    const currState = this.getState();
    this.localChangeList.push(
      ...generateGraphStateDiff(this.oldState, currState)
    );
    this.changedTicker = getObjectDiff(
      this.oldState.expressions.ticker,
      currState.expressions.ticker,
      "NOCHANGE"
    );
    this.changedSettings = getObjectDiff(this.oldState.graph, currState.graph);
    this.oldState = currState;
  }

  onReceiveRemoteState(incomingState: FutureProofGraphState) {
    this.stageChanges();
    const currState = this.getState();
    const diff = generateGraphStateDiff(currState, incomingState);
    const remoteChanges = subtractDiff(diff, this.localChangeList);

    const isEditingTicker = !!document.activeElement?.closest(".dcg-ticker");

    const ticker = !isEditingTicker
      ? getObjectDiff(
          currState.expressions.ticker,
          incomingState.expressions.ticker,
          "NOCHANGE"
        )
      : "NOCHANGE";

    return {
      listChanges: remoteChanges.filter(
        (e) => graphStateChangeKey(e) !== Calc.controller.getSelectedItem()?.id
      ),
      settings: getObjectDiff(currState.graph, incomingState.graph),
      ticker,
    };
  }

  onAfterReceiveRemoteState() {
    // after receiving remote state, update the state after the last send
    this.stateAtLastSend = this.getState();
    // "skip over" the old state
    this.oldState = this.stateAtLastSend;
  }

  getAndClearCurrentChanges() {
    this.stageChanges();
    const oldChanges = this.localChangeList;
    const settings = this.changedSettings;
    const ticker = this.changedTicker;
    this.localChangeList = [];
    this.changedSettings = undefined;
    this.changedTicker = "NOCHANGE";

    return {
      listChanges: oldChanges,
      settings,
      ticker: ticker,
    };
  }
}
