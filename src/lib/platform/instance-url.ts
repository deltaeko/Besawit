import { env } from "@/lib/env";

export function buildInstanceLoginUrl(subdomain: string) {
  const appUrl = new URL(env.APP_URL);
  const hostname =
    appUrl.hostname === "localhost" || env.APP_BASE_DOMAIN === "localhost"
      ? `${subdomain}.localhost`
      : `${subdomain}.${env.APP_BASE_DOMAIN}`;

  const port = appUrl.port ? `:${appUrl.port}` : "";
  return `${appUrl.protocol}//${hostname}${port}`;
}
