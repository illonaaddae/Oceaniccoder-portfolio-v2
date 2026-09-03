/**
 * Move one item to a new position, returning a new array. Used by list
 * editors where order is meaningful (the hero's typing roles cycle in the
 * order they're listed), for both drag-and-drop and the arrow buttons.
 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length) return list;
  if (to < 0 || to >= list.length) return list;

  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
