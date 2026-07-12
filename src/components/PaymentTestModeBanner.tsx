const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-red-950/60 border-b border-red-800/60 px-4 py-2 text-center text-xs font-mono text-red-200">
        Production checkout not configured. Complete go-live in the Payments tab to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-amber-950/60 border-b border-amber-800/60 px-4 py-2 text-center text-xs font-mono text-amber-200">
        Test mode — no real charges.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Learn more
        </a>
      </div>
    );
  }
  return null;
}