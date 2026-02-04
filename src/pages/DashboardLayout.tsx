import React, { useState, useEffect } from 'react';
import { UserMenuPopup, EditProfileModal } from '../features/profile/ProfileModals';

interface Props {
  onLogout: () => void;
  onEditAvatarRequest: () => void;
  onSettingsRequest: () => void;
  onEnterGame: () => void;
}

export const DashboardLayout = ({ onLogout, onEditAvatarRequest, onSettingsRequest, onEnterGame }: Props) => {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
  const [user, setUser] = useState<any>({
    displayName: 'Loading...',
    profileColor: '#87CEEB',
    avatarConfig: {},
  });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${serverUrl}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data) setUser((prev: any) => ({ ...prev, ...data }));
      })
      .catch(() => { });
  }, []);

  const handleSaveProfile = (newName: string, newColor: string) => {
    setUser({ ...user, displayName: newName, profileColor: newColor });
    setShowEditModal(false);
  };

  return (
    // ✅ Main Container: Thêm dark mode background & text
    <div className="flex w-screen h-screen bg-[#F5F7FA] dark:bg-gray-900 font-sans text-[#232333] dark:text-gray-100 transition-colors duration-300">

      {/* --- SIDEBAR --- */}
      {/* ✅ Sidebar: Thêm dark mode background & border */}
      <aside className="w-[280px] bg-white dark:bg-gray-800 border-r border-[#E4E4E6] dark:border-gray-700 flex flex-col justify-between p-6 transition-colors duration-300">
        <div>
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold">G</div>
            <span className="font-bold text-lg dark:text-white">The Gathering</span>
          </div>

          <nav className="space-y-2">
            <SidebarLink icon="🏠" label="Trang chủ" active />
            <SidebarLink icon="☕" label="Không gian" />
            <SidebarLink icon="💬" label="Cộng đồng" />
            <SidebarLink icon="📚" label="Thư viện" />

            <div onClick={onSettingsRequest}>
              <SidebarLink icon="⚙️" label="Cài đặt" />
            </div>
          </nav>
        </div>

        {/* WIDGET USER */}
        <div className="relative">
          <div
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ backgroundColor: user.profileColor || '#87CEEB' }}>
              {user.displayName?.charAt(0).toUpperCase()}
              {/* Chấm xanh online: viền trắng ở light mode, viền xám ở dark mode */}
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 translate-x-1 -translate-y-1"></div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate dark:text-white">{user.displayName}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Online</p>
            </div>
          </div>

          {showUserMenu && (
            <UserMenuPopup
              user={user}
              onClose={() => setShowUserMenu(false)}
              onLogout={onLogout}
              onEditProfile={() => {
                setShowUserMenu(false);
                setShowEditModal(true);
              }}
            />
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">Chào buổi sáng, {user.displayName}.</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10">Chúc bạn một ngày làm việc hiệu quả!</p>

        <button
          type="button"
          onClick={onEnterGame}
          className="bg-teal-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-800 transition-colors mb-10 shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          ➜ Vào Không Gian Làm Việc
        </button>
      </main>

      {/* MODAL EDIT PROFILE */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
          onEditAvatar={onEditAvatarRequest}
        />
      )}
    </div>
  );
};

// Component Sidebar Link (Cập nhật dark mode styles cho trạng thái Active/Inactive)
const SidebarLink = ({ icon, label, active }: any) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${active
    ? 'bg-teal-50 text-teal-800 font-bold dark:bg-teal-900/30 dark:text-teal-400'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
    }`}>
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </div>
);