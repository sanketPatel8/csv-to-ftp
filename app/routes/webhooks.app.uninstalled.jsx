// app/routes/webhooks.app.uninstalled.jsx

import { authenticate } from "../shopify.server";
import { MySQLSessionStorage } from "../lib/mysql-session-storage";

const storage = new MySQLSessionStorage();

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log("🔄 Webhook received:", topic, "for shop:", shop);

  try {
    const sessions = await storage.findSessionsByShop(shop);

    if (!sessions || sessions.length === 0) {
      console.log("⚠️ No sessions found for shop:", shop);
      return new Response("OK", { status: 200 });
    }

    const sessionIds = sessions.map((session) => session.id);
    const deleted = await storage.deleteSessions(sessionIds);

    if (deleted) {
      console.log("🗑️ Deleted sessions for shop:", shop);
    } else {
      console.log("⚠️ No sessions deleted (maybe already removed).");
    }
  } catch (err) {
    console.error("❌ Error in APP_UNINSTALLED cleanup for shop:", shop, err);
  }

  return new Response("OK", { status: 200 });
};
