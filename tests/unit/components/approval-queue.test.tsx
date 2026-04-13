import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'ADMIN', employeeId: 'emp-0', companyId: 'co-1' } } }),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    timeoff: {
      listRequests: {
        useQuery: () => ({
          data: {
            requests: [{
              id: 'req-1',
              status: 'PENDING',
              startDate: new Date('2024-06-10'),
              endDate: new Date('2024-06-14'),
              days: 5,
              reason: 'Summer vacation',
              employee: { id: 'emp-1', firstName: 'Bob', lastName: 'Smith', department: { name: 'Engineering' } },
              policy: { name: 'Vacation', type: 'VACATION' },
            }],
            nextCursor: undefined,
          },
          isLoading: false,
        }),
      },
      approve: { useMutation: () => ({ mutate: mockApprove, isPending: false }) },
      reject: { useMutation: () => ({ mutate: mockReject, isPending: false }) },
    },
    useContext: () => ({ timeoff: { listRequests: { invalidate: mockInvalidate } } }),
  },
}));

import ApprovalQueue from '@/components/time-off/approval-queue';

describe('ApprovalQueue', () => {
  it('renders pending request with employee name', () => {
    render(<ApprovalQueue />);
    expect(screen.getByText(/Bob Smith/i)).toBeDefined();
    expect(screen.getAllByText(/Vacation/i).length).toBeGreaterThan(0);
  });

  it('calls approve mutation when Approve is clicked', async () => {
    render(<ApprovalQueue />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith({ requestId: 'req-1' });
    });
  });

  it('calls reject mutation when Reject is clicked', async () => {
    render(<ApprovalQueue />);
    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith({ requestId: 'req-1' });
    });
  });
});
