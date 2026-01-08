// import { useState, useEffect } from "react";
// import { useFetcher, useLoaderData } from "@remix-run/react";
// import {
//   Page,
//   Card,
//   Text,
//   BlockStack,
//   Select,
//   TextField,
//   Button,
//   InlineStack,
//   Banner,
//   InlineGrid,
// } from "@shopify/polaris";
// import { TitleBar } from "@shopify/app-bridge-react";
// import { authenticate } from "../shopify.server";
// import { MySQLSessionStorage } from "../lib/mysql-session-storage.js";
// import pool from "../db.server.js";

// /* ---------------------- LOADER ---------------------- */
// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;

//   const storage = new MySQLSessionStorage();
//   const ftpConfig = await storage.getFtpConfig(shop);

//   // 🔥 FETCH last_cron_run ALSO
//   const [rows] = await pool.query(
//     "SELECT last_cron_run FROM stores WHERE shop = ? LIMIT 1",
//     [shop],
//   );

//   return {
//     shop,
//     config: ftpConfig || null,
//     lastCron: rows.length ? rows[0].last_cron_run : null,
//   };
// };

// /* ---------------------- ACTION ---------------------- */
// export const action = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;

//   const form = await request.formData();
//   const protocol = form.get("protocol");
//   const host = form.get("host");
//   const port = form.get("port");
//   const username = form.get("username");
//   const passwordValue = form.get("password");
//   const time_range = form.get("time_range"); // ⭐ FIXED

//   const storage = new MySQLSessionStorage();

//   await storage.saveFtpConfig(shop, {
//     protocol,
//     host,
//     port,
//     username,
//     password: passwordValue,
//     time_range,
//   });

//   return { success: true };
// };

// /* ---------------------- COMPONENT ---------------------- */
// export default function ConnectionSettings() {
//   const fetcher = useFetcher();
//   const { config } = useLoaderData();

//   const isSubmitting = fetcher.state === "submitting";

//   /* ---------- Load from DB or set defaults ---------- */
//   const [protocol, setProtocol] = useState(config?.protocol || "SFTP");
//   const [host, setHost] = useState(config?.host || "");
//   const [port, setPort] = useState(
//     config?.port || (config?.protocol === "FTP" ? "21" : "22"),
//   );
//   const [username, setUsername] = useState(config?.username || "");
//   const [password, setPassword] = useState(config?.password || "");
//   const [timeRange, setTimeRange] = useState(config?.time_range || "24h");

//   /* ---------- Auto-change port when protocol changes ---------- */
//   useEffect(() => {
//     if (!config) {
//       setPort(protocol === "FTP" ? "21" : "22");
//     }
//   }, [protocol]);

//   return (
//     <Page>
//       <TitleBar title="Connection Settings" />

//       <InlineGrid columns={{ sm: 1, md: 2 }} gap="400">
//         {/* LEFT SIDE */}
//         <Card padding="400">
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Connection Settings
//             </Text>

//             <fetcher.Form method="post">
//               <BlockStack gap="400">
//                 {/* PROTOCOL */}
//                 <Select
//                   label="Protocol"
//                   options={[
//                     { label: "SFTP (Recommended)", value: "SFTP" },
//                     { label: "FTP", value: "FTP" },
//                   ]}
//                   value={protocol}
//                   onChange={setProtocol}
//                   name="protocol"
//                 />

//                 {/* HOST */}
//                 <TextField
//                   label="Host / Server Address"
//                   placeholder="sftp.example.com"
//                   value={host}
//                   onChange={setHost}
//                   name="host"
//                 />

//                 {/* PORT + USERNAME */}
//                 <InlineStack gap="200">
//                   <TextField
//                     label="Port"
//                     value={port}
//                     onChange={setPort}
//                     name="port"
//                   />
//                   <TextField
//                     label="Username"
//                     value={username}
//                     onChange={setUsername}
//                     name="username"
//                   />
//                 </InlineStack>

//                 {/* PASSWORD */}
//                 <TextField
//                   label="Password or Private Key"
//                   type="password"
//                   value={password}
//                   onChange={setPassword}
//                   name="password"
//                 />

//                 {/* TIME RANGE */}
//                 <Select
//                   label="Order Time Range"
//                   options={[
//                     { label: "Last 1 Hour", value: "1h" },
//                     { label: "Last 6 Hours", value: "6h" },
//                     { label: "Last 12 Hours", value: "12h" },
//                     { label: "Last 24 Hours", value: "24h" },
//                     { label: "Last 7 Days", value: "7d" },
//                     { label: "Last 30 Days", value: "30d" },
//                     { label: "Last 90 Days", value: "90d" },
//                     { label: "Last 1 Year", value: "1y" },
//                     { label: "All Time", value: "all" },
//                   ]}
//                   value={timeRange}
//                   onChange={setTimeRange}
//                   name="time_range"
//                 />

//                 {/* SAVE BUTTON */}
//                 <Button submit variant="primary" loading={isSubmitting}>
//                   Save Configuration
//                 </Button>

//                 {fetcher.data?.success && (
//                   <Banner status="success">
//                     Configuration saved successfully!
//                   </Banner>
//                 )}
//               </BlockStack>
//             </fetcher.Form>
//           </BlockStack>
//         </Card>

//         {/* RIGHT SIDE */}
//         <Card padding="400">
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Export Orders
//             </Text>

//             <fetcher.Form method="post" action="/api/daily-orders">
//               <Button primary submit loading={isSubmitting}>
//                 🚀 Generate CSV & Upload
//               </Button>

//               {fetcher.data && (
//                 <Banner
//                   status={fetcher.data.success ? "success" : "critical"}
//                   title={fetcher.data.success ? "Success" : "Error"}
//                 >
//                   {JSON.stringify(fetcher.data)}
//                 </Banner>
//               )}
//             </fetcher.Form>
//           </BlockStack>
//         </Card>
//       </InlineGrid>
//     </Page>
//   );
// }

import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Select,
  TextField,
  Button,
  InlineStack,
  Banner,
  InlineGrid,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { MySQLSessionStorage } from "../lib/mysql-session-storage.js";
import pool from "../db.server.js";

/* ---------------------- LOADER ---------------------- */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const storage = new MySQLSessionStorage();
  const ftpConfig = await storage.getFtpConfig(shop);

  // Get last cron run time
  const [rows] = await pool.query(
    "SELECT last_cron_run FROM stores WHERE shop = ? LIMIT 1",
    [shop],
  );

  return {
    shop,
    config: ftpConfig || null,
    lastCron: rows.length ? rows[0].last_cron_run : null,
  };
};

/* ---------------------- ACTION ---------------------- */
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const form = await request.formData();
  const protocol = form.get("protocol");
  const host = form.get("host");
  const port = form.get("port");
  const username = form.get("username");
  const passwordValue = form.get("password");
  const time_range = form.get("time_range");
  const file_path = form.get("file_path"); // ✅ NEW

  const storage = new MySQLSessionStorage();

  await storage.saveFtpConfig(shop, {
    protocol,
    host,
    port,
    username,
    password: passwordValue,
    time_range,
    file_path, // ✅ SAVE
  });

  return { success: true };
};

function formatDateTime(date) {
  if (!date) return "Never";
  return new Date(date).toLocaleString();
}

function getNextRunTime(last, range) {
  if (!last) return "Waiting for first cron execution";

  const next = new Date(last);

  switch (range) {
    case "1h":
      next.setHours(next.getHours() + 1);
      break;
    case "6h":
      next.setHours(next.getHours() + 6);
      break;
    case "12h":
      next.setHours(next.getHours() + 12);
      break;
    case "24h":
      next.setHours(next.getHours() + 24);
      break;
    case "7d":
      next.setDate(next.getDate() + 7);
      break;
    case "30d":
      next.setDate(next.getDate() + 30);
      break;
    case "90d":
      next.setDate(next.getDate() + 90);
      break;
    case "1y":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "all":
      return "Cron Runs → Fetches ALL Orders";
    default:
      next.setHours(next.getHours() + 24);
  }

  return next.toLocaleString();
}

/* ---------------------- COMPONENT ---------------------- */
export default function ConnectionSettings() {
  const fetcher = useFetcher();
  const { config, lastCron } = useLoaderData();

  const isSubmitting = fetcher.state === "submitting";

  // Convert last cron run readable
  const lastCronDisplay = formatDateTime(lastCron);

  // Next run time based on time_range
  const nextRunDisplay = getNextRunTime(lastCron, config?.time_range);

  /* ---------- Load values ---------- */
  const [protocol, setProtocol] = useState(config?.protocol || "SFTP");
  const [host, setHost] = useState(config?.host || "");
  const [port, setPort] = useState(
    config?.port || (config?.protocol === "FTP" ? "21" : "22"),
  );
  const [username, setUsername] = useState(config?.username || "");
  const [password, setPassword] = useState(config?.password || "");
  const [timeRange, setTimeRange] = useState(config?.time_range || "24h");
  const [filePath, setFilePath] = useState(config?.file_path || "/");

  /* Auto-update port on protocol change */
  useEffect(() => {
    if (!config) {
      setPort(protocol === "FTP" ? "21" : "22");
    }
  }, [protocol]);

  return (
    <Page>
      <TitleBar title="Connection Settings" />

      <InlineGrid columns={{ sm: 1, md: 2 }} gap="400">
        {/* LEFT SIDE */}
        <Card padding="400">
          <BlockStack gap="400">
            {/* 🔥 CRON INFO BANNER */}
            <Banner status="info">
              <p>
                <b>Last Cron Run:</b> {lastCronDisplay}
              </p>
              <p>
                <b>Next Scheduled Run:</b> {nextRunDisplay}
              </p>
            </Banner>

            <Text as="h2" variant="headingXl">
              FTP / SFTP Configuration
            </Text>

            <fetcher.Form method="post">
              <BlockStack gap="400">
                <Select
                  label="Protocol"
                  options={[
                    { label: "SFTP (Recommended)", value: "SFTP" },
                    { label: "FTP", value: "FTP" },
                  ]}
                  value={protocol}
                  onChange={setProtocol}
                  name="protocol"
                />

                <TextField
                  label="Host / Server Address"
                  placeholder="sftp.example.com"
                  value={host}
                  onChange={setHost}
                  name="host"
                />

                <InlineStack gap="200">
                  <TextField
                    label="Port"
                    value={port}
                    onChange={setPort}
                    name="port"
                  />
                  <TextField
                    label="Username"
                    value={username}
                    onChange={setUsername}
                    name="username"
                  />
                </InlineStack>

                <TextField
                  label="Password / Private Key"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  name="password"
                />

                <TextField
                  label="Remote File Path"
                  helpText="Example: /exports/orders or /public_html/uploads"
                  placeholder="/exports/orders"
                  value={filePath}
                  onChange={setFilePath}
                  name="file_path"
                />

                <Select
                  label="Order Time Range"
                  options={[
                    { label: "Last 1 Hour", value: "1h" },
                    { label: "Last 6 Hours", value: "6h" },
                    { label: "Last 12 Hours", value: "12h" },
                    { label: "Last 24 Hours", value: "24h" },
                    { label: "Last 7 Days", value: "7d" },
                    { label: "Last 30 Days", value: "30d" },
                  ]}
                  value={timeRange}
                  onChange={setTimeRange}
                  name="time_range"
                />

                <Button submit variant="primary" loading={isSubmitting}>
                  Save Settings
                </Button>

                {fetcher.data?.success && (
                  <Banner status="success">Settings saved successfully!</Banner>
                )}
              </BlockStack>
            </fetcher.Form>
          </BlockStack>
        </Card>

        {/* RIGHT SIDE */}
        <Card padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingXl">
              Export Orders Now
            </Text>

            <fetcher.Form method="post" action="/api/daily-orders">
              <Button primary submit loading={isSubmitting}>
                🚀 Generate CSV & Upload
              </Button>

              {/* {fetcher.data && (
                <Banner
                  status={fetcher.data.success ? "success" : "critical"}
                  title={fetcher.data.success ? "Success" : "Error"}
                >
                  {JSON.stringify(fetcher.data)}
                </Banner>
              )} */}
            </fetcher.Form>
          </BlockStack>
        </Card>
      </InlineGrid>
    </Page>
  );
}
