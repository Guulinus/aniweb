export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-purple-400 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-4">Page not found</h2>
      <p className="text-gray-400 mb-8">The page you are looking for does not exist.</p>
      <a
        href="/"
        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition"
      >
        Go home
      </a>
    </div>
  );
}
