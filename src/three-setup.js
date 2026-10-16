import * as THREE from 'three';

// Work directly in sRGB values. The custom shaders, the chroma key and the
// sky colours in sky.js all assume this, so it must run before any THREE.Color
// is created. Every module that makes colours imports this file first.
THREE.ColorManagement.enabled = false;
