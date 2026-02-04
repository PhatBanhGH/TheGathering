import React, { useState } from 'react';
import { FaLaptop, FaMobileAlt, FaTrash, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

export default function AccountSettings() {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
  // State form
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  
  // State trạng thái
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Mock Data Sessions (Giữ nguyên demo phần này)
  const sessions = [
    { id: 1, device: 'Windows PC - Chrome', location: 'Ho Chi Minh City', active: 'Active now', current: true, type: 'desktop' },
    { id: 2, device: 'iPhone 13 - Safari', location: 'Ho Chi Minh City', active: '2 hours ago', current: false, type: 'mobile' },
  ];

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 1. Validate cơ bản
    if (!passForm.current || !passForm.new || !passForm.confirm) {
        return setMessage({ type: 'error', text: "Vui lòng điền đầy đủ thông tin." });
    }
    if (passForm.new !== passForm.confirm) {
        return setMessage({ type: 'error', text: "Mật khẩu mới và xác nhận không khớp!" });
    }
    if (passForm.new.length < 6) {
        return setMessage({ type: 'error', text: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    setLoading(true);
    try {
      // 2. Gọi API
      const token = localStorage.getItem('token');
      const res = await fetch(`${serverUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            currentPassword: passForm.current,
            newPassword: passForm.new 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Lỗi khi đổi mật khẩu");
      }

      // 3. Thành công
      setMessage({ type: 'success', text: "Đổi mật khẩu thành công!" });
      setPassForm({ current: '', new: '', confirm: '' }); // Reset form

    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      
      {/* 1. ĐỔI MẬT KHẨU */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Đổi mật khẩu</h2>
        <p className="text-sm text-gray-500 mb-6">Nên sử dụng mật khẩu mạnh để bảo vệ tài khoản.</p>

        {/* Thông báo lỗi/thành công */}
        {message && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
                {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                {message.text}
            </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
             <input type="password" 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                value={passForm.current} 
                onChange={e => setPassForm({...passForm, current: e.target.value})}
                disabled={loading}
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
             <input type="password" 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                value={passForm.new} 
                onChange={e => setPassForm({...passForm, new: e.target.value})}
                disabled={loading}
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
             <input type="password" 
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                value={passForm.confirm} 
                onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                disabled={loading}
             />
           </div>
           <div className="pt-2">
             <button 
                type="submit"
                disabled={loading}
                className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
                    loading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-900 text-white hover:bg-black'
                }`}
             >
                {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
             </button>
           </div>
        </form>
      </section>

      <hr className="border-gray-100" />

      {/* 2. QUẢN LÝ THIẾT BỊ (SESSIONS) - Demo UI */}
      <section>
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Thiết bị đăng nhập</h2>
                <p className="text-sm text-gray-500">Quản lý và đăng xuất các phiên làm việc.</p>
            </div>
            <button className="text-sm text-red-600 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                Đăng xuất tất cả thiết bị
            </button>
        </div>

        <div className="space-y-3">
            {sessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-lg">
                            {session.type === 'desktop' ? <FaLaptop /> : <FaMobileAlt />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800 text-sm">{session.device}</h4>
                                {session.current && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">This device</span>}
                            </div>
                            <p className="text-xs text-gray-500">{session.location} • {session.active}</p>
                        </div>
                    </div>
                    {!session.current && (
                        <button className="text-gray-400 hover:text-red-500 p-2 transition-colors" title="Đăng xuất thiết bị này">
                            <FaTrash />
                        </button>
                    )}
                </div>
            ))}
        </div>
      </section>

      <hr className="border-gray-100" />
      
      {/* 3. VÙNG NGUY HIỂM */}
      <section className="bg-red-50 border border-red-100 rounded-2xl p-6">
         <h2 className="text-lg font-bold text-red-700 mb-2">Vùng nguy hiểm</h2>
         <p className="text-sm text-red-600/80 mb-4">Một khi bạn xóa tài khoản, không thể quay lại. Xin hãy chắc chắn.</p>
         <button className="px-5 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
            Xóa tài khoản
         </button>
      </section>

    </div>
  );
}