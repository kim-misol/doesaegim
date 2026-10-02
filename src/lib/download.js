// File export. Browsers use an <a download>; Capacitor's WKWebView ignores
// that, so on native we write to the cache dir and open the iOS share sheet.

export function toBase64(data) {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(
          data.buffer ?? data,
          data.byteOffset ?? 0,
          data.byteLength,
        );
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function webDownload(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function isNativePlatform() {
  const cap = typeof window !== "undefined" ? window.Capacitor : undefined;
  return (
    !!cap &&
    typeof cap.isNativePlatform === "function" &&
    cap.isNativePlatform()
  );
}

async function nativeShare(name, base64) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: name, url: uri });
}

export async function saveFile(
  name,
  data,
  type,
  { isNative = isNativePlatform, web = webDownload, native = nativeShare } = {},
) {
  if (!isNative()) return web(name, data, type);
  try {
    await native(name, toBase64(data));
  } catch (e) {
    if (/cancel/i.test(String(e?.message))) return; // user dismissed the sheet
    throw e;
  }
}
