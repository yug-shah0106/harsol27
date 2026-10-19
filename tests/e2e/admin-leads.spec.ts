import { expect, test, type Page } from "@playwright/test";
import { choose, expectAccessible, fillLeadForm, newPage, unique } from "./helpers";
import { signInAs, STAFF, uniqueIp } from "./staff";

async function submitLead(page: Page, name: string, email: string) {
  await page.goto("/?utm_source=newsletter&utm_campaign=diwali&ignored=1"); // arrives by a campaign link
  await page.waitForFunction(() => sessionStorage.getItem("harsol27.utm"));
  await page.goto("/Seller-Registration");
  await fillLeadForm(page, { name, phone: "98250 54321", email, category: "Trading", industry: "Ceramics & Tiles" });
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("status")).toContainText("We have received your details");
}

test("admin finds a new lead, sees staff-only details, and changes its status with history", async ({ browser }) => {
  const ip = uniqueIp();
  const name = `Lead Admin Journey ${unique()}`;
  const visitor = await newPage(browser, ip); // the IP header goes to the app only: storage's CORS rule refuses it
  await submitLead(visitor, name, `journey.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.admin);
  await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Leads" }).click();

  await page.getByLabel("Search name, email or phone").fill(name);
  await choose(page, "Status", "New");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=NEW/);
  await expect(page.getByText("1 lead")).toBeVisible();
  await expectAccessible(page);

  // The approval pill: Pending, then Approved, Rejected and back to Pending, straight from the list. The pill
  // shows a choice at once; each step waits for the save itself before reloading to check it stuck.
  const approval = page.getByRole("row", { name: new RegExp(name) }).getByRole("combobox", { name: new RegExp(`^Approval for ${name}`) });
  await expect(approval).toHaveText("Pending");
  const row = page.getByRole("row", { name: new RegExp(name) });
  for (const choice of ["Approved", "Rejected", "Pending"]) {
    await approval.click();
    await expect(page.getByRole("listbox").getByRole("option")).toHaveText(["Pending", "Approved", "Rejected"]);
    const saved = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers());
    await page.getByRole("option", { name: choice }).click();
    await saved;
    await expect(approval).toHaveText(choice);
    await page.reload();
    await expect(approval).toHaveText(choice);
    // Approved: the subscription's end date in the list (15 months from today); otherwise none.
    if (choice === "Approved") await expect(row.getByText(/^Till \d{1,2} \w{3} \d{4}$/)).toBeVisible();
    else await expect(row.getByText("None", { exact: true })).toBeVisible();
  }

  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(/^15 months: \d{1,2} \w{3} \d{4} to \d{1,2} \w{3} \d{4}, once approved$/)).toBeVisible(); // pending again
  await expect(page.getByText(ip)).toBeVisible(); // source IP is shown to staff
  await expect(page.getByText("source: newsletter · campaign: diwali")).toBeVisible(); // the campaign it came from
  await expect(page.getByText("Ceramics & Tiles")).toBeVisible();
  // The payment screenshot opens through a short-lived storage link, for staff only.
  const proof = await page.request.get(await page.getByRole("link", { name: "View the screenshot" }).getAttribute("href") ?? "", { maxRedirects: 0 });
  expect(proof.status()).toBe(302);
  expect(proof.headers().location).toContain("lead-payments/");

  await choose(page, "New status", "Contacted");
  await page.getByLabel("Note (optional)").fill("Spoke on the phone");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(page.getByRole("status")).toContainText("Status updated.");

  const history = page.getByRole("region", { name: "Status history" });
  await expect(history.getByText("New → Contacted")).toBeVisible();
  await expect(history.getByText("Approval: Pending → Approved")).toBeVisible();
  await expect(history.getByText("Approval: Approved → Rejected")).toBeVisible();
  await expect(history.getByText("Approval: Rejected → Pending")).toBeVisible();
  await expect(history.getByText(`by ${STAFF.admin.name}`)).toHaveCount(4); // three approval changes, one status change
  await expect(history.getByText("Spoke on the phone")).toBeVisible();
  await expectAccessible(page);
});

test("a viewer can read leads but gets no controls to change them", async ({ browser }) => {
  const name = `Lead Viewer Journey ${unique()}`;
  const visitor = await newPage(browser);
  await submitLead(visitor, name, `viewer.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.viewer);
  await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("row", { name: new RegExp(name) }).getByText("Pending")).toBeVisible(); // the decision, read only
  await expect(page.getByRole("combobox", { name: /^Approval for/ })).toHaveCount(0);
  await page.getByRole("link", { name }).click();
  await expect(page.getByText("You have view-only access.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save status" })).toHaveCount(0);
});

test("the overview shows seller registrations by approval, and its cards open the filtered list", async ({ browser }) => {
  const visitor = await newPage(browser);
  await submitLead(visitor, `Lead Overview ${unique()}`, `overview.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.admin);
  for (const heading of ["Seller registrations", "Registrations, last 14 days", "Waiting for approval", "Top native places", "By category", "Marketplace"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByRole("img", { name: /^Registrations per day:/ })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: /^Pending/ }).click();
  await expect(page).toHaveURL(/\/admin\/leads\?decision=PENDING$/);
  await expect(page.getByRole("combobox", { name: "Approval", exact: true })).toHaveText("Pending");
  await expect(page.getByRole("row").nth(1).getByRole("combobox", { name: /^Approval for/ })).toHaveText("Pending");
});

test("an approved registration gets a login from the team; the seller signs in with it until it is rejected", async ({ browser }) => {
  test.setTimeout(90_000); // deliberately slow password hashes (argon2id)
  const name = `Lead Login ${unique()}`;
  const visitor = await newPage(browser);
  await submitLead(visitor, name, `login.${unique()}@example.test`);
  await visitor.close();

  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } })).newPage();
  await signInAs(page, STAFF.admin);
  await page.goto(`/admin/leads?q=${encodeURIComponent(name)}`);
  const approval = page.getByRole("combobox", { name: /^Approval for/ });
  await page.getByRole("link", { name }).click();
  const login = page.getByRole("region", { name: "Seller login" });
  await expect(login).toContainText("A login can be made once the registration is approved.");

  // Approve, then make the login: the username is suggested from the name; the password is shown once.
  await approval.click();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers());
  await page.getByRole("option", { name: "Approved" }).click();
  await saved;
  await page.reload();
  const username = `${name.split(" ")[2]!.toLowerCase()}`; // the unique part, so no other test has it
  await login.getByLabel("Username").fill(username);
  await login.getByRole("button", { name: "Create login" }).click();
  await expect(login).toContainText("Login made. Send these to");
  const password = (await login.locator("dd").nth(1).innerText()).trim();
  expect(password).toMatch(/^[a-zA-Z2-9]{12}$/);
  await expect(login.getByRole("button", { name: "Copy username and password" })).toBeVisible();
  await expectAccessible(page);
  await page.reload();
  await expect(login).toContainText(`Username ${username}`); // the password is never shown again
  await expect(login).not.toContainText(password);

  // The seller signs in with it, and sees their registration.
  const seller = await newPage(browser);
  await seller.goto("/sign-in");
  await seller.getByLabel("Username").fill(username);
  await seller.getByLabel("Password", { exact: true }).fill(password);
  await seller.getByRole("button", { name: "Sign in" }).click();
  await expect(seller).toHaveURL(/\/account$/, { timeout: 20_000 });
  const registration = seller.getByRole("region", { name: "Your seller registration" });
  await expect(registration).toContainText("Approved");
  await expect(registration).toContainText(/15 months, \d{1,2} \w{3} \d{4} to \d{1,2} \w{3} \d{4}/);

  // Rejected: the login stops working at once, even for the open session.
  await approval.click();
  const rejected = page.waitForResponse((r) => r.request().method() === "POST" && "next-action" in r.request().headers());
  await page.getByRole("option", { name: "Rejected" }).click();
  await rejected;
  await seller.goto("/account");
  await expect(seller).toHaveURL(/\/sign-in\?next=%2Faccount$/);
  await seller.getByLabel("Username").fill(username);
  await seller.getByLabel("Password", { exact: true }).fill(password);
  await seller.getByRole("button", { name: "Sign in" }).click();
  await expect(seller.getByRole("main").getByRole("alert")).toContainText("Username or password is incorrect", { timeout: 20_000 });
});

test("lead pages are staff-only", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/staff\/sign-in$/);
});
