/**
 * Tracks pressed keys using `keydown`/`keyup`, returning an API to read state
 * and to dispose listeners. Keeps the mutating object stable for quick checks.
 */
export function createKeyTracker(target: Document = document) {
  const keys: Record<string, boolean> = Object.create(null);
  const onDown = (e: KeyboardEvent) => { keys[e.code] = true; };
  const onUp = (e: KeyboardEvent) => { keys[e.code] = false; };
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  const dispose = () => {
    target.removeEventListener('keydown', onDown);
    target.removeEventListener('keyup', onUp);
  };
  return { keys, dispose };
}
