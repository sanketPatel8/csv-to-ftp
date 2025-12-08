// import { authenticate } from "../shopify.server";
// import db from "../db.server";

// export const action = async ({ request }) => {
//   const { shop, session, topic } = await authenticate.webhook(request);

//   console.log(`Received ${topic} webhook for ${shop}`);

//   // Webhook requests can trigger multiple times and after an app has already been uninstalled.
//   // If this webhook already ran, the session may have been deleted previously.
//   if (session) {
//     await db.session.deleteMany({ where: { shop } });
//   }

//   return new Response();
// };

// app/routes/webhooks.app-uninstalled.jsx
import { authenticate } from "../shopify.server";
import { MySQLSessionStorage } from "../lib/mysql-session-storage";

const storage = new MySQLSessionStorage();

export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);

  console.log("🔄 APP_UNINSTALLED webhook for shop:", shop);

  try {
    // 1️⃣ Get all sessions for this shop
    const sessions = await storage.findSessionsByShop(shop);

    if (sessions.length === 0) {
      console.log("⚠️ No sessions found for shop:", shop);
      return new Response("OK");
    }

    // 2️⃣ Extract session IDs
    const sessionIds = sessions.map((session) => session.id);

    // 3️⃣ Delete all sessions using your custom function
    const deleted = await storage.deleteSessions(sessionIds);

    if (deleted) {
      console.log("🗑️ Deleted sessions for shop:", shop);
    } else {
      console.log("⚠️ No sessions deleted (maybe already removed).");
    }
  } catch (err) {
    console.error("❌ Error in uninstall cleanup:", err);
  }

  return new Response("OK");
};
