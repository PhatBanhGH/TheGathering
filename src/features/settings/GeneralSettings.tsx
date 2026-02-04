import React, { useState, useEffect } from 'react';
import { FaBell, FaLock, FaMoon, FaSun, FaCheck } from 'react-icons/fa';

// Component Switch Toggles
const Switch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function GeneralSettings() {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // 1. KHỞI TẠO STATE: Luôn nhìn vào thực tế (Class HTML)
  const [settings, setSettings] = useState(() => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      emailNotify: true,
      browserNotify: false, 
      onlineStatus: 'public',
      allowInvites: 'everyone',
      autoFocus: true,
      theme: isDark ? 'dark' : 'light' 
    };
  });

  // Helper: Hàm đổi màu DOM
  const toggleDarkMode = (isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  };

  // 2. LOAD SETTINGS TỪ SERVER
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${serverUrl}/api/user/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if(data) {
        // Lấy theme hiện tại đang hiển thị trên màn hình
        const currentRealTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        
        setSettings(prev => ({ 
            ...prev, 
            ...data,
            // 🛑 CHẶN ĐỨNG việc Server ghi đè Theme khi mới load
            theme: currentRealTheme 
        }));
      }
    })
    .catch(err => console.error("Lỗi tải settings:", err));
  }, []);

  // 3. HÀM GỌI API LƯU
  const saveToServer = async (dataToSave: any) => {
    setLoading(true);
    setSaveStatus('Đang lưu...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${serverUrl}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(dataToSave)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('Đã lưu thành công');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        if (res.status === 401 || res.status === 403) {
            setSaveStatus('Phiên đăng nhập hết hạn...');
            return;
        }
        setSaveStatus('Lỗi lưu: ' + (data.message || 'Server error'));
      }
    } catch (err) {
      setSaveStatus('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  // 4. XỬ LÝ KHI CLICK ĐỔI THEME (QUAN TRỌNG NHẤT)
  const handleThemeChange = (newTheme: string) => {
    // A. Đổi màu ngay lập tức (DOM)
    toggleDarkMode(newTheme === 'dark');
    
    // B. Cập nhật State React
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);
    
    // C. ✅ LƯU VÀO LOCALSTORAGE (Để Landing Page/App.tsx đọc được)
    localStorage.setItem('theme', newTheme);
    
    // D. Lưu lên Server (Backup)
    saveToServer(newSettings);
  };

  const handleSave = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveToServer(newSettings);
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      
      {/* Hiển thị trạng thái lưu */}
      {saveStatus && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-bold shadow-lg z-50 transition-opacity duration-300 ${
            saveStatus.includes('Lỗi') || saveStatus.includes('hết hạn') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
            {saveStatus}
        </div>
      )}

      {/* --- NOTIFICATIONS --- */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FaBell className="text-gray-400"/> Thông báo & Làm phiền
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 transition-colors duration-300">
            <div className="p-4 flex justify-between items-center">
                <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">Email thông báo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nhận email khi có lời mời họp hoặc tin nhắn quan trọng.</p>
                </div>
                <Switch checked={settings.emailNotify} onChange={v => handleSave('emailNotify', v)} />
            </div>
            <div className="p-4 flex justify-between items-center">
                <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">Thông báo trình duyệt</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hiển thị popup khi có người nhắc đến bạn (@mention).</p>
                </div>
                <Switch checked={settings.browserNotify} onChange={v => handleSave('browserNotify', v)} />
            </div>
        </div>
      </section>

      {/* --- PRIVACY & SAFETY --- */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FaLock className="text-gray-400"/> Riêng tư & An toàn
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6 transition-colors duration-300">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trạng thái Online</label>
                <select 
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
                    value={settings.onlineStatus}
                    onChange={e => handleSave('onlineStatus', e.target.value)}
                >
                    <option value="public">Công khai (Mọi người đều thấy)</option>
                    <option value="friends">Chỉ bạn bè</option>
                    <option value="hidden">Ẩn (Invisible)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ai có thể mời bạn vào phiên?</label>
                <select 
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white transition-colors"
                    value={settings.allowInvites}
                    onChange={e => handleSave('allowInvites', e.target.value)}
                >
                    <option value="everyone">Mọi người</option>
                    <option value="friends">Chỉ người theo dõi</option>
                    <option value="none">Không ai cả</option>
                </select>
            </div>
        </div>
      </section>

      {/* --- SESSION DEFAULTS --- */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Mặc định phiên làm việc</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center transition-colors duration-300">
             <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">Tự động vào chế độ "Focus"</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tự động đổi trạng thái khi bạn tham gia phòng làm việc.</p>
            </div>
            <Switch checked={settings.autoFocus} onChange={v => handleSave('autoFocus', v)} />
        </div>
      </section>

      {/* --- THEME --- */}
      <section>
         <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Giao diện</h2>
         <div className="flex gap-4">
             {['light', 'dark'].map(theme => (
                 <div 
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={`flex-1 p-4 border rounded-xl cursor-pointer flex items-center justify-center gap-2 capitalize font-medium transition-all duration-200 ${
                        settings.theme === theme 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-400' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:bg-gray-800'
                    }`}
                 >
                    {theme === 'light' ? <FaSun /> : <FaMoon />} {theme}
                    {settings.theme === theme && <FaCheck className="ml-auto"/>}
                 </div>
             ))}
         </div>
      </section>

    </div>
  );
}