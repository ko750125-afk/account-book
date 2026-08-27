"use client";

import { useEffect, useRef, useState } from "react";
import {
  acquireMicrophoneStream,
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  releaseMicrophoneStream,
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
  const startingRef = useRef(false);
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
      releaseMicrophoneStream();
    };
  }, []);

  function getRecognition(): SpeechRecognitionLike | null {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      return null;
    }

    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;

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
      const text = finalTextRef.current.trim();
      if (text) {
        onFinalRef.current(text);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  async function start() {
    if (!enabled || isListening || startingRef.current) {
      return;
    }

    const recognition = getRecognition();
    if (!recognition) {
      onErrorRef.current?.(
        "이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 이용해 주세요.",
      );
      return;
    }

    startingRef.current = true;
    finalTextRef.current = "";

    try {
      await acquireMicrophoneStream();
      recognition.start();
      setIsListening(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        onErrorRef.current?.(
          "마이크 권한이 필요해요. 주소창 왼쪽 아이콘에서 마이크를 항상 허용해 주세요.",
        );
        return;
      }
      onErrorRef.current?.("음성 인식을 시작하지 못했어요. 다시 시도해 주세요.");
    } finally {
      startingRef.current = false;
    }
  }

  function toggle() {
    if (isListening) {
      stop();
      return;
    }
    void start();
  }

  return { isListening, isSupported, start, stop, toggle };
}
