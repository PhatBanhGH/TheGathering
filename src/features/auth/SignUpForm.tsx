import React, { useState, useRef, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface Props { 
  email: string; 
  onSuccess: (data: { password: string; fullName: string }) => void; 
  onBack: () => void; 
}

export default function SignUpForm({ email, onSuccess, onBack }: Props) {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capToken, setCapToken] = useState<string|null>(null);
  const recapRef = useRef<ReCAPTCHA>(null);

  // State kiểm tra độ mạnh mật khẩu
  const [passValidations, setPassValidations] = useState({
    minLength: false,
    hasNumber: false,
    hasUpper: false,
    hasLower: false,
    noSequence: true // Không chứa chuỗi dễ đoán (đơn giản hóa)
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Hàm kiểm tra mật khẩu realtime
  useEffect(() => {
    setPassValidations({
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      noSequence: !/(123|abc|qwerty)/i.test(password) // Ví dụ đơn giản
    });
  }, [password]);

  const isFormValid = Object.values(passValidations).every(Boolean) && firstName && lastName && capToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capToken) return alert("Vui lòng xác minh CAPTCHA");
    if (!Object.values(passValidations).every(Boolean)) return; // Chặn nếu pass yếu

    try {
      const res = await fetch(`${serverUrl}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken: capToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(`Mã xác thực đã gửi đến ${email}`);
      const fullName = `${firstName} ${lastName}`.trim();
      onSuccess({ password, fullName }); 

    } catch (err) {
      alert((err as Error).message);
      setCapToken(null); recapRef.current?.reset();
    }
  };

  return (
    <div className="login-container">
      <h1 style={{ textAlign: 'left', marginBottom: '10px', fontSize: '1.8rem' }}>Tạo Tài Khoản</h1>
      <p style={{ textAlign: 'left', fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
        Vui lòng nhập tên đầy đủ của bạn và mật khẩu.
      </p>

      <form onSubmit={handleSubmit}>
        {/* HỌ TÊN */}
        <input 
          className="email-input" placeholder="Tên" 
          value={firstName} onChange={e=>setFirstName(e.target.value)} required 
        />
        <input 
          className="email-input" placeholder="Họ" 
          value={lastName} onChange={e=>setLastName(e.target.value)} required 
        />

        {/* MẬT KHẨU + TOOLTIP */}
        <div style={{ position: 'relative' }}>
          <input 
            type={showPassword ? "text" : "password"} 
            className={`email-input ${showTooltip && !Object.values(passValidations).every(Boolean) ? 'input-error' : ''}`}
            placeholder="Mật khẩu" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            required 
            style={{ paddingRight: '40px' }}
          />
          <span 
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '15px', top: '15px', cursor: 'pointer', color: '#666' }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>

          {/* TOOLTIP VALIDATION (Hiện khi focus hoặc nhập sai) */}
          {showTooltip && (
            <div className="password-tooltip">
              <p style={{fontWeight: 'bold', marginBottom: 5}}>Mật khẩu phải bao gồm ít nhất:</p>
              <ul>
                <li className={passValidations.minLength ? 'valid' : 'invalid'}>
                  {passValidations.minLength ? <FaCheckCircle/> : <FaTimesCircle/>} 8 ký tự
                </li>
                <li className={passValidations.hasNumber ? 'valid' : 'invalid'}>
                  {passValidations.hasNumber ? <FaCheckCircle/> : <FaTimesCircle/>} 1 số
                </li>
                <li className={passValidations.hasUpper ? 'valid' : 'invalid'}>
                  {passValidations.hasUpper ? <FaCheckCircle/> : <FaTimesCircle/>} 1 chữ cái viết hoa
                </li>
                <li className={passValidations.hasLower ? 'valid' : 'invalid'}>
                  {passValidations.hasLower ? <FaCheckCircle/> : <FaTimesCircle/>} 1 chữ cái viết thường
                </li>
              </ul>
              <p style={{fontWeight: 'bold', marginTop: 10, marginBottom: 5}}>Mật khẩu không được bao gồm:</p>
              <ul>
                 <li className={passValidations.noSequence ? 'valid' : 'invalid'}>
                  {passValidations.noSequence ? <FaCheckCircle/> : <FaTimesCircle/>} 4 ký tự liên tiếp (ví dụ "1234")
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="captcha-container" style={{ justifyContent: 'flex-start' }}>
            <ReCAPTCHA ref={recapRef} sitekey="6LdZ-R8sAAAAAJsVD-PuCr4JUdHNpQK0t74ouIpM" onChange={setCapToken} />
        </div>

        <button 
          className="btn btn-email" 
          style={{ marginTop: '20px', opacity: isFormValid ? 1 : 0.6, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
          disabled={!isFormValid}
        >
          Tiếp tục
        </button>
      </form>
      
      <button className="cancel-button" onClick={onBack} type="button">Quay lại</button>
    </div>
  );
}