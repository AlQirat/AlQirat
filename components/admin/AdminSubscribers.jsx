"use client";

import { useEffect, useState } from "react";
import { Download, Mail, Trash2 } from "lucide-react";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSubscribers() {
    const response = await fetch("/api/admin/subscribers", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load subscribers.");
    setSubscribers(result.subscribers);
    setError("");
  }

  useEffect(() => { loadSubscribers(); }, []);

  async function remove(subscriber) {
    if (!window.confirm(`Remove ${subscriber.email} from the list?`)) return;
    const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to remove this subscriber.");
    await loadSubscribers();
  }

  function downloadCsv() {
    const rows = ["email,subscribed_on", ...subscribers.map((item) => `${item.email},${item.created_at.slice(0, 10)}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "al-qirat-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Marketing</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">Newsletter subscribers</h2>
          <p className="mt-1 text-sm text-stone-500">{subscribers.length} {subscribers.length === 1 ? "person has" : "people have"} subscribed from the storefront.</p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!subscribers.length}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-stone-50 disabled:opacity-40"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}

      {loading ? (
        <p className="p-8 text-sm text-stone-500">Loading subscribers...</p>
      ) : subscribers.length === 0 ? (
        <div className="m-7 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center">
          <Mail className="mx-auto text-stone-300" size={30} />
          <p className="mt-3 font-semibold">No subscribers yet</p>
          <p className="mt-1 text-sm text-stone-500">Email addresses from the homepage subscribe form will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {subscribers.map((subscriber) => (
            <li key={subscriber.id} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-7">
              <div className="min-w-0">
                <a href={`mailto:${subscriber.email}`} className="block truncate text-sm font-semibold text-ink hover:text-gold-dark">{subscriber.email}</a>
                <p className="text-xs text-stone-500">Subscribed {formatDate(subscriber.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(subscriber)}
                aria-label={`Remove ${subscriber.email}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
