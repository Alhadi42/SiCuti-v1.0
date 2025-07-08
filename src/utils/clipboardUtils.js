/**
 * Clipboard utilities for reliable copy/paste functionality
 */

export const copyToClipboard = async (text) => {
  if (!text) {
    throw new Error("No text provided to copy");
  }

  console.log("📋 Attempting to copy to clipboard:", text);

  // Method 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log("✅ Copy successful using Clipboard API");
      return { success: true, method: "clipboard-api" };
    } catch (error) {
      console.warn("⚠️ Clipboard API failed, trying fallback...", error);
    }
  }

  // Method 2: execCommand fallback (for older browsers or non-HTTPS)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Styling to make it invisible but focusable
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    textArea.style.zIndex = "-1";

    document.body.appendChild(textArea);

    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    // Execute copy command
    const successful = document.execCommand("copy");

    // Clean up
    document.body.removeChild(textArea);

    if (successful) {
      console.log("✅ Copy successful using execCommand");
      return { success: true, method: "exec-command" };
    } else {
      throw new Error("execCommand copy returned false");
    }
  } catch (error) {
    console.error("❌ execCommand fallback failed:", error);
  }

  // Method 3: Manual copy instruction (last resort)
  console.warn("⚠️ All copy methods failed, showing manual instruction");
  throw new Error("Copy to clipboard failed. Please copy manually: " + text);
};

export const checkClipboardSupport = () => {
  const support = {
    clipboardAPI: !!(navigator.clipboard && window.isSecureContext),
    execCommand: !!document.queryCommandSupported?.("copy"),
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
  };

  console.log("📋 Clipboard support check:", support);
  return support;
};

export default {
  copyToClipboard,
  checkClipboardSupport,
};
