import { createSignal } from "solid-js";

const enum Theme {
  Auto = "auto",
  Light = "light",
  Dark = "dark",
}

const THEME_DATA_ATTR = "data-bs-theme";
const THEME_STORAGE_KEY = "theme";
const prefersDarkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

const [activeTheme, setActiveTheme] = createSignal(getStoredTheme());

function getStoredTheme(): Theme {
  return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) ?? Theme.Auto;
}

function setStoredTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme as string);
}

function setTheme(theme: Theme) {
  setActiveTheme(theme);
  setStoredTheme(theme);

  if (theme === Theme.Auto && prefersDarkModeQuery.matches) {
    document.documentElement.setAttribute(
      THEME_DATA_ATTR,
      Theme.Dark as string
    );
  } else {
    document.documentElement.setAttribute(THEME_DATA_ATTR, theme as string);
  }
}

function initTheme() {
  // Set initial theme
  setTheme(activeTheme());

  // Listen for changes to system theme
  prefersDarkModeQuery.addEventListener("change", () => {
    if (activeTheme() === Theme.Auto) {
      setTheme(activeTheme());
    }
  });
}

export { Theme, activeTheme, setTheme, initTheme };
