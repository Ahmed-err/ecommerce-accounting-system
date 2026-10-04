"use client";

// Last resort when the root layout itself fails: no providers, no dictionary, plain HTML.
export default function GlobalError({ reset }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F7F6F3", color: "#121821", margin: 0 }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>حدث خطأ ما</h1>
          <p>Something went wrong.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 16, height: 44, padding: "0 20px", borderRadius: 8, border: 0, background: "#F2A20C", color: "#0E1A2B", fontWeight: 700 }}
          >
            إعادة المحاولة / Try again
          </button>
        </main>
      </body>
    </html>
  );
}
