import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";

export function UploadthingProvider() {
  return (
    <NextSSRPlugin
      /**
       * The `extractRouterConfig` will extract the route config from the router
       * so we can use the cookie-based auth in the uploadthing handler.
       */
      routerConfig={extractRouterConfig(ourFileRouter)}
    />
  );
}
