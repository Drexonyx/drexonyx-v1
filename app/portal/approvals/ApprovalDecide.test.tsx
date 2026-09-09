import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalDecide } from './ApprovalDecide';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockActionDecideApproval } = vi.hoisted(() => ({
  mockActionDecideApproval: vi.fn(),
}));

vi.mock('./actions', () => ({
  actionDecideApproval: mockActionDecideApproval,
}));

// ─── ApprovalDecide ───────────────────────────────────────────────────────────

describe('ApprovalDecide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Approve and Reject buttons', () => {
    render(<ApprovalDecide approvalId="approval1" />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('calls actionDecideApproval with APPROVED when Approve is clicked', async () => {
    mockActionDecideApproval.mockResolvedValue({ ok: true });
    render(<ApprovalDecide approvalId="approval1" />);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(mockActionDecideApproval).toHaveBeenCalledWith('approval1', 'APPROVED');
    });
  });

  it('calls actionDecideApproval with REJECTED when Reject is clicked', async () => {
    mockActionDecideApproval.mockResolvedValue({ ok: true });
    render(<ApprovalDecide approvalId="approval1" />);
    fireEvent.click(screen.getByText('Reject'));
    await waitFor(() => {
      expect(mockActionDecideApproval).toHaveBeenCalledWith('approval1', 'REJECTED');
    });
  });

  it('displays error message when action returns ok:false', async () => {
    mockActionDecideApproval.mockResolvedValue({ ok: false, reason: 'not_found' });
    render(<ApprovalDecide approvalId="approval1" />);
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(screen.getByText('not_found')).toBeInTheDocument();
    });
  });
});
