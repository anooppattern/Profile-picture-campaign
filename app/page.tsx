import TemplateGallery from "@/components/TemplateGallery";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Picture Generator</h1>
              <p className="text-gray-500 mt-1">
                Choose a template, upload your photo, and create your campaign profile picture
              </p>
            </div>
            <a
              href="/admin"
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Admin
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <TemplateGallery />
      </main>

      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
          Profile Picture Generator &middot; Upload your photo and create campaign profile pictures
        </div>
      </footer>
    </div>
  );
}
