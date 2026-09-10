"use client";

// Web Audio API Context (싱글톤으로 재사용하여 성능 최적화 및 브라우저 정책 대응)
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * 특정 주파수와 지속 시간으로 비프음을 재생합니다.
 */
function playTone(frequency: number, type: OscillatorType, durationMs: number, slideToFreq?: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 브라우저 정책상 사용자 상호작용 없이 AudioContext가 일시정지 상태일 수 있음
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  if (slideToFreq) {
    osc.frequency.linearRampToValueAtTime(slideToFreq, ctx.currentTime + durationMs / 1000);
  }

  // 부드러운 페이드 아웃으로 팝핑 노이즈 방지
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + durationMs / 1000);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

/**
 * WMS 3중 감각 피드백 엔진 (Audio + Haptic)
 * 기획서 명세에 따른 피드백 제공
 */
export const feedback = {
  // 정상 스캔 / 카운트 +1
  normal() {
    playTone(1200, 'sine', 50);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  // 로케이션 일치 도달
  match() {
    playTone(880, 'sine', 80);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }
  },

  // 목표 수량 달성 완료
  complete() {
    playTone(1500, 'sine', 120);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 100]);
    }
  },

  // 오스캔 / 불일치 에러
  error() {
    // 400Hz 저음 버저음 2회 (100ms x 2)
    playTone(400, 'square', 100);
    setTimeout(() => playTone(400, 'square', 100), 150);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(250);
    }
  },

  // 명령 실행 (CMD-*)
  command() {
    // 600Hz -> 1000Hz 슬라이드 상승음
    playTone(600, 'sine', 150, 1000);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }
};
