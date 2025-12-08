// import { useState } from "react";
// import { useFetcher } from "@remix-run/react";
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

// /* ---------------------- LOADER ---------------------- */
// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   return { shop: session.shop };
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
//   const password = form.get("password");

//   const storage = new MySQLSessionStorage();

//   await storage.saveFtpConfig(shop, {
//     protocol,
//     host,
//     port,
//     username,
//     password,
//   });

//   return { success: true };
// };

// /* ---------------------- COMPONENT ---------------------- */
// export default function ConnectionSettings() {
//   const fetcher = useFetcher();
//   const isSubmitting = fetcher.state === "submitting";

//   const [protocol, setProtocol] = useState("SFTP");
//   const [host, setHost] = useState("");
//   const [port, setPort] = useState("22");
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");

//   return (
//     <Page>
//       <TitleBar title="Connection Settings" />

//       <InlineGrid columns={{ sm: 1, md: 2 }} gap="400">
//         {/* --------------------------------------------------- */}
//         {/* LEFT COLUMN : FTP / SFTP CONFIGURATION */}
//         {/* --------------------------------------------------- */}
//         <Card padding="400">
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Connection Settings
//             </Text>
//             <Text as="p" variant="bodyMd" tone="subdued">
//               Store your secure FTP/SFTP details for the Shopify app.
//             </Text>

//             <fetcher.Form method="post">
//               <BlockStack gap="400">
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

//                 <TextField
//                   label="Host / Server Address"
//                   placeholder="sftp.example.com"
//                   value={host}
//                   onChange={setHost}
//                   name="host"
//                 />

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

//                 <TextField
//                   label="Password or Private Key"
//                   type="password"
//                   value={password}
//                   onChange={setPassword}
//                   name="password"
//                 />

//                 <Button submit variant="primary" loading={isSubmitting}>
//                   Save Configuration
//                 </Button>
//               </BlockStack>
//             </fetcher.Form>
//           </BlockStack>
//         </Card>

//         {/* --------------------------------------------------- */}
//         {/* RIGHT COLUMN : EXPORT ORDERS */}
//         {/* --------------------------------------------------- */}
//         <Card padding="400">
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Export Orders (Last 24 hours)
//             </Text>

//             <Text as="p" tone="subdued">
//               Fetch last 24h orders → generate CSV → upload to FTP/SFTP.
//             </Text>

//             <fetcher.Form method="post" action="/api/daily-orders">
//               <Button submit primary loading={isSubmitting}>
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

//               <Button
//                 primary
//                 onClick={async () => {
//                   const response = await fetch("/api/ftp-test", {
//                     method: "POST",
//                   });
//                   const result = await response.json();

//                   if (result.success) {
//                     alert(
//                       `✅ FTP WORKS!\nProtocol: ${result.working_config.protocol}\nPort: ${result.working_config.port}`,
//                     );
//                   } else {
//                     alert(
//                       `❌ FTP FAILED\n${result.error}\n\nNext: ${result.next_step || "Check console"}`,
//                     );
//                     console.log("Full FTP test results:", result);
//                   }
//                 }}
//               >
//                 🔍 Test FTP Connection (5s)
//               </Button>
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

/* ---------------------- LOADER ---------------------- */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const storage = new MySQLSessionStorage();
  const ftpConfig = await storage.getFtpConfig(shop); // ⭐ Fetch stored details

  return {
    shop,
    config: ftpConfig || null,
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
  const password = form.get("password");

  const storage = new MySQLSessionStorage();

  await storage.saveFtpConfig(shop, {
    protocol,
    host,
    port,
    username,
    password,
  });

  return { success: true };
};

/* ---------------------- COMPONENT ---------------------- */
export default function ConnectionSettings() {
  const fetcher = useFetcher();
  const { config } = useLoaderData(); // ⭐ Load saved DB config

  const isSubmitting = fetcher.state === "submitting";

  /* ---------- Set default values from database ---------- */
  const [protocol, setProtocol] = useState(config?.protocol || "SFTP");
  const [host, setHost] = useState(config?.host || "");
  const [port, setPort] = useState(
    config?.port || (config?.protocol === "FTP" ? "21" : "22"),
  );
  const [username, setUsername] = useState(config?.username || "");
  const [password, setPassword] = useState(config?.password || "");

  /* ---------- Auto-update PORT when protocol changes ---------- */
  useEffect(() => {
    if (!config) {
      setPort(protocol === "FTP" ? "21" : "22");
    }
  }, [protocol]);

  return (
    <Page>
      <TitleBar title="Connection Settings" />

      <InlineGrid columns={{ sm: 1, md: 2 }} gap="400">
        {/* --------------------------------------------------- */}
        {/* LEFT COLUMN : FTP / SFTP CONFIGURATION */}
        {/* --------------------------------------------------- */}
        <Card padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingXl">
              Connection Settings
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Store your secure FTP/SFTP details for the Shopify app.
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
                  label="Password or Private Key"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  name="password"
                />

                <Button submit variant="primary" loading={isSubmitting}>
                  Save Configuration
                </Button>

                {fetcher.data?.success && (
                  <Banner status="success">
                    FTP/SFTP configuration saved successfully!
                  </Banner>
                )}
              </BlockStack>
            </fetcher.Form>
          </BlockStack>
        </Card>

        {/* --------------------------------------------------- */}
        {/* RIGHT COLUMN : EXPORT ORDERS */}
        {/* --------------------------------------------------- */}
        <Card padding="400">
          <BlockStack gap="400">
            <Text as="h2" variant="headingXl">
              Export Orders (Last 24 hours)
            </Text>

            <Text as="p" tone="subdued">
              Fetch last 24h orders → generate CSV → upload to FTP/SFTP.
            </Text>

            <fetcher.Form method="post" action="/api/daily-orders">
              <Button submit primary loading={isSubmitting}>
                🚀 Generate CSV & Upload
              </Button>

              {fetcher.data && (
                <Banner
                  status={fetcher.data.success ? "success" : "critical"}
                  title={fetcher.data.success ? "Success" : "Error"}
                >
                  {JSON.stringify(fetcher.data)}
                </Banner>
              )}
            </fetcher.Form>
          </BlockStack>
        </Card>
      </InlineGrid>
    </Page>
  );
}
