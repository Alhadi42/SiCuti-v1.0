/**
 * Remove debug button if it exists
 */
export const removeDebugButton = () => {
  const debugButton = document.getElementById('debug-user-btn');
  if (debugButton) {
    debugButton.remove();
    console.log("Debug button removed");
  }
};

// Auto-remove debug button when module loads
removeDebugButton();

// Also check after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', removeDebugButton);
} else {
  removeDebugButton();
}

// Set up a periodic check to remove the button if it reappears
const interval = setInterval(() => {
  const button = document.getElementById('debug-user-btn');
  if (button) {
    button.remove();
  }
}, 1000);

// Stop checking after 10 seconds
setTimeout(() => {
  clearInterval(interval);
}, 10000);
