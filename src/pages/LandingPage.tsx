import React, { useState, useEffect } from 'react';

// --- Types & Interfaces ---
interface NavItem {
  label: string;
  href: string;
}

interface FeaturePoint {
  title: string;
  desc: string;
}

interface ComparisonPoint {
  text: string;
}

interface UseCase {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// 👇 THÊM INTERFACE NÀY ĐỂ FIX LỖI "onJoin does not exist"
interface LandingPageProps {
  onJoin: () => void;
}

// --- Constants (Data) ---

const NAV_ITEMS: NavItem[] = [
  { label: 'Sản phẩm', href: '#product' },
  { label: 'Trường hợp dùng', href: '#use-cases' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'Tài nguyên', href: '#resources' },
];

const COMPARISON_OLD: ComparisonPoint[] = [
  { text: 'Gửi link họp và chờ đợi' },
  { text: 'Giao tiếp rời rạc qua chat' },
  { text: 'Mệt mỏi vì phải bật camera liên tục' },
  { text: 'Không biết đồng nghiệp đang bận hay rảnh' },
  { text: 'Không gian làm việc tĩnh, nhàm chán' },
];

const COMPARISON_NEW: ComparisonPoint[] = [
  { text: 'Đi lại gần để nói chuyện ngay lập tức' },
  { text: 'Thấy trạng thái rảnh/bận qua avatar' },
  { text: 'Không bắt buộc bật camera, dùng avatar' },
  { text: 'Cảm giác thuộc về một đội nhóm thực sự' },
  { text: 'Tùy biến văn phòng theo sở thích' },
];

const USE_CASES: UseCase[] = [
  { title: 'Văn phòng ảo', desc: 'Thay thế văn phòng vật lý, làm việc từ xa nhưng vẫn gắn kết.', icon: <BuildingIcon /> },
  { title: 'Onboarding', desc: 'Đào tạo nhân sự mới trực quan, dễ dàng hòa nhập văn hóa.', icon: <UserPlusIcon /> },
  { title: 'Team Bonding', desc: 'Tổ chức game, tiệc tùng ảo để xả stress cùng nhau.', icon: <HeartIcon /> },
  { title: 'Workshop', desc: 'Chia nhóm thảo luận, bảng trắng và thuyết trình hiệu quả.', icon: <PresentationIcon /> },
  { title: 'Lớp học', desc: 'Không gian học tập tương tác, không còn cảm giác buồn chán.', icon: <AcademicIcon /> },
  { title: 'Cộng đồng', desc: 'Tổ chức sự kiện, hội thảo cho hàng trăm người tham gia.', icon: <GlobeIcon /> },
];

const TESTIMONIALS: Testimonial[] = [
  { quote: "The Gathering đã thay đổi hoàn toàn cách chúng tôi làm việc từ xa. Cảm giác cô đơn biến mất.", author: "Nguyễn Văn A", role: "CTO", company: "TechStart VN" },
  { quote: "Không còn những cuộc họp vô tận. Cần gì chỉ cần 'đi bộ' qua bàn đồng nghiệp hỏi là xong.", author: "Trần Thị B", role: "Product Manager", company: "Creative Studio" },
  { quote: "Onboarding nhân viên mới chưa bao giờ dễ dàng đến thế. Mọi người hòa nhập rất nhanh.", author: "Lê Văn C", role: "HR Director", company: "Global Corp" },
  { quote: "Giao diện dễ thương, nhẹ nhàng, không gây áp lực như các ứng dụng họp trực tuyến khác.", author: "Phạm Thị D", role: "Designer", company: "ArtWorks" },
  { quote: "Chúng tôi tổ chức Happy Hour mỗi thứ 6 trên The Gathering. Rất vui và gắn kết!", author: "Hoàng Văn E", role: "Team Lead", company: "DevHouse" },
  { quote: "Tính năng âm thanh theo phạm vi thực sự là bước đột phá cho các buổi workshop.", author: "Vũ Thị F", role: "Agile Coach", company: "Innovate Inc" },
];

const FAQS: FAQItem[] = [
  { question: "The Gathering có miễn phí không?", answer: "Có, chúng tôi có gói miễn phí vĩnh viễn cho các đội nhóm nhỏ dưới 10 người. Các tính năng cốt lõi đều được bao gồm." },
  { question: "Tôi có cần cài đặt phần mềm không?", answer: "Không. The Gathering chạy hoàn toàn trên trình duyệt web (Chrome, Firefox, Safari, Edge)." },
  { question: "Giới hạn số người tham gia là bao nhiêu?", answer: "Gói Enterprise của chúng tôi hỗ trợ lên đến 500 người cùng lúc trong một không gian sự kiện." },
  { question: "Bảo mật dữ liệu như thế nào?", answer: "Chúng tôi tuân thủ GDPR và sử dụng mã hóa đầu cuối cho tất cả các luồng âm thanh và video." },
  { question: "Tôi có thể tùy chỉnh không gian không?", answer: "Chắc chắn rồi! Chúng tôi cung cấp công cụ Map Maker để bạn tự thiết kế văn phòng, hoặc dùng các mẫu có sẵn." },
  { question: "Tính năng âm thanh hoạt động ra sao?", answer: "Giống như ngoài đời thực, bạn chỉ nghe thấy tiếng của những người đứng gần bạn trong không gian ảo." },
  { question: "Có hỗ trợ trên điện thoại không?", answer: "Hiện tại chúng tôi có bản mobile beta hỗ trợ các tính năng cơ bản như di chuyển và trò chuyện âm thanh." },
  { question: "Làm sao để thanh toán?", answer: "Chúng tôi chấp nhận thẻ tín dụng quốc tế (Visa, Mastercard) và chuyển khoản ngân hàng cho gói doanh nghiệp." },
];

// --- Icons (SVG Components) ---

function MenuIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
}
function XMarkIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function CheckCircleIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>;
}
function XCircleIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
}
function ChevronDownIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
}
function ChevronRightIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
}
function BuildingIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>; }
function UserPlusIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>; }
function HeartIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>; }
function PresentationIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>; }
function AcademicIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>; }
function GlobeIcon() { return <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>; }


// --- Components ---

// 👇 CẬP NHẬT: Nhận prop onJoin
const LandingPage: React.FC<LandingPageProps> = ({ onJoin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    // ✅ CONTAINER CHÍNH: Thêm dark:bg-gray-900 dark:text-gray-100 transition-colors
    <div className="min-h-screen font-sans text-slate-900 dark:text-gray-100 bg-white dark:bg-gray-900 selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-white focus:text-indigo-600 top-4 left-4">
        Skip to content
      </a>

      {/* 1. Announcement Bar */}
      <div className="bg-indigo-600 dark:bg-indigo-700 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium">
        <span className="inline-block" role="alert">
          🚀 Phiên bản 2.0 đã ra mắt! Trải nghiệm không gian mới mượt mà hơn. <a href="#" className="underline decoration-indigo-200 hover:decoration-white ml-1">Tìm hiểu thêm &rarr;</a>
        </span>
      </div>

      {/* 2. Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm dark:shadow-gray-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">G</div>
              <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">The Gathering</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {NAV_ITEMS.map((item) => (
                <a key={item.label} href={item.href} className="text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-md px-2 py-1">
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={onJoin} // ✅ Gắn hàm onJoin
                className="text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-md px-3 py-2"
              >
                Đăng nhập
              </button>
              <button 
                onClick={onJoin} // ✅ Gắn hàm onJoin
                className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              >
                Tạo không gian
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 absolute w-full shadow-lg">
            <div className="px-4 pt-2 pb-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <a key={item.label} href={item.href} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-gray-200 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700">
                  {item.label}
                </a>
              ))}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-700 flex flex-col gap-2">
                <button onClick={onJoin} className="w-full text-center px-3 py-2 rounded-md text-base font-medium text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700">Đăng nhập</button>
                <button onClick={onJoin} className="w-full text-center px-3 py-2 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700">Tạo không gian</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
        {/* 3. Hero Section */}
        <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              
              {/* Hero Text */}
              <div className="flex-1 text-center lg:text-left z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-6 animate-fade-in-up">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Gặp gỡ trực tuyến thế hệ mới
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-6">
                  Không gian làm việc ảo giúp đội nhóm <span className="text-indigo-600 dark:text-indigo-400">gặp nhau nhanh</span> như ngoài đời
                </h1>
                <p className="text-lg sm:text-xl text-slate-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Cảm nhận sự hiện diện của đồng nghiệp. Đi lại gần để nói chuyện ngay lập tức. Giảm thiểu những cuộc họp lên lịch cứng nhắc và mệt mỏi.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <button onClick={onJoin} className="px-8 py-3.5 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shadow-xl shadow-indigo-200 dark:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 text-lg">
                    Tạo không gian
                  </button>
                  <button onClick={onJoin} className="px-8 py-3.5 rounded-full bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 font-semibold hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 text-lg flex items-center justify-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">▶</span>
                    Xem demo
                  </button>
                </div>
              </div>

              {/* Hero Visual (Mockup) */}
              <div className="flex-1 w-full max-w-xl lg:max-w-full relative">
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-10 animate-blob"></div>
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-10 animate-blob animation-delay-2000"></div>

                {/* The "Map" Card */}
                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900 border border-slate-100 dark:border-gray-700 overflow-hidden aspect-[4/3] transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  {/* Map Background Pattern */}
                  <div className="absolute inset-0 bg-slate-50 dark:bg-gray-900" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.2 }}></div>
                  
                  {/* Room Areas */}
                  <div className="absolute top-8 left-8 right-32 bottom-24 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <span className="text-indigo-300 dark:text-indigo-500 font-bold text-2xl uppercase tracking-widest opacity-50 select-none">Khu vực làm việc</span>
                  </div>
                  <div className="absolute bottom-6 right-6 w-48 h-32 bg-orange-50/80 dark:bg-orange-900/20 border-2 border-orange-100 dark:border-orange-900/50 rounded-lg flex items-center justify-center">
                     <span className="text-orange-300 dark:text-orange-600 font-bold uppercase text-xs">Pantry</span>
                  </div>

                  {/* Users */}
                  <div className="absolute top-1/3 left-1/4 flex flex-col items-center gap-1 animate-bounce-slow">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 border-2 border-white dark:border-gray-800 shadow-md flex items-center justify-center text-white font-bold">L</div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" aria-label="Online"></div>
                    </div>
                    <span className="bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">Lan (Design)</span>
                    <span className="absolute -top-8 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-200 text-xs px-2 py-1 rounded-lg shadow-sm whitespace-nowrap animate-fade-in">Review xong chưa?</span>
                  </div>

                  <div className="absolute top-1/3 left-[40%] flex flex-col items-center gap-1 animate-bounce-slow animation-delay-1000">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 border-2 border-white dark:border-gray-800 shadow-md flex items-center justify-center text-white font-bold">H</div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                    <span className="bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">Hùng (Dev)</span>
                  </div>

                  <div className="absolute bottom-10 right-12 flex flex-col items-center gap-1">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 border-2 border-white dark:border-gray-800 shadow-md flex items-center justify-center text-white font-bold opacity-80">M</div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full" aria-label="Busy"></div>
                    </div>
                      <span className="bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">Minh (Đang họp)</span>
                  </div>

                  {/* Activity Tags */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-md font-medium border border-green-200 dark:border-green-800">Trò chuyện</span>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-md font-medium border border-blue-200 dark:border-blue-800">Review thiết kế</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Feature Block #1: Job-to-be-done */}
        <section className="py-20 bg-slate-50 dark:bg-gray-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <div>
                  <h2 className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide text-sm mb-2">Phối hợp tức thì</h2>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Kết nối chỉ với một lần di chuyển</h3>
                  <p className="text-slate-600 dark:text-gray-400 text-lg">
                    Không còn chờ đợi link Zoom. Thấy ai đó đang rảnh? Chỉ cần di chuyển avatar của bạn lại gần họ để bắt đầu trò chuyện ngay lập tức.
                  </p>
                </div>
                <ul className="space-y-4">
                  {[
                    "Thấy ngay ai đang rảnh rỗi trên bản đồ",
                    "Vẫy tay chào hỏi không cần làm phiền",
                    "Nghe âm thanh rõ dần khi lại gần (Spatial Audio)",
                    "Tham gia cuộc trò chuyện chỉ với 1 thao tác"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-slate-700 dark:text-gray-300 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={onJoin} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 group">
                  Dùng thử 30 ngày <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="flex-1 w-full">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-gray-950 p-6 border border-slate-100 dark:border-gray-700 relative">
                   {/* Abstract UI Representation */}
                   <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-gray-800">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-gray-700"></div>
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-gray-700"></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="aspect-video bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center relative border border-indigo-100 dark:border-indigo-900">
                         <div className="w-12 h-12 rounded-full bg-indigo-200 dark:bg-indigo-600 border-4 border-white dark:border-gray-800"></div>
                         <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">Bạn</div>
                      </div>
                      <div className="aspect-video bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center relative border border-emerald-100 dark:border-emerald-900">
                        <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-600 border-4 border-white dark:border-gray-800"></div>
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">Đồng nghiệp</div>
                         {/* Connection line */}
                         <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-green-400"></div>
                      </div>
                   </div>
                   <div className="mt-4 flex justify-center">
                     <span className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">Đã kết nối âm thanh</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Feature Block #2: Focus */}
        <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row-reverse items-center gap-16">
              <div className="flex-1 space-y-8">
                <div>
                  <h2 className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wide text-sm mb-2">Giảm xao nhãng</h2>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Làm việc sâu mà không bị cô lập</h3>
                  <p className="text-slate-600 dark:text-gray-400 text-lg">
                    Cần tập trung? Bước vào khu vực "Focus Zone". Bạn vẫn hiện diện với đồng nghiệp nhưng thông báo và âm thanh sẽ được tắt tự động.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "Chế độ tối giản", icon: "✨" },
                    { title: "Kiểm soát âm thanh", icon: "🔊" },
                    { title: "Trạng thái tự động", icon: "🔴" }
                  ].map((card, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                      <div className="text-2xl mb-2">{card.icon}</div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-gray-200">{card.title}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl transform -rotate-2"></div>
                 <div className="relative bg-slate-900 dark:bg-black rounded-2xl shadow-2xl p-6 border border-slate-800 text-white">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-red-500"></div>
                         <div className="text-sm font-mono text-slate-400">Trạng thái: Đừng làm phiền</div>
                      </div>
                      <div className="h-6 w-12 bg-slate-700 rounded-full relative">
                         <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="h-32 flex items-center justify-center border border-dashed border-slate-700 rounded-lg bg-slate-800/50">
                       <span className="text-slate-500 text-sm">Không có thông báo mới</span>
                    </div>
                    <div className="mt-6 flex gap-3">
                       <div className="h-2 w-full bg-slate-700 rounded overflow-hidden">
                          <div className="h-full w-2/3 bg-indigo-500"></div>
                       </div>
                       <span className="text-xs text-indigo-400">Đang code...</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Comparison Section */}
        <section className="py-20 bg-indigo-900 dark:bg-gray-950 text-white transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nâng cấp trải nghiệm làm việc</h2>
              <p className="text-indigo-200 dark:text-gray-400 max-w-2xl mx-auto">Tại sao các đội nhóm chuyển từ công cụ họp truyền thống sang The Gathering?</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Old Way */}
              <div className="bg-indigo-800/50 dark:bg-gray-800/50 rounded-2xl p-8 border border-indigo-700/50 dark:border-gray-700/50">
                <h3 className="text-xl font-bold mb-6 text-indigo-200 dark:text-gray-300 flex items-center gap-2">
                  <span className="text-2xl">🏚️</span> Cách làm cũ
                </h3>
                <ul className="space-y-4">
                  {COMPARISON_OLD.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-indigo-100/80 dark:text-gray-400">
                      <XCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* New Way */}
              <div className="bg-white dark:bg-gray-800 text-slate-900 dark:text-white rounded-2xl p-8 border border-white dark:border-gray-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">KHUYÊN DÙNG</div>
                <h3 className="text-xl font-bold mb-6 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="text-2xl">🚀</span> The Gathering
                </h3>
                <ul className="space-y-4">
                  {COMPARISON_NEW.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 font-medium">
                      <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Use Cases Grid */}
        <section id="use-cases" className="py-20 bg-slate-50 dark:bg-gray-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Một nền tảng, vô vàn ứng dụng</h2>
              <p className="text-slate-600 dark:text-gray-400">Linh hoạt cho mọi nhu cầu gặp gỡ của doanh nghiệp.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {USE_CASES.map((useCase, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-slate-100 dark:border-gray-700 group">
                  <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg inline-block group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                    {useCase.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{useCase.title}</h3>
                  <p className="text-slate-600 dark:text-gray-400">{useCase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Social Proof */}
        <section className="py-20 bg-white dark:bg-gray-900 overflow-hidden transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
              Được đội nhóm tin dùng để làm việc "có mặt" hơn
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-gray-800 p-6 rounded-2xl border border-slate-100 dark:border-gray-700">
                  <div className="flex text-yellow-400 mb-4 text-sm">★★★★★</div>
                  <p className="text-slate-700 dark:text-gray-300 mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-600 flex items-center justify-center font-bold text-slate-500 dark:text-gray-300 text-sm">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{t.author}</div>
                      <div className="text-xs text-slate-500 dark:text-gray-400">{t.role}, {t.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Big CTA */}
        <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">30 ngày đầu miễn phí</h2>
            <p className="text-xl text-indigo-100 dark:text-indigo-200 mb-10">Không cần thẻ tín dụng. Không phí thiết lập ẩn. Hủy bất cứ lúc nào.</p>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-12 text-indigo-100 dark:text-indigo-200 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 dark:text-indigo-900 flex items-center justify-center font-bold text-xs">1</span>
                Chọn mẫu không gian (2 phút)
              </div>
              <div className="hidden md:block w-12 h-px bg-indigo-400/50"></div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 dark:text-indigo-900 flex items-center justify-center font-bold text-xs">2</span>
                Mời đội nhóm (1 click)
              </div>
              <div className="hidden md:block w-12 h-px bg-indigo-400/50"></div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white text-indigo-600 dark:text-indigo-900 flex items-center justify-center font-bold text-xs">3</span>
                Bắt đầu ngay
              </div>
            </div>

            <button onClick={onJoin} className="bg-white text-indigo-700 dark:bg-indigo-500 dark:text-white text-lg font-bold px-10 py-4 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-400 transition-colors shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-900 focus-visible:ring-offset-2">
              Tạo không gian ngay
            </button>
          </div>
        </section>

        {/* 10. FAQ */}
        <section id="resources" className="py-20 bg-white dark:bg-gray-900 transition-colors">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">Câu hỏi thường gặp</h2>
            <div className="space-y-4">
              {FAQS.map((faq, idx) => (
                <AccordionItem key={idx} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 11. Footer */}
      <footer className="bg-slate-900 dark:bg-black text-slate-400 py-12 border-t border-slate-800 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1">
              <div className="flex items-center gap-2 text-white mb-4">
                <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center font-bold text-xs">G</div>
                <span className="font-bold text-lg">The Gathering</span>
              </div>
              <p className="text-sm">Kết nối đội nhóm từ xa bằng không gian ảo sống động.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Tính năng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bảo mật</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tải xuống</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Khách hàng</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Tài nguyên</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hướng dẫn</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Trợ giúp</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cộng đồng</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Công ty</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pháp lý</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
            <p>&copy; {new Date().getFullYear()} The Gathering Inc. Bảo lưu mọi quyền.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Điều khoản</a>
              <a href="#" className="hover:text-white">Riêng tư</a>
              <a href="#" className="hover:text-white">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper Component for Accordion
const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
      <button
        className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-left focus:outline-none focus:bg-slate-100 dark:focus:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-slate-900 dark:text-gray-200">{question}</span>
        <ChevronDownIcon className={`w-5 h-5 text-slate-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className={`bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 text-slate-600 dark:text-gray-400 text-sm leading-relaxed border-t border-slate-100 dark:border-gray-800">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;