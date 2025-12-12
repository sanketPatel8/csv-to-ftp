import { json } from "@remix-run/node";
import fs from "fs/promises";
import pool from "../../db.server";
import { Client } from "basic-ftp";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
  memory: 1024,
};

// (keep your helper functions as-is)
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

function formatNoteAttributes(noteAttributes) {
  if (!noteAttributes || noteAttributes.length === 0) return "";
  return noteAttributes.map((attr) => `${attr.name}: ${attr.value}`).join("\n");
}

// (convertToCSV kept same as your original — not repeating here for brevity)
// Paste your full convertToCSV function here unchanged.
function convertToCSV(ordersData) {
  if (!ordersData.length) return null;

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

    const totalDiscount = discountApplications
      .reduce((sum, disc) => sum + parseFloat(disc.value || 0), 0)
      .toFixed(2);

    const paymentMethod = order.payment_gateway_names?.length
      ? `1${order.payment_gateway_names[0]}`
      : "";

    const paymentRefs =
      order.refunds?.map((r) => r.id).join(" + ") ||
      order.transactions?.[0]?.receipt?.payment_id ||
      "";

    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach((item, index) => {
        const itemTaxLines = item.tax_lines || [];

        const lineitemName =
          item.variant_title && item.variant_title !== "Default Title"
            ? `${item.title} - ${item.variant_title}`
            : item.title;

        rows.push([
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

          item.quantity || 0,
          lineitemName || "",
          item.price || "0.00",
          item.compare_at_price || "",
          item.sku || "",
          item.requires_shipping ? "true" : "false",
          item.taxable ? "true" : "false",
          item.fulfillment_status || "pending",

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
            : "",
          index === 0
            ? billingAddress.province_code || billingAddress.province || ""
            : "",
          index === 0
            ? billingAddress.country_code || billingAddress.country || ""
            : "",
          index === 0 ? billingAddress.phone || "" : "",

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
            : "",
          index === 0
            ? shippingAddress.province_code || shippingAddress.province || ""
            : "",
          index === 0
            ? shippingAddress.country_code || shippingAddress.country || ""
            : "",
          index === 0 ? shippingAddress.phone || "" : "",

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

  const results = []; // collect per-store results

  try {
    // Load ALL stores
    console.log("📡 Loading all store configurations from database...");
    const [storeRows] = await pool.query(
      "SELECT id, shop, access_token, ftp_protocol, ftp_host, ftp_port, ftp_username, ftp_password, ftp_time_range FROM stores",
    );

    if (!storeRows.length) {
      console.log("❌ No stores found in DB");
      return json({ error: "No stores found in DB" }, { status: 404 });
    }

    // Process stores sequentially to avoid too many parallel network calls
    for (const store of storeRows) {
      const storeResult = {
        store_id: store.id,
        shop: store.shop,
        uploaded: false,
        orders_fetched: 0,
        line_items: 0,
        filename: null,
        error: null,
        preserved_csv_path: null,
      };

      console.log("\n============================================");
      console.log(`➡️ Processing store: ${store.shop} (ID: ${store.id})`);
      console.log("============================================");

      try {
        const shop = store.shop.replace(".myshopify.com", "");
        const accessToken = store.access_token;
        const timeRange = store.ftp_time_range || store.ftp_time_range || "24h";
        const createdAtMin = getCreatedAtMin(timeRange);

        // Build Shopify API URL
        const API_VERSION = "2025-10";
        let url = `https://${shop}.myshopify.com/admin/api/${API_VERSION}/orders.json?limit=250&status=any`;
        if (createdAtMin) url += `&created_at_min=${createdAtMin}`;

        console.log("📥 Shopify API URL:", url);

        // Fetch orders
        console.log("📡 Fetching orders from Shopify for store:", store.shop);
        const response = await fetch(url, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Shopify API Error for store ${store.shop}: ${response.status}`,
          );
        }

        const data = await response.json();
        const orders = data.orders || [];

        storeResult.orders_fetched = orders.length;
        storeResult.line_items = orders.reduce(
          (sum, order) => sum + (order.line_items?.length || 0),
          0,
        );

        console.log(`📦 Orders Fetched: ${orders.length}`);
        console.log(`📦 Total Line Items: ${storeResult.line_items}`);

        if (orders.length === 0) {
          console.log(
            "⚠️ No orders for this store/time range — skipping CSV + FTP.",
          );
          // still update last_cron_run for this store
          await pool.query(
            "UPDATE stores SET last_cron_run = NOW() WHERE id = ?",
            [store.id],
          );
          results.push(storeResult);
          continue;
        }

        // Convert orders to CSV
        console.log("📝 Creating CSV File (Shopify Format)...");
        const csvContent = convertToCSV(orders);

        if (!csvContent) {
          console.log("⚠️ convertToCSV returned empty — skipping store.");
          await pool.query(
            "UPDATE stores SET last_cron_run = NOW() WHERE id = ?",
            [store.id],
          );
          results.push(storeResult);
          continue;
        }

        // Save CSV locally
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, -5);

        // clean shop name for safe filename
        const cleanShop = shop.replace(/[^a-zA-Z0-9_-]/g, "");

        // clean timeRange
        const cleanRange = timeRange.replace(/[^a-zA-Z0-9_-]/g, "");

        // build formatted date
        const d = new Date();
        const day = String(d.getDate()).padStart(2, "0");

        const months = [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ];
        const month = months[d.getMonth()];
        const year = d.getFullYear();

        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");

        // const filename = `orders_${shop}_${timestamp}.csv`;
        const filename = `orders_${cleanShop}_${cleanRange}_${day}_${month}_${year}_${hours}-${minutes}.csv`;
        const csvFilePath = `/tmp/${filename}`;
        storeResult.filename = filename;
        storeResult.preserved_csv_path = csvFilePath;

        await fs.writeFile(csvFilePath, csvContent);
        console.log(`💾 CSV Saved → ${csvFilePath}`);

        // FTP upload
        console.log(
          "📤 Preparing to upload CSV to FTP server for store:",
          store.shop,
        );
        if (!store.ftp_host || !store.ftp_username) {
          throw new Error(
            "Missing FTP configuration (host/username) for store",
          );
        }

        const client = new Client();
        client.ftp.verbose = true;

        try {
          // Determine secure mode from ftp_protocol
          let secureMode = false;
          if (store.ftp_protocol) {
            const proto = String(store.ftp_protocol).toLowerCase();
            if (proto === "ftps" || proto === "ftp-ssl" || proto === "ftpes") {
              secureMode = true;
            }
          }

          console.log("🔧 FTP Configuration:");
          console.log(`   • Host: ${store.ftp_host}`);
          console.log(`   • Port: ${store.ftp_port || 21}`);
          console.log(`   • Username: ${store.ftp_username}`);
          console.log(`   • Secure Mode: ${secureMode}`);
          console.log("--------------------------------------------");

          await client.access({
            host: store.ftp_host,
            port: store.ftp_port || 21,
            user: store.ftp_username,
            password: store.ftp_password,
            secure: secureMode,
            timeout: 50000,
          });

          console.log("✅ Connected to FTP server successfully!");
          console.log(`📁 Current FTP Directory: ${await client.pwd()}`);

          // Enable passive mode (basic-ftp uses passive by default; still log)
          client.ftp.passive = true;
          console.log("📡 Passive Mode Enabled");

          console.log("⬆️ Upload Starting...");
          console.log(`   • Local File: ${csvFilePath}`);
          console.log(`   • Remote File: /${filename}`);

          await client.uploadFrom(csvFilePath, `/${filename}`);

          console.log("🎉 Upload Completed Successfully!");
          storeResult.uploaded = true;

          // Close ftp client
          client.close();
          console.log("🔌 FTP Connection Closed");
        } catch (ftpErr) {
          // Ensure client closed if an error occurred
          try {
            client.close();
          } catch (e) {
            // ignore
          }
          throw ftpErr;
        } finally {
          // nothing extra here
        }

        // Delete temp CSV after successful upload
        try {
          await fs.unlink(csvFilePath);
          storeResult.preserved_csv_path = null; // removed
          console.log("🧹 Temp CSV File Deleted Successfully");
        } catch (unlinkErr) {
          // If deletion fails, preserve path for debugging
          console.warn("⚠️ Failed to delete temp CSV:", unlinkErr.message);
        }

        // Update last_cron_run for this store
        await pool.query(
          "UPDATE stores SET last_cron_run = NOW() WHERE id = ?",
          [store.id],
        );

        const storeTimeTaken = ((Date.now() - cronStart) / 1000).toFixed(2);
        console.log("------------------------------------------------------");
        console.log(`✅ Store Finished: ${store.shop}`);
        console.log(`⏳ Time since cron start: ${storeTimeTaken} seconds`);
        console.log("------------------------------------------------------");

        results.push(storeResult);
      } catch (storeErr) {
        console.error(
          `❌ Error processing store ${store.shop}:`,
          storeErr.message,
        );
        storeResult.error = storeErr.message || String(storeErr);
        // leave preserved_csv_path as-is (if file was created)
        // attempt to update last_cron_run anyway
        try {
          await pool.query(
            "UPDATE stores SET last_cron_run = NOW() WHERE id = ?",
            [store.id],
          );
        } catch (e) {
          console.warn(
            "⚠️ Could not update last_cron_run for store:",
            store.id,
            e.message,
          );
        }
        results.push(storeResult);
        // continue to next store
      }
    } // end for-of stores

    const timeTaken = ((Date.now() - cronStart) / 1000).toFixed(2);
    console.log("------------------------------------------------------");
    console.log(
      `✅ CRON FINISHED for all stores at: ${new Date().toISOString()}`,
    );
    console.log(`⏳ Total Execution Time: ${timeTaken} seconds`);
    console.log("------------------------------------------------------");

    return json({
      success: true,
      summary: results,
      execution_time_seconds: timeTaken,
    });
  } catch (error) {
    console.log("❌ CRON FAILED:", error.message);
    return json(
      {
        error: error.message,
        summary: results,
      },
      { status: 500 },
    );
  }
};
