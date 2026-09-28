/// <reference types="@serwist/next/typings" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/dashboard"),
      handler: new NetworkFirst({
        cacheName: "dashboard-api",
        networkTimeoutSeconds: 8,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 12,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        request.method === "GET" &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/login") &&
        !url.pathname.startsWith("/api/logout") &&
        !url.pathname.startsWith("/api/readings") &&
        !url.pathname.startsWith("/api/ingest"),
      handler: new NetworkFirst({
        cacheName: "api-get",
        networkTimeoutSeconds: 8,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 48,
            maxAgeSeconds: 60 * 60 * 6,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
