import { expect, test } from "@playwright/test";
import { formatDay, fromDateInput, toDateInput } from "../../src/lib/subscription";
import { indiaToday } from "../../src/server/visibility";
import { expectAccessible, newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, makeApprovedSeller, randomMobile } from "./member";
import { signInAs, STAFF } from "./staff";

test("subscriptions: an admin records a payment and the seller sees it; a viewer cannot record", async ({ browser }) => {
  const company = `Desai Brass ${unique()}`;

  // ── An approved seller with no payment yet ──
  const seller = await newPage(browser);
  const mobile = randomMobile();
  await seller.goto("/sign-in?next=/seller");
  await completeSignIn(seller, mobile);
  await makeApprovedSeller(mobile.e164, company, null);
  await seller.goto("/seller/subscription");
  await expect(seller.getByText("Not active yet.")).toBeVisible();

  // ── Admin: find them under "No payment yet" and record a year ──
  const admin = await newPage(browser);
  const csp = watchCsp(admin);
  await signInAs(admin, STAFF.admin);
  await admin.getByRole("link", { name: "Subscriptions", exact: true }).click();
  await admin.getByRole("link", { name: /^No payment yet/ }).click();
  await expect(admin).toHaveURL(/view=unpaid/); // the tab has loaded, so its search form is the one we fill
  await admin.getByLabel("Search company").fill(company);
  await admin.getByRole("button", { name: "Search" }).click();
  await expectAccessible(admin);
  await admin.getByRole("link", { name: company }).click();

  const suggested = await admin.getByLabel("New paid-until date").inputValue();
  expect(suggested).toBe(toDateInput(new Date(Date.UTC(indiaToday().getUTCFullYear() + 1, indiaToday().getUTCMonth(), indiaToday().getUTCDate() - 1))));
  const until = formatDay(fromDateInput(suggested));

  // A mistake is shown on its field and nothing typed is lost.
  await admin.getByLabel("Amount paid, ₹ (optional)").fill("two thousand");
  await admin.getByLabel("Receipt or UPI reference (optional)").fill("UPI 998877");
  await admin.getByRole("button", { name: "Record payment" }).click();
  await expect(admin.getByText("Enter the amount in rupees, for example 2000 or 2000.50.")).toBeVisible();
  await expect(admin.getByLabel("Receipt or UPI reference (optional)")).toHaveValue("UPI 998877");

  await admin.getByLabel("Amount paid, ₹ (optional)").fill("2000");
  await admin.getByRole("button", { name: "Record payment" }).click();
  await expect(admin.getByText(`Payment recorded. Paid until ${until}.`)).toBeVisible();
  const history = admin.getByRole("list", { name: "Payment history" });
  await expect(history).toContainText(`Paid until (none) → ${until}`);
  await expect(history).toContainText("₹2,000 · ref. UPI 998877");
  await expect(history).toContainText(`by ${STAFF.admin.name}`);
  await expect(admin.getByLabel("New paid-until date")).not.toHaveValue(suggested); // now suggests the following year

  // Moving the date earlier needs a reason (checked on the server).
  await admin.getByLabel("New paid-until date").fill(toDateInput(indiaToday()));
  await admin.getByRole("button", { name: "Record payment" }).click();
  await expect(admin.getByText(/The new date is earlier than the current one/)).toBeVisible();
  await expectAccessible(admin);
  expect(csp).toEqual([]);

  // ── The seller sees the new date and the payment, but not internal notes ──
  await seller.reload();
  await expect(seller.getByText(`Active until ${until}`)).toBeVisible();
  const row = seller.getByRole("row").filter({ hasText: "UPI 998877" });
  await expect(row).toContainText("₹2,000");
  await expect(row).toContainText(until);
  await expectAccessible(seller);

  // ── A viewer sees the subscription but cannot record ──
  const viewer = await newPage(browser);
  await signInAs(viewer, STAFF.viewer);
  await viewer.goto(admin.url());
  await expect(viewer.getByRole("list", { name: "Payment history" })).toContainText(until);
  await expect(viewer.getByRole("button", { name: "Record payment" })).toHaveCount(0);
});
