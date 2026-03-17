import type { SupabaseClient } from "@supabase/supabase-js";

export class NotificationService {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  }

  static getPermission(): NotificationPermission {
    if (!NotificationService.isSupported()) return "denied";
    return Notification.permission;
  }

  static async requestPermission(): Promise<NotificationPermission> {
    if (!NotificationService.isSupported()) return "denied";
    return Notification.requestPermission();
  }

  async subscribeToPush(userId: string): Promise<boolean> {
    if (!NotificationService.isSupported()) return false;

    const permission = await NotificationService.requestPermission();
    if (permission !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return false;

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
        });
      }

      const subJson = subscription.toJSON();
      await this.client.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh ?? "",
          auth: subJson.keys?.auth ?? "",
        },
        { onConflict: "user_id,endpoint" }
      );

      return true;
    } catch {
      return false;
    }
  }

  async unsubscribeFromPush(userId: string): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await this.client
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);
      }
    } catch {
      /* noop */
    }
  }

  static showLocal(title: string, options?: NotificationOptions): void {
    if (NotificationService.getPermission() !== "granted") return;
    new Notification(title, {
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      ...options,
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
