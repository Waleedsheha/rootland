import { Box3, Group, Mesh, NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Scene, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** One full turn every TURN_SECONDS. */
const TURN_SECONDS = 14;
/** How far the pointer leans the mark, in radians. */
const LEAN_YAW = 0.6;
const LEAN_PITCH = 0.25;
const FOV = 30;
/** Share of the canvas height the mark fills. */
const FILL = 0.82;
/** Angle of the still mark (reduced motion): a three-quarter view. */
const STILL_YAW = 0.45;

export interface MarkScene {
  /** Draw every frame while on screen; stop when off screen. */
  setRunning(running: boolean): void;
  /** Pointer position relative to the mark, -1..1 on each axis (right and down are positive). */
  setPointer(x: number, y: number): void;
  dispose(): void;
}

/**
 * The RootLand mark as a 3D object inside `container`: it turns slowly and leans toward the pointer.
 * With `still` (reduced motion) it is drawn once at a three-quarter angle and never moves.
 */
export async function createMarkScene(container: HTMLElement, modelUrl: string, still: boolean): Promise<MarkScene> {
  const gltf = await new GLTFLoader().loadAsync(modelUrl);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;
  // The canvas fills the container without sizing it; otherwise its pixel size feeds back into the layout.
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';

  // Studio reflections, so the cream reads as satin and the copper bar as metal.
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envMap;

  // Centre the mark on the origin and scale it to a height of 1, so the framing does not depend on the file.
  const model = gltf.scene;
  const box = new Box3().setFromObject(model);
  model.position.sub(box.getCenter(new Vector3()));
  const pivot = new Group();
  pivot.add(model);
  pivot.scale.setScalar(1 / box.getSize(new Vector3()).y);
  scene.add(pivot);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 20);
  camera.position.set(0, 0, 0.5 / Math.tan((FOV * Math.PI) / 360) / FILL);

  let spin = still ? STILL_YAW : 0;
  let leanYaw = 0;
  let leanPitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let last = performance.now();

  const draw = () => {
    pivot.rotation.set(leanPitch, spin + leanYaw, 0);
    renderer.render(scene, camera);
  };

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    spin += (dt / TURN_SECONDS) * Math.PI * 2;
    const ease = 1 - Math.exp(-dt * 5);
    leanYaw += (targetYaw - leanYaw) * ease;
    leanPitch += (targetPitch - leanPitch) * ease;
    draw();
  };

  const fit = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  const resizer = new ResizeObserver(fit);
  resizer.observe(container);
  container.appendChild(renderer.domElement);
  fit();

  return {
    setRunning(running) {
      if (still) return;
      last = performance.now();
      renderer.setAnimationLoop(running ? tick : null);
    },
    setPointer(x, y) {
      if (still) return;
      targetYaw = x * LEAN_YAW;
      targetPitch = y * LEAN_PITCH;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      resizer.disconnect();
      model.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      });
      envMap.dispose();
      pmrem.dispose();
      room.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
