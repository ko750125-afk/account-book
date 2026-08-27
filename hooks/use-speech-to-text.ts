"use client";

import { useEffect, useRef, useState } from "react";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  speechErrorMessage,
  type SpeechRecognitionLike,
} from "@/lib/speech";

interface UseSpeechToTextOptions {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export function useSpeechToText({
  onFinal,
  onInterim,
  onError,
  enabled = true,
}: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  onFinalRef.current = onFinal;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function stop() {
    recognitionRef.current?.stop();
  }

  function start() {
    if (!enabled || isListening) {
      return;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      onErrorRef.current?.(
        "이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 이용해 주세요.",
      );
      return;
    }

    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;
    finalTextRef.current = "";

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      finalTextRef.current = finalText.trim();
      const liveText = `${finalText} ${interim}`.trim();
      if (liveText) {
        onInterimRef.current?.(liveText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        return;
      }
      onErrorRef.current?.(speechErrorMessage(event.error));
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      const text = finalTextRef.current.trim();
      if (text) {
        onFinalRef.current(text);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      onErrorRef.current?.("음성 인식을 시작하지 못했어요. 다시 시도해 주세요.");
    }
  }

  function toggle() {
    if (isListening) {
      stop();
      return;
    }
    start();
  }

  return { isListening, isSupported, start, stop, toggle };
}
