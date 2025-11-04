import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { listContacts, createContact, getContact, deleteContact } from '@/services/contacts';

describe('contacts service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('listContacts returns paginated results sorted by lastActivityAt desc', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const res = await listContacts({ pageSize: 10 });
    expect(res.pageSize).toBe(10);
    expect(Array.isArray(res.data)).toBe(true);
    for (let i = 1; i < res.data.length; i++) {
      const prev = new Date(res.data[i - 1].lastActivityAt).getTime();
      const curr = new Date(res.data[i].lastActivityAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  test('listContacts supports search query filter', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const firstPage = await listContacts({ pageSize: 20 });
    const probe = firstPage.data[0];
    expect(probe).toBeDefined();
    const q = (probe.firstName || probe.lastName || probe.email || '').slice(0, 3);
    const res = await listContacts({ pageSize: 50, q });
    const includesProbe = res.data.some((c) => c.id === probe.id);
    expect(includesProbe).toBe(true);
  });

  test('create/get/delete lifecycle works', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const email = `jest-${Date.now()}@example.com`;
    const created = await createContact({
      firstName: 'Jest',
      lastName: 'User',
      email,
    });
    const loaded = await getContact(created.id);
    expect(loaded.email).toBe(email);
    await deleteContact(created.id);
    await expect(getContact(created.id)).rejects.toThrow();
  });

  test('listContacts transient failure surfaces an error', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    await expect(listContacts({ pageSize: 5 })).rejects.toThrow('TransientError');
  });
});
