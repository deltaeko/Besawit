import path from "node:path";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";

import { env } from "@/lib/env";

const allowedMimeTypes = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
} as const;

const mimeTypesByExtension = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
} as const;

export type BrandingAssetKind = "logoUrl" | "logoSquareUrl" | "faviconUrl";

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function sanitizePathSegment(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function getUploadRoot() {
  if (env.BRANDING_UPLOAD_DIR) {
    return path.resolve(env.BRANDING_UPLOAD_DIR);
  }

  return path.resolve(process.cwd(), "storage", "branding-assets");
}

function getMaxUploadBytes() {
  return env.BRANDING_MAX_UPLOAD_MB * 1024 * 1024;
}

function getAssetExtension(file: File) {
  const byMimeType = allowedMimeTypes[file.type as keyof typeof allowedMimeTypes];
  if (byMimeType) {
    return byMimeType;
  }

  const filename = "name" in file ? String(file.name ?? "") : "";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ext in mimeTypesByExtension) {
    return ext;
  }

  return null;
}

function getMimeTypeFromExtension(extension: string) {
  return mimeTypesByExtension[extension as keyof typeof mimeTypesByExtension] ?? "application/octet-stream";
}

export function getBrandingAssetPublicUrl(relativePath: string) {
  return `/api/branding-assets/${relativePath.replace(/\\/g, "/")}`;
}

export function toAbsoluteBrandingAssetUrl(assetUrl: string) {
  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl;
  }

  return new URL(assetUrl, env.APP_URL).toString();
}

export async function saveBrandingAsset(input: {
  file: File;
  kind: BrandingAssetKind;
  scope: string;
}) {
  const extension = getAssetExtension(input.file);
  if (!extension) {
    throw new Error("Format file belum didukung. Gunakan PNG, JPG, WEBP, atau ICO.");
  }

  if (input.file.size > getMaxUploadBytes()) {
    throw new Error(`Ukuran file terlalu besar. Maksimum ${env.BRANDING_MAX_UPLOAD_MB} MB.`);
  }

  const scope = sanitizeSegment(input.scope) || "default";
  const field = sanitizeSegment(input.kind) || "asset";
  const filename = `${field}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const relativePath = path.posix.join(scope, filename);
  const fullPath = path.join(getUploadRoot(), relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, Buffer.from(await input.file.arrayBuffer()));

  return {
    relativePath,
    publicUrl: getBrandingAssetPublicUrl(relativePath),
    contentType: getMimeTypeFromExtension(extension),
  };
}

export async function readBrandingAsset(assetPath: string[]) {
  const normalizedSegments = assetPath.map((segment) => sanitizePathSegment(segment));
  const relativePath = normalizedSegments.join(path.sep);
  const root = getUploadRoot();
  const fullPath = path.resolve(root, relativePath);

  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid asset path.");
  }

  const fileStat = await stat(fullPath);
  if (!fileStat.isFile()) {
    throw new Error("Asset not found.");
  }

  const extension = path.extname(fullPath).slice(1).toLowerCase();

  return {
    bytes: await readFile(fullPath),
    contentType: getMimeTypeFromExtension(extension),
  };
}
