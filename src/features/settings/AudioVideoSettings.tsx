import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaVideo, FaVolumeUp } from 'react-icons/fa';

export default function AudioVideoSettings() {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  // 👇 Ref để tham chiếu đến thẻ video thật
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Xin quyền & Lấy danh sách thiết bị
  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setPermission(true);

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);
        
        // Set mặc định nếu chưa chọn
        if (!selectedMic) {
            const audio = deviceList.find(d => d.kind === 'audioinput');
            if (audio) setSelectedMic(audio.deviceId);
        }
        if (!selectedCam) {
            const video = deviceList.find(d => d.kind === 'videoinput');
            if (video) setSelectedCam(video.deviceId);
        }
        if (!selectedSpeaker) {
            const speaker = deviceList.find(d => d.kind === 'audiooutput');
            if (speaker) setSelectedSpeaker(speaker.deviceId);
        }

      } catch (err) {
        console.error("Lỗi quyền media:", err);
        setPermission(false);
      }
    }
    getDevices();
  }, []); // Chạy 1 lần đầu

  // 👇 2. LOGIC HIỂN THỊ CAMERA (MỚI)
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
        if (!selectedCam || !videoRef.current) return;

        try {
            // Dừng stream cũ nếu có
            if (videoRef.current.srcObject) {
                const oldStream = videoRef.current.srcObject as MediaStream;
                oldStream.getTracks().forEach(track => track.stop());
            }

            // Lấy stream mới dựa trên selectedCam
            stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedCam } }
            });

            // Gán vào thẻ video
            videoRef.current.srcObject = stream;
        } catch (e) {
            console.error("Không thể mở camera:", e);
        }
    }

    startCamera();

    // Cleanup khi component unmount hoặc đổi camera
    return () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [selectedCam]);


  if (permission === false) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <h3 className="font-bold">Không thể truy cập thiết bị</h3>
        <p className="text-sm">Vui lòng cho phép trình duyệt truy cập Camera và Microphone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* 👇 PREVIEW CAMERA THẬT */}
      <section className="bg-black rounded-2xl aspect-video w-full flex items-center justify-center relative overflow-hidden shadow-lg">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform -scale-x-100" // Lật gương
          />
          
          <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Camera Preview
          </div>
      </section>

      {/* MICROPHONE */}
      <section>
        <label className="block font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
            <FaMicrophone /> Microphone
        </label>
        <select 
            className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={selectedMic}
            onChange={e => setSelectedMic(e.target.value)}
        >
            {devices.filter(d => d.kind === 'audioinput').map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${idx + 1}`}
                </option>
            ))}
        </select>
        <div className="mt-2 flex items-center gap-2">
             <input type="checkbox" id="noise" className="rounded text-blue-600" />
             <label htmlFor="noise" className="text-sm text-gray-600 dark:text-gray-400">Khử tiếng ồn (Noise Suppression)</label>
        </div>
      </section>

      {/* CAMERA SELECT */}
      <section>
        <label className="block font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
            <FaVideo /> Camera
        </label>
        <select 
            className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={selectedCam}
            onChange={e => setSelectedCam(e.target.value)}
        >
            {devices.filter(d => d.kind === 'videoinput').map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                </option>
            ))}
        </select>
      </section>

      {/* SPEAKER */}
      <section>
        <label className="block font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
            <FaVolumeUp /> Loa / Tai nghe
        </label>
        <select 
            className="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            value={selectedSpeaker}
            onChange={e => setSelectedSpeaker(e.target.value)}
        >
            {devices.filter(d => d.kind === 'audiooutput').map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${idx + 1}`}
                </option>
            ))}
        </select>
      </section>

    </div>
  );
}