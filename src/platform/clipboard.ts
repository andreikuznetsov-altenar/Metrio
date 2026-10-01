export type ClipboardCopyResult = 'copied' | 'error';

export async function copyTextToClipboard(text: string): Promise<ClipboardCopyResult> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'error';
  }
}
