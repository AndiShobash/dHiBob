import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
const db = {
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  notificationPreference: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ prisma: db }));

// Import router
import { notificationsRouter } from '@/server/routers/notifications';

function makeCtx(overrides: Partial<{ employeeId: string; companyId: string; role: string }> = {}) {
  return {
    session: {
      user: {
        id: 'user-1',
        employeeId: overrides.employeeId ?? 'emp-1',
        companyId: overrides.companyId ?? 'co-1',
        role: overrides.role ?? 'ADMIN',
        email: 'admin@acme.tech',
      },
    },
    db,
    user: {
      id: 'user-1',
      employeeId: overrides.employeeId ?? 'emp-1',
      companyId: overrides.companyId ?? 'co-1',
      role: overrides.role ?? 'ADMIN',
      email: 'admin@acme.tech',
    },
  };
}

const caller = notificationsRouter.createCaller as any;

describe('notifications router — preferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPreferences returns preferences for current user', async () => {
    const prefs = [
      { id: 'p1', employeeId: 'emp-1', eventType: 'TIMEOFF_REQUEST', inApp: true, email: false, slack: true },
    ];
    db.notificationPreference.findMany.mockResolvedValue(prefs);

    const router = notificationsRouter.createCaller(makeCtx());
    const result = await router.getPreferences();

    expect(result).toEqual(prefs);
    expect(db.notificationPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-1' } }),
    );
  });

  it('upsertPreference creates/updates a preference row', async () => {
    const pref = { id: 'p1', employeeId: 'emp-1', eventType: 'TIMEOFF_REQUEST', inApp: true, email: false, slack: true };
    db.notificationPreference.upsert.mockResolvedValue(pref);

    const router = notificationsRouter.createCaller(makeCtx());
    const result = await router.upsertPreference({
      eventType: 'TIMEOFF_REQUEST',
      inApp: true,
      email: false,
      slack: true,
    });

    expect(result).toEqual(pref);
    expect(db.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employeeId_eventType: { employeeId: 'emp-1', eventType: 'TIMEOFF_REQUEST' } },
        create: expect.objectContaining({ employeeId: 'emp-1', eventType: 'TIMEOFF_REQUEST', email: false }),
        update: expect.objectContaining({ email: false }),
      }),
    );
  });

  it('resetPreferences deletes all preference rows for the user', async () => {
    db.notificationPreference.deleteMany.mockResolvedValue({ count: 3 });

    const router = notificationsRouter.createCaller(makeCtx());
    const result = await router.resetPreferences();

    expect(result).toEqual({ count: 3 });
    expect(db.notificationPreference.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-1' } }),
    );
  });

  it('list returns notifications for current user', async () => {
    const notifications = [
      { id: 'n1', type: 'TIMEOFF_APPROVED', title: 'Approved', read: false },
    ];
    db.notification.findMany.mockResolvedValue(notifications);

    const router = notificationsRouter.createCaller(makeCtx());
    const result = await router.list();

    expect(result).toEqual(notifications);
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp-1' } }),
    );
  });

  it('markRead verifies ownership by filtering on employeeId', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 1 });

    const router = notificationsRouter.createCaller(makeCtx());
    await router.markRead({ id: 'n1' });

    // Must filter by both id AND employeeId to prevent cross-user access
    expect(db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n1', employeeId: 'emp-1' },
        data: { read: true },
      }),
    );
  });

  it('markAllRead updates all unread for the user', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 5 });

    const router = notificationsRouter.createCaller(makeCtx());
    const result = await router.markAllRead();

    expect(result).toEqual({ count: 5 });
    expect(db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employeeId: 'emp-1', read: false },
        data: { read: true },
      }),
    );
  });

  it('create rejects non-admin users', async () => {
    const router = notificationsRouter.createCaller(makeCtx({ role: 'EMPLOYEE' }));
    await expect(
      router.create({
        employeeId: 'emp-2',
        type: 'TIMEOFF_REQUEST',
        title: 'Test',
      })
    ).rejects.toThrow();
  });

  it('create allows admin users', async () => {
    db.notification.create.mockResolvedValue({ id: 'n1', type: 'TIMEOFF_REQUEST', title: 'Test' });

    const router = notificationsRouter.createCaller(makeCtx({ role: 'ADMIN' }));
    const result = await router.create({
      employeeId: 'emp-2',
      type: 'TIMEOFF_REQUEST',
      title: 'Test',
    });

    expect(result).toEqual(expect.objectContaining({ id: 'n1' }));
  });

  it('upsertPreference rejects invalid eventType', async () => {
    const router = notificationsRouter.createCaller(makeCtx());
    await expect(
      router.upsertPreference({
        eventType: 'INVALID_TYPE',
        inApp: true,
        email: true,
        slack: true,
      })
    ).rejects.toThrow();
  });
});
