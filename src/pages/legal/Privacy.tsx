import { LegalLayout } from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="May 16, 2026"
      path="/legal/privacy"
      description="How EBLOCKI collects, uses, and protects your data."
    >
      <p>
        EBLOCKI ("we", "us") provides a behavioural performance operating system that helps
        operators convert ambition into measurable proof. This policy describes what data we
        collect, how it is used, and the rights you have over it.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, full name, encrypted password (managed by our auth provider).</li>
        <li><strong>Operator data:</strong> control sheets, proof artifacts, coach interactions, modes, onboarding profile, configuration.</li>
        <li><strong>Attachments:</strong> PDFs, images, and text files you upload as proof evidence, plus OCR text we extract from them.</li>
        <li><strong>Device data:</strong> platform (iOS / Android / web), push notification token, app version, locale.</li>
        <li><strong>Analytics:</strong> anonymised event names, session identifiers, screen names, feature usage timings.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the behavioural engine, generate verdicts on proof artifacts, and personalise modes.</li>
        <li>To send transactional messages (verification, password reset) and — if you opt in — push notifications.</li>
        <li>To detect bugs, measure retention, and improve the product.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Coach responses, proof scoring, and OCR are produced by large language models hosted by
        third-party providers. Prompts may include the text you submit, your active mode, and your
        onboarding profile. We do not allow model providers to train on your data. See the{" "}
        <a href="/legal/ai-disclosure">AI Disclosure</a> for the model list.
      </p>

      <h2>4. Sharing</h2>
      <p>We share data only with the sub-processors required to operate EBLOCKI:</p>
      <ul>
        <li>Supabase (database, auth, storage)</li>
        <li>Google &amp; OpenAI (AI inference, via our gateway)</li>
        <li>PostHog (product analytics)</li>
      </ul>
      <p>We do not sell your data to advertisers.</p>

      <h2>5. Retention</h2>
      <p>
        Operator data is retained while your account is active. When you delete your account, all
        rows are removed within 30 days and storage attachments are purged immediately.
      </p>

      <h2>6. Your rights</h2>
      <ul>
        <li>Access &amp; export — request a JSON export from Settings → Account.</li>
        <li>Correction — edit any record from inside the app.</li>
        <li>Deletion — delete your account from Settings → Account.</li>
        <li>If you are in the EEA / UK, you may also lodge a complaint with your supervisory authority.</li>
      </ul>

      <h2>7. Children</h2>
      <p>EBLOCKI is not directed to users under 13 and accounts under 13 are not permitted.</p>

      <h2>8. Contact</h2>
      <p>For any privacy request, email <a href="mailto:privacy@eblocki.space">privacy@eblocki.space</a>.</p>
    </LegalLayout>
  );
}