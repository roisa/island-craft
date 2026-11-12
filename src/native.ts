/**
 * Things only the iOS app can do: a gentle tap of the phone (haptics) at good
 * moments, and the iOS share sheet for files (the website downloads them
 * instead). Plugins are loaded only inside the app, so the website and the
 * tests never load them.
 */
const native = () => typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

export type Buzz = 'tap' | 'thud' | 'success' | 'oops';
let last = 0;
/** a short vibration; at most one every 60 ms so busy moments don't buzz on and on */
export function buzz(kind: Buzz) {
  if (!native()) return;
  const now = performance.now();
  if (kind !== 'success' && now - last < 60) return;
  last = now;
  import('@capacitor/haptics').then(({ Haptics, ImpactStyle, NotificationType }) => {
    if (kind === 'success') return Haptics.notification({ type: NotificationType.Success });
    if (kind === 'oops') return Haptics.notification({ type: NotificationType.Warning });
    return Haptics.impact({ style: kind === 'thud' ? ImpactStyle.Medium : ImpactStyle.Light });
  }).catch(() => { /* no haptics on this device */ });
}

/**
 * Hand a file to the user: the share sheet in the app (Save to Files, Photos,
 * AirDrop...), a download on the website. `data` is text, or a data: URL for images.
 */
export async function shareFile(name: string, data: string, mime: string): Promise<boolean> {
  if (!native()) {
    const url = data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    if (!data.startsWith('data:')) setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }
  try {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const isB64 = data.startsWith('data:');
    const { uri } = await Filesystem.writeFile({
      path: name, directory: Directory.Cache,
      data: isB64 ? data.slice(data.indexOf(',') + 1) : data,
      ...(isB64 ? {} : { encoding: Encoding.UTF8 }),
    });
    await Share.share({ title: name, files: [uri] });
    return true;
  } catch {
    return false; // the share sheet was closed, or saving failed
  }
}
