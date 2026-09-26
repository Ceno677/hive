import * as THREE from 'three';
import { VIEW_EXTENT } from '../generator/config';
import { applyParamsToMaterials, createMaterials, setMaterialsPhase, type MaterialSet } from './materials';
import type { RenderParams } from '../animation/animationConfig';
import type { BuiltEntity } from '../generator/types';

/**
 * Renderer-agnostic scene builder. The preview, the PNG exporter, the WebM
 * exporter and any future batch script all build the exact same scene from the
 * same BuiltEntity — only the WebGLRenderer differs.
 */
export interface EntitySceneHandle {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  stats: { fragments: number; ambient: number };
  setPhase(phase: number): void;
  applyParams(params: RenderParams): void;
  setViewport(width: number, height: number): void;
  dispose(): void;
}

function makeQuadInstanceGeometry(): THREE.InstancedBufferGeometry {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = (quad.index as THREE.BufferAttribute).clone();
  geo.setAttribute('position', (quad.getAttribute('position') as THREE.BufferAttribute).clone());
  geo.setAttribute('uv', (quad.getAttribute('uv') as THREE.BufferAttribute).clone());
  quad.dispose();
  return geo;
}

export function createEntityScene(entity: BuiltEntity, params: RenderParams): EntitySceneHandle {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-VIEW_EXTENT, VIEW_EXTENT, VIEW_EXTENT, -VIEW_EXTENT, 0.1, 10);
  camera.position.z = 5;

  const mats: MaterialSet = createMaterials(params, entity.anchors);

  // Background plane (covers any aspect).
  const bgGeo = new THREE.PlaneGeometry(8, 8);
  const bgMesh = new THREE.Mesh(bgGeo, mats.background);
  bgMesh.position.z = -1;
  bgMesh.renderOrder = 0;
  bgMesh.frustumCulled = false;
  scene.add(bgMesh);

  // Instanced pixel body — one draw call for every fragment.
  const p = entity.particles;
  const bodyGeo = makeQuadInstanceGeometry();
  bodyGeo.setAttribute('aHome', new THREE.InstancedBufferAttribute(p.home, 3));
  bodyGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(p.size, 1));
  bodyGeo.setAttribute('aBright', new THREE.InstancedBufferAttribute(p.bright, 1));
  bodyGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(p.phase, 1));
  bodyGeo.setAttribute('aSuscept', new THREE.InstancedBufferAttribute(p.suscept, 1));
  bodyGeo.setAttribute('aRegion', new THREE.InstancedBufferAttribute(p.region, 1));
  bodyGeo.setAttribute('aDetach', new THREE.InstancedBufferAttribute(p.detach, 2));
  bodyGeo.setAttribute('aErode', new THREE.InstancedBufferAttribute(p.erode, 1));
  bodyGeo.setAttribute('aEdge', new THREE.InstancedBufferAttribute(p.edge, 1));
  bodyGeo.setAttribute('aAccent', new THREE.InstancedBufferAttribute(p.accent, 1));
  bodyGeo.instanceCount = p.count;
  const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
  bodyMesh.renderOrder = 1;
  bodyMesh.frustumCulled = false;
  scene.add(bodyMesh);

  // Ambient debris — a second, much smaller instanced draw call.
  const am = entity.ambient;
  const ambientGeo = makeQuadInstanceGeometry();
  ambientGeo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(am.center, 2));
  ambientGeo.setAttribute('aRadius', new THREE.InstancedBufferAttribute(am.radius, 1));
  ambientGeo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(am.speed, 1));
  ambientGeo.setAttribute('aPhase0', new THREE.InstancedBufferAttribute(am.phase0, 1));
  ambientGeo.setAttribute('aSize', new THREE.InstancedBufferAttribute(am.size, 1));
  ambientGeo.setAttribute('aBright', new THREE.InstancedBufferAttribute(am.bright, 1));
  ambientGeo.instanceCount = am.count;
  const ambientMesh = new THREE.Mesh(ambientGeo, mats.ambient);
  ambientMesh.renderOrder = 2;
  ambientMesh.frustumCulled = false;
  scene.add(ambientMesh);

  return {
    scene,
    camera,
    stats: { fragments: p.count, ambient: am.count },
    setPhase(phase: number) {
      setMaterialsPhase(mats, phase);
    },
    applyParams(next: RenderParams) {
      applyParamsToMaterials(mats, next);
    },
    setViewport(width: number, height: number) {
      const aspect = width / Math.max(height, 1);
      if (aspect >= 1) {
        camera.left = -VIEW_EXTENT * aspect;
        camera.right = VIEW_EXTENT * aspect;
        camera.top = VIEW_EXTENT;
        camera.bottom = -VIEW_EXTENT;
      } else {
        camera.left = -VIEW_EXTENT;
        camera.right = VIEW_EXTENT;
        camera.top = VIEW_EXTENT / aspect;
        camera.bottom = -VIEW_EXTENT / aspect;
      }
      camera.updateProjectionMatrix();
    },
    dispose() {
      bgGeo.dispose();
      bodyGeo.dispose();
      ambientGeo.dispose();
      mats.body.dispose();
      mats.background.dispose();
      mats.ambient.dispose();
    },
  };
}
