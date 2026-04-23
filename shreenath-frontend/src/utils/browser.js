export async function copyTextToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (document?.execCommand) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (copied) {
        return true;
      }
    } catch (error) {
      document.body.removeChild(textArea);
    }
  }

  throw new Error("Clipboard is not available.");
}

export function confirmAction(message) {
  if (typeof window?.confirm === "function") {
    return window.confirm(message);
  }

  return false;
}

export function downloadBlob(blob, filename) {
  if (typeof URL?.createObjectURL !== "function" || !document?.createElement) {
    throw new Error("File download is not available in this browser.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
