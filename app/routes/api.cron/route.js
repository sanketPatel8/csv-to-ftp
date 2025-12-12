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

// Format date to match Shopify format: 2025-11-06 15:24:16 +0530
function formatShopifyDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  // Get timezone offset
  const offset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(
    2,
    "0",
  );
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const offsetSign = offset >= 0 ? "+" : "-";

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${offsetSign}${offsetHours}${offsetMinutes}`;
}

// Format note attributes
function formatNoteAttributes(noteAttributes) {
  if (!noteAttributes || noteAttributes.length === 0) return "";
  return noteAttributes.map((attr) => `${attr.name}: ${attr.value}`).join("\n");
}

// Convert orders to CSV matching exact Shopify format
function convertToCSV(ordersData) {
  if (!ordersData.length) return null;

  // Exact Shopify CSV headers (76 columns)
  const headers = [
    "Name",
    "Email",
    "Financial Status",
    "Paid at",
    "Fulfillment Status",
    "Fulfilled at",
    "Accepts Marketing",
    "Currency",
    "Subtotal",
    "Shipping",
    "Taxes",
    "Total",
    "Discount Code",
    "Discount Amount",
    "Shipping Method",
    "Created at",
    "Lineitem quantity",
    "Lineitem name",
    "Lineitem price",
    "Lineitem compare at price",
    "Lineitem sku",
    "Lineitem requires shipping",
    "Lineitem taxable",
    "Lineitem fulfillment status",
    "Billing Name",
    "Billing Street",
    "Billing Address1",
    "Billing Address2",
    "Billing Company",
    "Billing City",
    "Billing Zip",
    "Billing Province",
    "Billing Country",
    "Billing Phone",
    "Shipping Name",
    "Shipping Street",
    "Shipping Address1",
    "Shipping Address2",
    "Shipping Company",
    "Shipping City",
    "Shipping Zip",
    "Shipping Province",
    "Shipping Country",
    "Shipping Phone",
    "Notes",
    "Note Attributes",
    "Cancelled at",
    "Payment Method",
    "Payment Reference",
    "Refunded Amount",
    "Vendor",
    "Outstanding Balance",
    "Employee",
    "Location",
    "Device ID",
    "Id",
    "Tags",
    "Risk Level",
    "Source",
    "Lineitem discount",
    "Tax 1 Name",
    "Tax 1 Value",
    "Tax 2 Name",
    "Tax 2 Value",
    "Tax 3 Name",
    "Tax 3 Value",
    "Tax 4 Name",
    "Tax 4 Value",
    "Tax 5 Name",
    "Tax 5 Value",
    "Phone",
    "Receipt Number",
    "Duties",
    "Billing Province Name",
    "Shipping Province Name",
    "Payment ID",
    "Payment Terms Name",
    "Next Payment Due At",
    "Payment References",
  ];

  const rows = [];

  ordersData.forEach((order) => {
    const customer = order.customer || {};
    const billingAddress = order.billing_address || {};
    const shippingAddress = order.shipping_address || {};
    const taxLines = order.tax_lines || [];
    const shippingLines = order.shipping_lines || [];
    const discountCodes = order.discount_codes || [];
    const discountApplications = order.discount_applications || [];

    // Calculate total discount
    const totalDiscount = discountApplications
      .reduce((sum, disc) => sum + parseFloat(disc.value || 0), 0)
      .toFixed(2);

    // Get payment method
    const paymentMethod = order.payment_gateway_names?.length
      ? `1${order.payment_gateway_names[0]}`
      : "";

    // Format payment references (can have multiple with " + " separator)
    const paymentRefs =
      order.refunds?.map((r) => r.id).join(" + ") ||
      order.transactions?.[0]?.receipt?.payment_id ||
      "";

    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach((item, index) => {
        const itemTaxLines = item.tax_lines || [];

        // Build lineitem name (product title with variant if exists)
        const lineitemName =
          item.variant_title && item.variant_title !== "Default Title"
            ? `${item.title} - ${item.variant_title}`
            : item.title;

        rows.push([
          // Order Info (માત્ર પહેલી line item માં)
          order.name || "",
          index === 0 ? order.email || customer.email || "" : "",
          index === 0 ? order.financial_status || "" : "",
          index === 0 ? formatShopifyDate(order.processed_at) : "",
          index === 0 ? order.fulfillment_status || "" : "",
          index === 0 ? formatShopifyDate(order.fulfilled_at) : "",
          index === 0 ? (customer.accepts_marketing ? "yes" : "no") : "",
          index === 0 ? order.currency || "" : "",
          index === 0 ? order.subtotal_price || "0.00" : "",
          index === 0 ? shippingLines[0]?.price || "0.00" : "",
          index === 0 ? order.total_tax || "0.00" : "",
          index === 0 ? order.total_price || "0.00" : "",
          index === 0 ? discountCodes[0]?.code || "" : "",
          index === 0 ? totalDiscount : "",
          index === 0 ? shippingLines[0]?.title || "" : "",
          index === 0 ? formatShopifyDate(order.created_at) : "",

          // Line Item Info (દરેક row માં)
          item.quantity || 0,
          lineitemName || "",
          item.price || "0.00",
          item.compare_at_price || "",
          item.sku || "",
          item.requires_shipping ? "true" : "false",
          item.taxable ? "true" : "false",
          item.fulfillment_status || "pending",

          // Billing Address (માત્ર પહેલી line item માં)
          index === 0
            ? `${billingAddress.first_name || ""} ${billingAddress.last_name || ""}`.trim()
            : "",
          index === 0 ? billingAddress.address1 || "" : "",
          index === 0 ? billingAddress.address1 || "" : "",
          index === 0 ? billingAddress.address2 || "" : "",
          index === 0 ? billingAddress.company || "" : "",
          index === 0 ? billingAddress.city || "" : "",
          index === 0
            ? billingAddress.zip
              ? `'${billingAddress.zip}`
              : ""
            : "", // Add ' prefix
          index === 0
            ? billingAddress.province_code || billingAddress.province || ""
            : "",
          index === 0
            ? billingAddress.country_code || billingAddress.country || ""
            : "",
          index === 0 ? billingAddress.phone || "" : "",

          // Shipping Address (માત્ર પહેલી line item માં)
          index === 0
            ? `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim()
            : "",
          index === 0 ? shippingAddress.address1 || "" : "",
          index === 0 ? shippingAddress.address1 || "" : "",
          index === 0 ? shippingAddress.address2 || "" : "",
          index === 0 ? shippingAddress.company || "" : "",
          index === 0 ? shippingAddress.city || "" : "",
          index === 0
            ? shippingAddress.zip
              ? `'${shippingAddress.zip}`
              : ""
            : "", // Add ' prefix
          index === 0
            ? shippingAddress.province_code || shippingAddress.province || ""
            : "",
          index === 0
            ? shippingAddress.country_code || shippingAddress.country || ""
            : "",
          index === 0 ? shippingAddress.phone || "" : "",

          // Additional Order Fields
          index === 0 ? order.note || "" : "",
          index === 0 ? formatNoteAttributes(order.note_attributes) : "",
          index === 0 ? formatShopifyDate(order.cancelled_at) : "",
          index === 0 ? paymentMethod : "",
          index === 0
            ? order.transactions?.[0]?.receipt?.payment_id ||
              order.transactions?.[0]?.authorization ||
              ""
            : "",
          index === 0 ? order.total_price_refunded || "0.00" : "",
          item.vendor || "",
          index === 0 ? order.total_outstanding || "0.00" : "",
          index === 0 ? order.source_identifier || "" : "",
          index === 0 ? order.location_id || "" : "",
          index === 0 ? order.device_id || "" : "",
          order.id || "",
          index === 0 ? order.tags || "" : "",
          index === 0
            ? order.risks && order.risks.length > 0
              ? order.risks[0].recommendation
              : "Low"
            : "",
          index === 0 ? order.source_name || "web" : "",
          item.total_discount || "0.00",

          // Tax Lines (up to 5)
          index === 0 ? taxLines[0]?.title || "" : "",
          index === 0 ? taxLines[0]?.price || "" : "",
          index === 0 ? taxLines[1]?.title || "" : "",
          index === 0 ? taxLines[1]?.price || "" : "",
          index === 0 ? taxLines[2]?.title || "" : "",
          index === 0 ? taxLines[2]?.price || "" : "",
          index === 0 ? taxLines[3]?.title || "" : "",
          index === 0 ? taxLines[3]?.price || "" : "",
          index === 0 ? taxLines[4]?.title || "" : "",
          index === 0 ? taxLines[4]?.price || "" : "",

          // Additional Contact & Payment Info
          index === 0 ? order.phone || customer.phone || "" : "",
          order.order_number || "",
          index === 0 ? order.total_duties || "" : "",
          index === 0 ? billingAddress.province || "" : "",
          index === 0 ? shippingAddress.province || "" : "",
          index === 0 ? order.transactions?.[0]?.receipt?.payment_id || "" : "",
          index === 0 ? order.payment_terms?.payment_terms_name || "" : "",
          index === 0
            ? formatShopifyDate(order.payment_terms?.next_payment_due_at)
            : "",
          index === 0 ? paymentRefs : "",
        ]);
      });
    } else {
      // Order without line items (rare case)
      rows.push([
        order.name || "",
        order.email || customer.email || "",
        order.financial_status || "",
        formatShopifyDate(order.processed_at),
        order.fulfillment_status || "",
        formatShopifyDate(order.fulfilled_at),
        customer.accepts_marketing ? "yes" : "no",
        order.currency || "",
        order.subtotal_price || "0.00",
        shippingLines[0]?.price || "0.00",
        order.total_tax || "0.00",
        order.total_price || "0.00",
        discountCodes[0]?.code || "",
        totalDiscount,
        shippingLines[0]?.title || "",
        formatShopifyDate(order.created_at),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `${billingAddress.first_name || ""} ${billingAddress.last_name || ""}`.trim(),
        billingAddress.address1 || "",
        billingAddress.address1 || "",
        billingAddress.address2 || "",
        billingAddress.company || "",
        billingAddress.city || "",
        billingAddress.zip ? `'${billingAddress.zip}` : "",
        billingAddress.province_code || billingAddress.province || "",
        billingAddress.country_code || billingAddress.country || "",
        billingAddress.phone || "",
        `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim(),
        shippingAddress.address1 || "",
        shippingAddress.address1 || "",
        shippingAddress.address2 || "",
        shippingAddress.company || "",
        shippingAddress.city || "",
        shippingAddress.zip ? `'${shippingAddress.zip}` : "",
        shippingAddress.province_code || shippingAddress.province || "",
        shippingAddress.country_code || shippingAddress.country || "",
        shippingAddress.phone || "",
        order.note || "",
        formatNoteAttributes(order.note_attributes),
        formatShopifyDate(order.cancelled_at),
        paymentMethod,
        order.transactions?.[0]?.receipt?.payment_id ||
          order.transactions?.[0]?.authorization ||
          "",
        order.total_price_refunded || "0.00",
        "",
        order.total_outstanding || "0.00",
        order.source_identifier || "",
        order.location_id || "",
        order.device_id || "",
        order.id || "",
        order.tags || "",
        order.risks && order.risks.length > 0
          ? order.risks[0].recommendation
          : "Low",
        order.source_name || "web",
        "",
        taxLines[0]?.title || "",
        taxLines[0]?.price || "",
        taxLines[1]?.title || "",
        taxLines[1]?.price || "",
        taxLines[2]?.title || "",
        taxLines[2]?.price || "",
        taxLines[3]?.title || "",
        taxLines[3]?.price || "",
        taxLines[4]?.title || "",
        taxLines[4]?.price || "",
        order.phone || customer.phone || "",
        order.order_number || "",
        order.total_duties || "",
        billingAddress.province || "",
        shippingAddress.province || "",
        order.transactions?.[0]?.receipt?.payment_id || "",
        order.payment_terms?.payment_terms_name || "",
        formatShopifyDate(order.payment_terms?.next_payment_due_at),
        paymentRefs,
      ]);
    }
  });

  return [
    headers.join(","),
    ...rows.map((r) =>
      r
        .map((v) => {
          const str = String(v);
          // Handle fields with commas, quotes, or newlines
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str === "" ? "" : `${str}`;
        })
        .join(","),
    ),
  ].join("\n");
}

export const action = async () => {
  const cronStart = Date.now();
  console.log("------------------------------------------------------");
  console.log("🚀 CRON STARTED:", new Date().toISOString());
  console.log("------------------------------------------------------");

  let csvFilePath = null;
  let orders = [];
  let totalLineItems = 0;

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
    let url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?limit=250&status=any`;
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

    totalLineItems = orders.reduce(
      (sum, order) => sum + (order.line_items?.length || 0),
      0,
    );

    console.log(`📦 Orders Fetched: ${orders.length}`);
    console.log(`📦 Total Line Items: ${totalLineItems}`);

    if (orders.length === 0) {
      console.log("⚠️ No orders found for selected time range.");
      return json({ success: true, orders: 0, line_items: 0 });
    }

    // 🔹 4. Convert to CSV (Exact Shopify Format)
    console.log("📝 Creating CSV File (Shopify Format)...");
    const csvContent = convertToCSV(orders);

    if (!csvContent) {
      return json({
        success: true,
        orders: 0,
        message: "No orders to export",
      });
    }

    // 🔹 5. Save CSV locally
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `orders_${shop}_${timestamp}.csv`;
    csvFilePath = `/tmp/${filename}`;

    await fs.writeFile(csvFilePath, csvContent);
    console.log(`💾 CSV Saved → ${csvFilePath}`);

    // 🔹 6. FTP upload with passive mode
    console.log("============================================");
    console.log("🚀 Starting FTP CSV Upload Process...");
    console.log("============================================\n");

    console.log("📤 Preparing to upload CSV to FTP server...");
    console.log("🔧 FTP Configuration:");
    console.log(`   • Host: ${store.ftp_host}`);
    console.log(`   • Port: ${store.ftp_port || 21}`);
    console.log(`   • Username: ${store.ftp_username}`);
    console.log(`   • Secure Mode: true`);
    console.log(`   • Passive Mode: Enabled`);
    console.log("--------------------------------------------");

    try {
      const client = new Client();
      client.ftp.verbose = true;

      console.log("🔌 Attempting connection to FTP server...");

      let secureMode = false;

      if (store.ftp_protocol) {
        const proto = store.ftp_protocol.toLowerCase();

        if (proto === "ftps" || proto === "ftp-ssl" || proto === "ftpes") {
          secureMode = true;
        }
      }

      await client.access({
        host: store.ftp_host,
        port: store.ftp_port || 21,
        user: store.ftp_username,
        password: store.ftp_password,
        secure: false,
        // secureOptions: { rejectUnauthorized: false },
        timeout: 50000,
        passive: false,
      });

      console.log("✅ Connected to FTP server successfully!");
      console.log(`📁 Current FTP Directory: ${await client.pwd()}`);

      // Enable passive mode
      // client.ftp.passive = true;
      console.log("📡 Passive Mode Enabled");

      console.log("--------------------------------------------");
      console.log("⬆️ Upload Starting...");
      console.log(`   • Local File: ${csvFilePath}`);
      console.log(`   • Remote File: /${filename}`);

      await client.uploadFrom(csvFilePath, `/${filename}`);

      console.log("🎉 Upload Completed Successfully!");
      console.log("--------------------------------------------");

      client.close();
      console.log("🔌 FTP Connection Closed");

      // Delete temp CSV
      await fs.unlink(csvFilePath);
      console.log("🧹 Temp CSV File Deleted Successfully");

      console.log("\n============================================");
      console.log("🎯 FTP CSV Upload Process Finished!");
      console.log("============================================");
    } catch (error) {
      console.log("\n❌ ERROR OCCURRED DURING FTP UPLOAD");
      console.error("Error Details:", error.message);
      console.error(error);

      console.log("⚠️ Closing FTP client due to error...");

      console.log("============================================\n");
    }

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
      line_items: totalLineItems,
      csv_rows: totalLineItems,
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
