import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const native = () => Capacitor.isNativePlatform();

export const haptics = {
  light: () => native() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium: () => native() && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy: () => native() && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success: () => native() && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warning: () => native() && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
  error: () => native() && Haptics.notification({ type: NotificationType.Error }).catch(() => {}),
  select: () => native() && Haptics.selectionStart().then(() => Haptics.selectionEnd()).catch(() => {}),
};

export function useHaptics() {
  return haptics;
}