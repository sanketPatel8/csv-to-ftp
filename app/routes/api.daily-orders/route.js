// import { json } from "@remix-run/node";
// import { authenticate } from "../../shopify.server";
// import SftpClient from "ssh2-sftp-client";
// import fs from "fs/promises";
// import pool from "../../db.server";
// import { Client } from "basic-ftp";

// export const config = { runtime: "nodejs" };

// export const action = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const shop = session.shop.replace(".myshopify.com", "");
//   const accessToken = session.accessToken;
//   const API_VERSION = "2024-01";
//   const client = new Client();
//   client.ftp.verbose = true;

//   let csvFilePath = null;
//   let orders = []; // ✅ FIXED: Declare at top

//   try {
//     // 1. 24 hours ago calculate
//     const createdAtMin = (() => {
//       const date = new Date();
//       date.setHours(date.getHours() - 24);
//       return date.toISOString();
//     })();

//     console.log(`🔄 Fetching orders since: ${createdAtMin}`);

//     // 2. Shopify REST API (Safe fields)
//     const url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?created_at_min=${createdAtMin}`;

//     const response = await fetch(url, {
//       method: "GET",
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//     }

//     const data = await response.json();
//     orders = data.orders; // ✅ Now defined everywhere
//     console.log(`📦 Found ${orders.length} orders`);

//     // 3. FTP config
//     const storeDomain = session.shop;
//     const [ftpRows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
//       storeDomain,
//     ]);

//     if (ftpRows.length === 0) {
//       return json(
//         { error: `❌ FTP config not found for store: ${storeDomain}` },
//         { status: 404 },
//       );
//     }

//     const ftpConfig = ftpRows[0];
//     console.log(
//       `🔍 FTP Config: ${ftpConfig.ftp_host}:${ftpConfig.ftp_port} (${ftpConfig.ftp_protocol})`,
//     );

//     // 4. SAFE CSV (No customer data)
//     const convertToCSV = (ordersData) => {
//       if (!ordersData || ordersData.length === 0) return null;

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

//       const rows = ordersData.map((order) =>
//         [
//           order.id || "",
//           order.order_number || order.name || "",
//           order.created_at || "",
//           order.total_price || 0,
//           order.currency || "",
//           order.financial_status || "",
//           order.fulfillment_status || "unfulfilled",
//           order.line_items?.length || 0,
//         ].map((field) => {
//           const str = String(field);
//           if (str.includes(",") || str.includes('"') || str.includes("\n")) {
//             return `"${str.replace(/"/g, '""')}"`;
//           }
//           return str;
//         }),
//       );

//       return [headers.join(","), ...rows.map((row) => row.join(","))].join(
//         "\n",
//       );
//     };

//     const csvContent = convertToCSV(orders);
//     if (!csvContent) {
//       return json({
//         success: true,
//         orders: 0,
//         message: "No orders in last 24h",
//       });
//     }

//     // 5. Generate filename
//     const timestamp = new Date()
//       .toISOString()
//       .replace(/[:.]/g, "-")
//       .slice(0, -5);
//     const filename = `shopify_orders_${shop}_${timestamp}.csv`;
//     csvFilePath = `/tmp/${filename}`;

//     // 6. Save CSV
//     await fs.writeFile(csvFilePath, csvContent, "utf8");
//     console.log(`💾 CSV saved: ${filename} (${orders.length} orders)`);

//     // 7. FIXED SFTP with fallbacks
//     const remotePath = `/${filename}`;
//     let uploadSuccess = false;

//     // FTP Port 21
//     try {
//       console.log(`🔄 Trying FTP (port 21)...`);
//       //   const ftp = new SftpClient();
//       await client.access({
//         host: ftpConfig.ftp_host,
//         port: 21,
//         username: ftpConfig.ftp_username,
//         password: ftpConfig.ftp_password,
//         // protocol: "ftp",
//         // timeouts: { connectTimeout: 15000 },
//         secure: false,
//       });
//       //   await ftp.put(csvFilePath, remotePath);
//       //   await ftp.end();
//       console.log(`✅ FTP Success: ${remotePath}`);
//       uploadSuccess = true;
//       client.close();
//     } catch (e) {
//       console.log(`❌ FTP failed: ${e.message}`);
//     }

//     // SFTP Original
//     if (!uploadSuccess) {
//       try {
//         console.log(`🔄 Trying SFTP (${ftpConfig.ftp_port || 22})...`);
//         const sftp = new SftpClient();
//         await sftp.connect({
//           host: ftpConfig.ftp_host,
//           port: parseInt(ftpConfig.ftp_port) || 22,
//           username: ftpConfig.ftp_username,
//           password: ftpConfig.ftp_password,
//           protocol: "sftp",
//           timeouts: { connectTimeout: 20000 },
//         });
//         await sftp.put(csvFilePath, remotePath);
//         await sftp.end();
//         console.log(`✅ SFTP Success: ${remotePath}`);
//         uploadSuccess = true;
//       } catch (e) {
//         console.log(`❌ SFTP failed: ${e.message}`);
//       }
//     }

//     if (!uploadSuccess) {
//       return json(
//         {
//           success: false,
//           orders: orders.length,
//           ftp_failed: true,
//           csv_preserved: csvFilePath,
//           error: "All FTP/SFTP failed",
//           ftp_debug: { host: ftpConfig.ftp_host, port: ftpConfig.ftp_port },
//         },
//         { status: 500 },
//       );
//     }

//     // 8. Cleanup
//     await fs.unlink(csvFilePath);
//     csvFilePath = null;

//     return json({
//       success: true,
//       orders: orders.length,
//       filename,
//       ftp_server: ftpConfig.ftp_host,
//       remote_path: remotePath,
//     });
//   } catch (error) {
//     console.error("❌ API Error:", error);

//     if (csvFilePath) {
//       console.log(`💾 CSV preserved: ${csvFilePath}`);
//     }

//     // ✅ FIXED: orders always defined
//     return json(
//       {
//         error: error.message,
//         csv_preserved: csvFilePath || false,
//         orders_processed: orders.length, // SAFE NOW!
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

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const accessToken = session.accessToken;
  const API_VERSION = "2024-01";

  let csvFilePath = null;
  let orders = [];

  try {
    // 1. Last 24 hours
    const createdAtMin = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    console.log("Fetching orders since:", createdAtMin);

    // 2. REST API (SAFE: no customer data)
    const url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?created_at_min=${createdAtMin}`;
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
    console.log("Orders:", orders.length);

    // 3. Fetch FTP Config
    const [rows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
      session.shop,
    ]);

    if (rows.length === 0)
      return json({ error: "FTP config not found" }, { status: 404 });

    const ftpConfig = rows[0];

    // 4. Convert to CSV
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
      return json({ success: true, orders: 0, message: "No orders last 24h" });
    }

    // 5. Save CSV file
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `orders_${shop}_${timestamp}.csv`;
    csvFilePath = `/tmp/${filename}`;

    await fs.writeFile(csvFilePath, csvContent);
    console.log("CSV saved:", filename);

    // 6. Upload using basic-ftp Client
    const client = new Client();
    client.ftp.verbose = true;

    console.log("Connecting to FTP:", ftpConfig.ftp_host);

    await client.access({
      host: ftpConfig.ftp_host,
      port: ftpConfig.ftp_port || 21,
      user: ftpConfig.ftp_username,
      password: ftpConfig.ftp_password,
      secure: false, // change to true if FTPS
    });

    console.log("Uploading file:", filename);

    await client.uploadFrom(csvFilePath, `/${filename}`);

    console.log("FTP Upload Success 🎉");

    client.close();

    // 7. Remove temp file
    await fs.unlink(csvFilePath);

    return json({
      success: true,
      orders: orders.length,
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
