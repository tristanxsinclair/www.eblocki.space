import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Bootstrap native shell. Safe to call on web (no-ops).
 * Wires status bar, splash hide, keyboard behaviour, and app lifecycle.
 */
export async function bootstrapNative(opts: {
  onResume?: () => void;
  onPause?: () => void;
  onUrlOpen?: (url: string) => void;
} = {}) {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0a0e14" });
    }
  } catch (e) {
    console.warn("[native] status bar", e);
  }

  try {
    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("kb-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("kb-open");
    });
  } catch (e) {
    console.warn("[native] keyboard", e);
  }

  try {
    CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) opts.onResume?.();
      else opts.onPause?.();
    });
    CapApp.addListener("appUrlOpen", ({ url }) => opts.onUrlOpen?.(url));
    // Android hardware back-button → browser history
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapApp.exitApp();
    });
  } catch (e) {
    console.warn("[native] app", e);
  }

  // Hide splash a tick after first paint
  setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  }, 600);
}