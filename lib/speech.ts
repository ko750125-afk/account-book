export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorLike {
  error: string;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return null;
  }
  return new Ctor();
}

export function speechErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "마이크 권한이 필요해요. 주소창 왼쪽 아이콘에서 마이크를 허용해 주세요.";
  }
  if (error === "no-speech") {
    return "음성을 듣지 못했어요. 다시 눌러 말씀해 주세요.";
  }
  if (error === "audio-capture") {
    return "마이크를 찾을 수 없어요.";
  }
  if (error === "network") {
    return "음성 인식 네트워크 오류가 났어요. 잠시 후 다시 시도해 주세요.";
  }
  return "음성 인식에 실패했어요. 다시 시도해 주세요.";
}

let microphoneUnlocked = false;

export async function unlockMicrophonePermission(): Promise<void> {
  if (microphoneUnlocked) {
    return;
  }

  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (status.state === "granted") {
      microphoneUnlocked = true;
      return;
    }
  } catch {
    // Safari 등은 microphone permission query를 지원하지 않습니다.
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => {
    track.stop();
  });
  microphoneUnlocked = true;
  await new Promise((resolve) => {
    window.setTimeout(resolve, 80);
  });
}
