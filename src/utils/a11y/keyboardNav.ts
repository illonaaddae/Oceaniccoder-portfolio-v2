/**
 * Keyboard Navigation Utilities
 * @module utils/a11y/keyboardNav
 */

/**
 * Handles arrow key navigation for lists/grids
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    wrap?: boolean;
    horizontal?: boolean;
    vertical?: boolean;
    columns?: number;
  } = {},
): number {
  const {
    wrap = true,
    horizontal = true,
    vertical = true,
    columns = 1,
  } = options;
  let newIndex = currentIndex;

  switch (event.key) {
    case "ArrowRight":
      if (horizontal) {
        newIndex = currentIndex + 1;
        if (newIndex >= items.length) newIndex = wrap ? 0 : items.length - 1;
      }
      break;
    case "ArrowLeft":
      if (horizontal) {
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = wrap ? items.length - 1 : 0;
      }
      break;
    case "ArrowDown":
      if (vertical) {
        newIndex = currentIndex + columns;
        if (newIndex >= items.length)
          newIndex = wrap ? currentIndex % columns : items.length - 1;
      }
      break;
    case "ArrowUp":
      if (vertical) {
        newIndex = currentIndex - columns;
        if (newIndex < 0)
          newIndex = wrap
            ? items.length - columns + (currentIndex % columns)
            : currentIndex;
      }
      break;
    case "Home":
      newIndex = 0;
      break;
    case "End":
      newIndex = items.length - 1;
      break;
    default:
      return currentIndex;
  }

  event.preventDefault();
  items[newIndex]?.focus();
  return newIndex;
}
