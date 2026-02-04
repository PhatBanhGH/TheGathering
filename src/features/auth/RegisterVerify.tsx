import React, { useState } from 'react';

interface Props { 
  email: string; 
  regData: { password: string; fullName: string }; 
  onBack: () => void; 
  customVerifyAction?: (otp: string) => void;
  // ▼▼▼ MỚI: Hàm để báo cho App biết đã đăng ký xong ▼▼▼
  onRegisterSuccess?: (token: string) => void;
}

export default function RegisterVerify({ email, regData, onBack, customVerifyAction, onRegisterSuccess }: Props) {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5001";
  const [otp, setOtp] = useState('');
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Trường hợp dùng cho Quên Mật Khẩu
    if (customVerifyAction) {
        customVerifyAction(otp);
        return;
    }

    // 2. Trường hợp Đăng Ký Mới
    try {
      const res = await fetch(`${serverUrl}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email, 
            password: regData.password, 
            fullName: regData.fullName, 
            otp 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      alert("Đăng ký thành công! Chào mừng " + regData.fullName);
      
      // ▼▼▼ QUAN TRỌNG: Truyền token lên App để chuyển sang bước chọn Avatar ▼▼▼
      if (onRegisterSuccess) {
        onRegisterSuccess(data.accessToken);
      } else {
        // Fallback nếu không truyền hàm (reload trang)
        localStorage.setItem('token', data.accessToken);
        window.location.reload();
      }

    } catch (err) { alert((err as Error).message); }
  };

  return (
    <div className="login-container">
      <h1>Kiểm tra Email</h1>
      <p className="verify-subtitle">
        Mã xác minh đã được gửi đến <b>{email}</b>
      </p>
      
      <form onSubmit={handleRegister}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
            <input 
                className="email-input" 
                style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem', fontWeight: 'bold' }}
                placeholder="MÃ OTP" 
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                required 
                maxLength={6} 
                autoFocus
            />
        </div>
        
        <button className="btn btn-email">Xác minh</button>
      </form>
      
      <button className="cancel-button" onClick={onBack} type="button">
          Quay lại / Gửi lại mã
      </button>
    </div>
  );
}