import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { listTasks, createTask, updateTask, deleteTask } from '@/services/tasks';
import { createContact } from '@/services/contacts';

describe('tasks service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('create, update, delete task lifecycle and listTasks filtering', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const contact = await createContact({
      firstName: 'Task',
      lastName: 'Owner',
      email: `task-owner-${Date.now()}@example.com`,
    });

    const created = await createTask({
      contactId: contact.id,
      title: 'Initial Task',
      notes: 'Test task',
    });
    expect(created.id).toMatch(/^T\d+/);
    expect(created.completed).toBe(false);

    const updated = await updateTask(created.id, { completed: true, title: 'Updated Task' });
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe('Updated Task');

    const listAll = await listTasks({ contactId: contact.id });
    expect(listAll.data.some((t) => t.id === created.id)).toBe(true);

    const listCompleted = await listTasks({ contactId: contact.id, completed: true });
    expect(listCompleted.data.some((t) => t.id === created.id)).toBe(true);

    const listIncomplete = await listTasks({ contactId: contact.id, completed: false });
    expect(listIncomplete.data.some((t) => t.id === created.id)).toBe(false);

    const deleted = await deleteTask(created.id);
    expect(deleted).toBe(true);

    const afterDelete = await listTasks({ contactId: contact.id });
    expect(afterDelete.data.some((t) => t.id === created.id)).toBe(false);
  });

  test('listTasks transient failure surfaces an error', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.01);
    await expect(listTasks({})).rejects.toThrow('TransientError');
  });
});
