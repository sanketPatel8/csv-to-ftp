// import { json } from "@remix-run/node";
// import { authenticate } from "../../shopify.server";
// import fs from "fs/promises";
// import pool from "../../db.server";
// import { Client } from "basic-ftp";

// export const config = { runtime: "nodejs" };

// // Convert DB time_range to actual timestamp
// function getCreatedAtMin(range) {
//   const now = Date.now();

//   switch (range) {
//     case "1h":
//       return new Date(now - 1 * 3600 * 1000).toISOString();
//     case "6h":
//       return new Date(now - 6 * 3600 * 1000).toISOString();
//     case "12h":
//       return new Date(now - 12 * 3600 * 1000).toISOString();
//     case "24h":
//       return new Date(now - 24 * 3600 * 1000).toISOString();
//     case "7d":
//       return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
//     case "30d":
//       return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
//     case "90d":
//       return new Date(now - 90 * 24 * 3600 * 1000).toISOString();
//     case "1y":
//       return new Date(now - 365 * 24 * 3600 * 1000).toISOString();
//     case "all":
//       return null; // No filter → fetch all orders (max 250)
//     default:
//       return new Date(now - 24 * 3600 * 1000).toISOString();
//   }
// }

// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop.replace(".myshopify.com", "");
//   const accessToken = session.accessToken;
//   const API_VERSION = "2024-01";

//   let csvFilePath = null;
//   let orders = [];

//   try {
//     // 1️⃣ Fetch FTP Config including time_range
//     const [rows] = await pool.query(
//       "SELECT ftp_time_range FROM stores WHERE shop = ? LIMIT 1",
//       [session.shop],
//     );

//     if (!rows.length)
//       return json({ error: "FTP config not found" }, { status: 404 });

//     const timeRange = rows[0].ftp_time_range || "24h";

//     console.log("⏳ Time Range From DB:", timeRange);

//     const createdAtMin = getCreatedAtMin(timeRange);

//     let url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?limit=250`;

//     if (createdAtMin) {
//       url += `&created_at_min=${createdAtMin}`;
//     }

//     console.log("Fetching Orders URL:", url);

//     // 2️⃣ REST API (safe — no customer data included)
//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Shopify API Error: ${response.statusText}`);
//     }

//     const data = await response.json();
//     orders = data.orders;
//     console.log("Orders Received:", orders.length);

//     // 3️⃣ Convert to CSV
//     const convertToCSV = (ordersData) => {
//       if (!ordersData.length) return null;

//       const headers = [
//         "Order ID",
//         "Order Number",
//         "Created At",
//         "Total Price",
//         "Currency",
//         "Financial Status",
//         "Fulfillment Status",
//         "Items Count",
//       ];

//       const rows = ordersData.map((o) => [
//         o.id,
//         o.order_number || o.name,
//         o.created_at,
//         o.total_price,
//         o.currency,
//         o.financial_status,
//         o.fulfillment_status || "unfulfilled",
//         o.line_items?.length || 0,
//       ]);

//       return [
//         headers.join(","),
//         ...rows.map((r) =>
//           r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
//         ),
//       ].join("\n");
//     };

//     const csvContent = convertToCSV(orders);
//     if (!csvContent) {
//       return json({
//         success: true,
//         orders: 0,
//         message: "No orders found for selected time range",
//       });
//     }

//     // 4️⃣ Save CSV Temp File
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[:.]/g, "-")
//       .slice(0, -5);

//     const filename = `orders_${shop}_${timestamp}.csv`;
//     csvFilePath = `/tmp/${filename}`;

//     await fs.writeFile(csvFilePath, csvContent);
//     console.log("CSV File Saved:", filename);

//     // 5️⃣ Fetch FTP Credentials
//     const [ftpRows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
//       session.shop,
//     ]);
//     const ftpConfig = ftpRows[0];

//     // 6️⃣ Upload to FTP Server
//     const client = new Client();
//     client.ftp.verbose = true;

//     console.log("Connecting to FTP:", ftpConfig.ftp_host);

//     await client.access({
//       host: ftpConfig.ftp_host,
//       port: ftpConfig.ftp_port || 21,
//       user: ftpConfig.ftp_username,
//       password: ftpConfig.ftp_password,
//       secure: false,
//     });

//     await client.uploadFrom(csvFilePath, `/${filename}`);

//     console.log("FTP Upload Successful 🎉");

//     client.close();
//     await fs.unlink(csvFilePath);

//     return json({
//       success: true,
//       orders: orders.length,
//       time_range: timeRange,
//       uploaded_to: ftpConfig.ftp_host,
//       filename,
//     });
//   } catch (error) {
//     console.error("Error:", error);

//     return json(
//       {
//         error: error.message,
//         orders: orders.length,
//         csv_preserved: csvFilePath || false,
//       },
//       { status: 500 },
//     );
//   }
// };

import { json } from "@remix-run/node";
import fs from "fs/promises";
import pool from "../../db.server";
import { Client } from "basic-ftp";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
  memory: 1024,
};

// Convert DB time_range to timestamp
function getCreatedAtMin(range) {
  const now = Date.now();
  const map = {
    "1h": 1 * 3600 * 1000,
    "6h": 6 * 3600 * 1000,
    "12h": 12 * 3600 * 1000,
    "24h": 24 * 3600 * 1000,
    "7d": 7 * 24 * 3600 * 1000,
    "30d": 30 * 24 * 3600 * 1000,
    "90d": 90 * 24 * 3600 * 1000,
    "1y": 365 * 24 * 3600 * 1000,
  };

  if (range === "all") return null;
  return new Date(now - (map[range] || map["24h"])).toISOString();
}

export const action = async () => {
  const cronStart = Date.now();
  console.log("------------------------------------------------------");
  console.log("🚀 CRON STARTED:", new Date().toISOString());
  console.log("------------------------------------------------------");

  let csvFilePath = null;
  let orders = [];

  try {
    // 🔹 1. Load store settings
    console.log("📡 Loading store configuration from database...");

    const [storeRows] = await pool.query(
      "SELECT shop, access_token, ftp_protocol, ftp_host, ftp_port, ftp_username, ftp_password, ftp_time_range FROM stores LIMIT 1",
    );

    if (!storeRows.length) {
      console.log("❌ No Store Found in Database");
      return json({ error: "No store found in DB" }, { status: 404 });
    }

    const store = storeRows[0];
    const shop = store.shop.replace(".myshopify.com", "");
    const accessToken = store.access_token;
    const timeRange = store.ftp_time_range || "24h";

    console.log(`🛒 Store Loaded: ${store.shop}`);
    console.log(`⏱ Time Range from DB: ${timeRange}`);

    const createdAtMin = getCreatedAtMin(timeRange);

    // 🔹 2. Build API URL
    const API_VERSION = "2024-01";
    let url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?limit=250`;
    if (createdAtMin) url += `&created_at_min=${createdAtMin}`;

    console.log("📥 Shopify API URL:", url);

    // 🔹 3. Fetch orders
    console.log("📡 Fetching orders from Shopify...");
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Shopify API Error: ${response.status}`);

    const data = await response.json();
    orders = data.orders;

    console.log(`📦 Orders Fetched: ${orders.length}`);

    if (orders.length === 0) {
      console.log("⚠️ No orders found for selected time range.");
      return json({ success: true, orders: 0 });
    }

    // 🔹 4. Convert to CSV
    console.log("📝 Creating CSV File...");
    const headers = [
      "Order ID",
      "Order Number",
      "Created At",
      "Total Price",
      "Currency",
      "Financial Status",
      "Fulfillment Status",
      "Items Count",
    ];

    const rows = orders.map((o) => [
      o.id,
      o.order_number || o.name,
      o.created_at,
      o.total_price,
      o.currency,
      o.financial_status,
      o.fulfillment_status || "unfulfilled",
      o.line_items?.length || 0,
    ]);

    const csvContent =
      headers.join(",") +
      "\n" +
      rows
        .map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

    // 🔹 5. Save CSV locally
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `orders_${shop}_${timestamp}.csv`;
    csvFilePath = `/tmp/${filename}`;

    await fs.writeFile(csvFilePath, csvContent);
    console.log(`💾 CSV Saved → ${csvFilePath}`);

    // 🔹 6. FTP upload
    console.log("📤 Uploading CSV to FTP server...");
    console.log(`🔗 FTP Host: ${store.ftp_host}`);

    const client = new Client();
    client.ftp.verbose = true;

    await client.access({
      host: store.ftp_host,
      port: store.ftp_port || 21,
      user: store.ftp_username,
      password: store.ftp_password,
      secure: false,
    });

    await client.uploadFrom(csvFilePath, `/${filename}`);
    client.close();

    console.log("🎉 FTP Upload Success!");

    await fs.unlink(csvFilePath);
    console.log("🧹 Temp CSV Deleted");

    // 🔹 7. Save cron run time
    console.log("🕒 Updating last_cron_run in database...");
    await pool.query("UPDATE stores SET last_cron_run = NOW()");

    const timeTaken = ((Date.now() - cronStart) / 1000).toFixed(2);

    console.log("------------------------------------------------------");
    console.log(`✅ CRON FINISHED at: ${new Date().toISOString()}`);
    console.log(`⏳ Total Execution Time: ${timeTaken} seconds`);
    console.log("------------------------------------------------------");

    return json({
      success: true,
      orders: orders.length,
      time_range: timeRange,
      uploaded_to: store.ftp_host,
      filename,
      execution_time_seconds: timeTaken,
    });
  } catch (error) {
    console.log("❌ CRON FAILED:", error.message);

    return json(
      {
        error: error.message,
        orders: orders.length,
        csv_preserved: csvFilePath || false,
      },
      { status: 500 },
    );
  }
};
