import {
  FutureProofGraphState,
  FutureProofItemState,
  GraphStateChange,
} from "./api";
import { generateListDiff } from "./diff";
import { ItemState } from "./graphstate";
import {
  addExpressionFromState,
  itemStateEq,
  modifyExpressionFromState,
} from "./util";
import { Calc } from "globals/window";

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
    this.oldState = currState;
  }

  onReceiveRemoteState(incomingState: FutureProofGraphState) {
    this.stageChanges();
    const diff = generateGraphStateDiff(this.getState(), incomingState);
    const remoteChanges = subtractDiff(diff, this.localChangeList);
    console.log("diff before/after", diff, remoteChanges);
    return remoteChanges.filter(
      (e) => graphStateChangeKey(e) !== Calc.controller.getSelectedItem()?.id
    );
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
    console.log("local change list", this.localChangeList);
    this.localChangeList = [];
    return oldChanges;
  }
}
