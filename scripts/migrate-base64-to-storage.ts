/**
 * One-shot migration: decode legacy base64 blobs from Postgres and hand
 * them to the active storage provider (S3 in prod, local disk in dev).
 *
 * Idempotent — run it as many times as you want. It only touches rows
 * where the legacy column is set AND the new key column is still null.
 *
 * Usage:
 *   # Local (writes to ./uploads/):
 *   npx tsx scripts/migrate-base64-to-storage.ts
 *
 *   # Production (EC2, inside the app container):
 *   docker compose -f docker-compose.prod.yml run --rm app \
 *     npx tsx scripts/migrate-base64-to-storage.ts
 */
import { PrismaClient } from '@prisma/client';
import { storage, isDataUrl } from '../src/lib/storage';

const prisma = new PrismaClient();

async function uploadBase64(value: string, fileName: string, folder: string): Promise<string | null> {
  // Strip optional data:<mime>;base64, prefix. Legacy rows sometimes stored
  // raw base64 with no header, sometimes a full data URL.
  let payload = value;
  if (isDataUrl(value)) {
    const comma = value.indexOf(',');
    if (comma < 0) return null;
    payload = value.slice(comma + 1);
  }
  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length === 0) return null;
  return storage.uploadFile(buffer, fileName || 'file', folder);
}

async function migrateExpenses() {
  const rows = await prisma.expenseClaim.findMany({
    where: { invoiceFile: { not: null }, invoiceFileKey: null },
    select: { id: true, invoiceFile: true, invoiceFileName: true },
  });
  console.log(`[expenses] ${rows.length} rows to migrate`);

  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const key = await uploadBase64(row.invoiceFile!, row.invoiceFileName ?? 'invoice', 'expense_invoices');
      if (!key) { skipped++; continue; }
      await prisma.expenseClaim.update({
        where: { id: row.id },
        data: { invoiceFileKey: key, invoiceFile: null },
      });
      migrated++;
    } catch (err) {
      console.error(`[expenses] ${row.id} failed:`, err);
    }
  }
  console.log(`[expenses] migrated=${migrated} skipped=${skipped}`);
}

async function migrateHrPortal() {
  const rows = await prisma.hrPortalItem.findMany({
    where: { fileData: { not: null }, fileKey: null },
    select: { id: true, fileData: true, fileName: true },
  });
  console.log(`[hr-portal] ${rows.length} rows to migrate`);

  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const key = await uploadBase64(row.fileData!, row.fileName ?? 'file', 'hr_portal');
      if (!key) { skipped++; continue; }
      await prisma.hrPortalItem.update({
        where: { id: row.id },
        data: { fileKey: key, fileData: null },
      });
      migrated++;
    } catch (err) {
      console.error(`[hr-portal] ${row.id} failed:`, err);
    }
  }
  console.log(`[hr-portal] migrated=${migrated} skipped=${skipped}`);
}

async function main() {
  console.log(`Using storage driver: ${process.env.STORAGE_DRIVER ?? 'local'}`);
  await migrateExpenses();
  await migrateHrPortal();
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
