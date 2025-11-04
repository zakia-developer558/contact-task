"use client";

export default function Home() {

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-24 px-8 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Contacts-Tasks App</h1>
        <p className="text-zinc-600 dark:text-zinc-400">A fast, keyboard-friendly UI for managing contacts and tasks.</p>

        <section aria-label="Features" className="w-full">
          <h2 className="text-xl font-medium text-black dark:text-zinc-50 mb-3">Features</h2>
          <ul className="list-disc pl-6 space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>12k+ contacts with instant search and sorting</li>
            <li>Optimistic updates for create, edit, and delete</li>
            <li>Keyboard shortcuts for fast navigation</li>
            <li>Persistent user preferences and density modes</li>
            <li>Integrated tasks with filter and bulk actions</li>
          </ul>
        </section>

        <div className="flex gap-4">
          <a
            href="/contacts"
            className="rounded-full bg-foreground px-5 py-3 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Go to Contacts
          </a>
        </div>
      </main>
    </div>
  );
}
