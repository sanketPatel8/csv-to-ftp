import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import SftpClient from "ssh2-sftp-client";
import fs from "fs/promises";
import pool from "../db.server"; // FTP config mate

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", ""); // Clean shop name
  const accessToken = session.accessToken;
  const API_VERSION = "2024-01";

  try {
    // 1. 24 hours ago calculate karo (same logic)
    const createdAtMin = (() => {
      const date = new Date();
      date.setHours(date.getHours() - 24);
      return date.toISOString();
    })();

    console.log(`🔄 Fetching orders since: ${createdAtMin}`);

    // 2. Shopify REST API call (same exact logic)
    const url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?created_at_min=${createdAtMin}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const orders = data.orders;
    console.log(`📦 Found ${orders.length} orders`);

    // 3. FTP config DB thi (orders nai store!)
    // 3. FTP config DB thi (orders nai store!)
    const storeDomain = session.shop; // always full domain

    const [ftpRows] = await pool.query("SELECT * FROM stores WHERE shop = ?", [
      storeDomain,
    ]);

    if (ftpRows.length === 0) {
      return json(
        {
          error: `❌ FTP config not found for store: ${storeDomain}`,
        },
        { status: 404 },
      );
    }

    const ftpConfig = ftpRows[0];

    // 4. convertToCSV function (same exact logic)
    const convertToCSV = (ordersData) => {
      if (!ordersData || ordersData.length === 0) {
        return null;
      }

      const headers = [
        "Order ID",
        "Order Number",
        "Created At",
        "Customer Name",
        "Customer Email",
        "Total Price",
        "Currency",
        "Financial Status",
        "Fulfillment Status",
        "Items Count",
        "Shipping Address",
        "Phone",
      ];

      const rows = ordersData.map((order) => {
        const customer = order.customer || {};
        const shippingAddress = order.shipping_address || {};

        return [
          order.id,
          order.order_number || order.name,
          order.created_at,
          `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
          customer.email || "",
          order.total_price,
          order.currency,
          order.financial_status,
          order.fulfillment_status || "unfulfilled",
          order.line_items?.length || 0,
          `${shippingAddress.address1 || ""}, ${shippingAddress.city || ""}, ${shippingAddress.province || ""}, ${shippingAddress.zip || ""}`.trim(),
          customer.phone || "",
        ].map((field) => {
          const str = String(field);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
      });

      return [headers.join(","), ...rows.map((row) => row.join(","))].join(
        "\n",
      );
    };

    const csvContent = convertToCSV(orders);
    if (!csvContent) {
      return json({
        success: true,
        orders: 0,
        message: "No orders in last 24h",
      });
    }

    // 5. Timestamp filename (same logic)
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `shopify_orders_${shop}_${timestamp}.csv`;
    const csvFilePath = `/tmp/${filename}`;

    // 6. File save (fs.writeFileSync → async version)
    await fs.writeFile(csvFilePath, csvContent, "utf8");
    console.log(`💾 CSV saved: ${filename}`);

    // 7. SFTP upload (same FTP logic)
    const sftp = new SftpClient();
    const remotePath = `/${filename}`;

    await sftp.connect({
      host: ftpConfig.ftp_host,
      port: parseInt(ftpConfig.ftp_port) || 22,
      username: ftpConfig.ftp_username,
      password: ftpConfig.ftp_password,
      protocol: ftpConfig.ftp_protocol === "ftp" ? "ftp" : "sftp",
    });

    await sftp.put(csvFilePath, remotePath);
    await sftp.end();

    // 8. Cleanup
    await fs.unlink(csvFilePath);

    console.log(`✅ Uploaded to ${ftpConfig.ftp_host}${remotePath}`);
    return json({
      success: true,
      orders: orders.length,
      filename,
      ftp_server: ftpConfig.ftp_host,
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};
