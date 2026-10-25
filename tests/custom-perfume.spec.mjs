import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const { createClient } = createRequire(import.meta.url)("@supabase/supabase-js");

test("signature scent: submission, ownership, admin quotation, live updates and feature controls", async ({ browser, request }, testInfo) => {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const password = `Scent-${randomUUID()}-A1!`;
  const users = [];
  const contexts = [];
  const pageErrors = [];
  let originalSettings;
  let id;
  const baseURL = testInfo.project.use.baseURL;
  const check = (result) => { if (result.error) throw new Error(`Fixture operation failed: ${result.error.message || result.error.code || result.error.status || "unknown"}`); return result.data; };
  async function loginCustomer() {
    const email = `scent-test-${randomUUID()}@example.com`;
    const created = check(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Scent Test Customer" } }));
    users.push(created.user.id);
    const context = await browser.newContext({ baseURL });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/login?next=/custom-perfume");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('form[data-auth-ready="true"]')).toBeVisible({ timeout: 20000 });
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Log In", exact: true }).click();
    await expect(page).toHaveURL(/\/custom-perfume$/);
    await expect(page.getByRole("button", { name: "Submit My Request" })).toBeVisible({ timeout: 20000 });
    return { page, context };
  }

  try {
    originalSettings = check(await service.from("custom_perfume_settings").select("enabled,homepage_enabled").eq("id", true).single());
    check(await service.from("custom_perfume_settings").update({ enabled: true, homepage_enabled: true }).eq("id", true));

    expect((await request.get("/api/custom-perfume/requests")).status()).toBe(401);
    expect((await request.post("/api/custom-perfume/requests", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/admin/custom-perfume/requests")).status()).toBe(401);
    expect((await request.put("/api/admin/custom-perfume/settings", { data: { enabled: false, homepage_enabled: false } })).status()).toBe(401);
    expect((await request.patch(`/api/admin/custom-perfume/requests/${randomUUID()}`, { data: {} })).status()).toBe(401);

    const { page, context } = await loginCustomer();
    await expect(page.getByRole("button", { name: "Submit My Request" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[name="reference_brand"]').fill("Test inspiration");
    await page.locator('[name="reference_name"]').fill("Test amber garden");
    await page.locator('[name="fragrance_notes"]').fill("Rose, amber and sandalwood");
    await page.locator('[name="scent_preferences"]').fill("Warm and soft for evening wear");
    await page.locator('[name="bottle_size"]').selectOption("50");
    await page.locator('[name="budget"]').fill("1500");
    await page.locator('[name="reference_url"]').fill("https://example.com/fragrance");
    await page.locator('[name="contact_phone"]').fill("0000000000");
    await page.locator('[name="instructions"]').fill("Avoid strong citrus.");
    await page.locator('[name="profile_acknowledged"]').check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("customer-mobile.png"), fullPage: true });
    const submission = page.waitForResponse((response) => response.url().endsWith("/api/custom-perfume/requests") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Submit My Request" }).click();
    const response = await submission;
    expect(response.status()).toBe(201);
    id = (await response.json()).request.id;
    await expect(page.getByRole("heading", { name: "Your inspiration is with us" })).toBeVisible();

    const retry = await context.request.post("/api/custom-perfume/requests", { data: {
      id, reference_brand: "Test inspiration", reference_name: "Test amber garden", fragrance_notes: "Rose, amber and sandalwood", scent_preferences: "Warm and soft for evening wear", bottle_size: 50, budget: 1500, reference_url: "https://example.com/fragrance", contact_name: "Scent Test Customer", contact_email: "test@example.com", contact_phone: "0000000000", instructions: "", profile_acknowledged: true,
    } });
    expect(retry.status()).toBe(200);
    const own = await (await context.request.get("/api/custom-perfume/requests")).json();
    expect(own.requests.filter((item) => item.id === id)).toHaveLength(1);
    expect(own.requests[0]).not.toHaveProperty("custom_perfume_internal_notes");
    expect((await context.request.post("/api/custom-perfume/requests", { data: { id: randomUUID() } })).status()).toBe(400);
    expect((await context.request.put("/api/admin/custom-perfume/settings", { data: { enabled: false, homepage_enabled: false } })).status()).toBe(401);
    await page.getByRole("link", { name: "View My Requests" }).click();
    await expect(page.locator("#custom-perfume-requests")).toContainText("Test amber garden");
    await page.reload();
    await expect(page.locator("#custom-perfume-requests")).toContainText("Test amber garden");

    const other = await loginCustomer();
    const otherResponse = await other.context.request.get("/api/custom-perfume/requests");
    expect(otherResponse.status()).toBe(200);
    const othersRequests = await otherResponse.json();
    expect(othersRequests.requests.some((item) => item.id === id)).toBe(false);

    const adminContext = await browser.newContext({ baseURL });
    contexts.push(adminContext);
    const login = await adminContext.request.post("/api/admin/login", { data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expect(login.status()).toBe(200);
    const admin = await adminContext.newPage();
    admin.on("pageerror", (error) => pageErrors.push(error.message));
    await admin.goto("/admin?section=custom-perfume");
    await expect(admin.getByRole("heading", { name: "Custom Perfume Requests" })).toBeVisible();
    await admin.getByRole("article").filter({ hasText: "Test amber garden" }).getByRole("button", { name: "Manage Request" }).click();
    await admin.locator('[name="status"]').selectOption("quoted");
    await admin.locator('[name="quotation_amount"]').fill("1800");
    await admin.locator('[name="quotation_details"]').fill("50 ml inspired fragrance profile. Shipping included. Valid for seven days.");
    await admin.locator('[name="internal_notes"]').fill("PRIVATE TEST NOTE: never visible to customers");
    await admin.getByRole("button", { name: "Save Request", exact: true }).click();
    await expect(admin.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#custom-perfume-requests")).toContainText("Quotation ready", { timeout: 20000 });
    await expect(page.locator("#custom-perfume-requests")).toContainText("1,800");
    await expect(page.locator("#custom-perfume-requests")).toContainText("requests have been updated");
    const customerData = await (await context.request.get("/api/custom-perfume/requests")).text();
    expect(customerData).not.toContain("PRIVATE TEST NOTE");
    expect(customerData).not.toContain("internal_notes");
    await page.reload();
    await expect(page.locator("#custom-perfume-requests")).toContainText("Quotation ready");

    await admin.getByLabel("Filter requests by status").selectOption("quoted");
    await expect(admin.getByRole("article").filter({ hasText: "Test amber garden" })).toBeVisible();
    await admin.reload();
    await admin.getByRole("article").filter({ hasText: "Test amber garden" }).getByRole("button", { name: "Manage Request" }).click();
    await expect(admin.locator('[name="internal_notes"]')).toHaveValue("PRIVATE TEST NOTE: never visible to customers");
    await admin.setViewportSize({ width: 390, height: 844 });
    expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await admin.screenshot({ path: testInfo.outputPath("admin-mobile.png"), fullPage: true });
    await admin.getByRole("button", { name: "Close", exact: true }).click();

    await page.locator('[name="address_line_1"]').fill("10 Test Street");
    await page.locator('[name="city"]').fill("Aligarh");
    await page.locator('[name="state"]').fill("Uttar Pradesh");
    await page.locator('[name="postal_code"]').fill("202001");
    await page.getByRole("button", { name: "Accept Quotation & Place COD Order" }).click();
    await expect(page).toHaveURL(/\/account#custom-perfume-requests$/);
    await expect(page.locator("#custom-perfume-requests")).toContainText("Order ALQ-");

    const home = await context.newPage();
    await home.goto("/");
    await expect(home.getByRole("heading", { name: "Create Your Signature Scent" })).toBeVisible();
    await home.setViewportSize({ width: 1440, height: 1000 });
    await home.getByRole("heading", { name: "Create Your Signature Scent" }).scrollIntoViewIfNeeded();
    await home.screenshot({ path: testInfo.outputPath("homepage-desktop.png") });
    await home.setViewportSize({ width: 390, height: 844 });
    await home.getByRole("heading", { name: "Create Your Signature Scent" }).scrollIntoViewIfNeeded();
    await home.screenshot({ path: testInfo.outputPath("homepage-mobile.png") });
    expect(await home.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await admin.getByLabel("Show homepage section when enabled").uncheck();
    await expect(admin.getByRole("status")).toContainText("Availability settings saved.");
    await expect(home.getByRole("heading", { name: "Create Your Signature Scent" })).toHaveCount(0, { timeout: 20000 });
    await home.reload();
    await expect(home.getByRole("heading", { name: "Create Your Signature Scent" })).toHaveCount(0);
    await other.page.reload();
    await expect(other.page.getByRole("button", { name: "Submit My Request" })).toBeVisible();

    await admin.getByLabel("Accept new custom perfume requests").uncheck();
    await expect(admin.getByRole("status")).toContainText("Availability settings saved.");
    await expect(other.page.getByRole("heading", { name: "New requests are currently paused" })).toBeVisible({ timeout: 20000 });
    await admin.reload();
    await expect(admin.getByLabel("Accept new custom perfume requests")).not.toBeChecked();
    await page.reload();
    await expect(page.locator("#custom-perfume-requests")).toContainText("Order ALQ-");
    expect(pageErrors).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
    if (originalSettings) check(await service.from("custom_perfume_settings").update(originalSettings).eq("id", true));
    for (const userId of users) {
      check(await service.from("customers").delete().eq("auth_user_id", userId));
      check(await service.auth.admin.deleteUser(userId));
    }
  }
});
