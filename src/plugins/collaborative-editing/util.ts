import { ItemState } from "./graphstate";
import { ModelDefaults } from "./model-defaults";
import { ItemModel } from "globals/models";
import { Calc } from "globals/window";

export function deepObjEq(a: any, b: any) {
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepObjEq(a[i], b[i])) return false;
    }
    return true;
  } else if (typeof a === "object") {
    return deepObjEq(
      Array.from(Object.entries(a)).sort((a, b) => a[0].localeCompare(b[0])),
      Array.from(Object.entries(b)).sort((a, b) => a[0].localeCompare(b[0]))
    );
  } else {
    return a === b;
  }
}

export function itemStateEq(a: ItemState, b: ItemState) {
  return deepObjEq(a, b);
}

function setUnion<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a, ...b]);
}

function setIntersection<T>(a: Set<T>, b: Set<T>) {
  const intersection = new Set(a);
  for (const item of b) {
    if (!intersection.has(item)) intersection.delete(item);
  }
  return intersection;
}

function setDiff<T>(a: Set<T>, b: Set<T>) {
  const diff = new Set(a);
  for (const item of b) {
    if (diff.has(item)) diff.delete(item);
  }
  return diff;
}

function setXOR<T>(a: Set<T>, b: Set<T>) {
  return setUnion(setDiff(a, b), setDiff(b, a));
}

export function getDesyncedExpressionIDs(
  listA: ItemState[], // local
  listB: ItemState[] // remote
) {
  const idSetA = new Set(listA.map((a) => a.id));
  const idSetB = new Set(listB.map((b) => b.id));
  const added = Array.from(setDiff(idSetB, idSetA));
  const removed = Array.from(setDiff(idSetA, idSetB));

  const sharedIDs = Array.from(setIntersection(idSetA, idSetB));

  const mapByIdA = new Map(listA.map((a) => [a.id, a]));
  const mapByIdB = new Map(listB.map((b) => [b.id, b]));

  const changed: string[] = [];
  for (const id of sharedIDs) {
    const a = mapByIdA.get(id) as ItemState;
    const b = mapByIdB.get(id) as ItemState;
    if (!itemStateEq(a, b)) changed.push(id);
  }

  return { added, removed, changed };
}

export function deleteExpression(id: string) {
  // console.log("does this trigger the error?");
  // Calc.controller.dispatch({
  //   type: "delete-item-and-animate-out",
  //   id,
  //   // @ts-expect-error flag to prevent loops
  //   triggeredByCollab: true,
  // });
  const model = Calc.controller.getItemModel(id);
  if (!model) return;
  // console.log("removing", model.id, model);
  Calc.controller._removeExpressionSynchronously(model);
}

// export function addOrUpdateExpressionFromState(state: ItemState) {
//   Calc.setExpression(state as Desmos.ExpressionState);
//   const model = Calc.controller.getItemModel(state.id);
//   const modelDefaultsForType = ModelDefaults[state.type];
// }

export function addExpressionFromState(state: ItemState, index: number) {
  // console.log("adding state", state);
  // let folderid = state.folderId;
  // delete state.folderId;
  // console.log("trying to add", state.id);
  const model = Calc.controller.createItemModel(state);
  // console.log("added model", model, "state after", state);
  Calc.controller._toplevelInsertItemAt(index, model);
  // console.log("set folderid", state.folderId);
  // Calc.controller.getItemModelByIndex(index)?.folderId = folderid;
}

export function modifyExpressionFromState(state: ItemState, index: number) {
  // console.log("modifying", state.id);
  deleteExpression(state.id);
  addExpressionFromState(state, index);
}
