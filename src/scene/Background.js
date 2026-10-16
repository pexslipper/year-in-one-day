import '../three-setup.js';
import * as THREE from 'three';
import { skyVertex, skyFragment } from './shaders.js';

/** Full-screen sky drawn behind everything: gradient, sun and stars. */
export class Background {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunPos: { value: new THREE.Vector2() },
      uSunVisible: { value: 0 },
      uStars: { value: 1 },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uOffset: { value: new THREE.Vector2() },
    };
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: this.uniforms,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  setAspect(aspect) {
    this.uniforms.uAspect.value = aspect;
  }

  update({ sky, sun, stars, time, offsetX, offsetY }) {
    const u = this.uniforms;
    u.uTop.value.copy(sky.top);
    u.uBottom.value.copy(sky.bottom);
    u.uSunColor.value.copy(sun.color);
    u.uSunPos.value.set(sun.x, sun.y);
    u.uSunVisible.value = sun.visible;
    u.uStars.value = stars;
    u.uTime.value = time;
    u.uOffset.value.set(offsetX, offsetY);
  }
}
