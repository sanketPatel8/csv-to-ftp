import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

import { MySQLSessionStorage } from "@shopify/shopify-app-session-storage-mysql";
import { pool } from "./db.server"; // MySQL connection

// ✔ Create MySQL-based session storage
const mysqlSessionStorage = new MySQLSessionStorage(process.env.DATABASE_URL);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: "https://trainer-isp-non-means.trycloudflare.com" || "",
  authPathPrefix: "/auth",

  // ✔ Use MySQL session storage (NOT Prisma)
  sessionStorage: mysqlSessionStorage,

  distribution: AppDistribution.AppStore,

  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },

  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;

// ✔ Export original shopify.sessionStorage ONLY
export const sessionStorage = shopify.sessionStorage;

export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
