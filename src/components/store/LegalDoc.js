import Link from "next/link";

/** Terms and privacy: title, last-updated date and the stored HTML (already sanitised). */
export default function LegalDoc({ html, title, updatedAt, lang, t }) {
  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString(lang === "ar" ? "ar-SD-u-nu-latn" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label={t.catalogBreadcrumbHome}>
          <Link href="/" className="hover:text-foreground">{t.catalogBreadcrumbHome}</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t.legalLastUpdated}: {updated}
          </p>
        ) : null}
        <article
          className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:mt-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-5 [&_li]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
