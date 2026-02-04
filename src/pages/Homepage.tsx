import { Link } from 'react-router-dom';

const Homepage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-gray-200 py-4">
        <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between max-md:px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-2xl font-bold text-gray-800">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">G</div>
              <span>Gather</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              What's new
            </div>
          </div>
          
          <nav className="flex gap-8 items-center max-md:hidden">
            <a href="#product" className="text-sm font-medium text-gray-600 no-underline transition-colors hover:text-gray-900">Product</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 no-underline transition-colors hover:text-gray-900">Testimonials</a>
            <a href="#resources" className="text-sm font-medium text-gray-600 no-underline transition-colors hover:text-gray-900">Resources</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 no-underline transition-colors hover:text-gray-900">Pricing</a>
            <a href="#contact" className="text-sm font-medium text-gray-600 no-underline transition-colors hover:text-gray-900">Contact Sales</a>
          </nav>

          <div className="flex gap-4 items-center">
            <Link to="/login" className="px-4 py-2 text-gray-800 font-medium text-sm no-underline rounded-md transition-colors hover:bg-gray-100">Login</Link>
            <Link to="/register" className="px-6 py-2 bg-blue-600 text-white no-underline rounded-md font-semibold text-sm transition-colors hover:bg-blue-700">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-8 text-center bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-[800px] mx-auto">
          <div className="inline-block px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 mb-8">
            Just shipped: Fresh styles for your avatar &gt;
          </div>
          
          <h1 className="text-6xl font-extrabold leading-tight text-gray-900 mb-6 tracking-tight max-md:text-4xl">
            People + knowledge.<br />
            All in one place.
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-[600px] mx-auto">
            Collaborate instantly and search intelligently with Gather. Bring meetings, 
            chat, and context from other apps into one AI-powered workspace.
          </p>
          
          <Link to="/register" className="inline-block px-8 py-4 bg-blue-600 text-white no-underline rounded-lg font-semibold text-base transition-all shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg">
            Start free 30-day trial
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-8 bg-white">
        <div className="max-w-[1200px] mx-auto flex justify-center gap-12">
          <div className="flex flex-col items-center gap-2 text-green-500 font-semibold">
            <div className="text-3xl">💬</div>
            <span>Meetings</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-green-500 font-semibold">
            <div className="text-3xl">💭</div>
            <span>Chat</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-green-500 font-semibold">
            <div className="text-3xl">📊</div>
            <span>Activity</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-green-500 font-semibold">
            <div className="text-3xl">📚</div>
            <span>Knowledge</span>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section className="py-8 px-8 bg-gray-800">
        <div className="max-w-[1400px] mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex justify-between items-center p-4 px-6 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="text-base">🔒</span>
              Design Review
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 bg-gray-700 border-none rounded text-gray-400 cursor-pointer transition-colors hover:bg-gray-600">⊞</button>
              <button className="w-8 h-8 bg-gray-700 border-none rounded text-gray-400 cursor-pointer transition-colors hover:bg-gray-600">⊡</button>
              <button className="w-8 h-8 bg-gray-700 border-none rounded text-gray-400 cursor-pointer transition-colors hover:bg-gray-600">⊟</button>
            </div>
          </div>
          
          <div className="p-8 bg-gray-900">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                      {String.fromCharCode(65 + (i % 26))}
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium bg-black/60 px-2 py-1 rounded">
                    User {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-center text-white">
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-4xl font-extrabold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of teams using Gather to collaborate better</p>
          <Link to="/register" className="inline-block px-10 py-4 bg-white text-indigo-600 no-underline rounded-lg font-semibold text-base transition-transform hover:-translate-y-0.5">
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 bg-gray-800 text-gray-400 text-center">
        <div className="max-w-[1200px] mx-auto">
          <p>&copy; 2024 Gather. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;





