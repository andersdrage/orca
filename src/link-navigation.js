// Leave new-tab/window, download and fragment navigation to the browser.
export function isSameTabNavigation(event, link) {
  return link && !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
    !link.hasAttribute('download') && (!link.target || link.target === '_self') &&
    link.origin === location.origin && !link.hash && !link.search
}
