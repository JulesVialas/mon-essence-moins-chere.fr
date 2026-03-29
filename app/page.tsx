import FuelSearch from "./components/FuelSearch";

export default function Home() {
  return (
    <>
      <main className="max-w-2xl w-full mx-auto px-4 py-5 flex-1">
        <FuelSearch />
      </main>

      <footer className="max-w-2xl mx-auto px-4 py-4 text-center space-y-1">
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
        <p className="text-xs text-slate-400">
          Réalisé par{" "}
          <a
            href="https://www.linkedin.com/in/julesvialas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 font-medium hover:text-blue-600 transition-colors"
          >
            Jules Vialas
          </a>
        </p>
      </footer>
    </>
  );
}
