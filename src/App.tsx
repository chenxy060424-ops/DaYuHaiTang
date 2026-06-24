/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera as CameraIcon, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  Play, 
  Eye, 
  EyeOff, 
  VolumeX, 
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Heart,
  Upload,
  X,
  Volume2,
  Maximize2,
  Settings,
  Music,
  SkipBack,
  SkipForward,
  Disc,
  Pause
} from "lucide-react";
import { Particle, HandData, GameConfig, SpiritFish } from "./types";

const bgImgUrl = "/src/assets/images/dayu_begonia_tulou_bg_1780979617236.png";

interface Lantern {
  rx: number; // relative center X (0..1)
  ry: number; // relative center Y (0..1)
  rw: number; // relative half-width (0..1)
  rh: number; // relative half-height (0..1)
  label: string;
}

const LANTERNS: Lantern[] = [
  { rx: 0.082, ry: 0.175, rw: 0.052, rh: 0.085, label: "左侧首灯" },
  { rx: 0.224, ry: 0.245, rw: 0.045, rh: 0.072, label: "廊道二灯" },
  { rx: 0.385, ry: 0.302, rw: 0.038, rh: 0.060, label: "廊道深处" },
  { rx: 0.552, ry: 0.342, rw: 0.032, rh: 0.052, label: "神庭枢纽" },
  { rx: 0.812, ry: 0.362, rw: 0.046, rh: 0.075, label: "右侧华灯" }
];

// Mathematical inside-check for vertically-elongated oval/ellipse Chinese lanterns
function isPointInEllipse(px: number, py: number, cx: number, cy: number, rw: number, rh: number) {
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx) / (rw * rw) + (dy * dy) / (rh * rh) <= 1.0;
}

// Draw traditional Chinese elliptical outline
function drawEllipsePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
}

// Helper functions for detecting and rendering iframe-based video platforms (Bilibili / YouTube)
const isIframeVideoUrl = (url: string) => {
  if (!url) return false;
  const normUrl = url.toLowerCase();
  return (
    normUrl.includes("bilibili.com") || 
    normUrl.includes("b23.tv") || 
    normUrl.includes("youtube.com") || 
    normUrl.includes("youtu.be") ||
    /^[A-Za-z0-9_-]{11}$/.test(url) || // Matches standard YouTube video IDs
    /^BV[A-Za-z0-9]{10}$/.test(url)    // Matches standard Bilibili BV IDs
  );
};

const getIframeSrc = (url: string) => {
  if (!url) return "";
  
  // If Bilibili bvid
  let bvid = "";
  if (/^BV[A-Za-z0-9]{10}$/.test(url)) {
    bvid = url;
  } else {
    const bvidMatch = url.match(/(BV[A-Za-z0-9]{10})/i);
    if (bvidMatch) bvid = bvidMatch[1];
  }
  
  if (bvid) {
    // Return high quality player embed
    return `//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&as_wide=1&danmaku=0&autoplay=1`;
  }

  // If YouTube ID
  let ytId = "";
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
    ytId = url;
  } else {
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    if (ytMatch) ytId = ytMatch[1];
  }

  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&mute=0`;
  }

  return "";
};

// Ethereal Zen Audio Synthesizer powered by native HTML5 Web Audio API & Zhou Shen "Big Fish" BGM
class ZenSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastTinkleTime = 0;
  private isInitialized = false;
  private loopOscs: OscillatorNode[] = [];
  private isMuted = false;
  private bgAudio: HTMLAudioElement | null = null;

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Initialize Zhou Shen's "大鱼" (Big Fish) BGM using NetEase Cloud Music high-fidelity stream URL
      this.bgAudio = new Audio();
      
      // Handle and prevent global script error propagation from media load failures
      this.bgAudio.addEventListener("error", (e) => {
        console.warn("BGM background audio element encountered a loading/mixed-content error (silenced):", e);
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch (err) {}
      }, true);

      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.45;
      this.bgAudio.src = BGM_TRACKS[0].url;

      if (!this.isMuted) {
        this.bgAudio.play().catch((err) => {
          console.log("Autoplay of Big Fish BGM waiting for user interaction:", err);
        });
      }

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio system not initialized/supported:", e);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetVol = muted ? 0 : 0.25;
      this.masterGain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 0.15);
    }
    if (this.bgAudio) {
      if (muted) {
        this.bgAudio.pause();
      } else {
        this.bgAudio.play().catch((err) => {
          console.warn("Big Fish BGM play failed:", err);
        });
      }
    }
  }

  pauseBGM() {
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  resumeBGM() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => {
        console.warn("Failed to resume AudioContext in resumeBGM:", err);
      });
    }
    if (this.bgAudio && !this.isMuted) {
      this.bgAudio.play().catch((err) => {
        console.warn("Big Fish BGM play failed:", err);
      });
    }
  }

  setBGMTrack(url: string) {
    if (this.bgAudio) {
      const wasPlaying = !this.bgAudio.paused;
      this.bgAudio.src = url;
      if (wasPlaying && !this.isMuted) {
        this.bgAudio.play().catch((err) => {
          console.warn("BGM track change and autoplay failed:", err);
        });
      }
    }
  }

  setBGMVolume(volume: number) {
    if (this.bgAudio) {
      this.bgAudio.volume = volume;
    }
  }

  setBGMPlaying(playing: boolean) {
    if (!this.bgAudio) return;
    if (playing) {
      if (!this.isMuted) {
        this.bgAudio.play().catch((err) => {
          console.warn("BGM play failed:", err);
        });
      }
    } else {
      this.bgAudio.pause();
    }
  }

  private startAmbientHum() {
    // Replaced by high-fidelity "Big Fish" background music
  }

  playChime(velocityStrength: number) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    if (now - this.lastTinkleTime < 0.08) return;
    this.lastTinkleTime = now;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66]; // Eb Major / C Pentatonic scale series
    const pitch = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    const feedback = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * (0.995 + Math.random() * 0.01), now + 0.5);

    const volume = Math.min(0.16, velocityStrength * 0.022 + 0.05);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    delay.delayTime.setValueAtTime(0.24, now);
    feedback.gain.setValueAtTime(0.38, now);

    osc.connect(gain);
    gain.connect(this.masterGain);

    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.masterGain);

    osc.start();
    osc.stop(now + 1.25);
  }

  playFishSplash() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(285, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.32);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(now + 0.4);
  }

  playAscendingSuccessSwell() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C major arpeggio
    notes.forEach((pitch, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(pitch, now + i * 0.12);
      
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 1.8);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 2.0);
    });
  }
}

// Cached offscreen canvas helper to prevent high-frequency GC pauses inside 60 FPS loop
let cachedOffscreenCanvas: HTMLCanvasElement | null = null;
let cachedOffscreenCtx: CanvasRenderingContext2D | null = null;

const getOffscreenCanvas = (w: number, h: number) => {
  if (!cachedOffscreenCanvas) {
    cachedOffscreenCanvas = document.createElement("canvas");
  }
  if (cachedOffscreenCanvas.width !== w || cachedOffscreenCanvas.height !== h) {
    cachedOffscreenCanvas.width = w;
    cachedOffscreenCanvas.height = h;
    cachedOffscreenCtx = null; // Recreate context for size change
  }
  if (!cachedOffscreenCtx) {
    cachedOffscreenCtx = cachedOffscreenCanvas.getContext("2d");
  }
  return { canvas: cachedOffscreenCanvas, ctx: cachedOffscreenCtx };
};

// Draw dynamic circular rotating Tulou sectors (only the wood-material detected pixels, matching CSS layered rendering)
const drawBackground = (
  targetCtx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLCanvasElement,
  w: number,
  h: number,
  frameTime: number,
  xOffset: number,
  yOffset: number,
  drawW: number,
  drawH: number,
  rotationAngle: number = 0,
  roofOpacity: number = 0,
  grayWoodCanvas: HTMLCanvasElement | null = null
) => {
  // Always draw static complete background first as the stable foundation
  targetCtx.drawImage(source, xOffset, yOffset, drawW, drawH);

  // If rotation is active, roof opacity is greater than 0, and we have a pre-filtered wood canvas:
  if (rotationAngle !== 0 && roofOpacity > 0 && grayWoodCanvas) {
    targetCtx.save();
    targetCtx.translate(xOffset + drawW * 0.5, yOffset + drawH * 0.345);
    targetCtx.rotate((rotationAngle * Math.PI) / 180);

    targetCtx.globalAlpha = roofOpacity;
    targetCtx.drawImage(grayWoodCanvas, -drawW * 0.5, -drawH * 0.345, drawW, drawH);
    targetCtx.restore();
  }
};

export const BGM_TRACKS = [
  {
    name: "《大鱼》 - 周深原唱版",
    description: "周深空灵婉转的原唱，重现海天交融的至美画卷",
    url: "/api/music-proxy?id=413812448"
  },
  {
    name: "《大鱼》 - 埙与箫唯美古风",
    description: "空灵的泥埙与清幽翠竹箫合奏，旷古悠远，超脱凡尘",
    url: "/api/music-proxy?id=1382575411"
  },
  {
    name: "《大鱼》 - 唯美古筝独奏",
    description: "如行云流水般的古筝演奏，述说大鱼海棠的凄美誓言",
    url: "/api/music-proxy?id=1439243714"
  },
  {
    name: "《大鱼》 - 梦幻钢琴伴奏",
    description: "如繁星闪烁般纯净的钢琴，还原指尖跃动的温暖旋律",
    url: "/api/music-proxy?id=418603077"
  }
];

export default function App() {
  const synthRef = useRef<ZenSynthesizer | null>(null);
  // References to main elements
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const moviePlayerRef = useRef<HTMLVideoElement | null>(null);
  
  // Offscreen helper canvases for ultra high performance (60 FPS)
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const grayscaleBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalSpritesRef = useRef<HTMLCanvasElement[]>([]);
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1200,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
    drawW: typeof window !== "undefined" ? window.innerWidth : 1200,
    drawH: typeof window !== "undefined" ? window.innerHeight : 800,
    xOffset: 0,
    yOffset: 0,
  });
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showConfig, setShowConfig] = useState(false);
  
  // User settings
  const [showCamPreview, setShowCamPreview] = useState(true);
  const [drawSkeleton, setDrawSkeleton] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);

  // Video and auto-play triggers
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("BV1bt411y7AR"); // Default to classic Big Fish and Begonia anime monologue scene (Bilibili entry)
  const [localVideoUrl, setLocalVideoUrl] = useState<string>(""); // Cloud active by default, can be customized with local video
  const [isMuted, setIsMuted] = useState(false);
  const [ambientMuted, setAmbientMuted] = useState(false);
  const [bgmTrackIndex, setBgmTrackIndex] = useState(0);
  const [bgmVolume, setBgmVolume] = useState(0.45);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false); // starts collapsed as an elegant note icon
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // BGM control actions
  const changeBGMTrack = (index: number) => {
    let nextIndex = index;
    if (index >= BGM_TRACKS.length) nextIndex = 0;
    if (index < 0) nextIndex = BGM_TRACKS.length - 1;
    
    setBgmTrackIndex(nextIndex);
    setAmbientMuted(false);
    
    if (!synthRef.current) {
      synthRef.current = new ZenSynthesizer();
    }
    synthRef.current.init();
    synthRef.current.setMuted(false);
    synthRef.current.setBGMTrack(BGM_TRACKS[nextIndex].url);
  };

  const changeBGMVolume = (vol: number) => {
    setBgmVolume(vol);
    if (synthRef.current) {
      synthRef.current.setBGMVolume(vol);
    }
  };

  const toggleBGMPlaying = () => {
    const nextMuted = !ambientMuted;
    setAmbientMuted(nextMuted);
    
    if (!synthRef.current) {
      synthRef.current = new ZenSynthesizer();
    }
    synthRef.current.init();
    synthRef.current.setMuted(nextMuted);
  };
  
  // Immersive story stage state management
  const [currentBgUrl, setCurrentBgUrl] = useState("/src/assets/images/dayu_begonia_tulou_bg_1780979617236.png");
  const [appStage, setAppStageState] = useState<"intro" | "prologue" | "prologue2" | "prologue3" | "painting" | "gate_locked" | "gate_opening" | "underwater_tree" | "completed">("intro");
  const appStageRef = useRef<"intro" | "prologue" | "prologue2" | "prologue3" | "painting" | "gate_locked" | "gate_opening" | "underwater_tree" | "completed">("intro");
  const [waveProgressCount, setWaveProgressCount] = useState(0);

  const setAppStage = (newStage: "intro" | "prologue" | "prologue2" | "prologue3" | "painting" | "gate_locked" | "gate_opening" | "underwater_tree" | "completed") => {
    appStageRef.current = newStage;
    setAppStageState(newStage);
    if (newStage !== "painting") {
      isBgRotatingRef.current = false;
      bgRotationAngleRef.current = 0;
      roofOpacityRef.current = 0;
      if (domRotatingRoofRef.current) {
        domRotatingRoofRef.current.style.display = "none";
        domRotatingRoofRef.current.style.opacity = "0";
        domRotatingRoofRef.current.style.transform = "";
      }
      if (domStaticBgRef.current) {
        domStaticBgRef.current.style.opacity = "1";
      }
    }
  };

  const gateProgressRef = useRef(0);
  const transitionBlackscreenOpacityRef = useRef(0);
  const waveStateRef = useRef({
    lastDir: 0,
    lastSwitchTime: 0,
    switchCount: 0
  });
  const lanternLightsRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const lastWaveCountRef = useRef(0);
  const litLanternsRef = useRef<boolean[]>([false, false, false, false, false]);
  const lanternAnimProgressRef = useRef<number[]>([0, 0, 0, 0, 0]);

  // Interactivity values stored in refs for 60fps loop (avoids heavy React re-renders)
  const particles = useRef<Particle[]>([]);
  const nextParticleId = useRef(0);
  const fishes = useRef<SpiritFish[]>([]);
  const handStateRef = useRef<HandData>({
    present: false,
    x: 0.5,
    y: 0.5,
    isOpen: false,
    score: 0,
    velocity: { x: 0, y: 0 }
  });
  
  // Frame counters and auto trigger refs for calculation optimization
  const previousProgressRef = useRef(0);
  const hasAutoTriggeredRef = useRef(false);
  const frameCountRef = useRef(0);

  const [underwaterProgress, setUnderwaterProgress] = useState(0);
  const [isTransitioningToMedia, setIsTransitioningToMedia] = useState(false);
  const [poppingQuote, setPoppingQuote] = useState<{ text: string; time: number } | null>(null);
  const rootGlowIntensityRef = useRef(0);
  const underwaterBubblesRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    alpha: number;
    life: number;
  }[]>([]);
  const blessingBubblesRef = useRef<{
    id: number;
    x: number;
    y: number;
    r: number;
    text: string;
    textPre: string;
    vx: number;
    vy: number;
    alpha: number;
  }[]>([]);
  const summonedKunRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    size: number;
    progress: number;
    pathPoints: { x: number; y: number }[];
    swimCycle: number;
    glowingTrails: { x: number; y: number; alpha: number; r: number; color: string }[];
  } | null>(null);
  
  // Track last known coordinate for velocity calculations (for touch / mouse fallback)
  const lastInteractionRef = useRef({ x: 0, y: 0, time: 0 });
  const isInteractingRef = useRef(false);
  const lastHandPosRef = useRef({ x: 0.5, y: 0.5 });
  const bgImageLoadedRef = useRef(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const domStaticBgRef = useRef<HTMLImageElement | null>(null);
  const domRotatingRoofRef = useRef<HTMLCanvasElement | null>(null);
  const grayWoodCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const roofOpacityRef = useRef(0);
  const bgRotationAngleRef = useRef(0);
  const isBgRotatingRef = useRef(false);
  const wasHandOpenRef = useRef(true);
  const introHoverTimerRef = useRef(0);
  
  // MediaPipe core objects refs
  const handsTracerRef = useRef<any>(null);
  const cameraTrackerRef = useRef<any>(null);
  
  // Global configuration
  const config = useRef<GameConfig>({
    maxPetals: 250,
    gravityY: 0.12,
    windX: -0.05
  });

  // Auto-dismiss popped bubble quote to keep the scene clean and elegant
  useEffect(() => {
    if (poppingQuote) {
      const timer = setTimeout(() => {
        setPoppingQuote(null);
      }, 2600); // Shorter cinematic reveal duration
      return () => clearTimeout(timer);
    }
  }, [poppingQuote]);

  // 1. Pre-render 4 beautiful high-resolution begonia petals styles onto offscreen canvases (薄如蝉翼，通透莹润)
  useEffect(() => {
    const spriteSizes = [56, 72, 64, 48]; // slightly larger for ultra clear high-res details
    const cachedSprites: HTMLCanvasElement[] = [];

    for (let i = 0; i < 4; i++) {
      const size = spriteSizes[i];
      const canvas = document.createElement("canvas");
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.save();
        ctx.translate(size, size);
        
        // Define beautiful glassy transparent pink-red linear + radial gradient mixture
        const grad = ctx.createRadialGradient(-size * 0.1, -size * 0.25, size * 0.05, 0, 0, size * 0.9);
        
        if (i === 0) {
          grad.addColorStop(0, "rgba(255, 235, 240, 0.95)"); // Softest peach pink heart highlight
          grad.addColorStop(0.35, "rgba(244, 63, 94, 0.65)"); // Translucent rose body
          grad.addColorStop(0.85, "rgba(159, 18, 57, 0.55)"); // Crimson bottom body
          grad.addColorStop(1, "rgba(76, 5, 25, 0.45)"); // Deep velvet base
        } else if (i === 1) {
          grad.addColorStop(0, "rgba(255, 228, 230, 0.9)"); // Light baby pink edge
          grad.addColorStop(0.4, "rgba(225, 29, 72, 0.63)"); // Translucent ruby red-rose
          grad.addColorStop(0.8, "rgba(136, 19, 55, 0.5)"); // Velvet burgundy core
          grad.addColorStop(1, "rgba(40, 0, 8, 0.35)"); // Shadows
        } else if (i === 2) {
          grad.addColorStop(0, "rgba(255, 241, 242, 0.95)"); // Gleaming blush rim
          grad.addColorStop(0.3, "rgba(190, 24, 74, 0.62)"); // Transparent dark pink-magenta
          grad.addColorStop(0.85, "rgba(76, 5, 25, 0.55)"); // Midnight burgundy
          grad.addColorStop(1, "rgba(20, 0, 5, 0.4)");
        } else {
          grad.addColorStop(0, "rgba(255, 244, 246, 0.99)"); // Shimmering white highlight
          grad.addColorStop(0.5, "rgba(251, 113, 133, 0.68)"); // Vibrant coral pink
          grad.addColorStop(0.9, "rgba(159, 12, 57, 0.52)"); // Base Crimson
          grad.addColorStop(1, "rgba(76, 5, 25, 0.42)");
        }
        
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(76, 5, 25, 0.15)";
        ctx.shadowBlur = 3;
        
        // Define accurate coordinates to draw organic heart/feather shaped begonia petals
        ctx.beginPath();
        if (i === 0) {
          // Beautiful heart leaf
          ctx.moveTo(0, -size * 0.85);
          ctx.bezierCurveTo(size * 0.85, -size * 0.88, size * 0.95, size * 0.52, 0, size * 0.92);
          ctx.bezierCurveTo(-size * 0.95, size * 0.52, -size * 0.85, -size * 0.88, 0, -size * 0.85);
        } else if (i === 1) {
          // Elegantly asymmetrical wind-swept curling petal
          ctx.moveTo(size * 0.05, -size * 0.82);
          ctx.bezierCurveTo(size * 0.62, -size * 0.94, size * 0.96, size * 0.38, size * 0.08, size * 0.9);
          ctx.bezierCurveTo(-size * 0.86, size * 0.62, -size * 0.68, -size * 0.74, size * 0.05, -size * 0.82);
        } else if (i === 2) {
          // Broad fan curved petal with slight notched heart tip (highly natural)
          ctx.moveTo(0, -size * 0.7);
          ctx.bezierCurveTo(size * 0.42, -size * 0.96, size * 0.92, -size * 0.35, size * 0.12, size * 0.94);
          ctx.bezierCurveTo(-size * 0.92, -size * 0.35, -size * 0.42, -size * 0.96, 0, -size * 0.7);
        } else {
          // Young, slender delicate drop petal
          ctx.moveTo(0, -size * 0.85);
          ctx.bezierCurveTo(size * 0.62, -size * 0.78, size * 0.58, size * 0.72, 0, size * 0.9);
          ctx.bezierCurveTo(-size * 0.62, size * 0.78, -size * 0.58, size * 0.72, 0, -size * 0.85);
        }
        ctx.fill();
        
        ctx.save();
        ctx.clip();
        
        // 1a. Draw high-fidelity flower veins (蝉翼脉纹, extremely fine and branching)
        ctx.strokeStyle = "rgba(255, 215, 225, 0.45)";
        ctx.lineWidth = 0.5; // thinner lines for natural realism
        
        // Main structural central line
        ctx.beginPath();
        ctx.moveTo(0, size * 0.85);
        ctx.quadraticCurveTo(-size * 0.08, size * 0.1, 0, -size * 0.6);
        ctx.stroke();
        
        // Multiple levels of fine secondary radiating branch veins
        const drawBranch = (startY: number, controlOffset: number, endX: number, endY: number) => {
          ctx.beginPath();
          ctx.moveTo(0, startY);
          ctx.quadraticCurveTo(controlOffset, startY - size * 0.15, endX, endY);
          ctx.stroke();
        };

        // Left branches
        drawBranch(size * 0.6, -size * 0.35, -size * 0.55, size * 0.2);
        drawBranch(size * 0.45, -size * 0.42, -size * 0.7, -size * 0.05);
        drawBranch(size * 0.3, -size * 0.45, -size * 0.75, -size * 0.3);
        drawBranch(size * 0.12, -size * 0.38, -size * 0.62, -size * 0.48);
        drawBranch(-size * 0.1, -size * 0.28, -size * 0.45, -size * 0.65);

        // Right branches
        drawBranch(size * 0.6, size * 0.35, size * 0.55, size * 0.2);
        drawBranch(size * 0.45, size * 0.42, size * 0.7, -size * 0.05);
        drawBranch(size * 0.3, size * 0.45, size * 0.75, -size * 0.3);
        drawBranch(size * 0.12, size * 0.38, size * 0.62, -size * 0.48);
        drawBranch(-size * 0.1, size * 0.28, size * 0.45, -size * 0.65);

        // Subbranch hair lines (extremely translucent)
        ctx.strokeStyle = "rgba(255, 230, 235, 0.18)";
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, size * 0.4); ctx.quadraticCurveTo(-size * 0.45, size * 0.3, -size * 0.58, size * 0.38);
        ctx.moveTo(size * 0.3, size * 0.4); ctx.quadraticCurveTo(size * 0.45, size * 0.3, size * 0.58, size * 0.38);
        ctx.moveTo(-size * 0.4, size * 0.15); ctx.quadraticCurveTo(-size * 0.58, size * 0.1, -size * 0.68, size * 0.12);
        ctx.moveTo(size * 0.4, size * 0.15); ctx.quadraticCurveTo(size * 0.58, size * 0.1, size * 0.68, size * 0.12);
        ctx.moveTo(-size * 0.45, -size * 0.1); ctx.quadraticCurveTo(-size * 0.62, -size * 0.2, -size * 0.72, -size * 0.15);
        ctx.moveTo(size * 0.45, -size * 0.1); ctx.quadraticCurveTo(size * 0.62, -size * 0.2, size * 0.72, -size * 0.15);
        ctx.stroke();

        // 1b. Translucent light reflections & depth shimmer on surface
        const reflections = ctx.createLinearGradient(-size * 0.4, -size * 0.4, size * 0.4, size * 0.4);
        reflections.addColorStop(0, "rgba(255, 255, 255, 0.22)"); // Gloss highlight
        reflections.addColorStop(0.4, "rgba(255, 255, 255, 0)");
        reflections.addColorStop(0.6, "rgba(255, 255, 255, 0)");
        reflections.addColorStop(1, "rgba(255, 255, 255, 0.08)");
        ctx.fillStyle = reflections;
        ctx.fillRect(-size, -size, size * 2, size * 2);
        
        ctx.restore(); // Exit clip

        // 1c. Gently curled border outline highlight (瓣缘轻柔微卷)
        ctx.strokeStyle = "rgba(255, 250, 252, 0.52)";
        ctx.lineWidth = 0.68;
        ctx.stroke();
        
        // Draw a light crescent curved highlight along one side to denote curling depth
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        if (i === 1) {
          ctx.arc(-size * 0.05, 0, size * 0.72, -Math.PI * 0.55, -Math.PI * 0.1);
        } else {
          ctx.arc(0, 0, size * 0.78, -Math.PI * 0.7, -Math.PI * 0.3);
        }
        ctx.stroke();
        ctx.restore();
        
        ctx.restore();
      }
      cachedSprites.push(canvas);
    }
    petalSpritesRef.current = cachedSprites;
  }, []);

  // 2. Initialize background image, offscreen canvases, and spirit fishes
  useEffect(() => {
    const img = new Image();
    img.src = currentBgUrl;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      backgroundImageRef.current = img;
      bgImageLoadedRef.current = true;
      setLoading(false);
      
      // Initialize sizing and pre-rendered grayscale canvas
      handleResize();

      // Initialize fishes only on first build
      if (fishes.current.length === 0) {
        const w = window.innerWidth || 1200;
        const h = window.innerHeight || 800;
        const initialFishes: SpiritFish[] = [];
        for (let i = 0; i < 4; i++) {
          initialFishes.push({
            id: i,
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            angle: Math.random() * Math.PI * 2,
            size: 13 + Math.random() * 7, // Slender and streamlined (纤巧)
            swimCycle: Math.random() * Math.PI * 2,
            swimSpeed: 0.03 + Math.random() * 0.02,
            targetX: Math.random() * w,
            targetY: Math.random() * h,
            trail: [],
            glowingTrails: []
          });
        }
        fishes.current = initialFishes;
      }
    };
  }, [currentBgUrl]);

  // Window resize event handling
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 3. Setup dynamic window resize handling & offscreen stretch buffers to preserve painting progress
  const handleResize = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas || !backgroundImageRef.current) return;
    
    const w = window.innerWidth;
    const h = window.innerHeight;

    const img = backgroundImageRef.current;
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let drawW = w;
    let drawH = h;
    let xOffset = 0;
    let yOffset = 0;

    if (canvasRatio > imgRatio) {
      drawH = w / imgRatio;
      yOffset = (h - drawH) / 2;
    } else {
      drawW = h * imgRatio;
      xOffset = (w - drawW) / 2;
    }

    setLayout({ w, h, drawW, drawH, xOffset, yOffset });
    
    // Backup existing painted mask if present, so progress is never lost on resize!
    let oldMask: HTMLCanvasElement | null = null;
    if (maskCanvasRef.current && maskCanvasRef.current.width > 0) {
      oldMask = document.createElement("canvas");
      oldMask.width = maskCanvasRef.current.width;
      oldMask.height = maskCanvasRef.current.height;
      const oldMaskCtx = oldMask.getContext("2d");
      if (oldMaskCtx) {
        oldMaskCtx.drawImage(maskCanvasRef.current, 0, 0);
      }
    }
    
    mainCanvas.width = w;
    mainCanvas.height = h;

    // Offscreen rendering layer adjustments
    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement("canvas");
    maskCanvasRef.current.width = w;
    maskCanvasRef.current.height = h;
    
    if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement("canvas");
    tempCanvasRef.current.width = w;
    tempCanvasRef.current.height = h;

    if (!grayscaleBgCanvasRef.current) grayscaleBgCanvasRef.current = document.createElement("canvas");
    grayscaleBgCanvasRef.current.width = w;
    grayscaleBgCanvasRef.current.height = h;

    // Recalculate pre-rendered ink grayscale background
    const grayCtx = grayscaleBgCanvasRef.current.getContext("2d");
    if (grayCtx) {
      grayCtx.clearRect(0, 0, w, h);
      // Modern high-performance filter for hardware-accelerated monochrome
      grayCtx.filter = "grayscale(100%) brightness(82%) contrast(105%)";
      
      grayCtx.drawImage(img, xOffset, yOffset, drawW, drawH);
    }

    // Restore old mask stretched nicely
    if (oldMask) {
      const maskCtx = maskCanvasRef.current.getContext("2d");
      if (maskCtx) {
        maskCtx.clearRect(0, 0, w, h);
        maskCtx.drawImage(oldMask, 0, 0, w, h);
      }
    }

    // Update the dynamic rotating wooden roof canvas overlay on resize/load
    updateRotatingRoofCanvas(img, drawW, drawH, xOffset, yOffset);
  };

  const updateRotatingRoofCanvas = (
    img: HTMLImageElement, 
    drawW: number, 
    drawH: number, 
    xOffset: number, 
    yOffset: number
  ) => {
    const colorCanvas = domRotatingRoofRef.current;
    if (!colorCanvas) return;
    
    const w = Math.ceil(drawW);
    const h = Math.ceil(drawH);
    colorCanvas.width = w;
    colorCanvas.height = h;
    
    // Ensure offscreen grayscale wood canvas exists and has correct dimensions
    if (!grayWoodCanvasRef.current) {
      grayWoodCanvasRef.current = document.createElement("canvas");
    }
    const grayCanvas = grayWoodCanvasRef.current;
    grayCanvas.width = w;
    grayCanvas.height = h;
    
    const colorCtx = colorCanvas.getContext("2d");
    const grayCtx = grayCanvas.getContext("2d");
    if (!colorCtx || !grayCtx) return;
    
    // 1. Draw color background centered
    colorCtx.clearRect(0, 0, w, h);
    colorCtx.drawImage(img, 0, 0, w, h);
    
    // 2. Draw the grayscale background corresponding segment
    grayCtx.clearRect(0, 0, w, h);
    if (grayscaleBgCanvasRef.current) {
      grayCtx.drawImage(
        grayscaleBgCanvasRef.current, 
        Math.floor(xOffset), 
        Math.floor(yOffset), 
        w, 
        h, 
        0, 
        0, 
        w, 
        h
      );
    }
    
    try {
      const colorImgData = colorCtx.getImageData(0, 0, w, h);
      const colorData = colorImgData.data;
      
      const grayImgData = grayCtx.getImageData(0, 0, w, h);
      const grayData = grayImgData.data;
      
      const cx = w * 0.5;
      const cy = h * 0.345;
      const maxR = w * 0.48;
      const minR = w * 0.14;
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let keep = false;
          if (dist >= minR && dist <= maxR) {
            const idx = (y * w + x) * 4;
            const r = colorData[idx];
            const g = colorData[idx+1];
            const b = colorData[idx+2];
            
            // Check if color is brown (wood roof tiles)
            const isColorBrown = r > 45 && g > 25 && b < 100 && r > g * 1.15 && g > b * 1.05 && r - b > 15;
            if (isColorBrown) {
              keep = true;
            }
          }
          
          if (!keep) {
            const idx = (y * w + x) * 4;
            colorData[idx+3] = 0; // set alpha to 0 for non-brown pixels in color
            grayData[idx+3] = 0;  // set alpha to 0 for non-brown pixels in gray
          }
        }
      }
      colorCtx.putImageData(colorImgData, 0, 0);
      grayCtx.putImageData(grayImgData, 0, 0);
    } catch (e) {
      console.error("Failed to generate rotating roof masks", e);
    }
  };

  // 4. Custom physical emitter script (飘动轨迹柔美舒缓)
  const spawnPetals = (x: number, y: number, vx: number, vy: number, amount = 1) => {
    if (petalSpritesRef.current.length === 0) return;
    
    for (let i = 0; i < amount; i++) {
      if (particles.current.length >= config.current.maxPetals) {
        particles.current.shift(); // Remove oldest to prevent memory leaks
      }
      
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.3 + Math.random() * 1.1; // delicate spreading dispersals
      
      // Inherit hand velocity softly mapping graceful inertia
      const pVx = Math.cos(angle) * spread + vx * 0.2 + config.current.windX * 0.3;
      const pVy = Math.sin(angle) * spread + vy * 0.2 - 0.55; // slower float
      
      const maxLife = 130 + Math.floor(Math.random() * 85); // longer lifetime for slower dance
      
      particles.current.push({
        id: nextParticleId.current++,
        x,
        y,
        vx: pVx,
        vy: pVy,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.025, // gentler twist rate
        scaleX: 0.5 + Math.random() * 0.5,
        scaleY: 0.5 + Math.random() * 0.5,
        alpha: 1.0,
        life: 1.0,
        maxLife,
        spriteIdx: Math.floor(Math.random() * petalSpritesRef.current.length),
        size: 13 + Math.random() * 13,
        attraction: 0.01 + Math.random() * 0.015,
        spinPhase: Math.random() * Math.PI * 2,
        spinSpeed: 0.018 + Math.random() * 0.025 // slower 3D spin for elegance
      });
    }
  };

  // 5. The primary high-performance interactive animation rendering loop
  useEffect(() => {
    let animId: number;
    let frameTime = 0;
    
    // Fluid turbulence factor derived from hand movement speed
    const updateAndRender = (timestamp: number) => {
      animId = requestAnimationFrame(updateAndRender);
      
      const mainCanvas = mainCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const tempCanvas = tempCanvasRef.current;
      const grayscaleBg = grayscaleBgCanvasRef.current;
      
      if (!mainCanvas || !maskCanvas || !tempCanvas || !grayscaleBg || !backgroundImageRef.current) return;
      
      const ctx = mainCanvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");
      const tempCtx = tempCanvas.getContext("2d");
      if (!ctx || !maskCtx || !tempCtx) return;
      
      const w = mainCanvas.width;
      const h = mainCanvas.height;
      frameTime += 0.016; // Approx tick
      
      // Update hand velocity decay
      const hand = handStateRef.current;
      if (hand.present) {
        hand.velocity.x *= 0.88;
        hand.velocity.y *= 0.88;
      }
      
      // Generate particles along hand movement center when palm is completely open
      if (hand.present && hand.isOpen) {
        const hX = (hand.x as number) * w;
        const hY = (hand.y as number) * h;
        // Frequency check for petal releases
        if (Math.random() < 0.45) {
          spawnPetals(hX, hY, hand.velocity.x, hand.velocity.y, 1);
        }
        
        // Accumulate colored restoration trail permanently directly below the hand center
        const densityRadius = 135; // Expanded brush size (扩大一次点亮范围)
        const grad = maskCtx.createRadialGradient(hX, hY, 0, hX, hY, densityRadius);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.45)"); // Brighter reveal
        grad.addColorStop(0.4, "rgba(255, 255, 255, 0.18)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        maskCtx.fillStyle = grad;
        maskCtx.beginPath();
        maskCtx.arc(hX, hY, densityRadius, 0, Math.PI * 2);
        maskCtx.fill();

        // Dynamically play ambient chime plucks matching hand swipe kinetics
        const handSpeed = Math.sqrt(hand.velocity.x * hand.velocity.x + hand.velocity.y * hand.velocity.y);
        if (handSpeed > 0.8) {
          if (!synthRef.current) {
            synthRef.current = new ZenSynthesizer();
          }
          synthRef.current.init();
          synthRef.current.setMuted(ambientMuted);
          synthRef.current.playChime(handSpeed);
        }
      }

      // If hand is clenched in a fist, immediately sweep all petals away!
      if (hand.present && !hand.isOpen) {
        particles.current = []; // All flower petals immediately disappear
      }
      
      // Update local falling petals physics (飘动缓缓旋舞、摇曳流转)
      const currentParticles = particles.current;
      for (let i = currentParticles.length - 1; i >= 0; i--) {
        const p = currentParticles[i];
        p.life -= 1 / p.maxLife;
        
        if (p.life <= 0) {
          currentParticles.splice(i, 1);
          continue;
        }
        
        // If hand is present and open, petals are attracted to it with custom weight creating magic wind swirls
        if (hand.present && hand.isOpen) {
          const hX = (hand.x as number) * w;
          const hY = (hand.y as number) * h;
          const dx = hX - p.x;
          const dy = hY - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 20 && distance < 450) {
            // Apply subtle spring gravity pull
            p.vx += (dx / distance) * p.attraction * 4.2;
            p.vy += (dy / distance) * p.attraction * 4.2;
          }
        }

        // --- Gentle swirling particle suction towards the sea-sky gate opening vortex center (元素联动) ---
        if (appStageRef.current === "gate_opening") {
          const imgRatio = 2048 / 1152;
          const canvasRatio = w / h;
          let pDrawW = w;
          let pDrawH = h;
          let pXOffset = 0;
          let pYOffset = 0;
          if (canvasRatio > imgRatio) {
            pDrawH = w / imgRatio;
            pYOffset = (h - pDrawH) / 2;
          } else {
            pDrawW = h * imgRatio;
            pXOffset = (w - pDrawW) / 2;
          }
          const vX = pXOffset + pDrawW * 0.5;
          const vY = pYOffset + pDrawH * 0.345;

          const dx = vX - p.x;
          const dy = vY - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 5) {
            const pull = 0.12 * p.attraction;
            const swirl = 0.28;
            const swirlX = -dy / distance;
            const swirlY = dx / distance;
            p.vx += (dx / distance) * pull + swirlX * swirl;
            p.vy += (dy / distance) * pull + swirlY * swirl;
          }
        }
        
        // Fluid drag and physical environmental velocities (slower wind drift + gentler gravity fall)
        p.vx *= 0.963; 
        p.vy *= 0.963;
        p.vy += config.current.gravityY * 0.52; // softer falling speed
        p.vx += (config.current.windX * 0.6) + Math.sin(frameTime * p.spinSpeed * 6 + p.spinPhase) * 0.08;
        
        // Euler position integration
        p.x += p.vx;
        p.y += p.vy;
        
        p.rotation += p.vRotation;
        p.alpha = Math.min(1.0, p.life * 1.5);
        p.spinPhase += p.spinSpeed;
        
        // Sinusoidal 3D fold simulation
        p.scaleY = Math.sin(p.spinPhase);
        
        // 6. Draw permanent color restoration footprint at each petal's pathway coordinates
        const revealBrushSize = p.size * 3.5; // Significantly expanded petal trails!
        const grad = maskCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, revealBrushSize);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        maskCtx.fillStyle = grad;
        maskCtx.beginPath();
        maskCtx.arc(p.x, p.y, revealBrushSize, 0, Math.PI * 2);
        maskCtx.fill();
      }
      
      // === DRAWING SEQUENCE ===
      // Clear main view
      ctx.clearRect(0, 0, w, h);
      
      // 1. Draw raw vibrant full-color illustration as the core foundation
      const img = backgroundImageRef.current;
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let drawW = w;
      let drawH = h;
      let xOffset = 0;
      let yOffset = 0;

      if (canvasRatio > imgRatio) {
        drawH = w / imgRatio;
        yOffset = (h - drawH) / 2;
      } else {
        drawW = h * imgRatio;
        xOffset = (w - drawW) / 2;
      }
      // Draw background with dynamic concentric rotating structures (让屋顶缓慢旋转)
      if (isBgRotatingRef.current) {
        // 48° per second (0.8° per frame), corresponding to 7.5s rotation period (单圈旋转周期约6-8秒)
        bgRotationAngleRef.current += 0.8; 
        if (roofOpacityRef.current < 1.0) {
          roofOpacityRef.current = Math.min(1.0, roofOpacityRef.current + 0.033); // 0.5s fade-in transition
        }
      } else {
        if (roofOpacityRef.current > 0) {
          roofOpacityRef.current = Math.max(0, roofOpacityRef.current - 0.033);
        }
      }

      if (domRotatingRoofRef.current) {
        if (isBgRotatingRef.current || roofOpacityRef.current > 0) {
          domRotatingRoofRef.current.style.display = "block";
          domRotatingRoofRef.current.style.opacity = `${roofOpacityRef.current}`;
          domRotatingRoofRef.current.style.transform = `rotate(${bgRotationAngleRef.current}deg)`;
        } else {
          domRotatingRoofRef.current.style.display = "none";
          domRotatingRoofRef.current.style.opacity = "0";
          domRotatingRoofRef.current.style.transform = "";
        }
      }

      // Since the colorful cover is now rendered completely via CSS layers beneath the canvas,
      // the canvas simply clears itself to transparent and overlays the grayscale layer with erased holes!
      // This results in a perfect transition to the rotating colorful CSS background underneath!
      
      // 2. Composite: If starting stages (intro, prologue, prologue2), painting, or underwater_tree stage, draw grayscale overlay on an offscreen buffer,
      // and erase parts matching the mask using destination-out hardware blending (起始的时候图片完全灰白，宿命相逢、水镜重染揭示斑斓色彩)
      if (
        appStageRef.current === "intro" ||
        appStageRef.current === "prologue" ||
        appStageRef.current === "prologue2" ||
        appStageRef.current === "prologue3" ||
        appStageRef.current === "painting" ||
        appStageRef.current === "underwater_tree"
      ) {
        tempCtx.clearRect(0, 0, w, h);
        drawBackground(tempCtx, grayscaleBg, w, h, frameTime, xOffset, yOffset, drawW, drawH, bgRotationAngleRef.current, roofOpacityRef.current, grayWoodCanvasRef.current);
        
        // Subtract parts based on accumulated mask white values
        tempCtx.globalCompositeOperation = "destination-out";
        tempCtx.drawImage(maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "source-over"; // Reset
        
        // Render grayscale layer with transparent holes back over our vibrant color photo
        ctx.drawImage(tempCanvas, 0, 0);
      }
      
      // --- Precise Pointing/Hover Detection for Corridor Lanterns (Gate Locked state) ---
      if (appStageRef.current === "gate_locked" && hand.present) {
        const hX = (hand.x as number) * w;
        const hY = (hand.y as number) * h;
        const isOpen = hand.isOpen;

        // "当手掌张开并移动到灯笼区域时，仅在该灯笼位置触发点亮效果"
        if (isOpen) {
          for (let i = 0; i < 5; i++) {
            // "已点亮的灯笼不会重复触发点亮动画"
            if (litLanternsRef.current[i]) continue;

            const rx = LANTERNS[i].rx * drawW + xOffset;
            const ry = LANTERNS[i].ry * drawH + yOffset;
            const rw = LANTERNS[i].rw * drawW;
            const rh = LANTERNS[i].rh * drawH;

            // "仅当手掌坐标完全进入灯笼边界内时，才触发点亮效果，彻底消除误触"
            if (isPointInEllipse(hX, hY, rx, ry, rw, rh)) {
              litLanternsRef.current[i] = true;

              // Play ethereal chime audio feedback
              if (!synthRef.current) {
                synthRef.current = new ZenSynthesizer();
              }
              synthRef.current.init();
              synthRef.current.setMuted(ambientMuted);
              synthRef.current.playChime(1.1 + 0.16 * i);

              // Spawn sparkling petals blooming outwards from the light source
              for (let k = 0; k < 20; k++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 4.8;
                const pVx = Math.cos(angle) * speed;
                const pVy = Math.sin(angle) * speed - 1.2;
                spawnPetals(rx, ry, pVx, pVy, 1);
              }

              // Update progress state
              const nextCount = litLanternsRef.current.filter(Boolean).length;
              setWaveProgressCount(nextCount);

              // "当全部点亮之后进入下一环节"
              if (nextCount === 5) {
                setTimeout(() => {
                  setAppStage("gate_opening");
                  gateProgressRef.current = 0;
                  setWaveProgressCount(0);
                }, 1000);
              }
            }
          }
        }
      }

      // ==========================================
      // --- INTERACTIVE SYSTEM FOR UNDERWATER TREE ROOTS ---
      // ==========================================
      if (appStageRef.current === "underwater_tree") {
        const hX = hand.present ? (hand.x as number) * w : lastInteractionRef.current.x * w;
        const hY = hand.present ? (hand.y as number) * h : lastInteractionRef.current.y * h;
        const isOpen = hand.present ? hand.isOpen : isInteractingRef.current;
        
        // Convert to relative coordinates of the background image
        const relX = (hX - xOffset) / drawW;
        const relY = (hY - yOffset) / drawH;
        
        // Check if hand/pointer touches the roots
        const checkOnRoot = (rx: number, ry: number) => {
          // Distance to main hub
          const distToHub = Math.sqrt((rx - 0.52) ** 2 + (ry - 0.45) ** 2);
          if (distToHub < 0.22) return true;
          
          // Distance to branch segments
          const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
            const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
            if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
          };

          const segments = [
            [0.52, 0.12, 0.52, 0.45], // upper trunk
            [0.52, 0.45, 0.32, 0.35], // upper-left top
            [0.32, 0.35, 0.15, 0.38], // upper-left outer
            [0.52, 0.45, 0.35, 0.65], // lower-left top
            [0.35, 0.65, 0.20, 0.85], // lower-left outer
            [0.52, 0.45, 0.72, 0.30], // upper-right top
            [0.72, 0.30, 0.88, 0.28], // upper-right outer
            [0.52, 0.45, 0.68, 0.68], // lower-right top
            [0.68, 0.68, 0.82, 0.82], // lower-right outer
          ];

          for (const seg of segments) {
            if (distToSegment(rx, ry, seg[0], seg[1], seg[2], seg[3]) < 0.08) {
              return true;
            }
          }
          return false;
        };

        const isHoveringRoot = isOpen && checkOnRoot(relX, relY);
        
        let glowIntensity = rootGlowIntensityRef.current;
        if (isHoveringRoot) {
          glowIntensity = Math.min(1.0, glowIntensity + 0.04);
        } else {
          glowIntensity = Math.max(0.0, glowIntensity - 0.02);
        }
        
        if (hand.present && !hand.isOpen) {
          glowIntensity = Math.max(0.0, glowIntensity - 0.1);
        }
        rootGlowIntensityRef.current = glowIntensity;
        
        // Render flowing golden veins along segments
        if (glowIntensity > 0.01) {
          ctx.save();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash([35, 85]);
          ctx.lineDashOffset = -frameTime * 65; // Gentler flowing speed
          
          const segments = [
            [0.52, 0.12, 0.52, 0.45], // upper trunk
            [0.52, 0.45, 0.32, 0.35], // upper-left top
            [0.32, 0.35, 0.15, 0.38], // upper-left outer
            [0.52, 0.45, 0.35, 0.65], // lower-left top
            [0.35, 0.65, 0.20, 0.85], // lower-left outer
            [0.52, 0.45, 0.72, 0.30], // upper-right top
            [0.72, 0.30, 0.88, 0.28], // upper-right outer
            [0.52, 0.45, 0.68, 0.68], // lower-right top
            [0.68, 0.68, 0.82, 0.82], // lower-right outer
          ];
          
          // Pass 1: Soft broad outer glow (Soft Volumetric Glow)
          ctx.lineWidth = 7.5;
          ctx.strokeStyle = `rgba(251, 191, 36, ${glowIntensity * 0.35})`; // Soft amber-400
          ctx.shadowColor = "rgba(253, 224, 71, 0.9)";
          ctx.shadowBlur = 32;
          
          for (const seg of segments) {
            ctx.beginPath();
            ctx.moveTo(seg[0] * drawW + xOffset, seg[1] * drawH + yOffset);
            ctx.lineTo(seg[2] * drawW + xOffset, seg[3] * drawH + yOffset);
            ctx.stroke();
          }

          // Pass 2: Elegant micro inner core (Soft Slender Core)
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = `rgba(255, 254, 235, ${glowIntensity * 0.75})`; // Pale warm cream
          ctx.shadowColor = "rgba(253, 224, 71, 0.6)";
          ctx.shadowBlur = 10;

          for (const seg of segments) {
            ctx.beginPath();
            ctx.moveTo(seg[0] * drawW + xOffset, seg[1] * drawH + yOffset);
            ctx.lineTo(seg[2] * drawW + xOffset, seg[3] * drawH + yOffset);
            ctx.stroke();
          }

          ctx.restore();
          
          // Ethereal continuous soundscape while swirling
          if (isHoveringRoot && frameCountRef.current % 24 === 0) {
            if (synthRef.current && !ambientMuted) {
              const notes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
              const yPerc = Math.max(0, Math.min(1, relY));
              const noteIndex = Math.floor((1 - yPerc) * (notes.length - 1));
              synthRef.current.playChime((notes[noteIndex] / 200) * 1.5);
            }
          }
        }
        
        // Spawn gold bubble sparks from roots
        if (glowIntensity > 0.1 && Math.random() < 0.45) {
          const segments = [
            [0.52, 0.12, 0.52, 0.45],
            [0.52, 0.45, 0.32, 0.35],
            [0.32, 0.35, 0.15, 0.38],
            [0.52, 0.45, 0.35, 0.65],
            [0.35, 0.65, 0.20, 0.85],
            [0.52, 0.45, 0.72, 0.30],
            [0.72, 0.30, 0.88, 0.28],
            [0.52, 0.45, 0.68, 0.68],
            [0.68, 0.68, 0.82, 0.82],
          ];
          const seg = segments[Math.floor(Math.random() * segments.length)];
          const t = Math.random();
          const bx = (seg[0] + t * (seg[2] - seg[0])) * drawW + xOffset;
          const by = (seg[1] + t * (seg[3] - seg[1])) * drawH + yOffset;
          
          underwaterBubblesRef.current.push({
            x: bx + (Math.random() - 0.5) * 20,
            y: by,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.6 - Math.random() * 1.5,
            r: 2 + Math.random() * 5,
            alpha: 0.7 + Math.random() * 0.3,
            life: 1.0
          });
        }
        
        // Update and draw gold bubble sparks
        const activeBubbles = underwaterBubblesRef.current;
        for (let i = activeBubbles.length - 1; i >= 0; i--) {
          const b = activeBubbles[i];
          b.life -= 0.009;
          if (b.life <= 0) {
            activeBubbles.splice(i, 1);
            continue;
          }
          b.x += b.vx + Math.sin(frameTime * 4 + b.y * 0.01) * 0.22;
          b.y += b.vy;
          b.alpha = b.life;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          
          const bubbleGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
          bubbleGrad.addColorStop(0, `rgba(255, 255, 255, ${b.alpha * glowIntensity})`);
          bubbleGrad.addColorStop(0.4, `rgba(253, 224, 71, ${b.alpha * 0.85 * glowIntensity})`);
          bubbleGrad.addColorStop(1.0, `rgba(234, 179, 8, 0)`);
          
          ctx.fillStyle = bubbleGrad;
          ctx.shadowColor = "rgba(253, 224, 71, 0.6)";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        }
        
        // Spawn and draw Blessing Bubbles
        const POETIC_PHRASES = [
          "有的鱼是永远关不住的，因为它们属于天空",
          "这短短的一生，不妨大胆一些，爱一个人，攀一座山，追一个梦",
          "我们相遇，是一场执念，逆天而行，在所不惜",
          "我欠他一条命，我要还清欠他的，无论付出多少代价",
          "用所有的眼泪，换你一次重逢，梦回海天，如愿以偿",
          "你是我甘愿倾尽半寿，也要守护的灵海之光",
          "上古有大椿者，以八千岁为春，八千岁为秋",
          "每条大鱼，都会相遇；每个人，都会重逢"
        ];
        
        if (Math.random() < 0.0085 && blessingBubblesRef.current.length < 5) {
          const id = Math.random();
          const r = 32 + Math.random() * 20;
          const text = POETIC_PHRASES[Math.floor(Math.random() * POETIC_PHRASES.length)];
          const textPre = text.slice(0, 5) + "...";
          blessingBubblesRef.current.push({
            id,
            x: w * 0.12 + Math.random() * w * 0.76,
            y: h + 50,
            r,
            text,
            textPre,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.45 - Math.random() * 0.8,
            alpha: 1.0
          });
        }
        
        const bubblesList = blessingBubblesRef.current;
        for (let i = bubblesList.length - 1; i >= 0; i--) {
          const b = bubblesList[i];
          b.y += b.vy;
          b.x += b.vx + Math.sin(frameTime * 1.5 + b.id) * 0.18;
          
          if (b.y < -50) {
            bubblesList.splice(i, 1);
            continue;
          }
          
          const isHandPresent = hand.present;
          const dist = Math.sqrt((hX - b.x) ** 2 + (hY - b.y) ** 2);
          
          // Pop!
          if ((isHandPresent && isOpen && dist < b.r + 25) || (!hand.present && isInteractingRef.current && dist < b.r + 25)) {
            if (synthRef.current && !ambientMuted) {
              synthRef.current.playChime(2.2);
            }
            for (let k = 0; k < 18; k++) {
              const burstAngle = Math.random() * Math.PI * 2;
              const burstSp = 2.0 + Math.random() * 4.5;
              spawnPetals(b.x, b.y, Math.cos(burstAngle) * burstSp, Math.sin(burstAngle) * burstSp, 1);
            }
            setPoppingQuote({
              text: b.text,
              time: Date.now()
            });
            bubblesList.splice(i, 1);
            continue;
          }
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          
          const bubbleG = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
          bubbleG.addColorStop(0, "rgba(255, 255, 255, 0.45)");
          bubbleG.addColorStop(0.3, "rgba(186, 230, 253, 0.28)");
          bubbleG.addColorStop(0.72, "rgba(110, 231, 183, 0.15)");
          bubbleG.addColorStop(1.0, "rgba(14, 165, 233, 0.42)");
          
          ctx.fillStyle = bubbleG;
          ctx.strokeStyle = "rgba(224, 242, 254, 0.68)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "rgba(14, 165, 233, 0.35)";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.stroke();
          
          ctx.font = "italic 11px Georgia, serif, system-ui";
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.textPre, b.x, b.y);
          ctx.restore();
        }
        
        // Draw Red Dolphin (Kun) if active
        const kun = summonedKunRef.current;
        if (kun && kun.active) {
          kun.progress += 0.0055;
          if (kun.progress >= 1.0) {
            kun.active = false;
          } else {
            const idx = Math.floor(kun.progress * (kun.pathPoints.length - 1));
            const pCurrent = kun.pathPoints[idx];
            const pNext = kun.pathPoints[Math.min(kun.pathPoints.length - 1, idx + 1)];
            
            kun.x = pCurrent.x;
            kun.y = pCurrent.y;
            
            const kunAngle = Math.atan2(pNext.y - pCurrent.y, pNext.x - pCurrent.x);
            kun.swimCycle += 0.055;
            
            if (Math.random() < 0.6) {
              kun.glowingTrails.push({
                x: kun.x - Math.cos(kunAngle) * kun.size + (Math.random() - 0.5) * 15,
                y: kun.y - Math.sin(kunAngle) * kun.size + (Math.random() - 0.5) * 15,
                alpha: 0.85,
                r: kun.size * 0.28 + Math.random() * 8,
                color: Math.random() > 0.4 ? "rgba(239, 68, 68," : "rgba(251, 191, 36,"
              });
            }
            
            for (let k = kun.glowingTrails.length - 1; k >= 0; k--) {
              const t = kun.glowingTrails[k];
              t.alpha -= 0.009;
              t.r += 0.35;
              if (t.alpha <= 0) {
                kun.glowingTrails.splice(k, 1);
              }
            }
            
            ctx.save();
            for (const t of kun.glowingTrails) {
              ctx.beginPath();
              const radG = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 1.8);
              radG.addColorStop(0, `${t.color}${t.alpha * 0.45})`);
              radG.addColorStop(0.5, `${t.color}${t.alpha * 0.15})`);
              radG.addColorStop(1, "rgba(239, 68, 68, 0)");
              ctx.fillStyle = radG;
              ctx.arc(t.x, t.y, t.r * 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
            
            ctx.save();
            ctx.translate(kun.x, kun.y);
            ctx.rotate(kunAngle);
            
            const surroundG = ctx.createRadialGradient(0, 0, kun.size * 0.15, 0, 0, kun.size * 2.8);
            surroundG.addColorStop(0, "rgba(239, 68, 68, 0.46)");
            surroundG.addColorStop(0.5, "rgba(244, 63, 94, 0.14)");
            surroundG.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = surroundG;
            ctx.beginPath();
            ctx.arc(0, 0, kun.size * 2.8, 0, Math.PI * 2);
            ctx.fill();
            
            const bodyG = ctx.createLinearGradient(-kun.size, 0, kun.size * 1.25, 0);
            bodyG.addColorStop(0, "rgba(220, 38, 38, 0.12)");
            bodyG.addColorStop(0.35, "rgba(239, 68, 68, 0.45)");
            bodyG.addColorStop(0.75, "rgba(220, 38, 38, 0.65)");
            bodyG.addColorStop(1.0, "rgba(254, 243, 199, 0.85)");
            
            ctx.fillStyle = bodyG;
            ctx.strokeStyle = "rgba(254, 202, 202, 0.65)";
            ctx.lineWidth = 1.8;
            ctx.shadowColor = "rgba(239, 68, 68, 0.9)";
            ctx.shadowBlur = 18;
            
            ctx.beginPath();
            ctx.moveTo(kun.size * 1.25, 0);
            ctx.quadraticCurveTo(kun.size * 0.35, -kun.size * 0.58, -kun.size * 0.65, -kun.size * 0.15);
            ctx.lineTo(-kun.size * 1.15, -kun.size * 0.35);
            const tailWiggle = Math.sin(kun.swimCycle) * kun.size * 0.18;
            ctx.lineTo(-kun.size * 1.05, tailWiggle);
            ctx.lineTo(-kun.size * 1.15, kun.size * 0.35);
            ctx.quadraticCurveTo(kun.size * 0.35, kun.size * 0.58, kun.size * 1.25, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
            ctx.beginPath();
            ctx.arc(kun.size * 0.82, -kun.size * 0.11, 2.8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.save();
            ctx.translate(kun.size * 0.25, -kun.size * 0.35);
            ctx.rotate(-0.85 + Math.sin(kun.swimCycle) * 0.22);
            const finG = ctx.createLinearGradient(0, 0, 0, -kun.size * 0.85);
            finG.addColorStop(0, "rgba(239, 68, 68, 0.6)");
            finG.addColorStop(1, "rgba(251, 191, 36, 0)");
            ctx.fillStyle = finG;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(kun.size * 0.2, -kun.size * 0.8);
            ctx.quadraticCurveTo(-kun.size * 0.15, -kun.size * 0.8, -kun.size * 0.2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            ctx.restore();
          }
        }
        
        // Throttled pixel color counting progress updates
        if (frameCountRef.current % 45 === 0) {
          const scaleW = 32;
          const scaleH = 32;
          const calcCanvas = document.createElement("canvas");
          calcCanvas.width = scaleW;
          calcCanvas.height = scaleH;
          const calcCtx = calcCanvas.getContext("2d");
          
          if (calcCtx) {
            calcCtx.drawImage(maskCanvas, 0, 0, scaleW, scaleH);
            try {
              const maskData = calcCtx.getImageData(0, 0, scaleW, scaleH).data;
              let paintedCount = 0;
              for (let i = 3; i < maskData.length; i += 4) {
                if (maskData[i] > 15) {
                  paintedCount++;
                }
              }
              let percentage = Math.floor((paintedCount / (scaleW * scaleH)) * 100 * 1.5); // expand speed factor 1.5x
              if (percentage > 100) percentage = 100;
              if (percentage !== previousProgressRef.current) {
                previousProgressRef.current = percentage;
                setUnderwaterProgress(percentage);
                
                // Auto trigger final video cinematic when 100% color reveal is complete
                if (percentage >= 100) {
                  if (synthRef.current && !ambientMuted) {
                    synthRef.current.playAscendingSuccessSwell();
                  }
                  setIsTransitioningToMedia(true);
                  setTimeout(() => {
                    setAppStage("completed");
                    setShowVideoModal(true);
                  }, 2500);
                }
              }
            } catch (e) {
              console.error("Mask sampling error in underwater_tree", e);
            }
          }
        }
      }

      // ==========================================
      // --- INTERACTIVE SYSTEM FOR CORRIDOR LANTERNS ---
      // ==========================================
      // 1. Smoothly update light intensities and 0.3s lighting animation progress
      const lightsList = lanternLightsRef.current;
      const progressList = lanternAnimProgressRef.current;
      for (let i = 0; i < 5; i++) {
        let target = 0;
        if (appStageRef.current === "gate_opening") {
          // Sequentially light up the water lanterns based on gateProgress thresholds (渐次点亮、联动玩法闭环)
          const threshold = i * 0.12;
          const thresholdFinished = gateProgressRef.current >= threshold;
          target = thresholdFinished ? 1.0 : (litLanternsRef.current[i] ? 1.0 : 0.0);
          
          // Seed the animation progress list for a gorgeous rising aura
          if (thresholdFinished && progressList[i] < 1.0) {
            progressList[i] = Math.min(1.0, progressList[i] + 0.05);
          }
        } else if (appStageRef.current === "completed") {
          target = 1;
        } else if (appStageRef.current === "gate_locked") {
          if (litLanternsRef.current[i]) {
            target = 1;
          }
        }
        lightsList[i] += (target - lightsList[i]) * 0.08;

        // Progressively grow the 0.3-second lighting animation (18 frames at 60fps)
        if (appStageRef.current !== "gate_opening") {
          if (litLanternsRef.current[i]) {
            if (progressList[i] < 1.0) {
              progressList[i] = Math.min(1.0, progressList[i] + 0.056); // perfectly 18 frames (~0.3s)
            }
          } else {
            progressList[i] = 0.0;
          }
        }
      }

      // 3. Draw lantern dimming masks and light glows on top of our image base
      if (appStageRef.current === "gate_locked" || appStageRef.current === "gate_opening" || appStageRef.current === "completed") {
        for (let i = 0; i < 5; i++) {
          const rx = LANTERNS[i].rx * drawW + xOffset;
          const ry = LANTERNS[i].ry * drawH + yOffset;
          const rw = LANTERNS[i].rw * drawW;
          const rh = LANTERNS[i].rh * drawH;
          const rr = rw; // Compatibility radius mapping

          // 3a. Redraw high-definition lantern texture inside the ELLIPSE clipping mask with an inner glowing paper envelope
          if (lightsList[i] > 0.01) {
            ctx.save();
            drawEllipsePath(ctx, rx, ry, rw * 1.15, rh * 1.15); // Precise ellipse clipping
            ctx.clip();

            // Organic flame flicker combining multiple frequency waves to simulate real heat/fire motion
            const organicFlicker = 0.035 * Math.sin(frameTime * 11.5 + i * 1.7) + 
                                  0.018 * Math.sin(frameTime * 4.2 + i * 3.1) + 
                                  0.006 * Math.sin(frameTime * 1.5 + i * 0.9);

            const bVal = 1.03 + 0.48 * lightsList[i] + organicFlicker;
            const cVal = 1.0 + 0.35 * lightsList[i];
            const sVal = 1.0 + 0.45 * lightsList[i];

            ctx.filter = `brightness(${bVal}) contrast(${cVal}) saturate(${sVal})`;

            // Draw original background cropped to the lantern bounding box
            const sx = (LANTERNS[i].rx - LANTERNS[i].rw * 1.15) * img.width;
            const sy = (LANTERNS[i].ry - LANTERNS[i].rh * 1.15) * img.height;
            const sw = LANTERNS[i].rw * 2.3 * img.width;
            const sh2 = LANTERNS[i].rh * 2.3 * img.height;

            ctx.drawImage(
              img,
              sx, sy, sw, sh2,
              rx - rw * 1.15,
              ry - rh * 1.15,
              rw * 2.3,
              rh * 2.3
            );
            ctx.restore();

            // Inner volumetric paper glow overlay using Color-Dodge to create realistic translucency
            ctx.save();
            ctx.globalCompositeOperation = "color-dodge";
            drawEllipsePath(ctx, rx, ry, rw * 1.14, rh * 1.14);
            ctx.clip();
            const paperGlow = ctx.createRadialGradient(rx, ry, rw * 0.05, rx, ry, rw * 1.25);
            paperGlow.addColorStop(0, `rgba(255, 235, 150, ${lightsList[i] * 0.72})`); // Radiant hot paper center
            paperGlow.addColorStop(0.4, `rgba(242, 105, 15, ${lightsList[i] * 0.55})`); // Classic warm orange
            paperGlow.addColorStop(0.85, `rgba(185, 12, 1, ${lightsList[i] * 0.25})`); // Soft crimson rim
            paperGlow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = paperGlow;
            ctx.fillRect(rx - rw * 1.3, ry - rh * 1.3, rw * 2.6, rh * 2.6);
            ctx.restore();

            // Spawn gentle rising glowing hot embers if lantern is fully lit and breathing
            if (lightsList[i] > 0.85 && Math.random() < 0.04) {
              const spawnX = rx + (Math.random() - 0.5) * rw * 1.2;
              const spawnY = ry + (Math.random() - 0.5) * rh * 0.6;
              const pVx = (Math.random() - 0.5) * 0.8;
              const pVy = -0.6 - Math.random() * 1.2;
              spawnPetals(spawnX, spawnY, pVx, pVy, 1); // Reuse particle pooling system to float upwards as a golden ember
            }
          }

          // 3b. Lantern Shadow (Extinguished state overlay mask)
          const shadowOpacity = 0.38 * (1.0 - lightsList[i]);
          if (shadowOpacity > 0.005) {
            const gShadow = ctx.createRadialGradient(rx, ry, rr * 0.15, rx, ry, rr * 1.35);
            gShadow.addColorStop(0, `rgba(16, 8, 10, ${shadowOpacity})`);
            gShadow.addColorStop(0.40, `rgba(12, 6, 8, ${shadowOpacity * 0.90})`);
            gShadow.addColorStop(0.75, `rgba(8, 4, 5, ${shadowOpacity * 0.60})`);
            gShadow.addColorStop(1, `rgba(0, 0, 0, 0)`);
            
            ctx.fillStyle = gShadow;
            ctx.beginPath();
            ctx.ellipse(rx, ry, rr * 1.3, rr * 1.3 * (rh / rw), 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3c. Lantern Glow (Lit state radiant aura overlay with soft ease-out golden-outward diffusion)
          if (lightsList[i] > 0.005) {
            const glowOpacity = lightsList[i];
            const liveFlicker = 0.5 * Math.sin(frameTime * 6.0 + i * 2.2) + 
                                0.3 * Math.sin(frameTime * 14.5 + i * 0.8) + 
                                0.2 * Math.sin(frameTime * 2.5 + i); // complex harmonic flicker
            const pulse = 1.0 + 0.08 * liveFlicker;
            
            // "由内向外扩散的暖金色光晕" with elegant Cubic Ease-Out curve for an atmospheric ignition visual
            const easedProgress = progressList[i] > 0 ? (1.0 - Math.pow(1.0 - progressList[i], 3)) : 1.0;
            const baseGlowSize = rr * 1.90 * pulse;
            const glowR = baseGlowSize * (0.32 + 0.68 * easedProgress);

            const gGlow = ctx.createRadialGradient(rx, ry, rr * 0.12 * easedProgress, rx, ry, glowR);
            gGlow.addColorStop(0, `rgba(255, 253, 218, ${glowOpacity * 0.96})`); // Sun-hot core
            gGlow.addColorStop(0.20, `rgba(255, 185, 30, ${glowOpacity * 0.80})`); // Warm golden-amber halo
            gGlow.addColorStop(0.52 * easedProgress, `rgba(240, 48, 12, ${glowOpacity * 0.42})`); // Soft cinnabar red
            gGlow.addColorStop(0.85 * easedProgress, `rgba(180, 16, 5, ${glowOpacity * 0.10})`); // Air-diffuse warmth boundary
            gGlow.addColorStop(1, `rgba(0, 0, 0, 0)`);

            ctx.fillStyle = gGlow;
            ctx.beginPath();
            ctx.ellipse(rx, ry, glowR, glowR * (rh / rw), 0, 0, Math.PI * 2);
            ctx.fill();

            // Light Ray spikes with a matching Cubic Ease-Out for cinematic flair
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.strokeStyle = `rgba(255, 212, 85, ${glowOpacity * 0.15 * (1.0 + 0.30 * liveFlicker) * easedProgress})`;
            ctx.lineWidth = 1.5;
            for (let r = 0; r < 4; r++) {
              const rayAngle = (r * Math.PI / 2) + frameTime * 0.35 + i;
              const rayLen = glowR * 0.86 * (1.0 + 0.18 * Math.sin(frameTime * 10 + r));
              ctx.beginPath();
              ctx.moveTo(rx - Math.cos(rayAngle) * rayLen, ry - Math.sin(rayAngle) * (rayLen * (rh / rw)));
              ctx.lineTo(rx + Math.cos(rayAngle) * rayLen, ry + Math.sin(rayAngle) * (rayLen * (rh / rw)));
              ctx.stroke();
            }
            ctx.restore();
          }

          // 3d. Elegant Atmospheric Ambient Breath Aura (Organic warm feedback replacing hard geometric lines & dashed outlines)
          if (appStageRef.current === "gate_locked") {
            const isLit = litLanternsRef.current[i];
            const isHandNear = hand.present && (Math.sqrt(((hand.x as number) * w - rx) ** 2 + ((hand.y as number) * h - ry) ** 2) < rw * 2.5);

            if (!isLit && isHandNear) {
              ctx.save();
              // Smooth breathing wave based on sinusoidal frameTime
              const pulseFactor = 0.5 + 0.5 * Math.sin(frameTime * 4.5);
              const hoverGlow = ctx.createRadialGradient(rx, ry, rw * 0.15, rx, ry, rw * 1.6);
              hoverGlow.addColorStop(0, `rgba(255, 185, 30, ${0.12 + 0.07 * pulseFactor})`); // highly translucent soft amber warmth
              hoverGlow.addColorStop(0.5, `rgba(239, 68, 68, ${0.05 + 0.03 * pulseFactor})`); // gentle cinnabar fade
              hoverGlow.addColorStop(1.0, "rgba(0, 0, 0, 0)");
              
              ctx.fillStyle = hoverGlow;
              ctx.beginPath();
              ctx.ellipse(rx, ry, rw * 1.8, rh * 1.8, 0, 0, Math.PI * 2);
              ctx.fill();
              
              // Extremely elegant soft gold calligraphy prompt beneath the lantern
              ctx.font = "italic 11px Georgia, serif, system-ui";
              ctx.fillStyle = `rgba(255, 220, 110, ${0.60 + 0.25 * pulseFactor})`;
              ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
              ctx.shadowBlur = 2;
              ctx.textAlign = "center";
              ctx.fillText("点亮", rx, ry + rh + 13);
              ctx.restore();
            }
          }
        }
      }

      // --- Draw sea-sky gate opening effect (Gate Opening state) ---
      if (appStageRef.current === "gate_opening") {
        gateProgressRef.current += 0.0058; // Gentler, cinematic timing (~3 seconds) for a poetic grand opening
        const p = gateProgressRef.current;

        const vortexX = xOffset + drawW * 0.5;
        const vortexY = yOffset + drawH * 0.345;
        const maxRadius = Math.max(w, h) * 1.35;
        const currentRadius = p * maxRadius;

        // 1. Soft, Ambient Cosmic Ocean Vortex backdrop (No hard glaring whiteout, pure watercolor beauty)
        ctx.save();
        
        // Multi-layered radial gradients simulating the warm golden-crimson sunset hues of "Big Fish & Begonia"
        const outerGlow = ctx.createRadialGradient(
          vortexX, vortexY, currentRadius * 0.08,
          vortexX, vortexY, currentRadius * 1.2
        );
        // Cinematic Warm Golden + Rose Crimson colors (暖金 + 嫣红与朱砂，国风雅致色彩)
        outerGlow.addColorStop(0, "rgba(255, 236, 179, 0.98)");   // Warm gold sunset core
        outerGlow.addColorStop(0.22, "rgba(251, 146, 60, 0.88)"); // Soft persimmon / warm amber
        outerGlow.addColorStop(0.55, "rgba(244, 63, 94, 0.58)");  // Delicate begonia rose crimson
        outerGlow.addColorStop(0.85, "rgba(13, 148, 136, 0.25)"); // Deep water teal water-mist blend
        outerGlow.addColorStop(1.0, "rgba(4, 6, 11, 0)");         // Fades seamlessly into deep night/sea

        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(vortexX, vortexY, currentRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Level 2: Misty overlay sunburst glow creating volumetric depth (soft screen mode)
        ctx.globalCompositeOperation = "screen";
        const innerGlow = ctx.createRadialGradient(
          vortexX, vortexY, currentRadius * 0.02,
          vortexX, vortexY, currentRadius * 0.7
        );
        innerGlow.addColorStop(0, "rgba(254, 240, 138, 0.92)");   // Luminous golden central soul
        innerGlow.addColorStop(0.35, "rgba(251, 113, 133, 0.6)"); // Flowing begonia petal tint
        innerGlow.addColorStop(0.75, "rgba(15, 118, 110, 0.15)"); // Deep marine emerald/jade glow
        innerGlow.addColorStop(1.0, "rgba(15, 118, 110, 0)");

        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(vortexX, vortexY, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Cinematic Hazy Diffuse Halos (朦胧弥散光晕, replacing harsh ray spokes)
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        
        const numHaloBlooms = 6;
        for (let idx = 0; idx < numHaloBlooms; idx++) {
          const angle = (idx * Math.PI * 2) / numHaloBlooms + frameTime * 0.28;
          const distOffset = Math.sin(frameTime * 1.5 + idx) * currentRadius * 0.05;
          const hX = vortexX + Math.cos(angle) * distOffset;
          const hY = vortexY + Math.sin(angle) * distOffset;
          
          // Render overlapping hazy watercolor nodes
          const nodeGlow = ctx.createRadialGradient(
            hX, hY, 0,
            hX, hY, currentRadius * 0.45
          );
          nodeGlow.addColorStop(0, "rgba(254, 215, 170, 0.32)"); // Champagne warmth
          nodeGlow.addColorStop(0.4, "rgba(244, 63, 94, 0.18)");   // Feathery begonia pink
          nodeGlow.addColorStop(1.0, "rgba(0,0,0,0)");
          
          ctx.fillStyle = nodeGlow;
          ctx.beginPath();
          ctx.arc(hX, hY, currentRadius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // --- 2.5 Dynamic Silhouette of the Red Spirit Kun (红衣灵鲲 - 宿命奔赴、归家启程的浪漫重逢) ---
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        
        // Swim path: floating elegantly in an orbital trajectory that spirals into the central golden sky
        const swimTime = frameTime * 0.65;
        // Orbit radius starts compact, expands along with gate radius, and plunges towards core
        const orbRadius = currentRadius * 0.25 * Math.sin(p * Math.PI);
        const kX = vortexX + Math.cos(swimTime) * orbRadius;
        const kY = vortexY + Math.sin(swimTime) * orbRadius - (1 - p) * 15; // smooth rising motion
        
        ctx.translate(kX, kY);
        // Align tail rotation relative to orbital velocity vector plus harmonic body wave
        ctx.rotate(swimTime + Math.PI / 2 + Math.cos(frameTime * 1.8) * 0.12);
        
        // Scale proportional to portal expansion
        const kScale = currentRadius * 0.0016 * (1.0 + Math.sin(frameTime * 1.2) * 0.06);
        ctx.scale(kScale, kScale);
        
        const kunAlpha = Math.min(1.0, p * 2.8) * (1 - p * p) * 0.92;
        ctx.globalAlpha = kunAlpha;
        
        // Setup gorgeous soft glowing shadows to preserve traditional ink watercolor texture
        ctx.shadowColor = "rgba(220, 38, 38, 0.85)"; // Sacred Vermilion Red Kun glow
        ctx.shadowBlur = 18;
        
        // Draw majestic side wing-fins (大鱼海棠经典羽翼状大鳍)
        const finSwing = Math.sin(frameTime * 2.8) * 0.1;
        
        // Left Wing-Fin
        ctx.beginPath();
        const wingGradL = ctx.createLinearGradient(0, 0, -45, 10);
        wingGradL.addColorStop(0, "rgba(239, 68, 68, 0.95)"); // Vermilion core
        wingGradL.addColorStop(0.5, "rgba(244, 63, 94, 0.7)");  // Begonia Rose
        wingGradL.addColorStop(1, "rgba(254, 240, 138, 0)");   // Warm gold tip
        ctx.fillStyle = wingGradL;
        ctx.moveTo(-6, -8);
        ctx.bezierCurveTo(-32 - finSwing * 18, -22, -55, 12, -2, 4);
        ctx.closePath();
        ctx.fill();
        
        // Right Wing-Fin
        ctx.beginPath();
        const wingGradR = ctx.createLinearGradient(0, 0, 45, 10);
        wingGradR.addColorStop(0, "rgba(239, 68, 68, 0.95)");
        wingGradR.addColorStop(0.5, "rgba(244, 63, 94, 0.7)");
        wingGradR.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = wingGradR;
        ctx.moveTo(6, -8);
        ctx.bezierCurveTo(32 + finSwing * 18, -22, 55, 12, 2, 4);
        ctx.closePath();
        ctx.fill();

        // Main Sleek Body of the Sacred Spirit Kun
        ctx.beginPath();
        // Head is at (0, -40), tail trunk connection at (0, 35)
        ctx.moveTo(0, -40);
        ctx.bezierCurveTo(-16, -28, -14, 10, -3, 35);
        
        // Tail flap swing
        const tailSwingX = Math.sin(frameTime * 4.8) * 7.5;
        ctx.lineTo(tailSwingX, 40);
        ctx.bezierCurveTo(14, 10, 16, -28, 0, -40);
        ctx.closePath();
        
        const bodyGrad = ctx.createLinearGradient(0, -40, 0, 40);
        bodyGrad.addColorStop(0, "rgba(220, 38, 38, 0.98)"); // vermilion red
        bodyGrad.addColorStop(0.65, "rgba(244, 63, 94, 0.9)");
        bodyGrad.addColorStop(1.0, "rgba(251, 113, 133, 0.6)");
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Dual butterfly-wing flowing tail lobes (仙气流云双蝶尾)
        ctx.save();
        ctx.translate(tailSwingX, 40);
        ctx.rotate(Math.sin(frameTime * 4.8) * 0.18);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Left tail lobe curve
        ctx.bezierCurveTo(-16, 10, -24, 28, -4, 35);
        ctx.bezierCurveTo(-5, 18, -2, 10, 0, 0);
        // Right tail lobe curve
        ctx.bezierCurveTo(16, 10, 24, 28, 4, 35);
        ctx.bezierCurveTo(5, 18, 2, 10, 0, 0);
        ctx.closePath();
        
        const tailGrad = ctx.createLinearGradient(0, 0, 0, 35);
        tailGrad.addColorStop(0, "rgba(220, 38, 38, 0.95)");
        tailGrad.addColorStop(0.5, "rgba(244, 63, 94, 0.72)");
        tailGrad.addColorStop(1.0, "rgba(253, 224, 71, 0.1)"); // translucent golden ink dust
        ctx.fillStyle = tailGrad;
        ctx.fill();
        ctx.restore();
        
        ctx.restore();

        // 3. Floating Ethereal Spirits (Souls as glowing floating teal or golden sparkles)
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const numParticles = 45;
        for (let idx = 0; idx < numParticles; idx++) {
          const angle = (idx * 17.5 + frameTime * 0.4) % (Math.PI * 2);
          const ratio = ((idx * 13 + frameTime * 12) % 400) / 400; // flowing outwards
          const r = ratio * currentRadius * 0.85;
          
          const pAngle = angle + ratio * 1.2;
          const px = vortexX + Math.cos(pAngle) * r;
          const py = vortexY + Math.sin(pAngle) * r;
          
          const pSize = (1.2 + Math.sin(idx + frameTime * 2.2) * 0.6) * Math.sin(ratio * Math.PI) * 2.2;
          const alpha = Math.sin(ratio * Math.PI) * (1 - p) * 0.8;
          
          if (alpha > 0) {
            // Elegant, pastel-tinted sparkles aligned with Begonia & Teal elements
            ctx.fillStyle = idx % 2 === 0 ? `rgba(153, 246, 228, ${alpha})` : `rgba(254, 243, 199, ${alpha})`;
            ctx.shadowColor = idx % 2 === 0 ? "rgb(153, 246, 228)" : "rgb(254, 243, 199)";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 4. Soft Swirling Begonia Petals (Floating through diffuse light gaps - extremely clean & focused)
        ctx.save();
        const numOverlayPetals = 4; // Subtly focused, very few petals
        for (let i = 0; i < numOverlayPetals; i++) {
          const personalSeed = i * 23.7;
          const phase = ((frameTime * 0.12 + i * 0.22) % 1.0); // 0 to 1 loop cyc
          // Beautiful concentrated radius closer to the center vortex instead of dispersing to the outer screen edges
          const dist = (0.16 + (1 - phase) * 0.44) * currentRadius * 0.8;
          const theta = frameTime * 0.55 + i * (Math.PI * 2 / numOverlayPetals) + phase * 2.5;
          const petX = vortexX + Math.cos(theta) * dist;
          const petY = vortexY + Math.sin(theta) * dist;
          
          const pSize = 10 + Math.sin(personalSeed) * 4.5;
          const scale = Math.sin(phase * Math.PI) * (1 - p * 0.25) * (pSize / 56);
          const alpha = Math.sin(phase * Math.PI) * (1 - p * 0.15) * 0.85;
          
          if (scale > 0.05 && alpha > 0.05) {
            ctx.save();
            ctx.translate(petX, petY);
            ctx.rotate(theta + frameTime * 0.95 + personalSeed);
            ctx.scale(scale, scale);
            ctx.globalAlpha = alpha;
            
            // Draw a high-fidelity procedural soft begonia petal
            const petalGrad = ctx.createRadialGradient(-2, -4, 1, 0, 0, 24);
            petalGrad.addColorStop(0, "rgba(255, 241, 242, 0.98)");
            petalGrad.addColorStop(0.5, "rgba(251, 113, 133, 0.62)"); // soft pastel warmth
            petalGrad.addColorStop(1, "rgba(159, 18, 57, 0)");       // soft feather blend
            
            ctx.fillStyle = petalGrad;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.bezierCurveTo(16, -20, 20, 8, 0, 20);
            ctx.bezierCurveTo(-20, 8, -16, -20, 0, -18);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();

        // 5. Cinematic fade-to-black overlay (中间加上黑幕过渡)
        if (p > 0.65) {
          const blackOpacity = Math.min(1.0, (p - 0.65) / 0.3);
          ctx.save();
          ctx.fillStyle = `rgba(4, 6, 11, ${blackOpacity})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // Wait for the full cinematic silence black overlay (complete darkness) before swapping stages
        if (gateProgressRef.current >= 1.05) {
          gateProgressRef.current = 1.05; // clamp
          if (synthRef.current && !ambientMuted) {
            synthRef.current.playAscendingSuccessSwell();
          }
          // Clear mask canvas for beautiful grayscale transition
          if (maskCanvasRef.current) {
            const mCtx = maskCanvasRef.current.getContext("2d");
            if (mCtx) mCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          }
          // Clear active particles and bubbles to prevent automatic coloring from previous stage
          particles.current = [];
          underwaterBubblesRef.current = [];
          blessingBubblesRef.current = [];
          
          // Reset progress trackers
          setUnderwaterProgress(0);
          previousProgressRef.current = 0;
          setIsTransitioningToMedia(false);
          
          // Spawn a refined, elegant, minimal flutter of petals for high-fidelity micro-accents — extremely clean (不用太多，精致点缀)
          const centerBurstX = vortexX;
          for (let petal = 0; petal < 6; petal++) { // Very few petals
            const px = centerBurstX + (Math.random() - 0.5) * (w * 0.3);
            const py = -10 - Math.random() * 50;
            const vx = (Math.random() - 0.5) * 1.5;
            const vy = 1.2 + Math.random() * 1.8;
            spawnPetals(px, py, vx, vy, 1);
          }
          
          // Init the fading black screen overlay opacity to 1.0 initially for a slow cinematic revealed fade out
          transitionBlackscreenOpacityRef.current = 1.0;
          
          setAppStage("prologue3");
        }
      }
      const activeFishes = fishes.current;
      for (const fish of activeFishes) {
        // Handle fish wandering or responding to the user's hand interactively
        const hX = (hand.x as number) * w;
        const hY = (hand.y as number) * h;
        const dx = hX - fish.x;
        const dy = hY - fish.y;
        const distToHand = Math.sqrt(dx * dx + dy * dy);

        if (hand.present) {
          if (hand.isOpen) {
            // Highly responsive swarming attraction: Orbit and gather closely around the active hand coordinates
            // Each fish orbits in a distinct phase to prevent overlapping into a single dot
            const orbitOffsetPhase = fish.id * (Math.PI / 2);
            const orbitX = hX + Math.sin(frameTime * 1.8 + orbitOffsetPhase) * 65;
            const orbitY = hY + Math.cos(frameTime * 1.8 + orbitOffsetPhase) * 65;

            const fDx = orbitX - fish.x;
            const fDy = orbitY - fish.y;
            const fDist = Math.sqrt(fDx * fDx + fDy * fDy);

            const targetAngle = Math.atan2(fDy, fDx);
            let angleDiff = targetAngle - fish.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            // Turn rapidly!
            fish.angle += angleDiff * 0.085;
            
            // Speed up if distant, inherit hand speed as dynamic momentum push
            const followSpeed = fDist > 300 ? 5.8 : 2.5 + Math.sin(fish.swimCycle) * 0.8;
            fish.vx = Math.cos(fish.angle) * followSpeed + hand.velocity.x * 0.28;
            fish.vy = Math.sin(fish.angle) * followSpeed + hand.velocity.y * 0.28;

            // Trigger a soft splash note and play sound when fish reaches or swirls past the hand
            if (fDist < 85 && Math.random() < 0.015) {
              if (synthRef.current && !ambientMuted) {
                synthRef.current.playFishSplash();
              }
            }
          } else {
            // Startled and quick retreat away from clenched fists (fright response)
            if (distToHand < 350) {
              const escapeAngle = Math.atan2(fish.y - hY, fish.x - hX);
              let angleDiff = escapeAngle - fish.angle;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              
              fish.angle += angleDiff * 0.095;
              const speed = 4.0 + Math.sin(fish.swimCycle) * 1.2;
              fish.vx = Math.cos(fish.angle) * speed;
              fish.vy = Math.sin(fish.angle) * speed;
            } else {
              // Gentle wander when far from fist
              const tDx = fish.targetX - fish.x;
              const tDy = fish.targetY - fish.y;
              const tDist = Math.sqrt(tDx * tDx + tDy * tDy);
              
              if (tDist < 80 || Math.random() < 0.005) {
                fish.targetX = Math.random() * w;
                fish.targetY = Math.random() * h;
              }
              const targetAngle = Math.atan2(tDy, tDx);
              let angleDiff = targetAngle - fish.angle;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              
              fish.angle += angleDiff * 0.015;
              const speed = 0.9 + Math.sin(fish.swimCycle) * 0.25;
              fish.vx = Math.cos(fish.angle) * speed;
              fish.vy = Math.sin(fish.angle) * speed;
            }
          }
        } else {
          // Normal elegant wandering across ambient water-sky layers
          const tDx = fish.targetX - fish.x;
          const tDy = fish.targetY - fish.y;
          const tDist = Math.sqrt(tDx * tDx + tDy * tDy);
          
          if (tDist < 80 || Math.random() < 0.005) {
            fish.targetX = Math.random() * w;
            fish.targetY = Math.random() * h;
          }
          const targetAngle = Math.atan2(tDy, tDx);
          let angleDiff = targetAngle - fish.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          
          fish.angle += angleDiff * 0.015;
          const speed = 0.9 + Math.sin(fish.swimCycle) * 0.25;
          fish.vx = Math.cos(fish.angle) * speed;
          fish.vy = Math.sin(fish.angle) * speed;
        }

        // Apply physical coordinates and clip boundaries
        fish.x += fish.vx;
        fish.y += fish.vy;
        
        const bMargin = 100;
        if (fish.x < -bMargin) fish.x = w + bMargin;
        if (fish.x > w + bMargin) fish.x = -bMargin;
        if (fish.y < -bMargin) fish.y = h + bMargin;
        if (fish.y > h + bMargin) fish.y = -bMargin;

        fish.swimCycle += fish.swimSpeed + Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy) * 0.012;

        // Save position trail
        fish.trail.unshift({ x: fish.x, y: fish.y });
        if (fish.trail.length > 20) {
          fish.trail.pop();
        }

        // Spawn pale mist-like trails (身后曳出浅淡雾状光迹)
        if (Math.random() < 0.45) {
          const backOffsetAngle = fish.angle + Math.PI;
          const tailBaseX = fish.x + Math.cos(backOffsetAngle) * fish.size * 1.5;
          const tailBaseY = fish.y + Math.sin(backOffsetAngle) * fish.size * 1.5;
          fish.glowingTrails.push({
            x: tailBaseX + (Math.random() - 0.5) * 4,
            y: tailBaseY + (Math.random() - 0.5) * 4,
            alpha: 0.55,
            radius: fish.size * 0.45 + Math.random() * 5
          });
        }

        // Dissolve trails
        for (let j = fish.glowingTrails.length - 1; j >= 0; j--) {
          const t = fish.glowingTrails[j];
          t.alpha -= 0.0075;
          t.radius += 0.22;
          if (t.alpha <= 0) {
            fish.glowingTrails.splice(j, 1);
          }
        }

        // 1. Draw glowing mist trails
        ctx.save();
        for (const t of fish.glowingTrails) {
          ctx.beginPath();
          const radialG = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.radius * 2.2);
          radialG.addColorStop(0, `rgba(186, 230, 253, ${t.alpha * 0.32})`);
          radialG.addColorStop(0.5, `rgba(56, 189, 248, ${t.alpha * 0.12})`);
          radialG.addColorStop(1, "rgba(56, 189, 248, 0)");
          ctx.fillStyle = radialG;
          ctx.arc(t.x, t.y, t.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 2. Draw glassy body wiggling in local space coordinates
        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.angle);

        // Surrounding soft light blue glow shadow (周身萦绕淡幽蓝柔光)
        const surroundGrad = ctx.createRadialGradient(0, 0, fish.size * 0.2, 0, 0, fish.size * 3.0);
        surroundGrad.addColorStop(0, "rgba(186, 230, 253, 0.45)");
        surroundGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.15)");
        surroundGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = surroundGrad;
        ctx.beginPath();
        ctx.arc(0, 0, fish.size * 3.0, 0, Math.PI * 2);
        ctx.fill();

        // Set dual-glow properties
        ctx.shadowColor = "rgba(125, 211, 252, 0.88)";
        ctx.shadowBlur = 12;

        // Custom linear/radial glassy gradient configuration (半透琉璃质感，肌理温润朦胧)
        const fishBodyGrad = ctx.createLinearGradient(-fish.size, 0, fish.size * 1.3, 0);
        fishBodyGrad.addColorStop(0, "rgba(224, 242, 254, 0.12)"); // clear, translucent tail base
        fishBodyGrad.addColorStop(0.4, "rgba(125, 211, 252, 0.38)"); // glazed warm blue body
        fishBodyGrad.addColorStop(0.82, "rgba(14, 165, 233, 0.58)"); // turquoise belly
        fishBodyGrad.addColorStop(1, "rgba(240, 253, 250, 0.78)"); // misty nose

        ctx.fillStyle = fishBodyGrad;
        ctx.strokeStyle = "rgba(224, 242, 254, 0.65)";
        ctx.lineWidth = 1.0;

        // Wavy pectoral fins
        const finAdjust = Math.sin(fish.swimCycle * 0.45) * 0.12;
        
        // Left Fin
        ctx.save();
        ctx.translate(fish.size * 0.38, -fish.size * 0.28);
        ctx.rotate(-0.85 + finAdjust);
        const lFinG = ctx.createLinearGradient(0, 0, 0, -fish.size * 1.25);
        lFinG.addColorStop(0, "rgba(14, 165, 233, 0.55)");
        lFinG.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = lFinG;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-fish.size * 0.15, -fish.size * 0.5, -fish.size * 0.4, -fish.size * 1.1, 0, -fish.size * 1.25);
        ctx.bezierCurveTo(fish.size * 0.3, -fish.size * 0.9, fish.size * 0.25, -fish.size * 0.4, 0, 0);
        ctx.fill();
        ctx.restore();

        // Right Fin
        ctx.save();
        ctx.translate(fish.size * 0.38, fish.size * 0.28);
        ctx.rotate(0.85 - finAdjust);
        const rFinG = ctx.createLinearGradient(0, 0, 0, fish.size * 1.25);
        rFinG.addColorStop(0, "rgba(14, 165, 233, 0.55)");
        rFinG.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = rFinG;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-fish.size * 0.15, fish.size * 0.5, -fish.size * 0.4, fish.size * 1.1, 0, fish.size * 1.25);
        ctx.bezierCurveTo(fish.size * 0.3, fish.size * 0.9, fish.size * 0.25, fish.size * 0.4, 0, 0);
        ctx.fill();
        ctx.restore();

        // Draw streamlined fish body (from nose to tail base)
        ctx.beginPath();
        ctx.moveTo(fish.size * 1.4, 0); // Nose
        ctx.bezierCurveTo(
          fish.size * 0.65, -fish.size * 0.45, 
          -fish.size * 0.2, -fish.size * 0.35, 
          -fish.size * 0.85, -fish.size * 0.08
        );
        const wBaseX = -fish.size * 1.8;
        const wBaseY = Math.sin(fish.swimCycle) * fish.size * 0.45;
        ctx.lineTo(wBaseX, wBaseY);
        ctx.bezierCurveTo(
          -fish.size * 0.2, fish.size * 0.35, 
          fish.size * 0.65, fish.size * 0.45, 
          fish.size * 1.4, 0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw elegant waving back dorsal fin
        const dorsalFinGrad = ctx.createLinearGradient(0, 0, -fish.size * 0.7, -fish.size * 0.3);
        dorsalFinGrad.addColorStop(0, "rgba(125, 211, 252, 0.6)");
        dorsalFinGrad.addColorStop(1, "rgba(125, 211, 252, 0)");
        ctx.fillStyle = dorsalFinGrad;
        ctx.beginPath();
        ctx.moveTo(fish.size * 0.4, 0);
        ctx.bezierCurveTo(0, -fish.size * 0.45, -fish.size * 0.55, -fish.size * 0.7, -fish.size * 0.35, 0);
        ctx.fill();

        // Draw double-lobed tail fin ("周身萦绕淡幽蓝柔光并且游动时尾鳍轻摆")
        ctx.save();
        ctx.translate(wBaseX, wBaseY);
        ctx.rotate(Math.sin(fish.swimCycle) * 0.32); // trailing wave rotating delay

        const tailG = ctx.createLinearGradient(0, 0, -fish.size * 1.7, 0);
        tailG.addColorStop(0, "rgba(186, 230, 253, 0.75)");
        tailG.addColorStop(0.5, "rgba(56, 189, 248, 0.35)");
        tailG.addColorStop(1, "rgba(186, 230, 253, 0)");
        ctx.fillStyle = tailG;
        ctx.strokeStyle = "rgba(224, 242, 254, 0.32)";

        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Upper lobe
        ctx.bezierCurveTo(
          -fish.size * 0.55, -fish.size * 0.75, 
          -fish.size * 1.3, -fish.size * 1.25, 
          -fish.size * 1.75, -fish.size * 0.8
        );
        ctx.bezierCurveTo(
          -fish.size * 1.2, -fish.size * 0.25, 
          -fish.size * 0.5, -fish.size * 0.08, 
          -fish.size * 0.25, 0
        );
        // Lower lobe
        ctx.bezierCurveTo(
          -fish.size * 0.5, fish.size * 0.08, 
          -fish.size * 1.2, fish.size * 0.25, 
          -fish.size * 1.75, fish.size * 0.8
        );
        ctx.bezierCurveTo(
          -fish.size * 1.3, fish.size * 1.25, 
          -fish.size * 0.55, fish.size * 0.75, 
          0, 0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Soft fin rays inside tail
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-fish.size * 1.4, -fish.size * 0.55);
        ctx.moveTo(0, 0); ctx.lineTo(-fish.size * 1.5, -fish.size * 0.25);
        ctx.moveTo(0, 0); ctx.lineTo(-fish.size * 1.5, fish.size * 0.25);
        ctx.moveTo(0, 0); ctx.lineTo(-fish.size * 1.4, fish.size * 0.55);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 0.7;
        ctx.stroke();

        ctx.restore(); // Exit tail fin rotation

        // Faint bright eyes
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.shadowColor = "rgba(255, 255, 255, 1)";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(fish.size * 0.88, -fish.size * 0.25, 1.6, 0, Math.PI * 2);
        ctx.arc(fish.size * 0.88, fish.size * 0.25, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Exit fish local translation
      }

      // 3. Render active drifting translucent organic petals on top (薄如蝉翼，带脉纹与流动光影)
      const sprites = petalSpritesRef.current;
      for (let i = 0; i < currentParticles.length; i++) {
        const p = currentParticles[i];
        const sprite = sprites[p.spriteIdx];
        if (!sprite) continue;
        
        const sprSize = sprite.width / 2;
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Adapt scale to petal sizes
        const sX = p.scaleX * (p.size / sprSize);
        const sY = p.scaleY * (p.size / sprSize);
        ctx.scale(sX, sY);
        
        // Soften opacity on steep angles
        ctx.globalAlpha = p.alpha * Math.max(0.2, Math.abs(p.scaleY));
        
        // Draw primary highly detailed pre-rendered petal sprite
        ctx.drawImage(sprite, -sprSize, -sprSize);

        // Shimmering light layer ("光影在瓣面自然流动")
        // Render a glossy streak traversing across the petal surface depending on its spinPhase, 
        // representing sunlight rays reflecting off the delicate curling flesh
        const shineFactor = Math.sin((p.spinPhase * 1.5) + (p.x * 0.005) + (p.y * 0.005));
        if (shineFactor > 0.45) {
          const shineAlpha = (shineFactor - 0.45) * 0.48 * p.alpha;
          
          ctx.save();
          // Clip to the exact contour outlines of the draw sprite using source-atop blend operation
          ctx.globalCompositeOperation = "source-atop";
          ctx.globalAlpha = shineAlpha;
          
          // Shimmering bright ray path
          const shineGrad = ctx.createLinearGradient(-sprSize, -sprSize, sprSize, sprSize);
          shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.72)");
          shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          
          ctx.fillStyle = shineGrad;
          ctx.fillRect(-sprSize, -sprSize, sprSize * 2, sprSize * 2);
          ctx.restore();
        }

        ctx.restore();
      }
      
      // 4. Subtle poetic aesthetic details: ambient deep-sea sparkles or rising ocean embers
      if (Math.random() < 0.08) {
        // Spawn deep background rising ember/bubble in color area
        const bubbleX = Math.random() * w;
        const bubbleY = h + 10;
        const bubbleRadius = 1 + Math.random() * 3;
        // Drawn as ambient glowing points
        ctx.save();
        ctx.fillStyle = "rgba(251, 113, 133, 0.3)";
        ctx.shadowColor = "rgba(244, 63, 94, 0.8)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bubbleX, h * (0.3 + Math.random() * 0.7), bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Cinematic black screen transition overlay (中间加上黑幕过渡 - fade out once target stage entered)
      if (transitionBlackscreenOpacityRef.current > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(4, 6, 11, ${transitionBlackscreenOpacityRef.current})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        
        // Render very slow, gentle cinematic fading-out reveals
        if (appStageRef.current === "underwater_tree" || appStageRef.current === "completed") {
          transitionBlackscreenOpacityRef.current = Math.max(0, transitionBlackscreenOpacityRef.current - 0.0088); 
        }
      }

      // 5. Draw a gorgeous flowing sea-spirit cursor halo tracker around active hand
      if (hand.present) {
        const hX = (hand.x as number) * w;
        const hY = (hand.y as number) * h;
        
        ctx.save();
        // Pulsating light ring
        const pulse = 1.0 + Math.sin(frameTime * 4) * 0.12;
        const outerRad = hand.isOpen ? 22 * pulse : 14 * pulse;
        
        ctx.strokeStyle = hand.isOpen ? "rgba(251, 113, 133, 0.75)" : "rgba(59, 130, 246, 0.75)";
        ctx.lineWidth = 2;
        ctx.shadowColor = hand.isOpen ? "rgba(244, 63, 94, 0.6)" : "rgba(37, 99, 235, 0.6)";
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(hX, hY, outerRad, 0, Math.PI * 2);
        ctx.stroke();

        // Core light dot
        ctx.fillStyle = hand.isOpen ? "#fff5f6" : "#eff6ff";
        ctx.beginPath();
        ctx.arc(hX, hY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Beautiful floating Chinese calligraphic text at cursor when user is tracking
        ctx.fillStyle = "rgba(251, 113, 133, 0.85)";
        ctx.font = "14px 'Noto Serif SC', serif";
        ctx.shadowBlur = 4;
        ctx.fillText(hand.isOpen ? "生" : "眠", hX + 18, hY - 6);
        
        ctx.restore();

        // Detect transition from hand OPEN to hand CLOSED (Clench Gesture Click)
        const isClenchedThisFrame = wasHandOpenRef.current && !hand.isOpen;
        
        if (appStageRef.current === "intro" || appStageRef.current === "prologue" || appStageRef.current === "prologue2" || appStageRef.current === "prologue3") {
          const targetBtnId = 
            appStageRef.current === "intro" ? "btn_start_prologue" : 
            appStageRef.current === "prologue" ? "btn_start_painting" : 
            appStageRef.current === "prologue2" ? "btn_start_gate" : "btn_start_underwater";
          const btn = document.getElementById(targetBtnId);
          let isInsideButton = false;
          let rect: DOMRect | null = null;
          
          if (btn) {
            rect = btn.getBoundingClientRect();
            const canvasRect = mainCanvas.getBoundingClientRect();
            const handClientX = (hand.x as number) * canvasRect.width + canvasRect.left;
            const handClientY = (hand.y as number) * canvasRect.height + canvasRect.top;
            
            if (
              handClientX >= rect.left && 
              handClientX <= rect.right && 
              handClientY >= rect.top && 
              handClientY <= rect.bottom
            ) {
              isInsideButton = true;
            }
          }
          
          if (isInsideButton) {
            introHoverTimerRef.current += 1;
            const progress = Math.min(1.0, introHoverTimerRef.current / 60); // 60 frames ≈ 1.0s hover-to-start
            
            // Draw golden spinning aura around the cursor showing click progress
            ctx.save();
            ctx.strokeStyle = "rgba(245, 158, 11, 0.85)"; // Golden amber
            ctx.lineWidth = 3;
            ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
            ctx.shadowBlur = 12;
            
            ctx.beginPath();
            ctx.arc(hX, hY, outerRad + 6, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = "rgba(245, 158, 11, 0.95)";
            ctx.font = "12px 'Noto Serif SC', serif";
            ctx.shadowBlur = 2;
            ctx.fillText(`${Math.round(progress * 100)}% 灵契重聚`, hX + 18, hY + 14);
            ctx.restore();
            
            if (introHoverTimerRef.current >= 60 || isClenchedThisFrame) {
              if (btn) {
                btn.click();
              }
              introHoverTimerRef.current = 0;
            }
          } else {
            introHoverTimerRef.current = 0;
            // Support clenching fist anywhere on screen as a fast skip start gesture
            if (isClenchedThisFrame) {
              if (btn) {
                btn.click();
              }
            }
          }
        }
        
        // Save the hand state for next frame transition calculation
        wasHandOpenRef.current = hand.isOpen;
      }

      // Check current mask restoration progress periodically in a non-blocking throttled way
      frameCountRef.current++;
      if (appStageRef.current === "painting" && frameCountRef.current % 45 === 0) {
        const scaleW = 32;
        const scaleH = 32;
        if (backgroundImageRef.current && bgImageLoadedRef.current) {
          const calcCanvas = document.createElement("canvas");
          calcCanvas.width = scaleW;
          calcCanvas.height = scaleH;
          const calcCtx = calcCanvas.getContext("2d");
          
          const bgCanvas = document.createElement("canvas");
          bgCanvas.width = scaleW;
          bgCanvas.height = scaleH;
          const bgCtx = bgCanvas.getContext("2d");
          
          if (calcCtx && bgCtx) {
            calcCtx.drawImage(maskCanvas, 0, 0, scaleW, scaleH);
            bgCtx.drawImage(backgroundImageRef.current, 0, 0, scaleW, scaleH);
            try {
              const maskData = calcCtx.getImageData(0, 0, scaleW, scaleH).data;
              const bgData = bgCtx.getImageData(0, 0, scaleW, scaleH).data;
              let activeBrownPixels = 0;
              let totalBrownPixels = 0;
              
              const cx = scaleW * 0.5;
              const cy = scaleH * 0.345;
              const maxR = scaleW * 0.48; // Outer roof circle boundary
              const minR = scaleW * 0.14; // Inner courtyard boundary
              
              for (let y = 0; y < scaleH; y++) {
                for (let x = 0; x < scaleW; x++) {
                  const dx = x + 0.5 - cx;
                  const dy = y + 0.5 - cy;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  
                  if (dist >= minR && dist <= maxR) {
                    const idx = (y * scaleW + x) * 4;
                    const r = bgData[idx];
                    const g = bgData[idx+1];
                    const b = bgData[idx+2];
                    
                    // Robust brown color detector
                    const isColorBrown = r > 45 && g > 25 && b < 100 && r > g * 1.15 && g > b * 1.05 && r - b > 15;
                    
                    if (isColorBrown) {
                      totalBrownPixels++;
                      const alphaIdx = idx + 3;
                      if (maskData[alphaIdx] > 15) { // alpha > 15 in maskCanvas means painted
                        activeBrownPixels++;
                      }
                    }
                  }
                }
              }
              
              let percentage = 0;
              if (totalBrownPixels > 0) {
                percentage = Math.round((activeBrownPixels / totalBrownPixels) * 100);
              }
              if (percentage >= 98) {
                percentage = 100;
              }
              if (percentage !== previousProgressRef.current) {
                previousProgressRef.current = percentage;
                setRestoreProgress(percentage);
                
                // Transition to Gate Locked (vortex) mode when above 100% coverage (画面完全点亮后进入海天之门)
                if (percentage >= 100 && !hasAutoTriggeredRef.current) {
                  hasAutoTriggeredRef.current = true;
                  isBgRotatingRef.current = true; // Let the roof start slow rotation!
                  
                  // Keep rotating during painting stage, then stop after 5.5 seconds (leaving remaining 1.0s static)
                  setTimeout(() => {
                    isBgRotatingRef.current = false; // Stop the rotation, keeps its current final angle static
                  }, 5500);
                  
                  // Finally transition to Act II Prologue scene after 6.5 seconds
                  setTimeout(() => {
                    setAppStage("prologue2");
                    setCurrentBgUrl("/src/assets/images/wooden_corridor_png_1781140258057.png");
                  }, 6500); // 6.5s delay to let the user enjoy the magical rotation
                }
              }
            } catch (e) {
              console.error("Mask sampling error", e);
            }
          }
        }
      }
    };
    
    animId = requestAnimationFrame(updateAndRender);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 6. MediaPipe hands callback receiver - mapped inside a ref to ensure zero component re-render overhead
  const onHandsResults = (results: any) => {
    const hand = handStateRef.current;
    
    // Draw joints onto visual tracking feedback canvas (if active)
    drawCameraOverlaySkeleton(results);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Average coordinate points to grab the absolute center of the palm structures
      const wrist = landmarks[0];
      const indexMcp = landmarks[5];
      const middleMcp = landmarks[9];
      const pinkyMcp = landmarks[17];
      
      const pX = (wrist.x + indexMcp.x + middleMcp.x + pinkyMcp.x) / 4;
      const pY = (wrist.y + indexMcp.y + middleMcp.y + pinkyMcp.y) / 4;
      
      // Horizontal mirroring mirroring logic mapping normalized 1-0 boundary
      const mirrorX = 1 - pX;
      
      // Calculate velocity vector based on prior coordinates
      const dx = mirrorX - lastHandPosRef.current.x;
      const dy = pY - lastHandPosRef.current.y;
      
      hand.velocity = { x: dx * 35, y: dy * 35 };
      lastHandPosRef.current = { x: mirrorX, y: pY };
      
      hand.x = mirrorX;
      hand.y = pY;
      hand.present = true;
      
      // --- Heuristics to detect gesture posture ---
      const dist = (p1: any, p2: any) => {
        const xd = p1.x - p2.x;
        const yd = p1.y - p2.y;
        const zd = p1.z - p2.z || 0;
        return Math.sqrt(xd*xd + yd*yd + zd*zd);
      };
      
      let extendedFingers = 0;
      
      // Fingers landmark coordinates
      const fingerTiers = [
        { tip: 8, pip: 6 },  // Index
        { tip: 12, pip: 10 }, // Middle
        { tip: 16, pip: 14 }, // Ring
        { tip: 20, pip: 18 }  // Pinky
      ];
      
      fingerTiers.forEach(f => {
        const dTip = dist(wrist, landmarks[f.tip]);
        const dPip = dist(wrist, landmarks[f.pip]);
        if (dTip > dPip * 1.05) {
          extendedFingers++;
        }
      });
      
      // Check thumb tip (4) distance from knuckle (2)
      const dThumbTip = dist(wrist, landmarks[4]);
      const dThumbBase = dist(wrist, landmarks[2]);
      if (dThumbTip > dThumbBase * 1.05) {
        extendedFingers++;
      }
      
      hand.isOpen = extendedFingers >= 4;
      hand.score = results.multiHandedness[0].score;
    } else {
      hand.present = false;
    }
  };

  // 7. Draw skeleton onto upper-right Camera monitor box
  const drawCameraOverlaySkeleton = (results: any) => {
    const canvas = camPreviewCanvasRef.current;
    const video = hiddenVideoRef.current;
    if (!canvas || !video || !showCamPreview) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw mirrored background video feed onto mini thumbnail preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0 && drawSkeleton) {
      const landmarks = results.multiHandLandmarks[0];
      ctx.save();
      
      // Draw joints connecting paths mimicking deep-sea luminous threads (cyan/rose color)
      const isHandOpen = handStateRef.current.isOpen;
      const themeColor = isHandOpen ? "#f43f5e" : "#3b82f6";
      
      // 1. Draw connections
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 4;
      
      // Helpers to map coordinates on mirrored canvas
      const drawLine = (ptAIdx: number, ptBIdx: number) => {
        const ptA = landmarks[ptAIdx];
        const ptB = landmarks[ptBIdx];
        // Mirror coordinates mapping
        const ax = (1 - ptA.x) * canvas.width;
        const ay = ptA.y * canvas.height;
        const bx = (1 - ptB.x) * canvas.width;
        const by = ptB.y * canvas.height;
        
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      };
      
      // Draw Palm Base & Wrist connectors
      drawLine(0, 1); drawLine(1, 2); drawLine(2, 3); drawLine(3, 4); // Thumb
      drawLine(0, 5); drawLine(5, 6); drawLine(6, 7); drawLine(7, 8); // Index
      drawLine(0, 9); drawLine(9, 10); drawLine(10, 11); drawLine(11, 12); // Middle
      drawLine(0, 13); drawLine(13, 14); drawLine(14, 15); drawLine(15, 16); // Ring
      drawLine(0, 17); drawLine(17, 18); drawLine(18, 19); drawLine(19, 20); // Pinky
      drawLine(5, 9); drawLine(9, 13); drawLine(13, 17); // Knuckles joins
      
      // 2. Draw land nodes
      ctx.fillStyle = "#ffffff";
      landmarks.forEach((pt: any) => {
        const px = (1 - pt.x) * canvas.width;
        const py = pt.y * canvas.height;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.restore();
    }
  };

  // 8. Initiate webcam camera and load MediaPipe structures safely
  const startCameraSystem = async () => {
    if (cameraState === "active" || cameraState === "requesting") return;
    
    setCameraState("requesting");
    setErrorMessage("");
    
    try {
      // 1. Initialize detector structures if absent
      if (!handsTracerRef.current) {
        if (!(window as any).Hands) {
          throw new Error("检测到浏览器尚未加载MediaPipe API，请稍后重试。");
        }
        
        const hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.62,
          minTrackingConfidence: 0.62
        });
        
        hands.onResults(onHandsResults);
        handsTracerRef.current = hands;
      }
      
      // 2. Request webcam feed
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      });
      
      const vEl = hiddenVideoRef.current;
      if (!vEl) throw new Error("页面视频接收节点未就绪。");
      
      vEl.srcObject = stream;
      const playPromise = vEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("相机视频流播放失败:", err);
          }
        });
      }
      
      // 3. Initiate camera ticking thread
      if (!cameraTrackerRef.current) {
        const camera = new (window as any).Camera(vEl, {
          onFrame: async () => {
            if (handsTracerRef.current && cameraState !== "error") {
              await handsTracerRef.current.send({ image: vEl });
            }
          },
          width: 640,
          height: 480
        });
        
        cameraTrackerRef.current = camera;
      }
      
      await cameraTrackerRef.current.start();
      setCameraState("active");
    } catch (err: any) {
      console.error("Camera startup failure", err);
      setCameraState("error");
      setErrorMessage(
        err.message || 
        "摄像头开启失败，可能原因：权限被拒绝、设备无视频输入模块、或使用了非HTTPS加密连接。您可以点击右上角通过【鼠标或触控】来随心画出海棠！"
      );
    }
  };

  // 9. Graceful fallback on mouse and touch sweeps for systems with missing camera permissions
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    isInteractingRef.current = true;
    updatePointerCoors(e);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isInteractingRef.current) return;
    updatePointerCoors(e);
  };

  const handleTouchEnd = () => {
    isInteractingRef.current = false;
    handStateRef.current.present = false;
  };

  const updatePointerCoors = (e: React.TouchEvent | React.MouseEvent) => {
    const mainCtx = mainCanvasRef.current;
    if (!mainCtx) return;
    
    const rect = mainCtx.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Normalize coordinates 0 to 1 mapping
    const nX = (clientX - rect.left) / rect.width;
    const nY = (clientY - rect.top) / rect.height;
    
    const now = performance.now();
    const dt = (now - lastInteractionRef.current.time) / 1000;
    
    // Calculate speed vector for natural wind drag
    let vx = 0;
    let vy = 0;
    if (dt > 0) {
      vx = (nX - lastInteractionRef.current.x) / dt;
      vy = (nY - lastInteractionRef.current.y) / dt;
      // Clamping speed spikes
      vx = Math.max(-15, Math.min(15, vx));
      vy = Math.max(-15, Math.min(15, vy));
    }
    
    lastInteractionRef.current = { x: nX, y: nY, time: now };
    
    // Bind interaction values directly inside our fast thread ref
    const hand = handStateRef.current;
    hand.present = true;
    hand.x = nX;
    hand.y = nY;
    hand.isOpen = true; // Click / sweep touch always triggers color restoration and petals spawning!
    hand.velocity = { x: vx * 0.15, y: vy * 0.15 };
    
    // Direct petal release
    if (Math.random() < 0.8) {
      spawnPetals(nX * rect.width, nY * rect.height, hand.velocity.x * 4, hand.velocity.y * 4, 1);
    }
  };

  // 10. Master state resets (Wipes the persistent mask canvas to start fresh)
  const resetEntireCanvas = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const maskCtx = mask.getContext("2d");
    if (!maskCtx) return;
    
    // Reset state triggers
    hasAutoTriggeredRef.current = false;
    previousProgressRef.current = 0;
    setRestoreProgress(0);
    setUnderwaterProgress(0);
    setIsTransitioningToMedia(false);
    setPoppingQuote(null);
    setAppStage("painting");
    setCurrentBgUrl("/src/assets/images/dayu_begonia_tulou_bg_1780979617236.png");
    gateProgressRef.current = 0;
    transitionBlackscreenOpacityRef.current = 0;
    waveStateRef.current = {
      lastDir: 0,
      lastSwitchTime: 0,
      switchCount: 0
    };
    setWaveProgressCount(0);
    lanternLightsRef.current = [0, 0, 0, 0, 0];
    lastWaveCountRef.current = 0;
    litLanternsRef.current = [false, false, false, false, false];
    lanternAnimProgressRef.current = [0, 0, 0, 0, 0];
    isBgRotatingRef.current = false;
    bgRotationAngleRef.current = 0;
    roofOpacityRef.current = 0;
    if (domRotatingRoofRef.current) {
      domRotatingRoofRef.current.style.display = "none";
      domRotatingRoofRef.current.style.opacity = "0";
      domRotatingRoofRef.current.style.transform = "";
    }
    if (domStaticBgRef.current) {
      domStaticBgRef.current.style.opacity = "1";
    }
    
    // Fade out mask with elegant transitional animations
    let fadeTicks = 0;
    const fadeOutMask = () => {
      if (fadeTicks < 25) {
        maskCtx.fillStyle = "rgba(0, 0, 0, 0.10)";
        maskCtx.globalCompositeOperation = "destination-out";
        maskCtx.fillRect(0, 0, mask.width, mask.height);
        fadeTicks++;
        requestAnimationFrame(fadeOutMask);
      } else {
        maskCtx.clearRect(0, 0, mask.width, mask.height);
        // Reset composite
        maskCtx.globalCompositeOperation = "source-over";
        particles.current = [];
      }
    };
    fadeOutMask();
  };

  // 11. Immersive Intro Stage Start Trigger
  const startStoryJourney = () => {
    // Play ethereal start sound
    if (!synthRef.current) {
      synthRef.current = new ZenSynthesizer();
    }
    synthRef.current.init();
    synthRef.current.setMuted(ambientMuted);
    
    // Play resonant startup chime arpeggio
    synthRef.current.playChime(1.0);
    setTimeout(() => {
      if (synthRef.current) {
        synthRef.current.playChime(1.25);
      }
    }, 150);
    setTimeout(() => {
      if (synthRef.current) {
        synthRef.current.playChime(1.50);
      }
    }, 300);

    setAppStage("prologue");
  };

  const startPaintingJourney = () => {
    // Play resonant startup chime arpeggio
    if (synthRef.current) {
      synthRef.current.playChime(1.8);
    }
    setAppStage("painting");
  };

  const startGateJourney = () => {
    // Play resonant startup chime arpeggio
    if (synthRef.current) {
      synthRef.current.playChime(1.5);
    }
    setAppStage("gate_locked");
  };

  const startUnderwaterJourney = () => {
    // Play deep resonant chime arpeggio
    if (synthRef.current) {
      synthRef.current.playChime(1.2);
    }
    setAppStage("underwater_tree");
    setCurrentBgUrl("/src/assets/images/underwater_tree_bg_1781581267263.jpg");
  };

  // Request HTML5 Browser Native Fullscreen safely
  const requestNativeFullscreen = (video: HTMLVideoElement) => {
    try {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if ((video as any).webkitRequestFullscreen) {
        (video as any).webkitRequestFullscreen();
      } else if ((video as any).mozRequestFullScreen) {
        (video as any).mozRequestFullScreen();
      } else if ((video as any).msRequestFullscreen) {
        (video as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn("浏览器安全机制阻止或不支持原生全屏:", e);
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElem = e.currentTarget;
    console.error("Video element failed to load:", videoElem.error);
    
    // Auto transition to standard Bilibili classic monologue if local file is missing/fails
    if (localVideoUrl === "/src/assets/images/dayu.mp4") {
      setVideoLoadError("本地高画质海棠视频未就绪，正在自动切换至【经典大鱼海棠电影旁白】云端星海线路...");
      setLocalVideoUrl("");
      setVideoUrl("BV1bt411y7AR");
      setIsVideoLoading(true);
    } else if (!localVideoUrl && videoUrl !== "https://vjs.zencdn.net/v/oceans.mp4") {
      setVideoLoadError("当前云端通道连接阻滞，正在自动配置【极速海棠海外CDN蓝光线】进行流式补偿...");
      setVideoUrl("https://vjs.zencdn.net/v/oceans.mp4");
      setIsVideoLoading(true);
    } else {
      setVideoLoadError("视频加载失败或格式不受支持。请检查网络状态，或在自定义设置中上传本地测试MP4/WebM素材。");
      setIsVideoLoading(false);
    }
  };

  // Synchronize and safely play cinematic video while catching any promise rejections
  useEffect(() => {
    let active = true;
    const video = moviePlayerRef.current;
    
    if (showVideoModal) {
      if (synthRef.current) {
        synthRef.current.pauseBGM();
      }
      if (video) {
        setIsVideoLoading(true);
        setVideoLoadError(null);
        try {
          video.load();
        } catch (e) {
          console.warn("video.load() system error:", e);
        }
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (active) {
              setIsVideoLoading(false);
              // Browser policy may require explicit interaction for fullscreen, handle gently
              try {
                requestNativeFullscreen(video);
              } catch (err) {
                console.warn("Asynchronous active fullscreen rejected by client policy:", err);
              }
            }
          }).catch((err) => {
            if (err.name !== "AbortError" && active) {
              console.log("影音自动播放状态调整: ", err.message);
            }
          });
        }
      }
    }
    
    return () => {
      active = false;
      if (video) {
        try {
          video.pause();
        } catch (_) {}
      }
      if (synthRef.current) {
        synthRef.current.resumeBGM();
      }
    };
  }, [showVideoModal, videoUrl, localVideoUrl]);

  // Automatically start requesting camera permission on mount to ease onboarding
  useEffect(() => {
    const delayCamStart = setTimeout(() => {
      startCameraSystem();
    }, 1500);
    return () => clearTimeout(delayCamStart);
  }, []);

  // Ensure the background music (BGM) starts playing from the very beginning of the app load
  useEffect(() => {
    const initAndPlayBGM = () => {
      if (!synthRef.current) {
        synthRef.current = new ZenSynthesizer();
      }
      synthRef.current.init();
      synthRef.current.setBGMVolume(bgmVolume);
      synthRef.current.setMuted(ambientMuted);
      synthRef.current.resumeBGM();
    };

    // Attempt to play immediately on mount
    initAndPlayBGM();

    // Set up standard user gesture listeners to bypass the browser's autoplay policy immediately
    const handleFirstUserGesture = () => {
      initAndPlayBGM();
      // Remove listeners once autoplay block is successfully bypassed
      window.removeEventListener("click", handleFirstUserGesture);
      window.removeEventListener("touchstart", handleFirstUserGesture);
      window.removeEventListener("keydown", handleFirstUserGesture);
      window.removeEventListener("mousedown", handleFirstUserGesture);
    };

    window.addEventListener("click", handleFirstUserGesture);
    window.addEventListener("touchstart", handleFirstUserGesture);
    window.addEventListener("keydown", handleFirstUserGesture);
    window.addEventListener("mousedown", handleFirstUserGesture);

    return () => {
      window.removeEventListener("click", handleFirstUserGesture);
      window.removeEventListener("touchstart", handleFirstUserGesture);
      window.removeEventListener("keydown", handleFirstUserGesture);
      window.removeEventListener("mousedown", handleFirstUserGesture);
    };
  }, []);

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden font-serif bg-[#04060b] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      id="main_app_wrapper"
    >
      {/* 0. CSS Styled Static Background Layer */}
      <div 
        className="absolute inset-0 select-none overflow-hidden pointer-events-none z-0"
        id="css_layered_tulou_background"
        style={{
          width: layout.w,
          height: layout.h,
        }}
      >
        {/* Static Colorful Backdrop (Sky, Mountains, Chun, Ground, and Statues) */}
        <img 
          ref={domStaticBgRef}
          src={currentBgUrl} 
          alt="Tulou Background Static"
          className="absolute pointer-events-none"
          style={{
            width: layout.drawW,
            height: layout.drawH,
            left: layout.xOffset,
            top: layout.yOffset,
            maxWidth: "none",
          }}
        />

        {/* Dynamic Rotating wooden circular Tulou rooftop overlay (faded in over 0.5s) */}
        <canvas 
          ref={domRotatingRoofRef}
          className="absolute pointer-events-none"
          style={{
            width: layout.drawW,
            height: layout.drawH,
            left: layout.xOffset,
            top: layout.yOffset,
            transformOrigin: "50% 34.5%",
            opacity: 0,
            display: "none",
          }}
        />
      </div>

      {/* 1. Main Canvas drawing layer */}
      <canvas 
        ref={mainCanvasRef}
        id="bg_and_petal_canvas"
        className="absolute inset-0 w-full h-full cursor-pointer z-10 touch-none block"
      />

      {/* Invisible HTML5 video processing node */}
      <video
        ref={hiddenVideoRef}
        id="hidden_video_processing"
        className="hidden"
        playsInline
        muted
      />

      {/* 2. Top-Left: Poetic header banner in vintage elegant calligraphic typography */}
      <div 
        id="poetic_water_title_overlay" 
        className="absolute top-5 left-6 md:top-8 md:left-10 z-10 pointer-events-none text-white max-w-sm md:max-w-md lg:max-w-lg antialiased p-4 md:p-5 rounded-2xl bg-black/45 backdrop-blur-[2px] border border-white/5 shadow-2xl"
      >
        <span className="font-calligraphy text-rose-500 text-3xl md:text-4xl lg:text-5xl tracking-widest glow-text leading-tight block drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          大鱼海棠
        </span>
        <span className="text-rose-200 font-serif font-medium text-xs sm:text-sm md:text-base tracking-[0.2em] block mt-1.5 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
          — 神之起舞 · 海棠生灵 —
        </span>
        
        {/* Lyrical poems fade in */}
        <div className="mt-4 space-y-2 text-slate-100 text-sm sm:text-base md:text-lg leading-relaxed hidden sm:block border-l-2 md:border-l-3 border-rose-500/50 pl-4 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]">
          <p className="italic font-medium">“有的鱼是永远关不住的，”</p>
          <p className="italic font-medium pl-4">“因为它们属于天空。”</p>
          <p className="text-amber-400 font-serif font-bold text-xs sm:text-sm pt-2 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            「张开手掌唤醒绯红海棠 · 握拳消逝入眠」
          </p>
        </div>
      </div>

      {/* 3. Top-Right: Mini Camera feedback monitor */}
      <div 
        id="camera_thumbnail_monitor"
        className="absolute top-5 right-6 md:top-8 md:right-10 z-50 flex flex-col items-end gap-3"
      >
        <AnimatePresence>
          {showCamPreview && cameraState === "active" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative rounded-full overflow-hidden w-28 h-28 md:w-36 md:h-36 border-2 border-[#8a1c14]/40 shadow-[0_0_20px_rgba(138,28,20,0.3)] bg-black/50"
              id="camera_mirrored_preview_frame"
            >
              <canvas
                ref={camPreviewCanvasRef}
                width={150}
                height={150}
                className="w-full h-full object-cover scale-x-100"
              />
              {/* Mini detection stats */}
              <div 
                className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] backdrop-blur-md bg-black/50 ${handStateRef.current.present ? "text-emerald-300 font-medium" : "text-slate-300"}`}
                id="hand_tracer_badge"
              >
                {handStateRef.current.present ? (handStateRef.current.isOpen ? "● 释灵中" : "● 眠") : "● 无手势"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic configuration floating taskbar */}
        <div className="flex gap-2" id="action_button_rail">
          {cameraState === "error" && (
            <button 
              onClick={() => alert(errorMessage)}
              className="flex items-center justify-center p-2 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300 transition-colors cursor-pointer hover:bg-amber-900/60"
              title="Camera setup logs"
            >
              <AlertCircle size={16} />
            </button>
          )}

          <button
            onClick={() => setShowCamPreview(!showCamPreview)}
            className="flex items-center justify-center p-2 rounded-full border border-slate-700/40 bg-[#0d121f]/75 hover:bg-slate-800/80 hover:text-white transition-colors cursor-pointer text-slate-300"
            title={showCamPreview ? "隐藏相机监控" : "开启相机监控"}
          >
            {showCamPreview ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>

          <button
            onClick={() => setDrawSkeleton(!drawSkeleton)}
            className={`flex items-center justify-center p-2 rounded-full border transition-all cursor-pointer ${drawSkeleton ? "border-rose-500/30 bg-rose-950/20 text-rose-300" : "border-slate-700/40 bg-[#0d121f]/75 text-slate-300 hover:bg-slate-800/80"}`}
            title="显示手部节点骨架"
          >
            <Sparkles size={16} />
          </button>

          <button
            onClick={() => {
              const nextMute = !ambientMuted;
              setAmbientMuted(nextMute);
              if (synthRef.current) {
                synthRef.current.setMuted(nextMute);
              }
            }}
            className={`flex items-center justify-center p-2 rounded-full border transition-all cursor-pointer ${!ambientMuted ? "border-rose-500/30 bg-rose-950/10 text-rose-300" : "border-slate-700/40 bg-[#0d121f]/75 text-slate-400 hover:bg-slate-800/80"}`}
            title={ambientMuted ? "播放《大鱼》背景音乐" : "静音《大鱼》背景音乐"}
            id="btn_toggle_audio_hum"
          >
            {ambientMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            onClick={resetEntireCanvas}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700/40 bg-[#0d121f]/75 text-slate-300 hover:border-rose-500/30 hover:bg-[#1a111a]/70 hover:text-rose-200 transition-all cursor-pointer text-xs font-serif tracking-widest shadow-md"
            title="重塑世界为灰度"
            id="btn_reset_graphics"
          >
            <RotateCcw size={13} className="animate-spin-slow" />
            <span>重塑</span>
          </button>
        </div>
      </div>

      {/* 4. Center-Bottom: Minimal onboarding state labels */}
      <div 
        id="bottom_status_onboarder" 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 w-full px-5 max-w-md text-center pointer-events-none"
      >
        {/* Ambient Tracking Status Log (No tech-larp details) */}
        <div id="state_log_badge" className="pointer-events-auto">
          {cameraState === "requesting" && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0d121f]/85 border border-blue-500/20 text-blue-300 rounded-full text-xs tracking-widest backdrop-blur-sm animate-pulse shadow-md">
              <RefreshCw size={12} className="animate-spin" />
              <span>灵镜摄像头寻契中...</span>
            </div>
          )}

          {cameraState === "active" && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#09181a]/85 border border-emerald-500/20 text-emerald-400 rounded-full text-xs tracking-widest backdrop-blur-sm shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>手部轨迹感应中（拂过重燃生机）</span>
            </div>
          )}

          {cameraState === "error" && (
            <div 
              onClick={() => startCameraSystem()}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#170c0c]/85 border border-[#8a1c14]/30 text-rose-300/90 rounded-full text-xs tracking-widest backdrop-blur-sm shadow-md cursor-pointer hover:bg-[#200e0e] transition-colors"
              title="Click to retry"
            >
              <AlertCircle size={12} />
              <span>已切换至「触控/鼠标」寻契（点击重试相机）</span>
            </div>
          )}

          {cameraState === "idle" && (
            <button
              onClick={startCameraSystem}
              className="flex items-center gap-2 px-5 py-2 bg-[#8a1c14] hover:bg-[#a2231b] border border-[#a2231b] text-white rounded-full text-xs font-serif tracking-widest shadow-lg transition-all cursor-pointer glow-text"
            >
              <CameraIcon size={13} className="animate-pulse" />
              <span>绑定摄像头手势感应</span>
            </button>
          )}
        </div>
      </div>

      {/* 4.1 Atmospheric Intro Screen Page */}
      <AnimatePresence>
        {appStage === "intro" && (
          <motion.div
            key="intro_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="absolute inset-0 z-40 bg-gradient-to-b from-[#0e0303]/96 via-[#02050c]/93 to-[#030a14]/97 backdrop-blur-[5px] flex flex-col items-center justify-center p-6 select-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"
          >
            {/* Elegant Background Ambient lights (Gold and Scarlet) */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

            {/* Traditional Decorative Golden Borders */}
            <div className="absolute inset-4 md:inset-8 border border-[#8a1c14]/20 rounded-2xl pointer-events-none" />
            <div className="absolute inset-5 md:inset-10 border border-amber-500/10 rounded-2xl pointer-events-none" />
            
            {/* Corner traditional lattice accents */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-[#8a1c14]/40 rounded-tl pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-[#8a1c14]/40 rounded-tr pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-[#8a1c14]/40 rounded-bl pointer-events-none" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-[#8a1c14]/40 rounded-br pointer-events-none" />

            {/* Main Content Container with stagger animation of children */}
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.3,
                  }
                }
              }}
              initial="hidden"
              animate="show"
              className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6 py-8"
            >
              {/* Top Traditional Chinese Red Seal Stamp Accent */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: -15 },
                  show: { opacity: 1, y: 0, transition: { duration: 1.0, ease: "easeOut" } }
                }}
                className="mb-8 px-2.5 py-1 bg-gradient-to-r from-[#8a1c14] to-red-800 border border-amber-500/20 text-white rounded-md text-[10px] tracking-[0.3em] pl-[0.4em] font-serif shadow-md uppercase select-none flex items-center gap-1"
              >
                <Sparkles size={8} className="text-amber-300 animate-spin" style={{ animationDuration: "6s" }} />
                <span>海天华章 · 序幕</span>
              </motion.div>

              {/* Spectacular Staggered "大鱼海棠" Calligraphy Display Title */}
              <div className="mb-8 overflow-visible flex flex-col items-center">
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    show: { 
                      opacity: 1, 
                      scale: 1, 
                      transition: { 
                        type: "spring", 
                        stiffness: 50, 
                        damping: 10,
                        delay: 0.2
                      } 
                    }
                  }}
                  className="font-calligraphy text-7xl sm:text-8xl md:text-9xl text-rose-500 tracking-[0.1em] pointer-events-none drop-shadow-[0_0_20px_rgba(225,29,72,0.85)] flex select-none"
                >
                  {/* Subtle letter pairing for Chinese typography */}
                  <span className="scale-[1.05] text-[#fb7185] hover:text-[#f43f5e] transition-all flex items-center justify-center">大</span>
                  <span className="-ml-1 scale-[0.98] rotate-3 text-[#f43f5e] hover:text-rose-400 transition-all flex items-center justify-center">鱼</span>
                  <span className="-ml-1 scale-[1.02] -rotate-2 text-[#e11d48] hover:text-rose-500 transition-all flex items-center justify-center">海</span>
                  <span className="-ml-1 scale-[1.05] text-[#fb7185] hover:text-[#da123a] transition-all flex items-center justify-center">棠</span>
                </motion.div>
                
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 0.6, y: 0, transition: { duration: 1.5, delay: 1.2 } }
                  }}
                  className="text-rose-200/50 font-serif font-light text-[11px] md:text-xs tracking-[0.5em] pl-[0.5em] block mt-4"
                >
                  — BIG FISH & BEGONIA —
                </motion.div>
              </div>

              {/* Dynamic Traditional Ribbon Divider */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.25, transition: { duration: 1.5, ease: "easeOut", delay: 1.0 } }
                }}
                className="w-40 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mb-10"
              />

              {/* Multi-line Cinematic Verses (Warm, Soft, Emotional) */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.7,
                      delayChildren: 1.5
                    }
                  }
                }}
                className="flex flex-col gap-5 text-slate-200/90 tracking-[0.2em] font-serif leading-relaxed font-light text-xs md:text-[14px]"
              >
                <motion.p 
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                  }}
                  className="hover:text-white transition-colors duration-500 select-all"
                >
                  “北冥有鱼，其名为鲲。鲲之大，不知其几千里也。”
                </motion.p>
                
                <motion.p 
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                  }}
                  className="hover:text-white transition-colors duration-500 select-all"
                >
                  “有的鱼是永远关不住的，因为它们属于天空。”
                </motion.p>

                <motion.p 
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
                  }}
                  className="hover:text-white transition-colors duration-500 text-rose-200/80 font-medium select-all"
                >
                  “风起雨落，琴瑟悠扬。请张开手掌，重染这卷斑驳的土楼。”
                </motion.p>
              </motion.div>

              {/* Bottom Traditional Ribbon Divider */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.25, transition: { duration: 1.5, ease: "easeOut", delay: 2.2 } }
                }}
                className="w-40 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mt-10 mb-10"
              />

              {/* Premium Glow Start Button Fading-In Automatically */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.9, y: 20 },
                  show: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0, 
                    transition: { 
                      type: "spring",
                      stiffness: 70,
                      damping: 14,
                      delay: 3.5 
                    } 
                  }
                }}
                className="text-center"
              >
                <button
                  onClick={startStoryJourney}
                  className="relative px-8 py-3.5 bg-gradient-to-r from-[#8a1c14] to-[#a2231b] hover:from-[#a2231b] hover:to-[#be2f25] text-white font-serif font-medium tracking-[0.3em] pl-[0.3em] text-sm md:text-base cursor-pointer rounded-full border border-rose-500/20 shadow-[0_4px_25px_rgba(138,28,20,0.4)] hover:shadow-[0_4px_35px_rgba(244,63,94,0.65)] active:scale-95 transition-all flex items-center gap-2"
                  id="btn_start_prologue"
                >
                  <Sparkles size={14} className="animate-pulse text-amber-300" />
                  <span>开启画卷 · 寻契海天</span>
                </button>
                <div className="text-[10px] text-slate-400/80 tracking-widest mt-3 animate-pulse flex flex-col items-center gap-1.5 font-serif text-center">
                  <span className="text-rose-400/90 font-medium">支持 摄像头手势 / 鼠标及触摸轨迹</span>
                  <span className="text-amber-400/80">「手势移至按钮悬停」或「在屏幕任意位置握拳」即可开启</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.1.5 Atmospheric Cinematic Prologue Screen Page */}
      <AnimatePresence>
        {appStage === "prologue" && (
          <motion.div
            key="prologue_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeInOut" }}
            className="absolute inset-0 z-40 bg-gradient-to-b from-[#030101] via-[#010205] to-[#040101] backdrop-blur-[4px] flex flex-col items-center justify-center p-6 select-none shadow-[inset_0_0_120px_rgba(0,0,0,0.95)]"
          >
            {/* Subtle Floating Orbs to embody spirits */}
            <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-rose-955/15 rounded-full blur-[90px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-sky-955/10 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.7,
                  }
                }
              }}
              initial="hidden"
              animate="show"
              className="relative z-10 flex flex-col items-center text-center max-w-xl px-5 py-8"
            >
              {/* Act Title */}
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: -15 },
                  show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="font-calligraphy text-3xl md:text-4xl text-rose-500 tracking-[0.25em] pl-[0.25em] mb-3 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] w-[580px] max-w-full text-center"
              >
                第一幕 · 海之相逢 ｜ 缘起
              </motion.h2>

              {/* Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mb-8"
              />

              {/* Scenic Verses Block */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.8,
                    }
                  }
                }}
                className="flex flex-col gap-5 text-slate-200/90 tracking-[0.25em] font-serif leading-loose font-light text-[13px] md:text-[15px]"
              >
                <motion.p
                   variants={{
                     hidden: { opacity: 0, y: 15 },
                     show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                   }}
                   className="font-medium text-rose-100/95 text-[14px] md:text-[16px] drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] select-all animate-pulse"
                   style={{ animationDuration: "5s" }}
                >
                  “所有活着的人类，都是海里一条巨大的鱼。”
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="select-all"
                >
                  灵界渡海，七日人间，一次相遇，一命相换。
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-rose-200/90 select-all"
                >
                  我记得他的样子，却不知他的名字；
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.95, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-amber-200/80 mt-1 select-all"
                >
                  只知恩情如债，此生必还。
                </motion.p>
              </motion.div>

              {/* Lower Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mt-8 mb-10"
              />

              {/* Continue Trigger Button */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.93 },
                  show: { 
                    opacity: 1, 
                    scale: 1, 
                    transition: { 
                      type: "spring",
                      stiffness: 80,
                      damping: 14,
                      delay: 3.5
                    } 
                  }
                }}
              >
                <button
                  onClick={startPaintingJourney}
                  className="relative px-8 py-3.5 bg-gradient-to-r from-[#8a1c14] to-[#a2231b] hover:from-[#a2231b] hover:to-[#be2f25] text-white font-serif font-medium tracking-[0.3em] pl-[0.3em] text-sm md:text-base cursor-pointer rounded-full border border-rose-500/20 shadow-[0_4px_25px_rgba(138,28,20,0.4)] hover:shadow-[0_4px_35px_rgba(244,63,94,0.65)] active:scale-95 transition-all flex items-center gap-2 mx-auto"
                  id="btn_start_painting"
                >
                  <Sparkles size={14} className="animate-pulse text-amber-300" />
                  <span>入世寻缘 · 重塑记忆</span>
                </button>
                <div className="text-[10px] text-slate-400/80 tracking-widest mt-3 animate-pulse flex flex-col items-center gap-1.5 font-serif text-center">
                  <span className="text-rose-400/90 font-medium">支持 摄像头手势 / 鼠标及触摸轨迹</span>
                  <span className="text-amber-400/80">「手势移至按钮悬停」或「在屏幕任意位置握拳」即可启程</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.1.6 Atmospheric Cinematic Act II Prologue Screen Page */}
      <AnimatePresence>
        {appStage === "prologue2" && (
          <motion.div
            key="prologue2_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeInOut" }}
            className="absolute inset-0 z-40 bg-gradient-to-b from-[#030101] via-[#010205] to-[#040101] backdrop-blur-[4px] flex flex-col items-center justify-center p-6 select-none shadow-[inset_0_0_120px_rgba(0,0,0,0.95)]"
          >
            {/* Subtle Floating Orbs to embody spirits */}
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-sky-955/10 rounded-full blur-[90px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-rose-955/15 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.7,
                  }
                }
              }}
              initial="hidden"
              animate="show"
              className="relative z-10 flex flex-col items-center text-center max-w-xl px-5 py-8"
            >
              {/* Act Title */}
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: -15 },
                  show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="font-calligraphy text-3xl md:text-4xl text-rose-500 tracking-[0.25em] pl-[0.25em] mb-3 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)] w-[580px] max-w-full text-center"
              >
                第二幕 · 以命相酬 ｜ 执念
              </motion.h2>

              {/* Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mb-8"
              />

              {/* Scenic Verses Block */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.8,
                    }
                  }
                }}
                className="flex flex-col gap-5 text-slate-200/90 tracking-[0.25em] font-serif leading-loose font-light text-[13px] md:text-[15px]"
              >
                <motion.p
                   variants={{
                     hidden: { opacity: 0, y: 15 },
                     show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                   }}
                   className="font-medium text-rose-100/95 text-[14px] md:text-[16px] drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] select-all animate-pulse"
                   style={{ animationDuration: "5s" }}
                >
                  “我欠他一条命，我要还清欠他的，无论付出多少代价。”
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="select-all"
                >
                  不是问你能不能，是问你想不想。
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-rose-200/90 select-all"
                >
                  以半寿为契，逆天而行；海棠为证，朝夕相伴。
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.95, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-amber-200/80 mt-1 select-all"
                >
                  这短短的一生，不妨大胆一些，爱一个人，攀一座山，追一个梦。
                </motion.p>
              </motion.div>

              {/* Lower Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#8a1c14] to-transparent mt-8 mb-10"
              />

              {/* Continue Trigger Button */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.93 },
                  show: { 
                    opacity: 1, 
                    scale: 1, 
                    transition: { 
                      type: "spring",
                      stiffness: 80,
                      damping: 14,
                      delay: 3.5
                    } 
                  }
                }}
              >
                <button
                  onClick={startGateJourney}
                  className="relative px-8 py-3.5 bg-gradient-to-r from-[#8a1c14] to-[#a2231b] hover:from-[#a2231b] hover:to-[#be2f25] text-white font-serif font-medium tracking-[0.3em] pl-[0.3em] text-sm md:text-base cursor-pointer rounded-full border border-rose-500/20 shadow-[0_4px_25px_rgba(138,28,20,0.4)] hover:shadow-[0_4px_35px_rgba(244,63,94,0.65)] active:scale-95 transition-all flex items-center gap-2 mx-auto"
                  id="btn_start_gate"
                >
                  <Sparkles size={14} className="animate-pulse text-amber-300" />
                  <span>逆天而行 · 开启海天世界</span>
                </button>
                <div className="text-[10px] text-slate-400/80 tracking-widest mt-3 animate-pulse flex flex-col items-center gap-1.5 font-serif text-center">
                  <span className="text-rose-400/90 font-medium">支持 摄像头手势 / 鼠标及触摸轨迹</span>
                  <span className="text-amber-400/80">「手势移至按钮悬停」或「在屏幕任意位置握拳」即可启程</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.1.7 Atmospheric Cinematic Act III Prologue Screen Page */}
      <AnimatePresence>
        {appStage === "prologue3" && (
          <motion.div
            key="prologue3_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0, ease: "easeInOut" }}
            className="absolute inset-0 z-40 bg-gradient-to-b from-[#010508] via-[#020b10] to-[#010609] backdrop-blur-[4px] flex flex-col items-center justify-center p-6 select-none shadow-[inset_0_0_120px_rgba(0,0,0,0.96)]"
          >
            {/* Subtle Floating Teal Orbs to embody marine/sea memories */}
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-teal-950/15 rounded-full blur-[90px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-emerald-950/10 rounded-full blur-[90px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.7,
                  }
                }
              }}
              initial="hidden"
              animate="show"
              className="relative z-10 flex flex-col items-center text-center max-w-xl px-5 py-8"
            >
              {/* Act Title */}
              <motion.h2
                variants={{
                  hidden: { opacity: 0, y: -15 },
                  show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="font-calligraphy text-2xl md:text-3xl text-teal-400 tracking-[0.25em] pl-[0.25em] mb-3 drop-shadow-[0_0_12px_rgba(20,184,166,0.6)] w-[580px] max-w-full text-center"
              >
                第三幕 · 风雨相伴 ｜ 成全
              </motion.h2>

              {/* Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#0f766e] to-transparent mb-8"
              />

              {/* Scenic Verses Block */}
              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.8,
                    }
                  }
                }}
                className="flex flex-col gap-5 text-slate-200/90 tracking-[0.25em] font-serif leading-loose font-light text-[13px] md:text-[15px]"
              >
                <motion.p
                   variants={{
                     hidden: { opacity: 0, y: 15 },
                     show: { opacity: 1, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                   }}
                   className="font-medium text-teal-100/95 text-[14px] md:text-[16px] drop-shadow-[0_0_8px_rgba(20,184,166,0.15)] select-all animate-pulse"
                   style={{ animationDuration: "5s" }}
                >
                  “你遇见一个人，犯了一个错，你想弥补，到最后才发现根本无力回天。”
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="select-all"
                >
                  天地失序，风波骤起；有人背叛所有神灵去爱你，为你忍受一切痛苦。
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.9, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-teal-200/90 select-all font-medium"
                >
                  我会化作人间的风雨，陪在你身边。
                </motion.p>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 0.95, y: 0, transition: { duration: 1.5, ease: "easeOut" } }
                  }}
                  className="text-amber-200/80 mt-1 select-all"
                >
                  只要心是善良的，对错都是别人的事；爱到最后，无非是成全与离别。
                </motion.p>
              </motion.div>

              {/* Lower Ribbon Accent */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, opacity: 0 },
                  show: { scaleX: 1, opacity: 0.3, transition: { duration: 1.5, ease: "easeOut" } }
                }}
                className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#0f766e] to-transparent mt-8 mb-10"
              />

              {/* Continue Trigger Button */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.93 },
                  show: { 
                    opacity: 1, 
                    scale: 1, 
                    transition: { 
                      type: "spring",
                      stiffness: 80,
                      damping: 14,
                      delay: 3.5
                    } 
                  }
                }}
              >
                <button
                  onClick={startUnderwaterJourney}
                  className="relative px-8 py-3.5 bg-gradient-to-r from-teal-800 to-teal-600 hover:from-teal-700 hover:to-teal-500 text-white font-serif font-medium tracking-[0.3em] pl-[0.3em] text-sm md:text-base cursor-pointer rounded-full border border-teal-500/20 shadow-[0_4px_25px_rgba(13,148,136,0.35)] hover:shadow-[0_4px_35px_rgba(20,184,166,0.55)] active:scale-95 transition-all flex items-center gap-2 mx-auto"
                  id="btn_start_underwater"
                >
                  <Sparkles size={14} className="animate-pulse text-teal-300" />
                  <span>风雨相随 · 梦回海天</span>
                </button>
                <div className="text-[10px] text-slate-400/80 tracking-widest mt-3 animate-pulse flex flex-col items-center gap-1.5 font-serif text-center">
                  <span className="text-teal-400/90 font-medium">支持 摄像头手势 / 鼠标及触摸轨迹</span>
                  <span className="text-teal-300/80">「手势移至按钮悬停」或「在屏幕任意位置握拳」即可潜入</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.2 Top-Middle: Picture Restoration Progress Bar & Movie Access Trigger */}
      <AnimatePresence>
        {appStage === "painting" && (
          <motion.div 
            key="progress_banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="restoration_progress_banner"
            className="absolute top-5 left-1/2 z-25 flex flex-col items-center gap-1.5 pointer-events-auto bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-rose-950/40 shadow-lg text-white"
            style={{ transform: "translateX(-50%)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif tracking-widest text-rose-200/90 font-light">
                画卷重染进度: <span className="text-rose-400 font-mono font-bold text-sm">{restoreProgress}%</span>
              </span>
              <button 
                onClick={() => {
                  setAppStage("gate_locked");
                  setCurrentBgUrl("/src/assets/images/wooden_corridor_png_1781140258057.png");
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-800 hover:bg-rose-700 active:bg-rose-900 border border-rose-600 font-serif text-[11px] tracking-widest cursor-pointer transition-all shadow-md hover:shadow-rose-900/40"
              >
                <span>进入仪式</span>
              </button>
            </div>
            
            {/* Glow progress bar background */}
            <div className="w-48 md:w-60 h-[3px] bg-slate-950/60 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#8a1c14] to-rose-400"
                animate={{ width: `${restoreProgress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {appStage === "painting" && showInstructions && (
          <motion.div
            key="painting_guide_panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-30 p-4 rounded-xl backdrop-blur-md bg-black/85 border border-slate-800/40 shadow-lg pointer-events-auto w-[92%] sm:w-[300px]"
            id="instruction_details_card"
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[#fb7185] font-light text-xs tracking-wider glow-text flex items-center gap-1">
                <Sparkles size={12} />
                <span>交互指引</span>
              </span>
              <button 
                onClick={() => setShowInstructions(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded border border-slate-800 hover:bg-slate-800/40 cursor-pointer"
              >
                隐藏
              </button>
            </div>
            
            <ul className="text-left text-slate-200 text-xs space-y-1.5 leading-relaxed font-serif">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 mt-1 text-[10px]">✦</span>
                <span><strong>张开五指</strong>：唤醒漫天海棠，复苏原画。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 mt-1 text-[10px]">✦</span>
                <span><strong>握紧拳头</strong>：收束繁花落叶，归于寂静。</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 mt-1 text-[10px]">✦</span>
                <span><strong>移动手势/鼠标</strong>：在屏幕自由轻拂，轻拨落花。</span>
              </li>
            </ul>
          </motion.div>
        )}

        {appStage === "gate_locked" && (
          <motion.div
            key="ritual_banner"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            id="gate_ritual_panel"
            className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-30 flex flex-col items-center gap-2 pointer-events-auto bg-black/85 backdrop-blur-md border border-rose-500/30 px-5 py-3 rounded-2xl w-[92%] sm:w-[300px] shadow-[0_0_25px_rgba(239,68,68,0.25)] text-center text-white"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="text-rose-400 animate-pulse" size={14} />
              <span className="text-rose-100 font-serif text-xs md:text-sm tracking-widest font-medium text-rose-300">
                — 海天之仪 · 唤醒法阵 —
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-relaxed font-serif">
              画卷重染成功。请在镜头前「上下挥手」唤醒法阵
              <br />
              或用手指/鼠标在屏幕上快速「上下划动」聚灵。
            </p>
            
            {/* Glowing Waving Energy Bar */}
            <div className="w-full flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-serif px-1">
                <span>廊桥挂灯重燃进度</span>
                <span className="text-rose-400 font-mono font-bold">{Math.min(5, waveProgressCount)}/5 盏</span>
              </div>
              <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden p-[1px] border border-slate-900">
                <motion.div 
                  className="h-full bg-gradient-to-r from-rose-500 via-orange-400 to-rose-400 rounded-full animate-pulse"
                  animate={{ width: `${(Math.min(5, waveProgressCount) / 5) * 100}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  style={{
                    boxShadow: "0 0 10px rgba(239, 68, 68, 0.6)"
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-1">
              <button
                onClick={() => {
                  setAppStage("gate_opening");
                  gateProgressRef.current = 0;
                  transitionBlackscreenOpacityRef.current = 0;
                }}
                className="px-3 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/30 hover:border-rose-700/55 rounded-full text-[9px] tracking-wider font-serif transition-all cursor-pointer"
              >
                直接破入仙门 ↗
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.3 Center-Middle Screen: Immersive Gate Opening Overlay */}
      <AnimatePresence>
        {appStage === "gate_opening" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-transparent pointer-events-none"
          >
            <motion.div
              animate={{ scale: [1, 1.03, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              className="text-center px-4"
            >
              <h1 className="font-calligraphy text-xl md:text-3xl text-amber-100 tracking-[0.45em] drop-shadow-[0_4px_16px_rgba(239,68,68,0.78)] leading-normal pl-[0.45em]">
                海天之门，宿命相逢
              </h1>
              <p className="text-zinc-200 mt-4 leading-relaxed font-serif text-xs md:text-sm tracking-widest opacity-95 pl-[0.2em] max-w-xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                “一生很短，不妨大胆去爱，去追一场山海”
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.4 Underwater Tree Root Stage HUD & Overlays */}
      <AnimatePresence>
        {appStage === "underwater_tree" && (
          <>
            {/* Top HUD: Color Reveal progress, Summon dolphin button, Complete button */}
            <motion.div 
              key="underwater_progress_banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-5 left-1/2 z-25 flex flex-col items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-teal-950/40 shadow-lg text-white"
              style={{ transform: "translateX(-50%)" }}
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-serif tracking-widest text-teal-200/90 font-light">
                  水镜重染进度: <span className="text-teal-400 font-mono font-bold text-sm">{underwaterProgress}%</span>
                </span>
                
                {/* Free dolphin summoning button */}
                <button
                  onClick={() => {
                    const mathSummon = (summonedKunRef.current?.active);
                    if (!mathSummon) {
                      // Trigger Kun Dolphin
                      const w = window.innerWidth;
                      const h = window.innerHeight;
                      const pathPoints: {x: number, y: number}[] = [];
                      const startX = -150;
                      const startY = h * 0.75 + (Math.random() - 0.5) * h * 0.15;
                      const endX = w + 150;
                      const endY = h * 0.2 + (Math.random() - 0.5) * h * 0.15;
                      
                      const cp1X = w * 0.25;
                      const cp1Y = h * 0.35;
                      const cp2X = w * 0.65;
                      const cp2Y = h * 0.85;
                      
                      for (let i = 0; i <= 100; i++) {
                        const t = i / 100;
                        const x = (1 - t)**3 * startX + 3 * (1 - t)**2 * t * cp1X + 3 * (1 - t) * t**2 * cp2X + t**3 * endX;
                        const y = (1 - t)**3 * startY + 3 * (1 - t)**2 * t * cp1Y + 3 * (1 - t) * t**2 * cp2Y + t**3 * endY;
                        pathPoints.push({ x, y });
                      }

                      summonedKunRef.current = {
                        active: true,
                        x: startX,
                        y: startY,
                        size: 75,
                        progress: 0,
                        pathPoints,
                        swimCycle: 0,
                        glowingTrails: []
                      };

                      if (synthRef.current && !ambientMuted) {
                        synthRef.current.playAscendingSuccessSwell();
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border border-amber-400 font-serif text-[11px] tracking-widest cursor-pointer transition-all shadow-md hover:shadow-amber-900/40"
                >
                  <Sparkles size={11} className="text-amber-100 animate-pulse" />
                  <span>召唤大鱼</span>
                </button>

                {/* Show final cinematic video button when progress is sufficient or as a skip */}
                <button 
                  onClick={() => {
                    if (synthRef.current && !ambientMuted) {
                      synthRef.current.playAscendingSuccessSwell();
                    }
                    setIsTransitioningToMedia(true);
                    setTimeout(() => {
                      setAppStage("completed");
                      setShowVideoModal(true);
                    }, 2000);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-teal-700 to-emerald-600 hover:brightness-110 active:brightness-95 border border-teal-500 font-serif text-[11px] tracking-widest cursor-pointer transition-all shadow-md"
                >
                  <span>{underwaterProgress >= 80 ? "梦回海天 ↗" : "直接破出水镜 ↗"}</span>
                </button>
              </div>
              
              {/* Glow progress bar background */}
              <div className="w-56 md:w-72 h-[3px] bg-slate-950/60 rounded-full overflow-hidden relative border border-slate-900/30">
                <motion.div 
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-teal-500 via-cyan-400 to-amber-300"
                  animate={{ width: `${underwaterProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Cinematic Centered Popped Quote Overlay (画面中央显现文字，无明显边框、更自然且浮空融入画面) */}
            <AnimatePresence>
              {poppingQuote && (
                <motion.div
                  key={poppingQuote.time}
                  initial={{ opacity: 0, scale: 0.94, y: "-40%", x: "-50%", filter: "blur(8px)" }}
                  animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%", filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.03, y: "-55%", x: "-50%", filter: "blur(12px)" }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-[48%] left-1/2 z-40 p-10 md:p-14 w-[90%] max-w-3xl text-center pointer-events-none select-none flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,rgba(4,6,11,0.88)_0%,rgba(4,6,11,0.68)_35%,rgba(4,6,11,0.25)_65%,transparent_90%)] filter drop-shadow-[0_4px_35px_rgba(0,0,0,0.98)]"
                >
                  {/* Subtle soft breathing light aura behind the text */}
                  <div className="absolute inset-0 bg-gradient-radial from-teal-500/10 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Poetic quote styling */}
                  <span className="text-teal-400 font-serif text-[20px] md:text-[24px] leading-none opacity-40 select-none">“</span>
                  <p className="text-teal-500 font-serif text-base md:text-[18px] tracking-[0.2em] leading-relaxed relative z-10 px-4 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    {poppingQuote.text}
                  </p>
                  <span className="text-teal-400 font-serif text-[20px] md:text-[24px] leading-none opacity-40 select-none">”</span>
                  
                  {/* Fine gold-teal tiny dividing line */}
                  <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-teal-400/35 to-transparent my-1.5" />
                  <span className="text-[10px] text-teal-400/70 uppercase tracking-[0.3em] font-sans font-light filter drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">电影哲学 · 梦回海天</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Right: Interactive Guides Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-30 p-4 rounded-xl backdrop-blur-md bg-black/85 border border-slate-850/40 shadow-lg pointer-events-auto w-[92%] sm:w-[325px] text-white"
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-teal-400 font-light text-xs tracking-wider glow-text flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>神迹交互指引</span>
                </span>
                <span className="text-[10px] text-slate-500 font-serif font-light">
                  Picture II (Underwater)
                </span>
              </div>
              
              <ul className="text-left text-slate-300 text-[11px] space-y-1.5 leading-relaxed font-serif">
                <li className="flex items-start gap-1.5">
                  <span className="text-teal-500 mt-0.5">✦</span>
                  <span><strong>划过画面</strong>：抛洒海棠花瓣，<strong>还原水镜原青绿色彩</strong>。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">✦</span>
                  <span><strong>抚摸树根枝干</strong>：注入<strong>淡金流光纹路</strong>，升腾细碎金光气泡，伴随空灵音律。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-rose-400 mt-0.5">✦</span>
                  <span><strong>握拳/按住不动</strong>：所有花瓣消散，树根微光缓慢褪去。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 mt-0.5">✦</span>
                  <span><strong>戳破游离气泡</strong>：解锁电影哲言，引爆全屏海棠花火。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-400 mt-0.5">✦</span>
                  <span><strong>召唤大鱼按键</strong>：在水中自由召唤大鱼鲲盘旋游过。</span>
                </li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4.4.5 Fully-integrated Seamless Transition Vignette */}
      <AnimatePresence>
        {isTransitioningToMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-gradient-to-b from-[#0e2226]/95 via-[#061114]/98 to-[#1f0606] flex flex-col items-center justify-center pointer-events-none"
            id="seamless_transition_overlay"
          >
            {/* Swirling celestial ink background dust & ambient glowing text */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 1.5 }}
              className="text-center px-8 relative"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-600/5 blur-[80px] rounded-full animate-pulse [animation-delay:1s]" />
              
              <h3 className="font-calligraphy text-2xl md:text-4xl text-amber-200 tracking-[0.4em] pl-[0.4em] drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]">
                海棠重染 · 水镜大开
              </h3>
              <p className="font-serif text-slate-300 text-xs md:text-sm tracking-[0.2em] mt-4 max-w-sm mx-auto leading-relaxed opacity-90">
                乾坤浩瀚，灵境交感。大鱼自深渊升腾，即刻开启终焉神迹之曲...
              </p>
              <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mx-auto mt-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4.5 Cinematic Video Celebration Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between pointer-events-auto overflow-hidden"
            id="movie_rendering_modal"
          >
            {/* Immersive Absolute Fullscreen Video Layer */}
            <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
              {/* Beautiful Cinematic Dissolved Shutter Cover */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 2.8, ease: "easeInOut", delay: 0.2 }}
                className="absolute inset-0 z-30 bg-gradient-to-b from-[#051114] via-[#091a1e] to-[#1c0606] flex flex-col items-center justify-center pointer-events-none"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 2.5, times: [0, 0.15, 0.85, 1], ease: "easeInOut" }}
                  className="text-center px-6"
                >
                  <h3 className="font-calligraphy text-2xl md:text-3.5xl text-amber-200 tracking-[0.4em] pl-[0.4em] drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]">
                    羽化登仙 ｜ 梦回海天
                  </h3>
                  <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent mx-auto mt-5" />
                  <p className="font-serif italic text-xs md:text-[13px] text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)] tracking-[0.25em] mt-4 leading-relaxed animate-pulse">
                    “有的鱼是永远关不住的，因为它们属于天空”
                  </p>
                </motion.div>
              </motion.div>
              {isIframeVideoUrl(localVideoUrl || videoUrl) ? (
                <iframe
                  src={getIframeSrc(localVideoUrl || videoUrl)}
                  className="w-full h-full border-0 pointer-events-auto"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  id="movie_iframe"
                  onLoad={() => setIsVideoLoading(false)}
                />
              ) : (
                <video
                  ref={moviePlayerRef}
                  src={localVideoUrl || videoUrl}
                  className="w-full h-full object-contain pointer-events-auto cursor-pointer"
                  controls
                  muted={isMuted}
                  playsInline
                  loop
                  preload="auto"
                  crossOrigin="anonymous"
                  id="movie_tag"
                  onLoadStart={() => {
                    setIsVideoLoading(true);
                    setVideoLoadError(null);
                  }}
                  onWaiting={() => setIsVideoLoading(true)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onError={handleVideoError}
                  onClick={() => {
                    if (moviePlayerRef.current) {
                      requestNativeFullscreen(moviePlayerRef.current);
                    }
                  }}
                />
              )}

              {/* Streaming state overlay feedback */}
              {isVideoLoading && !videoLoadError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none transition-all">
                  <div className="relative flex items-center justify-center mb-4">
                    <span className="absolute animate-ping h-12 w-12 rounded-full bg-rose-500/20 opacity-75" />
                    <RefreshCw className="text-rose-400 animate-spin" size={32} />
                  </div>
                  <p className="text-sm font-serif tracking-widest text-rose-200 glow-text animate-pulse">
                    正在连通灵境，加载超清流式画面中，请稍候...
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    如长时间黑屏，可开启“自定义设置”切换或上传本地视频
                  </p>
                </div>
              )}

              {/* Friendly routing or error system notices */}
              {videoLoadError && (
                <div className="absolute bottom-24 left-6 right-6 md:left-1/2 md:right-auto md:w-[480px] md:-translate-x-1/2 z-25 p-4 rounded-xl border border-rose-900/50 bg-black/90 backdrop-blur-md flex gap-3 pointer-events-auto">
                  <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-200 tracking-wider font-serif">影音加载异常智能修复系统</h4>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed font-serif">
                      {videoLoadError}
                    </p>
                    <button
                      onClick={() => setVideoLoadError(null)}
                      className="px-2 py-0.5 mt-1 bg-rose-950/40 text-rose-300 border border-rose-900/40 rounded text-[9px] hover:bg-rose-900/30 font-serif"
                    >
                      知道了
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Cinematic HUD Title Plate (Top Left over video) */}
            <div className="absolute top-6 left-6 z-20 pointer-events-none drop-shadow-md hidden sm:block">
              <h2 className="font-calligraphy text-xl md:text-3xl text-rose-100 tracking-widest glow-text w-[600px]" id="cinematic_hud_title">
                — 海棠涅槃 · 灵境初醒 —
              </h2>
              <p className="text-rose-200/60 font-serif font-light text-[9px] md:text-xs tracking-widest uppercase mt-0.5">
                “所有活着的人，都是海里的一条巨大的鱼”
              </p>
            </div>

            {/* Custom Overlay HUD Action Toggles (Top Right over video) */}
            <div className="absolute top-6 right-6 z-20 flex gap-2.5">
              {/* Settings Cog toggle with spinning animation */}
              <button
                onClick={() => setShowVideoSettings(!showVideoSettings)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-serif tracking-widest cursor-pointer transition-all ${
                  showVideoSettings 
                    ? "border-rose-400 bg-rose-950 text-rose-100 shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                    : "border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
                title="自定义视频源"
                id="btn_toggle_video_settings"
              >
                <Settings size={14} className={showVideoSettings ? "animate-spin" : ""} />
                <span className="hidden md:inline">自定义视频</span>
              </button>

              {/* Force browser native fullscreen button */}
              <button
                onClick={() => {
                  if (moviePlayerRef.current) {
                    requestNativeFullscreen(moviePlayerRef.current);
                  }
                }}
                className="flex items-center justify-center p-2 rounded-full border border-slate-800 bg-black/60 text-slate-300 hover:bg-black/80 hover:text-white transition-all cursor-pointer"
                title="原生全屏播放"
                id="btn_force_native_fullscreen"
              >
                <Maximize2 size={14} />
              </button>

              {/* Close cinematic theater button */}
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setShowVideoSettings(false);
                  resetEntireCanvas();
                  if (moviePlayerRef.current) {
                    moviePlayerRef.current.pause();
                  }
                }}
                className="flex items-center justify-center p-2 rounded-full border border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
                title="退出放映"
                id="btn_exit_movie_theater"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bottom sliding glassmorphic custom sources subpanel */}
            <AnimatePresence>
              {showVideoSettings && (
                <motion.div 
                  initial={{ y: 150, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 150, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 150 }}
                  className="absolute bottom-6 left-6 right-6 z-30 max-w-4xl mx-auto p-5 rounded-2xl border border-rose-900/45 bg-black/85 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-4 pointer-events-auto"
                  id="video_controls_subpanel"
                >
                  {/* Local Testing Video Drag & Drop Dropzone */}
                  <div 
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-rose-900/35 bg-[#070b15]/60 hover:bg-[#111122]/75 hover:border-rose-500/50 transition-all cursor-pointer text-center relative"
                    onClick={() => document.getElementById("video-file-picker")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith("video/")) {
                          const url = URL.createObjectURL(file);
                          setLocalVideoUrl(url);
                        }
                      }
                    }}
                  >
                    <input 
                      type="file" 
                      id="video-file-picker" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const url = URL.createObjectURL(file);
                          setLocalVideoUrl(url);
                        }
                      }}
                    />
                    <Upload className="text-rose-400 mb-2" size={20} />
                    <span className="text-xs font-serif text-slate-200">
                      拖拽或点击上传本地测试视频文件
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      支持极速流式加载本地保存的海棠超高画质影像
                    </span>
                  </div>

                  {/* Cloud direct link URL and preset templates selector */}
                  <div className="flex flex-col justify-between p-4 rounded-xl border border-rose-900/20 bg-black/60 text-left">
                    <div className="space-y-1">
                      <label className="text-xs text-rose-300 font-serif font-medium block">
                        云端视频直链传导 URL
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={videoUrl}
                          onChange={(e) => {
                            setLocalVideoUrl(""); 
                            setVideoUrl(e.target.value);
                          }}
                          placeholder="输入以 .mp4 结尾的云视频链接..."
                          className="flex-1 bg-black border border-slate-800 text-xs text-white px-3 py-1.5 rounded focus:outline-none focus:border-rose-600 font-mono"
                        />
                        {localVideoUrl && (
                          <button 
                            onClick={() => setLocalVideoUrl("")}
                            className="px-2.5 py-1 bg-rose-950/40 text-rose-300 border border-rose-900/40 rounded text-[10px] hover:bg-rose-900/30 font-serif whitespace-nowrap"
                          >
                            切回云端
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        云端海棠流式画质极佳预设:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                         {[
                          { name: "大鱼海棠经典旁白 (B站 ✦)", url: "BV1bt411y7AR" },
                          { name: "本地上传视频 (dayu.mp4 🌟)", url: "/src/assets/images/dayu.mp4", isLocalPreset: true },
                          { name: "大鱼海棠电影剪影 (B站 ✦)", url: "BV11x411p7P5" },
                          { name: "大鱼海棠经典独白 (YouTube)", url: "Ror1oDInFwY" },
                          { name: "极速大鱼星海 (推荐 🌟)", url: "https://vjs.zencdn.net/v/oceans.mp4" }
                        ].map((pre, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (pre.isLocalPreset) {
                                setLocalVideoUrl(pre.url);
                                setVideoUrl("");
                              } else {
                                setLocalVideoUrl("");
                                setVideoUrl(pre.url);
                              }
                              setVideoLoadError(null);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-serif border border-slate-800 bg-slate-900/50 text-slate-300 transition-colors hover:border-rose-700 hover:text-rose-200 cursor-pointer"
                          >
                            {pre.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. First-time loading curtain with absolute full-screen cover */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            id="opening_loader_overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute inset-0 bg-[#04060c] z-50 flex flex-col items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="flex flex-col items-center text-center max-w-md"
              id="loader_interior_card"
            >
              {/* Decorative ink-circle animation */}
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                <span className="absolute inset-0 border border-red-800/10 rounded-full scale-100"></span>
                <span className="absolute inset-2 border-2 border-[#8a1c14]/20 border-t-red-650 rounded-full animate-spin"></span>
                <span className="absolute inset-4 border border-blue-900/10 rounded-full"></span>
                <Heart size={20} className="text-[#8a1c14] animate-pulse glow-text" />
              </div>
              
              <h1 className="font-calligraphy text-4xl text-[#fb7185] tracking-widest mb-3 glow-text leading-snug">
                大鱼海棠 · 追生灵镜
              </h1>
              
              <blockquote className="text-slate-400 font-serif font-light text-xs italic leading-relaxed px-4 py-3 border-y border-slate-800/50 mb-6">
                “我们死去，生命将化作大风，回归星辰……”
              </blockquote>
              
              {/* Loading progress bar */}
              <div className="w-56 h-[1.5px] bg-slate-900 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-red-850 to-rose-500 w-[78%] animate-pulse"></div>
              </div>
              <p className="text-[10px] text-slate-500 font-serif tracking-wider font-light uppercase mt-3">
                古典神话画卷苏醒中...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Floating Ambient & BGM Music Player Panel */}
      <div className="fixed top-4 right-4 z-40 flex flex-col items-end gap-2" id="bgm_music_player_container">
        <AnimatePresence>
          {!showMusicPlayer ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMusicPlayer(true)}
              className="flex items-center justify-center w-11 h-11 rounded-full border border-rose-500/35 bg-slate-950/85 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.18)] backdrop-blur-md cursor-pointer hover:border-rose-400 hover:text-rose-200 transition-all"
              id="floating_music_trigger_btn"
              title="背景音乐古典播放器"
            >
              <Music size={18} className={!ambientMuted ? "animate-[spin_10s_linear_infinite]" : ""} />
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -15 }}
              className="w-76 rounded-2xl border border-rose-500/20 bg-[#0d0f17]/95 p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl text-slate-200"
              id="music_player_card"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 border-b border-rose-950/25 pb-2">
                <div className="flex items-center gap-1.5">
                  <Disc size={16} className={`text-rose-400 ${!ambientMuted ? "animate-[spin_8s_linear_infinite]" : ""}`} />
                  <span className="text-[11px] font-serif font-semibold text-rose-200 tracking-wider">背景音乐 · 大鱼海棠</span>
                </div>
                <button
                  onClick={() => setShowMusicPlayer(false)}
                  className="text-slate-400 hover:text-rose-300 transition-colors p-1 rounded-full hover:bg-slate-900/60 cursor-pointer"
                  title="收起播放器"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Disc & Track Name */}
              <div className="flex flex-col items-center mb-3 text-center">
                <div className="relative w-20 h-20 mb-2 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center p-1.5 shadow-inner">
                  {/* Vinyl plate animation */}
                  <div className={`w-full h-full rounded-full bg-black flex items-center justify-center border border-rose-950 relative overflow-hidden ${!ambientMuted ? "animate-[spin_12s_linear_infinite]" : ""}`}>
                    {/* Audio grooves */}
                    <div className="absolute inset-1.5 border border-slate-900/40 rounded-full" />
                    <div className="absolute inset-3 border border-slate-900/40 rounded-full" />
                    {/* Center rose label */}
                    <div className="w-6 h-6 rounded-full bg-rose-950 border border-rose-500/30 flex items-center justify-center text-[8px] text-rose-300 select-none font-bold">
                      海棠
                    </div>
                  </div>
                </div>

                <div className="h-9 flex flex-col justify-center">
                  <h3 className="text-xs font-semibold text-rose-100 font-serif line-clamp-1">{BGM_TRACKS[bgmTrackIndex].name}</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5 px-3 line-clamp-1">{BGM_TRACKS[bgmTrackIndex].description}</p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-3.5 mb-3">
                <button
                  onClick={() => changeBGMTrack(bgmTrackIndex - 1)}
                  className="p-1.5 rounded-full border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-rose-300 hover:border-rose-950 transition-colors cursor-pointer"
                  title="上一首"
                >
                  <SkipBack size={13} />
                </button>

                <button
                  onClick={toggleBGMPlaying}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${!ambientMuted ? "border-rose-500 bg-rose-950/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]" : "border-slate-700 bg-slate-900/50 text-slate-300 hover:text-rose-300"}`}
                  title={ambientMuted ? "播放" : "暂停"}
                >
                  {ambientMuted ? <Play size={14} className="ml-0.5" /> : <Pause size={14} />}
                </button>

                <button
                  onClick={() => changeBGMTrack(bgmTrackIndex + 1)}
                  className="p-1.5 rounded-full border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-rose-300 hover:border-rose-950 transition-colors cursor-pointer"
                  title="下一首"
                >
                  <SkipForward size={13} />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 mb-3.5 px-1">
                <button 
                  onClick={() => changeBGMVolume(bgmVolume > 0 ? 0 : 0.45)}
                  className="text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  {bgmVolume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => changeBGMVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 transition-colors"
                  title="音量调节"
                />
                <span className="text-[9px] text-slate-400 min-w-[20px] text-right">{Math.round(bgmVolume * 100)}%</span>
              </div>

              {/* Track Playlist Selector */}
              <div className="border-t border-rose-950/20 pt-2.5">
                <div className="text-[9px] text-slate-400 font-serif tracking-widest mb-1.5 text-left">精品音律选段</div>
                <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto pr-0.5">
                  {BGM_TRACKS.map((track, idx) => (
                    <button
                      key={idx}
                      onClick={() => changeBGMTrack(idx)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-all text-[10px] cursor-pointer ${bgmTrackIndex === idx && !ambientMuted ? "bg-rose-950/25 text-rose-300 font-medium border border-rose-500/15" : "hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-transparent"}`}
                    >
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <span className="text-[8px] opacity-60">0{idx + 1}</span>
                        <span>{track.name.replace("《大鱼》 - ", "")}</span>
                      </div>
                      {bgmTrackIndex === idx && !ambientMuted && (
                        <span className="flex gap-0.5 items-end h-2.5">
                          <span className="w-0.5 bg-rose-400 animate-[bounce_0.8s_infinite_100ms]" style={{ height: "40%" }} />
                          <span className="w-0.5 bg-rose-400 animate-[bounce_0.8s_infinite_300ms]" style={{ height: "100%" }} />
                          <span className="w-0.5 bg-rose-400 animate-[bounce_0.8s_infinite_200ms]" style={{ height: "60%" }} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
