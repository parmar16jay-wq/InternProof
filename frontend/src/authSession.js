// Authentication belongs to a browser tab so company and student accounts can
// be tested side by side in separate tabs of the same browser.
export function readAuthUser() {
  const current = window.sessionStorage.getItem("user");
  if (current) {
    try {
      return JSON.parse(current);
    } catch {
      window.sessionStorage.removeItem("user");
    }
  }

  // Move sessions created by older builds into this tab once. New sessions are
  // never written to localStorage, which is shared by every tab.
  const legacy = window.localStorage.getItem("user");
  if (!legacy) return null;
  window.localStorage.removeItem("user");
  try {
    const user = JSON.parse(legacy);
    if (user) window.sessionStorage.setItem("user", JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

export function writeAuthUser(user) {
  window.sessionStorage.setItem("user", JSON.stringify(user));
}

export function clearAuthUser() {
  window.sessionStorage.removeItem("user");
}
