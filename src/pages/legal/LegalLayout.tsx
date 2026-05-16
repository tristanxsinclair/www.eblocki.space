import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";

export function LegalLayout({
  title,
  updated,
  path,
  description,
  children,
}: {
  title: string;
  updated: string;
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen-safe bg-background text-foreground">
      <Seo title={`${title} | EBLOCKI`} description={description} path={path} />
      <header className="safe-top border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground native-tap" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EBLOCKI · Legal</span>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-5 py-8 safe-bottom prose-invert">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Last updated · {updated}</p>
        <h1 className="text-3xl font-semibold mt-2 mb-6 tracking-tight">{title}</h1>
        <div className="space-y-5 text-sm leading-relaxed text-foreground/90 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </main>
  );
}