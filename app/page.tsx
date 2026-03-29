import FuelSearch from "./components/FuelSearch";

export default function Home() {
  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h1M3 14h1m16-4h1m-1 4h1M7 5h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zm3 4h4m-4 4h4m-2-8v2" />
          </svg>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">Essence moins chère</span>
          <span className="ml-auto text-xs text-slate-400 hidden sm:block">données data.gouv.fr</span>
        </div>
      </header>

      <main className="max-w-2xl w-full mx-auto px-4 py-5 flex-1">
        <FuelSearch />
      </main>

      <footer className="max-w-2xl mx-auto px-4 py-4 text-center">
        <p className="text-xs text-slate-400">
          Prix indicatifs ·{" "}
          <a
            href="https://www.data.gouv.fr/fr/datasets/prix-des-carburants-en-france-flux-instantane-v2/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            data.gouv.fr
          </a>
        </p>
      </footer>
    </>
  );
}
