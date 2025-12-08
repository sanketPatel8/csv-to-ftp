// import { useState } from "react";
// import { useFetcher, useLoaderData } from "@remix-run/react";
// import {
//   Page,
//   Layout,
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

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   return { shop: session.shop };
// };

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

// export default function ConnectionSettings() {
//   const fetcher = useFetcher();
//   const isSubmitting =
//     fetcher.state === "submitting" && fetcher.formMethod === "POST";

//   const [protocol, setProtocol] = useState("SFTP");
//   const [host, setHost] = useState("");
//   const [port, setPort] = useState("22");
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");

//   return (
//     <Page>
//       <TitleBar title="Connection Settings" />

//       {/* <Layout>
//         <Layout.Section>
//           <Card>
//             <BlockStack gap="400">
//               <Text as="h2" variant="headingXl">
//                 Connection Settings
//               </Text>
//               <Text as="p" variant="bodyMd">
//                 Store your secure FTP/SFTP details for the Shopify app.
//               </Text>

//               <fetcher.Form method="post">
//                 <BlockStack gap="400">

//                   <Select
//                     label="Protocol"
//                     options={[
//                       { label: "SFTP (Recommended)", value: "SFTP" },
//                       { label: "FTP", value: "FTP" },
//                     ]}
//                     value={protocol}
//                     onChange={setProtocol}
//                     name="protocol"
//                   />

//                   <TextField
//                     label="Host/Server Address"
//                     placeholder="sftp.example.com"
//                     value={host}
//                     onChange={setHost}
//                     name="host"
//                   />

//                   <InlineStack gap="200">
//                     <TextField
//                       label="Port"
//                       value={port}
//                       onChange={setPort}
//                       name="port"
//                       autoComplete="off"
//                     />
//                     <TextField
//                       label="Username"
//                       value={username}
//                       onChange={setUsername}
//                       name="username"
//                       autoComplete="off"
//                     />
//                   </InlineStack>

//                   <TextField
//                     label="Password or Private Key"
//                     value={password}
//                     onChange={setPassword}
//                     name="password"
//                     type="password"
//                     autoComplete="new-password"
//                   />

//                   <Button submit variant="primary" loading={isSubmitting}>
//                     Save Configuration
//                   </Button>

//                   <Text as="p" variant="bodySm" tone="subdued">
//                     User ID (for reference): Loading...
//                   </Text>
//                 </BlockStack>
//               </fetcher.Form>
//             </BlockStack>
//           </Card>
//         </Layout.Section>
//         <Layout.Section>
//           <fetcher.Form method="post" action="/api.daily-orders">
//             <Button
//               submit
//               primary
//               loading={fetcher.state === "submitting"}
//               onClick={() => {
//                 setTimeout(() => {
//                   if (fetcher.data?.success) {
//                     alert(`✅ ${fetcher.data.orders} orders uploaded!`);
//                   } else if (fetcher.data?.error) {
//                     alert(`❌ ${fetcher.data.error}`);
//                   }
//                 }, 1000);
//               }}
//             >
//               🚀 Generate 24h Orders CSV & Upload
//             </Button>

//             {fetcher.data && (
//               <Banner status={fetcher.data.success ? "success" : "critical"}>
//                 {JSON.stringify(fetcher.data)}
//               </Banner>
//             )}
//           </fetcher.Form>
//         </Layout.Section>
//       </Layout> */}

//       <InlineGrid columns={{ sm: 1, md: 2 }} gap="400">
//         {/* LEFT SIDE: FTP Settings */}
//         <Card>
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Connection Settings
//             </Text>
//             <Text as="p" variant="bodyMd">
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
//                   label="Host/Server Address"
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
//                   value={password}
//                   onChange={setPassword}
//                   name="password"
//                   type="password"
//                 />

//                 <Button submit variant="primary" loading={isSubmitting}>
//                   Save Configuration
//                 </Button>
//               </BlockStack>
//             </fetcher.Form>
//           </BlockStack>
//         </Card>

//         {/* RIGHT SIDE: Export Button */}
//         <Card>
//           <BlockStack gap="400">
//             <Text as="h2" variant="headingXl">
//               Export Orders (Last 24h)
//             </Text>

//             <fetcher.Form method="post" action="/api.daily-orders">
//               <Button submit primary loading={fetcher.state === "submitting"}>
//                 🚀 Generate CSV & Upload
//               </Button>

//               {fetcher.data && (
//                 <Banner status={fetcher.data.success ? "success" : "critical"}>
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

import { useState } from "react";
import { useFetcher } from "@remix-run/react";
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
  return { shop: session.shop };
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
  const isSubmitting = fetcher.state === "submitting";

  const [protocol, setProtocol] = useState("SFTP");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
