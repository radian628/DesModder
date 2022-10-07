import { Calc } from "globals/window";
import Aug from "../aug/AugState";
import rawToAug from "../aug/rawToAug";
import augToText from "./augToText";

/**
 * @returns [boolean hasError, string text]
 */
export default function getText(): [boolean, string] {
  try {
    const state = Calc.getState();
    const aug = rawToAug(state);
    const augHasError = aug.expressions.list.some(itemHasError);
    const text = augToText(aug);
    return [augHasError, text];
  } catch {
    return [true, `"Error in conversion"`];
  }
}

function itemHasError(item: Aug.ItemAug) {
  return (
    item.error || (item.type === "folder" && item.children.some(itemHasError))
  );
}