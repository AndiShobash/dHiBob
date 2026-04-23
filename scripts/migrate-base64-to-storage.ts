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

/**
 * Walk an arbitrary JSON value. For any object shaped like
 * { name, url: "data:<mime>;base64,..." }, decode the base64, upload to
 * storage, and rewrite the object to { name, key }. Returns true if
 * anything was rewritten so the caller knows to save the outer record.
 */
async function rewriteDocFields(node: any, folder: string): Promise<boolean> {
  if (!node || typeof node !== 'object') return false;
  let mutated = false;

  if (Array.isArray(node)) {
    for (const item of node) {
      if (await rewriteDocFields(item, folder)) mutated = true;
    }
    return mutated;
  }

  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === 'string' && v.startsWith('{')) {
      // Some profile fields nest document JSON as a *string* value.
      try {
        const inner = JSON.parse(v);
        if (inner && typeof inner === 'object' && inner.name && typeof inner.url === 'string' && isDataUrl(inner.url)) {
          const key = await uploadBase64(inner.url, inner.name ?? 'file', folder);
          if (key) {
            node[k] = JSON.stringify({ name: inner.name, key });
            mutated = true;
          }
          continue;
        }
      } catch { /* not JSON, fall through */ }
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (v.name && typeof v.url === 'string' && isDataUrl(v.url)) {
        const key = await uploadBase64(v.url, v.name ?? 'file', folder);
        if (key) {
          node[k] = { name: v.name, key };
          mutated = true;
        }
        continue;
      }
      if (await rewriteDocFields(v, folder)) mutated = true;
    } else if (Array.isArray(v)) {
      if (await rewriteDocFields(v, folder)) mutated = true;
    }
  }
  return mutated;
}

async function migrateEmployeeProfiles() {
  const employees = await prisma.employee.findMany({
    select: { id: true, avatar: true, personalInfo: true, workInfo: true },
  });
  console.log(`[employees] ${employees.length} rows to scan`);

  let migrated = 0;
  for (const emp of employees) {
    const updates: { avatar?: string; personalInfo?: string; workInfo?: string } = {};

    // Avatar — stored as a plain string (data URL or redirect URL).
    if (emp.avatar && isDataUrl(emp.avatar)) {
      try {
        const key = await uploadBase64(emp.avatar, 'avatar', 'avatars');
        if (key) updates.avatar = `/api/files/redirect?key=${encodeURIComponent(key)}`;
      } catch (err) {
        console.error(`[employees] ${emp.id} avatar:`, err);
      }
    }

    // personalInfo (JSON string) — scan for {name, url:data:} shapes
    for (const [field, folder] of [['personalInfo', 'profile_docs'], ['workInfo', 'profile_docs']] as const) {
      const raw = (emp as any)[field];
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        if (await rewriteDocFields(obj, folder)) {
          updates[field] = JSON.stringify(obj);
        }
      } catch (err) {
        console.error(`[employees] ${emp.id} ${field} parse:`, err);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.employee.update({ where: { id: emp.id }, data: updates });
      migrated++;
    }
  }
  console.log(`[employees] migrated=${migrated}`);
}

async function main() {
  console.log(`Using storage driver: ${process.env.STORAGE_DRIVER ?? 'local'}`);
  await migrateExpenses();
  await migrateHrPortal();
  await migrateEmployeeProfiles();
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
