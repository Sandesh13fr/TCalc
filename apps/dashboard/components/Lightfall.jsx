"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import "./Lightfall.css";

const MAX_COLORS = 8;
const DEFAULT_COLORS = ["#A6C8FF", "#5227FF", "#FF9FFC"];

const hexToRGB = (hex) => {
  const c = hex.replace("#", "").padEnd(6, "0");
  return [parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255];
};

const prepColors = (input) => {
  const base = (input?.length ? input : DEFAULT_COLORS).slice(0, MAX_COLORS);
  const count = base.length;
  const arr = Array.from({ length: MAX_COLORS }, (_, index) => hexToRGB(base[Math.min(index, count - 1)]));
  const avg = arr.slice(0, count).reduce((sum, color) => sum.map((value, index) => value + color[index]), [0, 0, 0]);
  return { arr, count, avg: avg.map((value) => value / count) };
};

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `
precision highp float;

uniform vec3 iResolution;
uniform vec2 iMouse;
uniform float iTime;
uniform vec3 uColor0;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform vec3 uColor6;
uniform vec3 uColor7;
uniform int uColorCount;
uniform vec3 uBgColor;
uniform vec3 uMouseColor;
uniform float uSpeed;
uniform int uStreakCount;
uniform float uStreakWidth;
uniform float uStreakLength;
uniform float uGlow;
uniform float uDensity;
uniform float uTwinkle;
uniform float uZoom;
uniform float uBgGlow;
uniform float uOpacity;
uniform float uMouseEnabled;
uniform float uMouseStrength;
uniform float uMouseRadius;

varying vec2 vUv;

vec3 palette(float h) {
  int count = uColorCount;
  if (count < 1) count = 1;
  int idx = int(floor(clamp(h, 0.0, 0.999999) * float(count)));
  if (idx <= 0) return uColor0;
  if (idx == 1) return uColor1;
  if (idx == 2) return uColor2;
  if (idx == 3) return uColor3;
  if (idx == 4) return uColor4;
  if (idx == 5) return uColor5;
  if (idx == 6) return uColor6;
  return uColor7;
}

vec3 tanhv(vec3 x) {
  vec3 e = exp(-2.0 * x);
  return (1.0 - e) / (1.0 + e);
}

vec2 sceneC(vec2 frag, vec2 r) {
  vec2 P = (frag + frag - r) / r.x;
  float z = 0.0;
  float d = 1e3;
  vec4 O = vec4(0.0);
  for (int k = 0; k < 39; k++) {
    if (d <= 1e-4) break;
    O = z * normalize(vec4(P, uZoom, 0.0)) - vec4(0.0, 4.0, 1.0, 0.0) / 4.5;
    d = 1.0 - sqrt(length(O * O));
    z += d;
  }
  return vec2(O.x, atan(O.z, O.y));
}

void mainImage(out vec4 o, vec2 C) {
  vec2 r = iResolution.xy;
  vec2 uv0 = (C + C - r) / r.x;
  float T = 0.1 * iTime * uSpeed + 9.0;
  float angRings = max(1.0, floor(6.28318530718 * max(uDensity, 0.05) + 0.5));
  vec2 Y = vec2(5e-3, 6.28318530718 / angRings);
  vec2 c0 = sceneC(C, r);
  vec2 cdx = sceneC(C + vec2(1.0, 0.0), r);
  vec2 cdy = sceneC(C + vec2(0.0, 1.0), r);
  vec2 dCx = cdx - c0;
  vec2 dCy = cdy - c0;
  dCx.y -= 6.28318530718 * floor(dCx.y / 6.28318530718 + 0.5);
  dCy.y -= 6.28318530718 * floor(dCy.y / 6.28318530718 + 0.5);
  vec2 fw = abs(dCx) + abs(dCy);
  C = c0;
  vec2 P = vec2(2.0, 1.0) * uv0 - (r / r.x) * vec2(0.0, 1.0);
  vec4 O = vec4(uBgColor * 90.0 * uBgGlow / (1e3 * dot(P, P) + 6.0), 0.0);
  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mN = (iMouse + iMouse - r) / r.x;
    float md = length(uv0 - mN);
    mGlow = exp(-md * md / max(uMouseRadius * uMouseRadius, 1e-4)) * uMouseStrength;
    O.rgb += uMouseColor * mGlow * 0.25;
  }
  float zr = 5e-4 * uStreakWidth;
  vec2 rr = vec2(max(length(fw), 1e-5));
  float tail = 19.0 / max(uStreakLength, 0.05);
  for (int m = 0; m < 16; m++) {
    if (m >= uStreakCount) break;
    float jf = float(m) + 1.0;
    float ic = fract(sin(dot(vec2(jf, floor(C.x / Y.x + 0.5)), vec2(7.0, 11.0)) * 73.0));
    vec2 Pp = C - (T + T * ic) * vec2(0.0, 1.0);
    Pp -= floor(Pp / Y + 0.5) * Y;
    float h = fract(8663.0 * ic);
    vec3 col = palette(h);
    float weight = mix(1.5, 1.0 + sin(T + 7.0 * h + 4.0), uTwinkle) * (1.0 + mGlow * 2.0);
    vec2 inner = vec2(length(max(Pp, vec2(-1.0, 0.0))), length(Pp) - zr) - zr;
    vec2 sm = vec2(1.0) - smoothstep(-rr, rr, inner);
    O.rgb += dot(sm, vec2(exp(tail * Pp.y), 3.0)) * col * weight;
    C.x += Y.x / 8.0;
  }
  vec3 colr = sqrt(tanhv(max(O.rgb * uGlow - vec3(0.04, 0.08, 0.02), 0.0)));
  o = vec4(colr, uOpacity);
}

void main() {
  vec4 color;
  mainImage(color, vUv * iResolution.xy);
  gl_FragColor = color;
}
`;

export default function Lightfall({
  className = "",
  dpr = undefined,
  paused = false,
  colors = DEFAULT_COLORS,
  backgroundColor = "#0A29FF",
  speed = 0.5,
  streakCount = 2,
  streakWidth = 1,
  streakLength = 1,
  glow = 1,
  density = 0.6,
  twinkle = 1,
  zoom = 3,
  backgroundGlow = 0.5,
  opacity = 1,
  mouseInteraction = true,
  mouseStrength = 0.5,
  mouseRadius = 1,
  mouseDampening = 0.15,
  mixBlendMode = undefined,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    try {
      renderer = new Renderer({
        dpr: dpr ?? Math.min(window.devicePixelRatio || 1, 1.75),
        alpha: true,
        antialias: true,
      });
    } catch {
      return undefined;
    }
    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const { arr, count, avg } = prepColors(colors);
    const uniforms = {
      iResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1] },
      iMouse: { value: [0, 0] },
      iTime: { value: 0 },
      uColor0: { value: arr[0] }, uColor1: { value: arr[1] }, uColor2: { value: arr[2] }, uColor3: { value: arr[3] },
      uColor4: { value: arr[4] }, uColor5: { value: arr[5] }, uColor6: { value: arr[6] }, uColor7: { value: arr[7] },
      uColorCount: { value: count }, uBgColor: { value: hexToRGB(backgroundColor) }, uMouseColor: { value: avg },
      uSpeed: { value: speed }, uStreakCount: { value: Math.max(1, Math.min(16, Math.round(streakCount))) },
      uStreakWidth: { value: streakWidth }, uStreakLength: { value: streakLength }, uGlow: { value: glow },
      uDensity: { value: density }, uTwinkle: { value: twinkle }, uZoom: { value: zoom }, uBgGlow: { value: backgroundGlow },
      uOpacity: { value: opacity }, uMouseEnabled: { value: mouseInteraction ? 1 : 0 },
      uMouseStrength: { value: mouseStrength }, uMouseRadius: { value: mouseRadius },
    };
    const program = new Program(gl, { vertex, fragment, uniforms });
    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });
    let frame = 0;
    let lastTime = 0;
    const target = [0, 0];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1));
      uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];
      if (target[0] === 0 && target[1] === 0) {
        target[0] = gl.drawingBufferWidth / 2;
        target[1] = gl.drawingBufferHeight / 2;
        uniforms.iMouse.value = [...target];
      }
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scale = renderer.dpr || 1;
      target[0] = (event.clientX - rect.left) * scale;
      target[1] = (rect.height - (event.clientY - rect.top)) * scale;
      if (mouseDampening <= 0) uniforms.iMouse.value = [...target];
    };

    const render = (time) => {
      uniforms.iTime.value = time * 0.001;
      if (mouseDampening > 0) {
        const dt = lastTime ? (time - lastTime) / 1000 : 0;
        const factor = Math.min(1, 1 - Math.exp(-dt / Math.max(1e-4, mouseDampening)));
        uniforms.iMouse.value[0] += (target[0] - uniforms.iMouse.value[0]) * factor;
        uniforms.iMouse.value[1] += (target[1] - uniforms.iMouse.value[1]) * factor;
      }
      lastTime = time;
      renderer.render({ scene: mesh });
      if (!paused && !reducedMotion && !document.hidden) frame = requestAnimationFrame(render);
    };

    const onVisibilityChange = () => {
      cancelAnimationFrame(frame);
      if (!paused && !reducedMotion && !document.hidden) frame = requestAnimationFrame(render);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    if (mouseInteraction) window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      if (mouseInteraction) window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      canvas.remove();
      program.remove?.();
      geometry.remove?.();
      mesh.remove?.();
      renderer.destroy?.();
    };
  }, [backgroundColor, backgroundGlow, colors, density, dpr, glow, mouseDampening, mouseInteraction, mouseRadius, mouseStrength, opacity, paused, speed, streakCount, streakLength, streakWidth, twinkle, zoom]);

  return <div ref={containerRef} className={`lightfall-container ${className ?? ""}`} style={mixBlendMode ? { mixBlendMode } : undefined} aria-hidden="true" />;
}
