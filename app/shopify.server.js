import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

import { MySQLSessionStorage } from "./lib/mysql-session-storage.js"; // ✅ YOUR CUSTOM STORAGE

const mysqlSessionStorage = new MySQLSessionStorage(); // ✅ CUSTOM INSTANCE

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),

  appUrl: "https://csv-to-ftp.vercel.app",
  authPathPrefix: "/auth",

  sessionStorage: mysqlSessionStorage, // ✅ USE YOUR CUSTOM STORAGE

  distribution: AppDistribution.AppStore,

  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
});

export default shopify;

export const sessionStorage = shopify.sessionStorage;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
