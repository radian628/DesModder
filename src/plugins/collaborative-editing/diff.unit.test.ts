import {
  generateListDiff,
  getMovesToSort,
  longestIncreasingSubsequenceIndices,
} from "./diff";
import { test, describe, expect } from "@jest/globals";

function validateGMTS(input: number[]) {
  const moves = getMovesToSort(
    input,
    (a, b) => a - b,
    (a) => a
  );
  const inputCopy = input.slice();
  for (const m of moves) {
    const idx = inputCopy.findIndex((e) => e === m.movedElement);
    inputCopy.splice(idx, 1);
    inputCopy.splice((m.afterIndex ?? -1) + 1, 0, m.movedElement);
  }

  expect(inputCopy).toEqual(input.slice().sort((a, b) => a - b));
}

describe("longest increasing subseq indices", () => {
  const lisi = longestIncreasingSubsequenceIndices;
  test("[1,3,2] -> [0, 2]", () => {
    const indices = lisi([1, 3, 2], (a, b) => a - b);
    expect(indices).toEqual([0, 2]);
  });
  test("[1,2,3] -> [0, 1, 2]", () => {
    const indices = lisi([1, 2, 3], (a, b) => a - b);
    expect(indices).toEqual([0, 1, 2]);
  });
  test("[4,1,2,3] -> [1, 2, 3]", () => {
    const indices = lisi([4, 1, 2, 3], (a, b) => a - b);
    expect(indices).toEqual([1, 2, 3]);
  });
  test("[0,4,1,9,3,4] -> [1, 2, 3]", () => {
    const indices = lisi([0, 4, 1, 9, 3, 4], (a, b) => a - b);
    expect(indices).toEqual([0, 2, 4, 5]);
  });
  test("[1,2,3,4,5,9,8,7,6] -> [0,1,2,3,4,8]", () => {
    const indices = lisi([1, 2, 3, 4, 5, 9, 8, 7, 6], (a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 8]);
  });
});

describe("get moves to sort", () => {
  const testGMTS = (input: number[]) =>
    test(JSON.stringify(input), () => {
      validateGMTS(input);
    });

  testGMTS([1, 3, 2]);
  testGMTS([1, 27, 2, 3, 0, 4]);
  testGMTS([1, 2, 3]);
  testGMTS([3, 2, 1]);
  testGMTS([3, 1, 2]);
  testGMTS([1, 2, 3, 4, 5, 9, 8, 7, 6]);
});
