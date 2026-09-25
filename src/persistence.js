// A failed write freezes this queue: later snapshots must not leapfrog a
// failed revision and overwrite another window's work.
export function createSaveQueue(write) {
  let tail = Promise.resolve(), failure = null;
  return {
    enqueue(value, key) {
      const operation = tail.then(() => {
        if (failure) throw failure;
        return write(value, key);
      });
      tail = operation.catch(error => { failure = error; });
      return operation;
    },
    async flush() { await tail; if (failure) throw failure; }
  };
}
export function assertRevision(current, expected) {
  if ((current?.revision ?? 0) !== expected) {
    throw new Error('This planner changed in another window. Export your recovery copy, then reload before making more changes.');
  }
}
