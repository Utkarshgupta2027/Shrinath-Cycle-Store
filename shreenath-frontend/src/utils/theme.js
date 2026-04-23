import { getStoredUser, readStoredJson } from "./auth";

export const THEME_EVENT = "app-theme-change";
export const DEFAULT_THEME = "dark";

export const getSettingsKey = (userId) => `settingsCenter:${userId}`;

export function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

export function getStoredTheme(user = getStoredUser()) {
  if (!user?.id) {
    return DEFAULT_THEME;
  }

  const settings = readStoredJson(getSettingsKey(user.id), {});
  return normalizeTheme(settings?.theme);
}

export function applyTheme(theme) {
  const nextTheme = normalizeTheme(theme);
  document.body.classList.remove("app-theme-light", "app-theme-dark", "settings-light-mode");
  document.body.classList.add(`app-theme-${nextTheme}`);
  if (nextTheme === "light") {
    document.body.classList.add("settings-light-mode");
  }
  document.documentElement.setAttribute("data-theme", nextTheme);
  return nextTheme;
}

export function syncThemeFromStorage() {
  return applyTheme(getStoredTheme());
}

export function notifyThemeChange(theme) {
  const nextTheme = normalizeTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: nextTheme }));
}
