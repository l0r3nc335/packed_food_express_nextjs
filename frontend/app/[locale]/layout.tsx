import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { LanguageSelector } from "../../components/language-selector";
import { LOCALES, isLocale } from "../../i18n/config";
import { createTranslator } from "../../i18n/dictionary";
import { LocaleProvider } from "../../i18n/locale-provider";
import "../globals.css";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): Array<{ locale: string }> {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = createTranslator(isLocale(locale) ? locale : "en");

  return { title: t("app.title"), description: t("app.tagline") };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = createTranslator(locale);

  return (
    <html lang={locale}>
      <body className="min-h-screen">
        <LocaleProvider locale={locale}>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {t("app.title")}
                </h1>
                <p className="mt-1 max-w-xl text-sm text-slate-600">{t("app.tagline")}</p>
              </div>
              {/* useSearchParams needs a boundary so the shell can prerender. */}
              <Suspense fallback={null}>
                <LanguageSelector />
              </Suspense>
            </header>

            <main className="flex-1 py-8">{children}</main>

            <footer className="border-t border-slate-200 pt-6 text-xs text-slate-500">
              {t("footer.dataSource")}
            </footer>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
