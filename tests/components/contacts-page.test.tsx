import { describe, test } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import ContactsPage from '@/app/contacts/page';

describe('ContactsPage component', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Mock fetch used by the page for data loading
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({ data: [], total: 0, page: 1, pageSize: 50, hasNext: false }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    ) as unknown as typeof fetch;
  });

  test('Reset All shows success toast', async () => {
    await act(async () => {
      render(<ContactsPage />);
    });
    const resetAll = screen.getByRole('button', { name: /reset all/i });
    await act(async () => {
      fireEvent.click(resetAll);
    });
    expect(await screen.findByText(/preferences cleared/i)).toBeInTheDocument();
  });

  test('Density toggle updates aria-pressed and keyboard shortcut d toggles', async () => {
    await act(async () => {
      render(<ContactsPage />);
    });
    const comfortBtn = screen.getByRole('button', { name: /comfort density/i });
    const compactBtn = screen.getByRole('button', { name: /compact density/i });

    // Default should be comfort
    expect(comfortBtn).toHaveAttribute('aria-pressed', 'true');
    expect(compactBtn).toHaveAttribute('aria-pressed', 'false');

    // Click compact
    await act(async () => {
      fireEvent.click(compactBtn);
    });
    expect(comfortBtn).toHaveAttribute('aria-pressed', 'false');
    expect(compactBtn).toHaveAttribute('aria-pressed', 'true');

    // Press keyboard shortcut 'd' to toggle back to comfort
    await act(async () => {
      fireEvent.keyDown(window, { key: 'd' });
    });
    expect(comfortBtn).toHaveAttribute('aria-pressed', 'true');
    expect(compactBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
