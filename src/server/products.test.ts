import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeIndustry, makeSeller, makeStaff } from "../../tests/factories";
import { MAX_PHOTOS_PER_PRODUCT, PHOTO_WIDTHS } from "@/lib/product-schema";
import { db } from "./db";
import { UserFacingError } from "./errors";
import { getBoss } from "./jobs";
import { photoKey } from "./photo-files";
import { processPhoto } from "./photo-processing";
import {
  attachPhoto,
  createPhotoUpload,
  createProduct,
  deletePhoto,
  movePhoto,
  removeProduct,
  requireApprovedSeller,
  restoreProduct,
  setProductHidden,
  updateProduct,
  type SellerAccount,
} from "./products";
import { getObjectBytes, headObject } from "./storage";

let industryId: string;
let account: SellerAccount;

function productForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const values = {
    name: "Methi Khakhra 200 g",
    industryId,
    description: "Hand-roasted methi khakhra, packed in 200 g pouches, cartons of 40.",
    spec_label_0: "Pack size",
    spec_value_0: "200 g",
    spec_label_1: "",
    spec_value_1: "",
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function uploadPhoto(productId: string, bytes: Buffer, contentType = "image/jpeg") {
  const { key, uploadUrl } = await createPhotoUpload(account, productId, { fileName: "p.jpg", contentType, sizeBytes: bytes.length });
  const res = await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(bytes), headers: { "Content-Type": contentType } });
  expect(res.status).toBe(200);
  return key;
}

const jpegWithLocation = () =>
  sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#c84" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "secret-owner", Make: "PhoneMaker" } })
    .toBuffer();

async function fieldError(promise: Promise<unknown>, field: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(UserFacingError);
  expect((error as UserFacingError).fields?.[field]).toBeTruthy();
}

beforeAll(async () => {
  industryId = (await makeIndustry()).id;
  const { owner } = await makeSeller();
  account = await requireApprovedSeller(owner);
});

afterAll(async () => {
  await (await getBoss()).stop({ graceful: false });
  await db().$disconnect();
});

describe("seller products", () => {
  it("only approved sellers can manage products", async () => {
    const { owner } = await makeSeller({ status: "SUSPENDED" });
    await expect(requireApprovedSeller(owner)).rejects.toThrow(/approved sellers/);
  });

  it("creates a product with a URL slug and details, ignoring empty detail rows", async () => {
    const id = await createProduct(account, productForm());
    const product = await db().product.findUniqueOrThrow({ where: { id } });
    expect(product.slug).toMatch(/^methi-khakhra-200-g/);
    expect(product.specifications).toEqual([{ label: "Pack size", value: "200 g" }]);
  });

  it("validates on the server, including each detail row and the industry", async () => {
    await fieldError(createProduct(account, productForm({ description: "too short" })), "description");
    await fieldError(createProduct(account, productForm({ spec_label_0: "Weight", spec_value_0: "" })), "spec_value_0");
    await fieldError(createProduct(account, productForm({ industryId: (await makeIndustry(false)).id })), "industryId");
  });

  it("never lets a seller edit or hide another seller's product", async () => {
    const id = await createProduct(account, productForm());
    const { owner: other } = await makeSeller();
    const otherAccount = await requireApprovedSeller(other);
    await expect(updateProduct(otherAccount, id, productForm({ name: "Hijacked" }))).rejects.toThrow(/could not be found/);
    await expect(setProductHidden(otherAccount, id, true)).rejects.toThrow(/could not be found/);
  });

  it("keeps the slug when the name changes", async () => {
    const id = await createProduct(account, productForm());
    const before = await db().product.findUniqueOrThrow({ where: { id } });
    await updateProduct(account, id, productForm({ name: "Masala Khakhra 200 g" }));
    expect(await db().product.findUniqueOrThrow({ where: { id } })).toMatchObject({ name: "Masala Khakhra 200 g", slug: before.slug });
  });
});

describe("photos", () => {
  it("are converted to three WebP sizes without metadata, and the original is deleted", async () => {
    const productId = await createProduct(account, productForm());
    const key = await uploadPhoto(productId, await jpegWithLocation());
    await attachPhoto(account, productId, key);
    const photo = await db().productPhoto.findFirstOrThrow({ where: { productId } });
    expect(photo.status).toBe("PROCESSING");

    expect(await processPhoto(photo.id)).toBe("ready");
    expect(await processPhoto(photo.id)).toBe("skipped"); // a retried job does nothing
    const done = await db().productPhoto.findUniqueOrThrow({ where: { id: photo.id } });
    expect(done).toMatchObject({ status: "READY", uploadKey: null, width: 1600, height: 1200 });
    expect(await headObject(key)).toBeNull();

    for (const width of PHOTO_WIDTHS) {
      const meta = await sharp(Buffer.from(await getObjectBytes(photoKey(productId, photo.id, width)))).metadata();
      expect(meta).toMatchObject({ format: "webp", width });
      expect(meta.exif).toBeUndefined();
    }
  });

  it("refuses a file that is not really an image, and marks an unreadable image FAILED", async () => {
    const productId = await createProduct(account, productForm());
    const fake = await uploadPhoto(productId, Buffer.from("<html>not an image at all</html>"));
    await expect(attachPhoto(account, productId, fake)).rejects.toThrow(/not a real JPG/);

    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]); // JPEG header, garbage body
    await attachPhoto(account, productId, await uploadPhoto(productId, broken));
    const photo = await db().productPhoto.findFirstOrThrow({ where: { productId } });
    expect(await processPhoto(photo.id)).toBe("failed");
    expect((await db().productPhoto.findUniqueOrThrow({ where: { id: photo.id } })).status).toBe("FAILED");
  });

  it(`stops at ${MAX_PHOTOS_PER_PRODUCT} photos per product`, async () => {
    const productId = await createProduct(account, productForm());
    await db().productPhoto.createMany({
      data: Array.from({ length: MAX_PHOTOS_PER_PRODUCT }, (_, i) => ({ productId, status: "READY" as const, sortOrder: i })),
    });
    await expect(createPhotoUpload(account, productId, { fileName: "p.jpg", contentType: "image/jpeg", sizeBytes: 100 })).rejects.toThrow(/up to 50 photos/);
  });

  it("refuses photos over 10 MB or of other types before issuing an upload URL", async () => {
    const productId = await createProduct(account, productForm());
    await expect(createPhotoUpload(account, productId, { fileName: "p.jpg", contentType: "image/jpeg", sizeBytes: 11 * 1024 * 1024 })).rejects.toThrow(/10 MB/);
    await expect(createPhotoUpload(account, productId, { fileName: "p.gif", contentType: "image/gif", sizeBytes: 100 })).rejects.toThrow(/JPG, PNG or WebP/);
  });

  it("reorders and deletes photos (files included)", async () => {
    const productId = await createProduct(account, productForm());
    const image = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#123" } }).png().toBuffer();
    for (let i = 0; i < 2; i++) await attachPhoto(account, productId, await uploadPhoto(productId, image, "image/png"));
    const [a, b] = await db().productPhoto.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } });
    await movePhoto(account, b!.id, "up");
    const order = (await db().productPhoto.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } })).map((p) => p.id);
    expect(order).toEqual([b!.id, a!.id]);

    await processPhoto(a!.id);
    await deletePhoto(account, a!.id);
    expect(await db().productPhoto.count({ where: { id: a!.id } })).toBe(0);
    expect(await headObject(photoKey(productId, a!.id, 800))).toBeNull();
  });
});

describe("staff removal", () => {
  it("removes and restores a listing with an audit trail, and a removed listing cannot be edited by its seller", async () => {
    const admin = await makeStaff();
    const id = await createProduct(account, productForm());
    await expect(removeProduct({ productId: id, reason: "" }, admin)).rejects.toThrow(/reason/);
    await removeProduct({ productId: id, reason: "Misleading photos" }, admin);
    await expect(updateProduct(account, id, productForm())).rejects.toThrow(/removed by the Harsol27 team/);
    await expect(removeProduct({ productId: id, reason: "again" }, admin)).rejects.toThrow(/already removed/);
    await restoreProduct(id, admin);
    const log = await db().auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } });
    expect(log.map((l) => [l.action, l.actorId])).toEqual([
      ["PRODUCT_REMOVED", admin.id],
      ["PRODUCT_RESTORED", admin.id],
    ]);
  });
});
