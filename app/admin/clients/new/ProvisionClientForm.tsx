'use client';

import { useState } from 'react';
import { actionProvisionClient } from '../actions';
import s from '../../admin.module.css';

type SuccessState = {
  organizationId: string;
  userId: string;
  temporaryPassword: string;
};

function errorLabel(reason: string): string {
  if (reason === 'SLUG_TAKEN') return 'Organization slug is already in use. Choose a different slug.';
  if (reason === 'EMAIL_TAKEN') return 'Email address is already registered. Use a different email.';
  if (reason === 'MEMBERSHIP_EXISTS') return 'A CLIENT membership already exists for this user and organization.';
  return reason;
}

export function ProvisionClientForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await actionProvisionClient(formData);

    if (result.ok) {
      setSuccess({
        organizationId: result.organizationId,
        userId: result.userId,
        temporaryPassword: result.temporaryPassword,
      });
      form.reset();
    } else {
      setError(errorLabel(result.reason));
    }
    setPending(false);
  }

  if (success) {
    return (
      <div style={{ maxWidth: '560px' }}>
        <div
          style={{
            padding: '0.875rem 1rem',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          Client provisioned successfully.
        </div>
        <div className={s.tableWrap} style={{ marginBottom: '1rem' }}>
          <table className={s.table}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Organization ID</td>
                <td className={s.cellMono}>{success.organizationId}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>User ID</td>
                <td className={s.cellMono}>{success.userId}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Temporary Password</td>
                <td
                  className={s.cellMono}
                  style={{ fontWeight: 700, userSelect: 'all', color: 'var(--drex-accent)' }}
                >
                  {success.temporaryPassword}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
          Copy the temporary password and communicate it to the client via a secure out-of-band
          channel. It will not be shown again.
        </p>
        <button
          onClick={() => setSuccess(null)}
          className={`${s.badge} ${s.badgeAccent}`}
          style={{ cursor: 'pointer', border: 'none', padding: '0.4rem 0.875rem' }}
        >
          Provision another client
        </button>
      </div>
    );
  }

  const fieldStyle: React.CSSProperties = {
    padding: '0.5rem 0.625rem',
    borderRadius: '4px',
    border: '1px solid var(--drex-border, #444)',
    background: 'var(--drex-input-bg, transparent)',
    color: 'inherit',
    fontSize: '0.875rem',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.875rem',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <label style={labelStyle}>
        Organization Name
        <input
          name="organizationName"
          required
          minLength={1}
          maxLength={255}
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>
          Organization Slug{' '}
          <span style={{ fontWeight: 400, opacity: 0.65 }}>
            (lowercase letters, digits, hyphens — globally unique)
          </span>
        </span>
        <input
          name="organizationSlug"
          required
          minLength={1}
          maxLength={100}
          pattern="[a-z0-9-]+"
          title="Only lowercase letters, digits, and hyphens"
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <label style={labelStyle}>
        Client User Email
        <input
          name="userEmail"
          type="email"
          required
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <label style={labelStyle}>
        Client User Display Name
        <input
          name="userDisplayName"
          required
          minLength={1}
          maxLength={255}
          disabled={pending}
          style={fieldStyle}
        />
      </label>

      <p style={{ fontSize: '0.8125rem', margin: 0, opacity: 0.7 }}>
        A cryptographically secure temporary password is generated server-side. It will be
        displayed once after submission — copy it and send to the client out-of-band.
      </p>

      <div>
        <button
          type="submit"
          disabled={pending}
          className={`${s.badge} ${s.badgeAccent}`}
          style={{
            cursor: pending ? 'not-allowed' : 'pointer',
            border: 'none',
            padding: '0.5rem 1.25rem',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Provisioning…' : 'Provision Client'}
        </button>
      </div>
    </form>
  );
}
