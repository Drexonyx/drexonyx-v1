import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getApprovals, getAssetFileKeys } from '@/lib/portal/queries';
import { generateSignedUrl } from '@/lib/infrastructure/object-storage';
import s from '../portal.module.css';
import { ApprovalDecide } from './ApprovalDecide';

export const metadata = { title: 'Approvals — Client Portal' };

async function buildSignedUrlMap(
  fileKeyMap: Map<string, string>,
  ttlSeconds: number,
): Promise<Map<string, { url: string; expiresAt: string }>> {
  const map = new Map<string, { url: string; expiresAt: string }>();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toLocaleString();
  for (const [assetId, fileKey] of fileKeyMap) {
    try {
      const url = await generateSignedUrl(fileKey, ttlSeconds);
      map.set(assetId, { url, expiresAt });
    } catch {
      // Asset may not yet have a file_key or R2 is unavailable — skip silently.
    }
  }
  return map;
}

const APPROVAL_BADGE: Record<string, string> = {
  PENDING: s.badgeWarning,
  APPROVED: s.badgeSuccess,
  REJECTED: s.badgeDanger,
  EXPIRED: s.badgeNeutral,
  CANCELLED: s.badgeNeutral,
};

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const approvals = await getApprovals(session.user.organizationId);

  // DR 0098 §2.2: Pre-fetch signed URLs server-side for PENDING ASSET approvals.
  // 3600s interactive TTL (DR 0086 §2.7). Client uses R2 presigned URL — no CDN URLs.
  const pendingAssetApprovals = approvals.filter(
    (a) => a.status === 'PENDING' && a.target_type === 'ASSET' && a.target_id,
  );
  const assetIds = pendingAssetApprovals.map((a) => a.target_id as string);
  const fileKeyMap = await getAssetFileKeys(session.user.organizationId, assetIds);

  const signedUrlMap = await buildSignedUrlMap(fileKeyMap, 3600);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Approvals</h1>
        <p className={s.pageSubtitle}>Approval requests for your deliverables</p>
      </div>

      {approvals.length === 0 ? (
        <div className={s.emptyState}>
          <div className={s.emptyTitle}>No approvals yet</div>
          <div className={s.emptyBody}>Approval requests will appear here.</div>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Approval ID</th>
                <th>Target</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Created</th>
                <th>View</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => {
                const signedUrl =
                  a.status === 'PENDING' && a.target_type === 'ASSET' && a.target_id
                    ? signedUrlMap.get(a.target_id)
                    : undefined;
                return (
                  <tr key={a.id}>
                    <td className={`${s.cellPrimary} ${s.cellMono}`}>{a.id.slice(0, 8)}…</td>
                    <td className={s.cellMono}>
                      <span
                        className={`${s.badge} ${s.badgeNeutral}`}
                        style={{ marginRight: '0.25rem' }}
                      >
                        {a.target_type}
                      </span>
                      {a.target_id ? a.target_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td>
                      <span className={`${s.badge} ${APPROVAL_BADGE[a.status] ?? s.badgeNeutral}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className={s.cellMono}>
                      {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className={s.cellMono}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      {signedUrl ? (
                        <a
                          href={signedUrl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8125rem', color: 'var(--drex-accent)' }}
                          title={`Expires: ${signedUrl.expiresAt}`}
                        >
                          View Asset ↗
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {a.status === 'PENDING' && a.target_type === 'ASSET' ? (
                        <ApprovalDecide approvalId={a.id} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
