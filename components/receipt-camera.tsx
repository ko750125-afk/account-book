"use client";

import { useEffect, useRef, useState } from "react";

interface ReceiptCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function ReceiptCamera({ onCapture, onClose }: ReceiptCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setError("카메라를 켤 수 없어요. 권한을 허용해 주세요.");
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.86);
    });
    if (!blob) {
      return;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    onCapture(new File([blob], "receipt-camera.jpg", { type: "image/jpeg" }));
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="min-h-0 flex-1 bg-black object-cover"
      />
      {error ? (
        <p className="absolute inset-x-4 top-4 rounded-xl bg-black/70 px-3 py-2 text-center text-[14px] text-white">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 bg-black px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-2 text-[16px] font-medium text-white"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => {
            void handleCapture();
          }}
          disabled={Boolean(error)}
          aria-label="촬영"
          className="h-16 w-16 rounded-full border-4 border-white bg-[#e45b4c] disabled:opacity-40"
        />
        <span className="w-10" />
      </div>
    </div>
  );
}
