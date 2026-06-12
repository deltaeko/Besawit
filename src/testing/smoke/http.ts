import http from "node:http";
import https from "node:https";

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  host?: string;
  body?: JsonValue;
  cookie?: string | null;
};

export type JsonResponse<T = unknown> = {
  status: number;
  body: T;
  headers: http.IncomingHttpHeaders;
};

export function readJsonEnv<T extends Record<string, string>>(
  mapping: T,
): { [K in keyof T]: string } {
  const entries = Object.entries(mapping).map(([key, envName]) => {
    const value = process.env[envName];

    if (!value) {
      throw new Error(`Missing required env var: ${envName}`);
    }

    return [key, value] as const;
  });

  return Object.fromEntries(entries) as { [K in keyof T]: string };
}

export async function jsonRequest<T = unknown>(
  options: JsonRequestOptions,
): Promise<JsonResponse<T>> {
  const target = new URL(options.url);
  const transport = target.protocol === "https:" ? https : http;
  const payload =
    options.body === undefined ? null : JSON.stringify(options.body);

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...(options.host ? { Host: options.host } : {}),
          ...(options.cookie ? { Cookie: options.cookie } : {}),
        },
      },
      (res) => {
        let raw = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: (raw ? JSON.parse(raw) : null) as T,
            headers: res.headers,
          });
        });
      },
    );

    req.on("error", reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}
