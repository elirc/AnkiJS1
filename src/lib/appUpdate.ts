let updateAvailable = false;

export function hasAppUpdate() {
  return updateAvailable;
}

export function notifyAppUpdate() {
  // Service worker installation can finish before the curriculum and UI mount.
  updateAvailable = true;
  window.dispatchEvent(new CustomEvent("recall:update-available"));
}
