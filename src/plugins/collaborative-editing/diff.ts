export interface ListDiff<T, Key> {
  added: {
    add: T;
    after: Key | undefined;
  }[];
  removed: Key[];
  order: Key[];
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

  const added: { add: T; after: Key | undefined }[] = [];
  const removed: Key[] = [];

  let lastKey: Key | undefined;
  // in new, but not in old --> added
  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) {
      added.push({
        add: newMap.get(key) as T,
        after: lastKey,
      });
    } else {
      // in both && not eq --> removed and added (changed)
      if (!eq(item, newMap.get(key) as T)) {
        removed.push(key);
        added.push({
          add: newMap.get(key) as T,
          after: lastKey,
        });
      }
    }
    lastKey = key;
  }

  lastKey = undefined;
  for (const [key, item] of oldMap) {
    // in old, but not in new --> removed
    if (!newMap.has(key)) {
      removed.push(key);
    }
    lastKey = key;
  }

  return { added, removed, order };
}
