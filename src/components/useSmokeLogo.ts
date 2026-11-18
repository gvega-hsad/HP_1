import { useEffect } from 'react'

/**
 * Interactive smoke for a logo — soft and continuous, not particles.
 *
 * Hover the logo → it gently thins into slow, rising smoke, starting nearest
 * the cursor. Moving the mouse through it is like waving a hand through
 * smoke: wisps are carried along with the motion and the air clears where
 * the hand passes, then drifts back. Move away → the smoke settles back into
 * the crisp logo.
 *
 * How: the logo is rasterised once into a texture and drawn by a fragment
 * shader on an overlay canvas. The shader warps the texture with slowly
 * flowing noise, blurs and lightens it as it dissolves, and reads a coarse
 * "flow field" (updated on the CPU from pointer motion, linearly filtered on
 * the GPU) that displaces and clears the smoke. Everything is continuous, so
 * there are no dots or hard edges. The real <img>s are hidden only while the
 * effect runs; without WebGL2 a CSS haze is used instead.
 */

type Options = {
  hero: React.RefObject<HTMLElement | null>
  logo: React.RefObject<HTMLElement | null>
  canvas: React.RefObject<HTMLCanvasElement | null>
  enabled: boolean
  /** extra px around the logo that still counts as "hovering" once smoking */
  reach?: number
}

// Flow field resolution (cells) — coarse on purpose; the GPU smooths it.
const GW = 48
const GH = 33
const HAND_RADIUS = 0.1 // in canvas-height units

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y down, like the page
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uFlow;
uniform vec2 uRes;
uniform float uTime;
uniform float uK;
uniform vec2 uEntry;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  vec4 flow = texture(uFlow, uv);

  // dissolve spreads softly outward from where the cursor entered
  vec2 P = uv * vec2(aspect, 1.0);
  float d = length(P - uEntry * vec2(aspect, 1.0));
  float local = smoothstep(0.0, 1.0, uK * 2.2 - d * 0.9);

  // slow, rising, curling warp
  float t = uTime;
  vec2 q = P * 2.6 + vec2(0.0, t * 0.16);
  vec2 warp = vec2(fbm(q + vec2(0.0, t * 0.05)), fbm(q + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))) - 0.5;

  vec2 suv = uv;
  suv += warp * vec2(1.0 / aspect, 1.0) * 0.26 * local;
  suv.y += local * (0.045 + warp.y * 0.03); // sample from below → smoke rises
  suv -= flow.xy;                            // carried by the hand

  // soft blur that grows as it turns to smoke, plus wisps trailing upward
  float r = local * 10.0 / uRes.y + length(flow.xy) * 0.06;
  float lod = local * 1.6; // mip level: pre-blurred copies of the logo
  vec4 c = textureLod(uTex, suv, lod) * 0.16;
  for (int i = 0; i < 7; i++) {
    float a = float(i) * 0.8976 + 0.4;
    vec2 o = vec2(cos(a) / aspect, sin(a));
    c += textureLod(uTex, suv + o * r, lod) * 0.07;
    c += textureLod(uTex, suv + o * r * 0.45 + vec2(0.0, r * 0.2), lod) * 0.05;
  }
  // trailing plume: fainter copies drawn from further below, drifting with the noise
  vec4 trail = vec4(0.0);
  for (int j = 1; j <= 10; j++) {
    float fj = float(j) * 0.6;
    vec2 w2 = vec2(fbm(q * 0.8 + vec2(fj * 3.1, -t * 0.12)) - 0.5, 0.0) * 0.06 * fj;
    trail += textureLod(uTex, suv + vec2(w2.x / aspect, fj * 0.02 * local) + vec2(0.0, r), 2.6 + fj * 0.35) * (0.16 / (fj + 0.5));
  }
  c = c + trail * local * (1.0 - c.a);

  // logo colour → pale smoke, thinning out; the hand clears it further
  vec3 smoke = vec3(0.97, 0.94, 0.86);
  c.rgb = mix(c.rgb, smoke * c.a, local * 0.5);
  float fade = (1.0 - local * 0.65) * (1.0 - flow.z * 0.8);
  outColor = c * fade;
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader')
  return s
}

export default function useSmokeLogo({ hero, logo, canvas, enabled, reach = 140 }: Options) {
  useEffect(() => {
    const heroEl = hero.current
    const logoEl = logo.current
    const c = canvas.current
    if (!enabled || !heroEl || !logoEl || !c) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })

    // ---------- Fallback: a simple CSS haze ----------
    if (!gl) {
      logoEl.classList.add('has-haze')
      const on = () => logoEl.classList.add('is-hazy')
      const off = () => logoEl.classList.remove('is-hazy')
      logoEl.addEventListener('pointerenter', on)
      heroEl.addEventListener('pointerleave', off)
      logoEl.addEventListener('pointerleave', off)
      return () => {
        logoEl.removeEventListener('pointerenter', on)
        heroEl.removeEventListener('pointerleave', off)
        logoEl.removeEventListener('pointerleave', off)
        off()
        logoEl.classList.remove('has-haze')
      }
    }

    // ---------- GL setup ----------
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const U = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = U('uRes'), uTime = U('uTime'), uK = U('uK'), uEntry = U('uEntry')
    gl.uniform1i(U('uTex'), 0)
    gl.uniform1i(U('uFlow'), 1)

    const makeTex = (unit: number) => {
      const tx = gl.createTexture()!
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tx)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return tx
    }
    const logoTex = makeTex(0)
    const flowTex = makeTex(1)

    // ---------- Flow field (the "hand") ----------
    const fx = new Float32Array(GW * GH) // displacement, uv units
    const fy = new Float32Array(GW * GH)
    const vx = new Float32Array(GW * GH) // its velocity
    const vy = new Float32Array(GW * GH)
    const clear = new Float32Array(GW * GH)
    const flowData = new Float32Array(GW * GH * 4)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let mode: 'idle' | 'smoke' | 'reform' = 'idle'
    let k = 0
    let raf = 0
    const entry = { x: 0, y: 1 }
    const pointer = { x: -9, y: -9, vx: 0, vy: 0, t: 0 } // uv units; v per frame

    /** Rasterise the logo's images into the texture at their on-screen positions. */
    const build = () => {
      const cr = c.getBoundingClientRect()
      c.width = Math.round(cr.width * dpr)
      c.height = Math.round(cr.height * dpr)
      gl.viewport(0, 0, c.width, c.height)
      gl.uniform2f(uRes, c.width, c.height)

      const off = document.createElement('canvas')
      off.width = c.width
      off.height = c.height
      const o = off.getContext('2d')!
      o.scale(dpr, dpr)
      logoEl.querySelectorAll('img').forEach((img) => {
        const r = img.getBoundingClientRect()
        const clip = img.parentElement && img.parentElement !== logoEl ? img.parentElement.getBoundingClientRect() : null
        o.save()
        if (clip) {
          o.beginPath()
          o.rect(clip.left - cr.left, clip.top - cr.top, clip.width, clip.height)
          o.clip()
        }
        o.drawImage(img, r.left - cr.left, r.top - cr.top, r.width, r.height)
        o.restore()
      })
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, logoTex)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    const showLogo = (on: boolean) => {
      logoEl.classList.toggle('is-smoking', !on)
      c.style.opacity = on ? '0' : '1'
    }

    const stepFlow = () => {
      const aspect = c.width / c.height
      const speed = Math.hypot(pointer.vx, pointer.vy)
      const hand = mode === 'smoke' && speed > 0.0002
      const relax = mode === 'smoke' ? 0.994 : 0.93
      const r2 = HAND_RADIUS * HAND_RADIUS
      let active = 0
      for (let j = 0; j < GH; j++) {
        for (let i = 0; i < GW; i++) {
          const n = j * GW + i
          if (hand) {
            const dx = ((i + 0.5) / GW - pointer.x) * aspect
            const dy = (j + 0.5) / GH - pointer.y
            const w = Math.exp(-(dx * dx + dy * dy) / r2)
            if (w > 0.01) {
              vx[n] += pointer.vx * w * 0.3
              vy[n] += pointer.vy * w * 0.3
              clear[n] = Math.min(1, clear[n] + speed * w * 2.6)
            }
          }
          fx[n] = Math.max(-0.3, Math.min(0.3, (fx[n] + vx[n]) * relax))
          fy[n] = Math.max(-0.3, Math.min(0.3, (fy[n] + vy[n]) * relax))
          vx[n] *= 0.9
          vy[n] *= 0.9
          clear[n] *= mode === 'smoke' ? 0.982 : 0.9
          const m = n * 4
          flowData[m] = fx[n]
          flowData[m + 1] = fy[n]
          flowData[m + 2] = clear[n]
          active = Math.max(active, Math.abs(fx[n]), Math.abs(fy[n]), clear[n])
        }
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, flowTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, GW, GH, 0, gl.RGBA, gl.FLOAT, flowData)
      return active
    }

    const resetFlow = () => {
      fx.fill(0); fy.fill(0); vx.fill(0); vy.fill(0); clear.fill(0)
    }

    const tick = (t: number) => {
      // ease the dissolve in slowly, and back out a little quicker
      k += ((mode === 'smoke' ? 1 : 0) - k) * (mode === 'smoke' ? 0.022 : 0.03)
      pointer.vx *= 0.85
      pointer.vy *= 0.85
      const active = stepFlow()

      gl.uniform1f(uTime, t / 1000)
      gl.uniform1f(uK, k)
      gl.uniform2f(uEntry, entry.x, entry.y)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (mode === 'reform' && k < 0.004 && active < 0.0015) {
        mode = 'idle'
        k = 0
        showLogo(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const toUv = (e: PointerEvent) => {
      const cr = c.getBoundingClientRect()
      return { x: (e.clientX - cr.left) / cr.width, y: (e.clientY - cr.top) / cr.height }
    }

    const start = (e: PointerEvent) => {
      if (mode === 'smoke') return
      const p = toUv(e)
      if (mode === 'idle') {
        build()
        resetFlow()
        entry.x = p.x
        entry.y = p.y
      }
      mode = 'smoke'
      showLogo(false)
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }

    const near = (e: PointerEvent) => {
      const r = logoEl.getBoundingClientRect()
      return (
        e.clientX > r.left - reach &&
        e.clientX < r.right + reach &&
        e.clientY > r.top - reach * 1.6 && // smoke rises, so allow more room above
        e.clientY < r.bottom + reach
      )
    }

    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      const p = toUv(e)
      if (pointer.t) {
        const dt = Math.max(8, now - pointer.t)
        // smoothed velocity in uv per ~frame, capped so flicks stay gentle
        const cap = 0.03
        const nvx = Math.max(-cap, Math.min(cap, ((p.x - pointer.x) / dt) * 16))
        const nvy = Math.max(-cap, Math.min(cap, ((p.y - pointer.y) / dt) * 16))
        pointer.vx += (nvx - pointer.vx) * 0.5
        pointer.vy += (nvy - pointer.vy) * 0.5
      }
      pointer.x = p.x
      pointer.y = p.y
      pointer.t = now
      if (mode === 'smoke' && !near(e)) mode = 'reform'
    }

    const onHeroLeave = () => {
      pointer.t = 0
      if (mode === 'smoke') mode = 'reform'
    }

    logoEl.addEventListener('pointerenter', start)
    heroEl.addEventListener('pointermove', onMove)
    heroEl.addEventListener('pointerleave', onHeroLeave)
    return () => {
      cancelAnimationFrame(raf)
      logoEl.removeEventListener('pointerenter', start)
      heroEl.removeEventListener('pointermove', onMove)
      heroEl.removeEventListener('pointerleave', onHeroLeave)
      showLogo(true)
    }
  }, [hero, logo, canvas, enabled, reach])
}
