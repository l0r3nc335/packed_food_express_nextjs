import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Page not found</h2>
      <p className="mt-2 text-sm text-slate-600">
        This page does not exist. Available languages are English, Nederlands, Deutsch and Français.
      </p>
      <Link
        href="/en"
        className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
      >
        Go to the English version
      </Link>
    </div>
  );
}
