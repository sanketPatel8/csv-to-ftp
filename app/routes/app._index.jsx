import { useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Select,
  TextField,
  Button,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const form = await request.formData();

  const protocol = form.get("protocol");
  const host = form.get("host");
  const port = form.get("port");
  const username = form.get("username");
  const password = form.get("password");

  // TODO: SAVE IN DATABASE (MySQL)
  console.log("FTP DETAILS:", { protocol, host, port, username, password });

  return { success: true };
};

export default function ConnectionSettings() {
  const fetcher = useFetcher();
  const isSubmitting =
    fetcher.state === "submitting" && fetcher.formMethod === "POST";

  const [protocol, setProtocol] = useState("SFTP");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Page>
      <TitleBar title="Connection Settings" />

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingXl">
                Connection Settings
              </Text>
              <Text as="p" variant="bodyMd">
                Store your secure FTP/SFTP details for the Shopify app.
              </Text>

              <fetcher.Form method="post">
                <BlockStack gap="400">
                  {/* Protocol */}
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

                  {/* Host */}
                  <TextField
                    label="Host/Server Address"
                    placeholder="sftp.example.com"
                    value={host}
                    onChange={setHost}
                    name="host"
                  />

                  {/* Port + Username */}
                  <InlineStack gap="200">
                    <TextField
                      label="Port"
                      value={port}
                      onChange={setPort}
                      name="port"
                      autoComplete="off"
                    />
                    <TextField
                      label="Username"
                      value={username}
                      onChange={setUsername}
                      name="username"
                      autoComplete="off"
                    />
                  </InlineStack>

                  {/* Password */}
                  <TextField
                    label="Password or Private Key"
                    value={password}
                    onChange={setPassword}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                  />

                  <Button submit variant="primary" loading={isSubmitting}>
                    Save Configuration
                  </Button>

                  <Text as="p" variant="bodySm" tone="subdued">
                    User ID (for reference): Loading...
                  </Text>
                </BlockStack>
              </fetcher.Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
