import { LegalLayout } from "./LegalLayout";

export default function DataHandling() {
  return (
    <LegalLayout
      title="Data Handling"
      updated="May 16, 2026"
      path="/legal/data-handling"
      description="Where EBLOCKI data is stored, how it is secured, and how to export or delete it."
    >
      <h2>Storage location</h2>
      <p>
        All operator data is stored in a managed PostgreSQL database with Row Level Security.
        Every table policy restricts reads and writes to <code>auth.uid()</code> = the row owner,
        so users can only ever see their own data.
      </p>

      <h2>Attachments</h2>
      <p>
        Files uploaded as proof evidence are stored in a private bucket (<code>proof-attachments</code>).
        Signed URLs are issued per-request and are not publicly browsable.
      </p>

      <h2>Transport &amp; encryption</h2>
      <ul>
        <li>TLS 1.2+ in transit.</li>
        <li>AES-256 at rest (managed by our database and storage provider).</li>
        <li>Passwords are hashed with bcrypt.</li>
      </ul>

      <h2>Sub-processors</h2>
      <ul>
        <li>Supabase — database, auth, storage, edge functions.</li>
        <li>Lovable AI Gateway — AI inference routing.</li>
        <li>PostHog — product analytics (events only, no PII beyond user id).</li>
      </ul>

      <h2>Export your data</h2>
      <p>Go to <strong>Settings → Account → Export my data</strong> to download a JSON archive of every record we hold.</p>

      <h2>Delete your account</h2>
      <p>
        Go to <strong>Settings → Account → Delete my account</strong>. This triggers a server
        function that removes every row tied to your user id and purges your attachments. The
        operation is permanent and cannot be reversed.
      </p>

      <h2>Breach notification</h2>
      <p>If a breach affecting your data is detected, we will notify you within 72 hours.</p>
    </LegalLayout>
  );
}