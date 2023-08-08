import { deepObjEq } from "./util";

export interface ListDiff<T, Key> {
  added: {
    add: T;
    after: number | undefined;
  }[];
  removed: Key[];
  order: Key[];
}

// note: does not respond well to duplicate elements!
export function getMovesToSort<T, Key>(
  list: T[],
  cmp: (a: T, b: T) => number,
  key: (a: T) => Key
) {
  const sortedSubseq = longestIncreasingSubsequenceIndices(list, cmp);
  const sortedSubseqKeySet = new Set(sortedSubseq.map((i) => key(list[i])));

  const moves: {
    movedElement: T;
    afterIndex: number | undefined;
  }[] = [];

  const listCopy = list.slice();

  for (let i = 0; i < listCopy.length; i++) {
    const k = key(listCopy[i]);

    // case where element needs to be moved
    if (!sortedSubseqKeySet.has(k)) {
      const movedElement = listCopy[i];

      // make sure it can't move again
      sortedSubseqKeySet.add(k);

      // remove it
      listCopy.splice(i, 1);
      i--;

      // re-add it
      // edge case: add to beginning
      if (cmp(movedElement, listCopy[0]) <= 0) {
        moves.push({
          movedElement,
          afterIndex: undefined,
        });
        listCopy.splice(0, 0, movedElement);
        continue;
      }

      // edge case: add to end
      if (cmp(movedElement, listCopy[listCopy.length - 1]) >= 0) {
        moves.push({
          movedElement,
          afterIndex: listCopy.length - 1,
        });
        listCopy.push(movedElement);
        continue;
      }

      // TODO: Replace this with a binary search at some point
      for (let j = 1; j < listCopy.length; j++) {
        if (
          cmp(movedElement, listCopy[j - 1]) >= 0 &&
          cmp(movedElement, listCopy[j]) <= 0
        ) {
          moves.push({
            movedElement,
            afterIndex: j - 1,
          });
          listCopy.splice(j, 0, movedElement);
          break;
        }
      }
    }
  }

  return moves;
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
export function longestIncreasingSubsequenceIndices<T>(
  list: T[],
  cmp: (a: T, b: T) => number
) {
  const p: number[] = [];
  const m = [-1];

  let l = 0;
  for (let i = 0; i < list.length; i++) {
    let lo = 1;
    let hi = l + 1;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (cmp(list[m[mid]], list[i]) >= 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    const newL = lo;

    p[i] = m[newL - 1];
    m[newL] = i;

    if (newL > l) {
      l = newL;
    }
  }

  const s = [];
  let k = m[l];
  for (let i = l - 1; i >= 0; i--) {
    s.push(k);
    k = p[k];
  }

  s.reverse();

  return s;
}

export function generateListDiff<T, Key>(
  oldList: T[],
  newList: T[],
  key: (t: T) => Key,
  eq: (a: T, b: T) => boolean
): ListDiff<T, Key> {
  const makeMap = (l: T[]) => new Map(l.map((e) => [key(e), e]));

  const order = newList.map((e) => key(e));

  const oldMap = makeMap(oldList);
  const newMap = makeMap(newList);

  const added: { add: T; after: number | undefined }[] = [];
  const removed: Key[] = [];

  const indexIntoNewList = new Map(newList.map((e, i) => [key(e), i]));

  const finalindex = (t: T) => indexIntoNewList.get(key(t)) ?? 4503599627370496;

  // add moves for sorting list
  const moves = getMovesToSort(
    oldList,
    (a, b) => {
      return finalindex(a) - finalindex(b);
    },
    key
  );

  const removedSet = new Set<Key>();

  for (const [key, item] of oldMap) {
    // in old, but not in new --> removed
    if (!newMap.has(key)) {
      removed.push(key);
      removedSet.add(key);
    }
  }

  // add moved elements
  for (const m of moves) {
    if (removedSet.has(key(m.movedElement))) {
      continue;
    }
    removed.push(key(m.movedElement));
    added.push({
      add: m.movedElement,
      after: indexIntoNewList.get(key(m.movedElement)),
    });
  }

  let index: number | undefined;
  // in new, but not in old --> added
  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) {
      added.push({
        add: newMap.get(key) as T,
        after: index,
      });
    } else {
      // in both && not eq --> removed and added (changed)
      if (!eq(item, oldMap.get(key) as T)) {
        removed.push(key);
        added.push({
          add: newMap.get(key) as T,
          after: index,
        });
      }
    }
    index = index === undefined ? 0 : index + 1;
  }

  return { added, removed, order };
}

export function getObjectDiff(oldObj: any, newObj: any, sentinel = undefined) {
  const isDifferent = !deepObjEq(oldObj, newObj);

  return isDifferent ? newObj : sentinel;
}
