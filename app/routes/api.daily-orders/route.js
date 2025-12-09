// import { json } from "@remix-run/node";
// import { authenticate } from "../../shopify.server";
// import fs from "fs/promises";
// import pool from "../../db.server";
// import { Client } from "basic-ftp";

// export const config = { runtime: "nodejs" };

// export const action = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const shop = session.shop.replace(".myshopify.com", "");
//   const accessToken = session.accessToken;
//   const API_VERSION = "2024-01";

//   let csvFilePath = null;
//   let orders = [];

//   try {
//     // 1. Last 24 hours
//     const createdAtMin = new Date(
//       Date.now() - 24 * 60 * 60 * 1000,
//     ).toISOString();
//     console.log("Fetching orders since:", createdAtMin);

//     // 2. REST API (SAFE: no customer data)
//     const url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?created_at_min=${createdAtMin}`;
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
//     console.log("Orders:", orders.length);

//     // 3. Fetch FTP Config
//     const [rows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
//       session.shop,
//     ]);

//     if (rows.length === 0)
//       return json({ error: "FTP config not found" }, { status: 404 });

//     const ftpConfig = rows[0];

//     // 4. Convert to CSV
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
//       return json({ success: true, orders: 0, message: "No orders last 24h" });
//     }

//     // 5. Save CSV file
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[:.]/g, "-")
//       .slice(0, -5);
//     const filename = `orders_${shop}_${timestamp}.csv`;
//     csvFilePath = `/tmp/${filename}`;

//     await fs.writeFile(csvFilePath, csvContent);
//     console.log("CSV saved:", filename);

//     // 6. Upload using basic-ftp Client
//     const client = new Client();
//     client.ftp.verbose = true;

//     console.log("Connecting to FTP:", ftpConfig.ftp_host);

//     await client.access({
//       host: ftpConfig.ftp_host,
//       port: ftpConfig.ftp_port || 21,
//       user: ftpConfig.ftp_username,
//       password: ftpConfig.ftp_password,
//       secure: false, // change to true if FTPS
//     });

//     console.log("Uploading file:", filename);

//     await client.uploadFrom(csvFilePath, `/${filename}`);

//     console.log("FTP Upload Success 🎉");

//     client.close();

//     // 7. Remove temp file
//     await fs.unlink(csvFilePath);

//     return json({
//       success: true,
//       orders: orders.length,
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
import { authenticate } from "../../shopify.server";
import fs from "fs/promises";
import pool from "../../db.server";
import { Client } from "basic-ftp";

export const config = { runtime: "nodejs" };

// Convert DB time_range to actual timestamp
function getCreatedAtMin(range) {
  const now = Date.now();

  switch (range) {
    case "1h":
      return new Date(now - 1 * 3600 * 1000).toISOString();
    case "6h":
      return new Date(now - 6 * 3600 * 1000).toISOString();
    case "12h":
      return new Date(now - 12 * 3600 * 1000).toISOString();
    case "24h":
      return new Date(now - 24 * 3600 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    case "90d":
      return new Date(now - 90 * 24 * 3600 * 1000).toISOString();
    case "1y":
      return new Date(now - 365 * 24 * 3600 * 1000).toISOString();
    case "all":
      return null; // No filter → fetch all orders (max 250)
    default:
      return new Date(now - 24 * 3600 * 1000).toISOString();
  }
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const accessToken = session.accessToken;
  const API_VERSION = "2024-01";

  let csvFilePath = null;
  let orders = [];

  try {
    // 1️⃣ Fetch FTP Config including time_range
    const [rows] = await pool.query(
      "SELECT ftp_time_range FROM stores WHERE shop = ? LIMIT 1",
      [session.shop],
    );

    if (!rows.length)
      return json({ error: "FTP config not found" }, { status: 404 });

    const timeRange = rows[0].ftp_time_range || "24h";

    console.log("⏳ Time Range From DB:", timeRange);

    const createdAtMin = getCreatedAtMin(timeRange);

    let url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?limit=250`;

    if (createdAtMin) {
      url += `&created_at_min=${createdAtMin}`;
    }

    console.log("Fetching Orders URL:", url);

    // 2️⃣ REST API (safe — no customer data included)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API Error: ${response.statusText}`);
    }

    const data = await response.json();
    orders = data.orders;
    console.log("Orders Received:", orders.length);

    // 3️⃣ Convert to CSV
    const convertToCSV = (ordersData) => {
      if (!ordersData.length) return null;

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

      const rows = ordersData.map((o) => [
        o.id,
        o.order_number || o.name,
        o.created_at,
        o.total_price,
        o.currency,
        o.financial_status,
        o.fulfillment_status || "unfulfilled",
        o.line_items?.length || 0,
      ]);

      return [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    };

    const csvContent = convertToCSV(orders);
    if (!csvContent) {
      return json({
        success: true,
        orders: 0,
        message: "No orders found for selected time range",
      });
    }

    // 4️⃣ Save CSV Temp File
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);

    const filename = `orders_${shop}_${timestamp}.csv`;
    csvFilePath = `/tmp/${filename}`;

    await fs.writeFile(csvFilePath, csvContent);
    console.log("CSV File Saved:", filename);

    // 5️⃣ Fetch FTP Credentials
    const [ftpRows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
      session.shop,
    ]);
    const ftpConfig = ftpRows[0];

    // 6️⃣ Upload to FTP Server
    const client = new Client();
    client.ftp.verbose = true;

    console.log("Connecting to FTP:", ftpConfig.ftp_host);

    await client.access({
      host: ftpConfig.ftp_host,
      port: ftpConfig.ftp_port || 21,
      user: ftpConfig.ftp_username,
      password: ftpConfig.ftp_password,
      secure: false,
    });

    await client.uploadFrom(csvFilePath, `/${filename}`);

    console.log("FTP Upload Successful 🎉");

    client.close();
    await fs.unlink(csvFilePath);

    return json({
      success: true,
      orders: orders.length,
      time_range: timeRange,
      uploaded_to: ftpConfig.ftp_host,
      filename,
    });
  } catch (error) {
    console.error("Error:", error);

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
