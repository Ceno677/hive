import * as THREE from 'three';
import bodyVert from '../shaders/pixelBody.vert.glsl?raw';
import bodyFrag from '../shaders/pixelBody.frag.glsl?raw';
import bgVert from '../shaders/background.vert.glsl?raw';
import bgFrag from '../shaders/background.frag.glsl?raw';
import ambientVert from '../shaders/ambient.vert.glsl?raw';
import ambientFrag from '../shaders/ambient.frag.glsl?raw';
import type { RenderParams } from '../animation/animationConfig';
import type { BodyAnchors } from '../generator/types';

export interface MaterialSet {
  body: THREE.ShaderMaterial;
  background: THREE.ShaderMaterial;
  ambient: THREE.ShaderMaterial;
}

const v3 = (rgb: readonly number[]) => new THREE.Vector3(rgb[0], rgb[1], rgb[2]);

export function createMaterials(params: RenderParams, anchors: BodyAnchors): MaterialSet {
  const body = new THREE.ShaderMaterial({
    vertexShader: bodyVert,
    fragmentShader: bodyFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uAngle: { value: 0 },
      uPhase: { value: 0 },
      uMotion: { value: params.motion },
      uFragAmt: { value: params.fragAmt },
      uErosionAmt: { value: params.erosionAmt },
      uPixelScale: { value: 1 },
      uBreath: { value: params.breath },
      uSway: { value: params.sway },
      uNeckPivot: { value: new THREE.Vector2(anchors.neckPivot[0], anchors.neckPivot[1]) },
      uHipPivot: { value: new THREE.Vector2(anchors.hipPivot[0], anchors.hipPivot[1]) },
      uDetachDist: { value: params.detachDist },
      uDetachCycles: { value: params.detachCycles },
      uFlicker: { value: params.flicker },
      uBandAmp: { value: params.bandAmp },
      uBandFreq: { value: params.bandFreq },
      uBandSpeed: { value: params.bandSpeed },
      uGlitch: { value: params.glitch },
      uEyeStretch: { value: params.eyeStretch },
      uSeedOffset: { value: new THREE.Vector2(params.seedOffset[0], params.seedOffset[1]) },
      uShimmer: { value: params.shimmer },
      uCrawl: { value: params.crawl },
      uColorA: { value: v3(params.colorA) },
      uColorB: { value: v3(params.colorB) },
      uAccentColor: { value: v3(params.accentColor) },
      uEyeColor: { value: v3(params.eyeColor) },
      uEyeIntensity: { value: params.eyeIntensity },
      uEyeBlink: { value: params.eyeBlink },
      uMode: { value: params.pixelMode },
    },
  });

  const background = new THREE.ShaderMaterial({
    vertexShader: bgVert,
    fragmentShader: bgFrag,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTop: { value: v3(params.bgTop) },
      uBottom: { value: v3(params.bgBottom) },
      uGlow: { value: v3(params.bgGlow) },
      uMode: { value: params.bgMode },
      uAngle: { value: 0 },
      uPhase: { value: 0 },
      uSeedOffset: { value: new THREE.Vector2(params.seedOffset[0], params.seedOffset[1]) },
    },
  });

  const ambient = new THREE.ShaderMaterial({
    vertexShader: ambientVert,
    fragmentShader: ambientFrag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uAngle: { value: 0 },
      uPhase: { value: 0 },
      uMode: { value: params.ambientMode },
      uMotion: { value: params.motion },
      uColor: { value: v3(params.ambientColor) },
    },
  });

  return { body, background, ambient };
}

/** Update uniform values in place — no rebuild, safe to call every change. */
export function applyParamsToMaterials(mats: MaterialSet, params: RenderParams): void {
  const b = mats.body.uniforms;
  b.uMotion.value = params.motion;
  b.uFragAmt.value = params.fragAmt;
  b.uErosionAmt.value = params.erosionAmt;
  b.uBreath.value = params.breath;
  b.uSway.value = params.sway;
  b.uDetachDist.value = params.detachDist;
  b.uDetachCycles.value = params.detachCycles;
  b.uFlicker.value = params.flicker;
  b.uBandAmp.value = params.bandAmp;
  b.uBandFreq.value = params.bandFreq;
  b.uBandSpeed.value = params.bandSpeed;
  b.uGlitch.value = params.glitch;
  b.uEyeStretch.value = params.eyeStretch;
  b.uShimmer.value = params.shimmer;
  b.uCrawl.value = params.crawl;
  (b.uColorA.value as THREE.Vector3).set(params.colorA[0], params.colorA[1], params.colorA[2]);
  (b.uColorB.value as THREE.Vector3).set(params.colorB[0], params.colorB[1], params.colorB[2]);
  (b.uAccentColor.value as THREE.Vector3).set(params.accentColor[0], params.accentColor[1], params.accentColor[2]);
  (b.uEyeColor.value as THREE.Vector3).set(params.eyeColor[0], params.eyeColor[1], params.eyeColor[2]);
  b.uEyeIntensity.value = params.eyeIntensity;
  b.uEyeBlink.value = params.eyeBlink;
  b.uMode.value = params.pixelMode;

  const g = mats.background.uniforms;
  (g.uTop.value as THREE.Vector3).set(params.bgTop[0], params.bgTop[1], params.bgTop[2]);
  (g.uBottom.value as THREE.Vector3).set(params.bgBottom[0], params.bgBottom[1], params.bgBottom[2]);
  (g.uGlow.value as THREE.Vector3).set(params.bgGlow[0], params.bgGlow[1], params.bgGlow[2]);
  g.uMode.value = params.bgMode;

  const a = mats.ambient.uniforms;
  a.uMode.value = params.ambientMode;
  a.uMotion.value = params.motion;
  (a.uColor.value as THREE.Vector3).set(params.ambientColor[0], params.ambientColor[1], params.ambientColor[2]);
}

export function setMaterialsPhase(mats: MaterialSet, phase: number): void {
  const angle = phase * Math.PI * 2;
  mats.body.uniforms.uPhase.value = phase;
  mats.body.uniforms.uAngle.value = angle;
  mats.background.uniforms.uAngle.value = angle;
  mats.background.uniforms.uPhase.value = phase;
  mats.ambient.uniforms.uPhase.value = phase;
  mats.ambient.uniforms.uAngle.value = angle;
}
