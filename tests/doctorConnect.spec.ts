import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  type DoctorConnectData,
  encounterPath,
  loadDoctorConnectData,
} from "./helper/doctorConnectData";
import { recordExternalLinks } from "./helper/externalLinks";

async function openDoctorConnect(page: Page) {
  await page.getByRole("button", { name: "Doctor Connect" }).click();
  const sheet = page.getByRole("dialog", { name: "Doctor Connect" });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** One department's collapsible section: its header and member cards. */
function departmentSection(sheet: Locator, name: string) {
  return sheet
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .locator("xpath=ancestor::div[@data-state][1]");
}

async function filterByRole(page: Page, sheet: Locator, role: string) {
  // The sheet's only combobox. Comboboxes don't take a name from their
  // text, so it has no accessible name until a role is picked.
  const roleFilter = sheet.getByRole("combobox");
  await expect(roleFilter).toHaveText("Filter by role");
  await roleFilter.click();
  await page.getByPlaceholder("Search option...").fill(role);
  // Options come from a server-side role search (or, with
  // `allowed_filter_roles` configured, a local filter), and the search can
  // be slow, so give the option longer than the default to appear.
  const option = page
    .getByRole("option")
    .filter({ has: page.getByText(role, { exact: true }) });
  await expect(option).toBeVisible({ timeout: 30_000 });
  await option.click();
  await expect(roleFilter).toHaveText(role);
}

test.describe("Doctor Connect", () => {
  let data: DoctorConnectData;

  test.beforeEach(async ({ page }) => {
    data = loadDoctorConnectData();
    await page.goto(encounterPath(data));
  });

  test("lists department members in the slideover", async ({ page }) => {
    const sheet = await openDoctorConnect(page);
    const department = departmentSection(sheet, data.department);

    await expect(department.getByText("2 member(s)")).toBeVisible();
    await expect(
      department.getByRole("heading", { name: data.doctor.name }),
    ).toBeVisible();
    await expect(
      department.getByRole("heading", { name: data.nurse.name }),
    ).toBeVisible();
  });

  test("filters members by role", async ({ page }) => {
    const sheet = await openDoctorConnect(page);
    await filterByRole(page, sheet, "Doctor");
    const department = departmentSection(sheet, data.department);

    await expect(department.getByText("1 member(s)")).toBeVisible();
    await expect(
      department.getByRole("heading", { name: data.doctor.name }),
    ).toBeVisible();
    await expect(
      department.getByRole("heading", { name: data.nurse.name }),
    ).toBeHidden();
  });

  test("call icon dials the doctor", async ({ page }) => {
    const sheet = await openDoctorConnect(page);
    await filterByRole(page, sheet, "Doctor");
    const links = await recordExternalLinks(page);

    await departmentSection(sheet, data.department)
      .getByRole("button", { name: `Call ${data.doctor.name}`, exact: true })
      .click();

    await expect
      .poll(links.urls)
      .toEqual([`tel:${data.doctor.phone.replace(/\s/g, "")}`]);
  });

  test("WhatsApp icon opens a chat that links to the encounter", async ({
    page,
  }) => {
    const sheet = await openDoctorConnect(page);
    await filterByRole(page, sheet, "Doctor");
    const links = await recordExternalLinks(page);
    const encounterUrl = page.url();
    const phone = data.doctor.phone.replace(/\D/g, "");

    await departmentSection(sheet, data.department)
      .getByRole("button", {
        name: `Message ${data.doctor.name} on WhatsApp`,
        exact: true,
      })
      .click();

    // The app link first, then the wa.me fallback after ~1.25s.
    await expect.poll(async () => (await links.urls()).length).toBe(2);
    const [appLink, webLink] = (await links.urls()).map((url) => new URL(url));

    // whatsapp://send opens a chat with the message prefilled. For this
    // scheme the URL parser puts the action ("send") in the host.
    expect(appLink.protocol).toBe("whatsapp:");
    expect(appLink.host).toBe("send");
    expect(appLink.searchParams.get("phone")).toBe(phone);

    expect(webLink.origin).toBe("https://wa.me");
    expect(webLink.pathname).toBe(`/${phone}`);

    for (const link of [appLink, webLink]) {
      const message = link.searchParams.get("text");
      expect(message).toContain(data.doctor.name);
      expect(message).toContain(encounterUrl);
    }
  });
});
