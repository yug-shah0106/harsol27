import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SELLER_DOCUMENT_KINDS } from "@/lib/seller-schema";
import type { Member, MemberWithPhone } from "./authz";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss, QUEUES } from "./jobs";
import { purgeUnclaimedUploads } from "./retention";
import { createDocumentUpload, decideSeller, submitApplication } from "./sellers";
import type { StaffUser } from "./staff-policy";
import { headObject } from "./storage";

const run = crypto.randomUUID().slice(0, 8);
const PDF = new TextEncoder().encode("%PDF-1.4\n% test document\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
let admin: StaffUser;

async function newMember(): Promise<MemberWithPhone> {
  const phone = `+9197${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const email = `seller-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const user = await db().user.create({ data: { name: "Seller Test", email, mobile: phone } });
  return { id: user.id, email, phone };
}

/** The browser's two steps: ask for an upload URL, then PUT the bytes straight to storage. */
async function upload(member: Member, kind: string, bytes: Uint8Array = PDF, contentType = "application/pdf"): Promise<string> {
  const { key, uploadUrl } = await createDocumentUpload(member, { kind, fileName: `${kind}.pdf`, contentType, sizeBytes: bytes.length });
  const response = await fetch(uploadUrl, { method: "PUT", body: Buffer.from(bytes), headers: { "Content-Type": contentType } });
  expect(response.status).toBe(200);
  return key;
}

async function applicationForm(member: Member, docs: Partial<Record<string, string>>, overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const fields = {
    companyName: `Patel Khakhra ${run}`,
    contactName: "Asha Patel",
    contactPhone: "98250 12345",
    contactEmail: "Sales@PatelKhakhra.example",
    address: "12 Market Road",
    city: "Rajkot",
    state: "Gujarat",
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const [kind, key] of Object.entries(docs)) if (key) fd.set(`doc_${kind}`, key);
  return fd;
}

async function allDocs(member: Member) {
  return Object.fromEntries(await Promise.all(SELLER_DOCUMENT_KINDS.map(async (k) => [k, await upload(member, k)] as const)));
}

async function fieldError(promise: Promise<unknown>, field: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UserFacingError);
  expect((error as UserFacingError).fields?.[field]).toBeTruthy();
}

beforeAll(async () => {
  const user = await db().user.create({ data: { name: "Seller Admin", email: `seller-admin-${run}@example.test`, role: "ADMIN" } });
  admin = { id: user.id, name: user.name, email: user.email, role: "ADMIN" };
});

afterAll(async () => {
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("seller application", () => {
  it("creates a pending seller with all four documents, a history entry and a team alert", async () => {
    const member = await newMember();
    await submitApplication(member, await applicationForm(member, await allDocs(member)));

    const seller = await db().seller.findUniqueOrThrow({
      where: { userId: member.id },
      include: { documents: true, statusChanges: true },
      omit: { contactPhone: false, contactEmail: false }, // tests may read contact details directly
    });
    expect(seller).toMatchObject({ status: "PENDING", contactPhone: "+919825012345", contactEmail: "sales@patelkhakhra.example", slug: `patel-khakhra-${run}` });
    expect(seller.documents.map((d) => d.kind).sort()).toEqual([...SELLER_DOCUMENT_KINDS].sort());
    expect(seller.statusChanges).toEqual([expect.objectContaining({ fromStatus: null, toStatus: "PENDING", actorId: member.id })]);
    const jobs = await db().$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM pgboss.job WHERE name = ${QUEUES.sellerApplicationAlert} AND data->>'changeId' = ${seller.statusChanges[0]!.id}`;
    expect(jobs[0]?.n).toBe(1);
  });

  it("accepts a first application without the optional GST certificate", async () => {
    const member = await newMember();
    const docs = await allDocs(member);
    delete docs.GST_CERTIFICATE;
    await submitApplication(member, await applicationForm(member, docs));
    const seller = await db().seller.findUniqueOrThrow({ where: { userId: member.id }, include: { documents: true } });
    expect(seller.documents.map((d) => d.kind).sort()).toEqual(["ADDRESS_PROOF", "BUSINESS_REGISTRATION", "PAN_CARD"]);
  });

  it("requires every other document on a first application", async () => {
    const member = await newMember();
    const docs = await allDocs(member);
    delete docs.PAN_CARD;
    await fieldError(submitApplication(member, await applicationForm(member, docs)), "doc_PAN_CARD");
  });

  it("refuses a file whose bytes are not what it claims to be", async () => {
    const member = await newMember();
    const docs = await allDocs(member);
    docs.GST_CERTIFICATE = await upload(member, "GST_CERTIFICATE", new TextEncoder().encode("MZ fake executable"), "application/pdf");
    await fieldError(submitApplication(member, await applicationForm(member, docs)), "doc_GST_CERTIFICATE");
  });

  it("refuses an upload that was never actually sent to storage", async () => {
    const member = await newMember();
    const docs = await allDocs(member);
    docs.ADDRESS_PROOF = (await createDocumentUpload(member, { kind: "ADDRESS_PROOF", fileName: "x.pdf", contentType: "application/pdf", sizeBytes: 100 })).key;
    await fieldError(submitApplication(member, await applicationForm(member, docs)), "doc_ADDRESS_PROOF");
  });

  it("refuses someone else's upload", async () => {
    const owner = await newMember();
    const thief = await newMember();
    const docs = await allDocs(thief);
    docs.PAN_CARD = await upload(owner, "PAN_CARD");
    await fieldError(submitApplication(thief, await applicationForm(thief, docs)), "doc_PAN_CARD");
  });

  it("refuses unsupported types and oversized files before issuing an upload URL", async () => {
    const member = await newMember();
    await expect(createDocumentUpload(member, { kind: "PAN_CARD", fileName: "a.exe", contentType: "application/x-msdownload", sizeBytes: 10 })).rejects.toThrow(/PDF, JPG or PNG/);
    await expect(createDocumentUpload(member, { kind: "PAN_CARD", fileName: "a.pdf", contentType: "application/pdf", sizeBytes: 6 * 1024 * 1024 })).rejects.toThrow(/5 MB/);
  });

  it("validates company details on the server", async () => {
    const member = await newMember();
    await fieldError(submitApplication(member, await applicationForm(member, await allDocs(member), { state: "Atlantis" })), "state");
    await fieldError(submitApplication(member, await applicationForm(member, await allDocs(member), { contactEmail: "nope" })), "contactEmail");
  });

  it("does not let a seller apply twice", async () => {
    const member = await newMember();
    await submitApplication(member, await applicationForm(member, await allDocs(member)));
    await expect(submitApplication(member, await applicationForm(member, await allDocs(member)))).rejects.toThrow(/already applied/);
  });
});

describe("staff decisions and resubmission", () => {
  it("walks the full path: reject with reason → resubmit replacing one document → approve → suspend → reinstate", async () => {
    const member = await newMember();
    await submitApplication(member, await applicationForm(member, await allDocs(member)));
    const { id: sellerId } = await db().seller.findUniqueOrThrow({ where: { userId: member.id } });

    await fieldError(decideSeller({ sellerId, decision: "reject" }, admin), "reason");
    await decideSeller({ sellerId, decision: "reject", reason: "PAN card is unreadable" }, admin);

    const oldPan = await db().sellerDocument.findFirstOrThrow({ where: { sellerId, kind: "PAN_CARD" } });
    const keptGst = await db().sellerDocument.findFirstOrThrow({ where: { sellerId, kind: "GST_CERTIFICATE" } });
    const newPan = await upload(member, "PAN_CARD", PNG, "image/png");
    await submitApplication(member, await applicationForm(member, { PAN_CARD: newPan }, { city: "Ahmedabad" }));

    const after = await db().seller.findUniqueOrThrow({ where: { id: sellerId }, include: { documents: true } });
    expect(after).toMatchObject({ status: "PENDING", city: "Ahmedabad" });
    expect(after.documents.find((d) => d.kind === "PAN_CARD")).toMatchObject({ storageKey: newPan, contentType: "image/png" });
    expect(after.documents.find((d) => d.kind === "GST_CERTIFICATE")?.storageKey).toBe(keptGst.storageKey);
    expect(await headObject(oldPan.storageKey)).toBeNull(); // replaced file removed from storage

    await decideSeller({ sellerId, decision: "approve" }, admin);
    await decideSeller({ sellerId, decision: "suspend", reason: "Complaints from buyers" }, admin);
    await decideSeller({ sellerId, decision: "reinstate" }, admin);

    const history = await db().sellerStatusChange.findMany({ where: { sellerId }, orderBy: { createdAt: "asc" } });
    expect(history.map((h) => [h.fromStatus, h.toStatus, h.actorId === admin.id ? "staff" : "seller", h.reason])).toEqual([
      [null, "PENDING", "seller", null],
      ["PENDING", "REJECTED", "staff", "PAN card is unreadable"],
      ["REJECTED", "PENDING", "seller", null],
      ["PENDING", "APPROVED", "staff", null],
      ["APPROVED", "SUSPENDED", "staff", "Complaints from buyers"],
      ["SUSPENDED", "APPROVED", "staff", null],
    ]);
  });

  it("refuses decisions that do not fit the current status", async () => {
    const member = await newMember();
    await submitApplication(member, await applicationForm(member, await allDocs(member)));
    const { id: sellerId } = await db().seller.findUniqueOrThrow({ where: { userId: member.id } });
    await expect(decideSeller({ sellerId, decision: "suspend", reason: "x" }, admin)).rejects.toThrow(/cannot be given/);
    await expect(decideSeller({ sellerId, decision: "reinstate" }, admin)).rejects.toThrow(/cannot be given/);
    await expect(decideSeller({ sellerId, decision: "delete" }, admin)).rejects.toThrow();
  });

  it("applies only one of two simultaneous approvals", async () => {
    const member = await newMember();
    await submitApplication(member, await applicationForm(member, await allDocs(member)));
    const { id: sellerId } = await db().seller.findUniqueOrThrow({ where: { userId: member.id } });
    const results = await Promise.allSettled([decideSeller({ sellerId, decision: "approve" }, admin), decideSeller({ sellerId, decision: "approve" }, admin)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db().sellerStatusChange.count({ where: { sellerId, toStatus: "APPROVED" } })).toBe(1);
  });
});

describe("unclaimed uploads", () => {
  it("are deleted from storage and the database after a day", async () => {
    const member = await newMember();
    const key = await upload(member, "PAN_CARD");
    await db().upload.update({ where: { key }, data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) } });
    expect(await purgeUnclaimedUploads()).toBeGreaterThanOrEqual(1);
    expect(await headObject(key)).toBeNull();
    expect(await db().upload.findUnique({ where: { key } })).toBeNull();
  });
});
