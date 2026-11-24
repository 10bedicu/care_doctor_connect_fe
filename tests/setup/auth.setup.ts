import { expect, test as setup } from "@playwright/test";

import { ADMIN } from "../helper/careApi";

const authFile = "tests/.auth/user.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /username/i }).fill(ADMIN.username);
  await page.getByLabel(/^password$/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await expect(
    page.getByRole("heading", { name: /^Good (Morning|Afternoon|Evening), .+/ }),
  ).toBeVisible({ timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
