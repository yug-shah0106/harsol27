import { expect, test } from "@playwright/test";
import { expectAccessible, newPage, unique, watchCsp } from "./helpers";
import { completeSignIn, PDF_FILE, PNG_FILE, randomMobile } from "./member";
import { signInAs, STAFF } from "./staff";

const DOCUMENTS = [
  ["GST certificate", "gst.pdf"],
  ["PAN card", "pan.pdf"],
  ["Udyam or business registration certificate", "udyam.pdf"],
  ["Address proof (for example an electricity bill)", "bill.pdf"],
] as const;

test("seller journey: apply with documents → rejected with reason → resubmit → approved", async ({ browser }) => {
  test.setTimeout(90_000); // two people, four uploads, three accessibility checks
  // ── The seller applies ──
  const seller = await newPage(browser);
  const csp = watchCsp(seller);
  const company = `E2E Khakhra House ${unique()}`;
  await seller.goto("/sign-in?next=/seller/companyverification");
  await completeSignIn(seller, randomMobile());
  await expect(seller).toHaveURL(/\/seller\/companyverification$/);

  // Submitting empty shows every problem as text, and focuses the first one.
  await seller.getByRole("button", { name: "Submit application" }).click();
  await expect(seller.getByLabel("Company name")).toBeFocused();
  await expect(seller.getByText("Enter your company name.")).toBeVisible();
  await expect(seller.getByText(/^Upload your /)).toHaveCount(0); // every document is optional (client, 2026-10-15)
  await expect(seller.getByLabel("PAN card (optional)")).toBeVisible();

  await seller.getByLabel("Company name").fill(company);
  await seller.getByLabel("Contact person").fill("Asha Patel");
  await seller.getByLabel("Contact email").fill("asha@example.test");
  await seller.getByLabel("Business address").fill("12 Market Road");
  await seller.getByLabel("City", { exact: true }).fill("Rajkot");
  for (const [label, file] of DOCUMENTS) {
    await seller.getByLabel(label).setInputFiles(PDF_FILE(file));
    await expect(seller.getByText(`Uploaded: ${file}`)).toBeVisible();
  }
  await expectAccessible(seller);
  await seller.getByRole("button", { name: "Submit application" }).click();
  await expect(seller).toHaveURL(/\/seller\/companyverification$/);
  await expect(seller.getByText("Our team is reviewing your details")).toBeVisible();
  expect(csp).toEqual([]); // direct-to-storage uploads are allowed by the CSP

  // ── An admin reviews, opens a document, and rejects with a reason ──
  const admin = await newPage(browser);
  await signInAs(admin, STAFF.admin);
  await admin.goto("/admin/sellers?status=PENDING");
  await admin.getByRole("link", { name: company }).click();
  await expect(admin.getByRole("heading", { level: 1, name: company })).toBeVisible();
  await expectAccessible(admin);

  const docHref = await admin.getByRole("link", { name: /Open PAN card/ }).getAttribute("href");
  const doc = await admin.request.get(docHref!); // staff route → 60-second signed storage link
  expect(doc.status()).toBe(200);
  expect((await doc.body()).toString()).toContain("pan.pdf");

  await admin.getByRole("button", { name: "Reject" }).click();
  await admin.getByRole("dialog", { name: "Reject this application?" }).getByRole("button", { name: "Reject" }).click();
  await expect(admin.getByRole("region", { name: "Decision" }).getByRole("alert")).toContainText("Please give a reason.");
  await admin.getByLabel(/^Reason/).fill("The PAN card is not readable. Please upload a clearer copy.");
  await admin.getByRole("button", { name: "Reject" }).click();
  await admin.getByRole("dialog", { name: "Reject this application?" }).getByRole("button", { name: "Reject" }).click();
  await expect(admin.getByRole("status")).toContainText("Decision saved.");
  await expect(admin.getByText("Pending review → Not approved")).toBeVisible();

  // ── The seller sees the reason on the dashboard, replaces one document and applies again ──
  await seller.goto("/seller/dashboard");
  await expect(seller.getByText("Reason: The PAN card is not readable.")).toBeVisible();
  await expect(seller.getByRole("navigation", { name: "Seller" }).getByRole("link", { name: "Inquiries" })).toHaveCount(0); // not verified yet
  await expect(seller.getByText("Product listing opens once our team has approved your company verification.")).toBeVisible();
  await seller.getByRole("link", { name: "Edit and apply again" }).click();
  await expect(seller).toHaveURL(/\/seller\/companyverification$/);
  await expect(seller.getByText("Current file: pan.pdf")).toBeVisible();
  await seller.getByLabel("PAN card").setInputFiles(PNG_FILE("pan-clear.png"));
  await expect(seller.getByText("Uploaded: pan-clear.png")).toBeVisible();
  await seller.getByRole("button", { name: "Submit again" }).click();
  await expect(seller.getByText("Our team is reviewing your details")).toBeVisible();
  await expect(seller.getByText("pan-clear.png")).toBeVisible();

  // ── Approved ──
  await admin.reload();
  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Pending review → Approved")).toBeVisible();
  await expect(admin.getByText("by the seller").first()).toBeVisible();
  await expect(admin.getByText(`by ${STAFF.admin.name}`).first()).toBeVisible();

  await seller.reload();
  await expect(seller.getByText("Your seller account is approved.")).toBeVisible();

  // ── The dashboard: products open now, and the profile is edited without a new review ──
  await seller.goto("/seller/dashboard");
  await expect(seller.getByRole("navigation", { name: "Seller" }).getByRole("link", { name: "Inquiries" })).toBeVisible();
  await expect(seller.getByRole("region", { name: "At a glance" })).toBeVisible();
  await seller.getByLabel("City", { exact: true }).fill("Surat");
  await seller.getByRole("button", { name: "Save profile" }).click();
  await expect(seller.getByText("Saved.")).toBeVisible();
  await expectAccessible(seller);
  await seller.reload();
  await expect(seller.getByLabel("City", { exact: true })).toHaveValue("Surat");
  await expect(seller.getByText("Your seller account is approved.")).toBeVisible();
});

test("a viewer can review sellers but cannot decide; members cannot reach the admin area", async ({ browser }) => {
  const member = await newPage(browser);
  await member.goto("/sign-in?next=/account");
  await completeSignIn(member, randomMobile());
  await expect(member).toHaveURL(/\/account$/);
  await expectAccessible(member);
  await member.goto("/admin/sellers");
  await expect(member).toHaveURL(/\/staff\/sign-in$/);

  const viewer = await newPage(browser);
  await signInAs(viewer, STAFF.viewer);
  await viewer.goto("/admin/sellers");
  const first = viewer.getByRole("table").getByRole("link").first();
  if (await first.count()) {
    await first.click();
    await expect(viewer.getByText("You have view-only access.")).toBeVisible();
    await expect(viewer.getByRole("button", { name: /Approve|Reject|Suspend|Reinstate/ })).toHaveCount(0);
  }
});

test("seller documents are never reachable without a staff session", async ({ request }) => {
  const res = await request.get(`/api/admin/documents/${crypto.randomUUID()}`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain("/staff/sign-in");
});
