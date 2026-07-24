// Pure diff used by the remote store to turn a whole-array save() into the
// minimal set of row upserts + deletes. No I/O here — trivially testable.

function fingerprint(w) {
  // Fields that, when changed, require a DB write. Order fixed for stability.
  return JSON.stringify([w.srcLang, w.tgtLang, w.word, w.meaning, w.box, w.due]);
}

// prev / next are arrays of app words. Returns:
//   { upserts: [word,...],  // new or changed cards
//     deleteIds: [id,...] } // cards present in prev but gone from next
export function diffWords(prev = [], next = []) {
  const prevById = new Map(prev.map((w) => [w.id, w]));
  const nextIds = new Set(next.map((w) => w.id));

  const upserts = next.filter((w) => {
    const before = prevById.get(w.id);
    return !before || fingerprint(before) !== fingerprint(w);
  });

  const deleteIds = prev
    .filter((w) => !nextIds.has(w.id))
    .map((w) => w.id);

  return { upserts, deleteIds };
}
