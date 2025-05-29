import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">
            Strona nie została znaleziona
          </h2>
          <p className="text-gray-500 mb-6">
            Przepraszamy, ale strona którą próbujesz odwiedzić nie istnieje lub
            została przeniesiona.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Powrót do strony głównej
          </Link>

          <Link
            href="/formularz"
            className="inline-block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Przejdź do formularza
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            Jeśli uważasz, że to błąd, skontaktuj się z nami.
          </p>
        </div>
      </div>
    </div>
  );
}
