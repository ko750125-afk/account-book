export function prefersNativeCameraCapture(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  if (/Android|iPhone|iPod/i.test(userAgent)) {
    return true;
  }
  if (/iPad/i.test(userAgent)) {
    return true;
  }
  return navigator.maxTouchPoints > 1 && /Mac/i.test(userAgent);
}
