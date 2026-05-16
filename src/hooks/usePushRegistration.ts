import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Registers the device for push notifications and persists the token
 * against the signed-in user. No-ops on web.
 */
export function usePushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    let removed = false;

    (async () => {
      const perm = await PushNotifications.checkPermissions();
      let status = perm.receive;
      if (status === "prompt" || status === "prompt-with-rationale") {
        status = (await PushNotifications.requestPermissions()).receive;
      }
      if (status !== "granted") return;

      await PushNotifications.register();

      const sub1 = await PushNotifications.addListener("registration", async (token) => {
        if (removed) return;
        const info = await Device.getId();
        await supabase.from("push_tokens").upsert({
          user_id: user.id,
          token: token.value,
          platform: Capacitor.getPlatform() as "ios" | "android",
          device_id: info.identifier,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,token" });
      });

      const sub2 = await PushNotifications.addListener("registrationError", (err) => {
        console.warn("[push] registration error", err);
      });

      return () => {
        sub1.remove();
        sub2.remove();
      };
    })();

    return () => {
      removed = true;
    };
  }, [user]);
}