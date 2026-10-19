// Immutable reads/writes by dotted path ("skills.0.title"); numeric segments index arrays.

type Key = string | number;
type Tree = Record<string | number, unknown>;

export function parsePath(path: string): Key[] {
  return path === '' ? [] : path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}

export function getPath(obj: unknown, path: string): unknown {
  let cur = obj;
  for (const k of parsePath(path)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Tree)[k];
  }
  return cur;
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = parsePath(path);
  const write = (node: unknown, i: number): unknown => {
    if (i === keys.length) return value;
    const k = keys[i];
    const base: Tree = Array.isArray(node)
      ? ([...node] as unknown as Tree)
      : node && typeof node === 'object'
        ? { ...(node as Tree) }
        : typeof k === 'number'
          ? ([] as unknown as Tree)
          : {};
    base[k] = write(base[k], i + 1);
    return base;
  };
  return write(obj, 0) as T;
}

export function removeAt<T>(obj: T, path: string): T {
  const keys = parsePath(path);
  const idx = keys.pop();
  const parentPath = keys.join('.');
  const parent = parentPath ? getPath(obj, parentPath) : obj;
  if (!Array.isArray(parent) || typeof idx !== 'number') throw new Error(`not an array item: ${path}`);
  const next = parent.filter((_, i) => i !== idx);
  return parentPath ? setPath(obj, parentPath, next) : (next as T);
}

export function appendAt<T>(obj: T, path: string, value: unknown): T {
  const list = getPath(obj, path);
  return setPath(obj, path, [...(Array.isArray(list) ? list : []), value]);
}
