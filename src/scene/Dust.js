import '../three-setup.js';
import * as THREE from 'three';
import { dustVertex, dustFragment } from './shaders.js';
import { seededRandom, lerp } from '../utils.js';

/** Specks floating along the whole path. They read as dust by day and stars by night. */
export class Dust {
  constructor({ count = 1800, minZ, maxZ }) {
    const rnd = seededRandom(7);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * 2200;
      positions[i * 3 + 1] = (rnd() - 0.5) * 1400;
      positions[i * 3 + 2] = lerp(minZ, maxZ, rnd());
      seeds[i] = rnd();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    this.uniforms = {
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0.55 },
      uSize: { value: 2.4 },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
    };
    this.points = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
  }

  setPixelRatio(dpr) {
    this.uniforms.uPixelRatio.value = dpr;
  }

  update(time, color) {
    this.uniforms.uTime.value = time;
    this.uniforms.uColor.value.copy(color);
  }
}
