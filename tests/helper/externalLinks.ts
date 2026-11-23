import type { Page } from "@playwright/test";

type RecordingWindow = Window & {
  __externalLinks?: string[];
  navigation?: EventTarget;
};

/**
 * The Call and WhatsApp buttons hand off to the OS (`tel:`, `whatsapp://`)
 * or open a new tab (`wa.me`). In a headed browser that raises an
 * "Open app?" prompt, so record those hand-offs instead of performing them:
 *
 * - `window.open(url)` is recorded and opens nothing.
 * - Navigations to non-http URLs (`location.href = "whatsapp://..."`) are
 *   recorded and cancelled through the Navigation API.
 *
 * Install it after the page has loaded; it patches the live window.
 */
export async function recordExternalLinks(page: Page) {
  await page.evaluate(() => {
    const win = window as RecordingWindow;
    const links: string[] = [];
    win.__externalLinks = links;
    win.open = (url?: string | URL) => {
      links.push(String(url));
      return null;
    };
    win.navigation?.addEventListener("navigate", (event) => {
      const navigate = event as Event & { destination: { url: string } };
      if (!/^https?:/.test(navigate.destination.url)) {
        links.push(navigate.destination.url);
        navigate.preventDefault();
      }
    });
  });

  return {
    /** URLs the page tried to open, in order. */
    urls: () =>
      page.evaluate(() => (window as RecordingWindow).__externalLinks ?? []),
  };
}
