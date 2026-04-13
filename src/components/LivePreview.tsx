import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCcw, Maximize2, Eye } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useOrchestrator } from "../store/orchestrator-store";
import { convertFileSrc } from "@tauri-apps/api/core";

export function LivePreview() {
  const project = useOrchestrator((s) => s.project);
  const assets = useOrchestrator((s) => s.assets);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    animId: number;
    loaded: Map<string, THREE.Object3D>;
  } | null>(null);
  const [assetCount, setAssetCount] = useState(0);

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    const container = containerRef.current;
    if (!container || sceneRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87c3ed);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 6, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.update();

    // Lighting
    const ambient = new THREE.AmbientLight(0x9aa5b0, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    scene.add(sun);

    // Grid helper for empty scenes
    const grid = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
    grid.name = "__grid";
    scene.add(grid);

    // Animation loop
    function animate() {
      const id = requestAnimationFrame(animate);
      sceneRef.current!.animId = id;
      controls.update();
      renderer.render(scene, camera);
    }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      animId: 0,
      loaded: new Map(),
    };

    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Load GLB assets into scene
  const loadAssets = useCallback(() => {
    if (!sceneRef.current || !project) return;

    const { scene, loaded } = sceneRef.current;
    const loader = new GLTFLoader();
    const modelAssets = assets.filter(
      (a) => a.type === "model" && (a.path.endsWith(".glb") || a.path.endsWith(".gltf"))
    );

    // Remove previously loaded models
    loaded.forEach((obj) => scene.remove(obj));
    loaded.clear();

    // Scene layout - position models based on filename
    const POSITIONS: Record<string, { pos: [number, number, number]; scale: number }[]> = {
      "terrain.glb": [{ pos: [0, 0, 0], scale: 1 }],
      "tree.glb": [
        { pos: [3, 0, 0.2], scale: 1 },
        { pos: [-4, 0, 0.1], scale: 0.8 },
        { pos: [5, 0, 0.3], scale: 1.2 },
        { pos: [-2, 0, 0.15], scale: 0.9 },
      ],
      "rock.glb": [
        { pos: [1.5, 0, 1], scale: 1 },
        { pos: [-3, 0, -2], scale: 1.5 },
        { pos: [6, 0, 1], scale: 0.7 },
      ],
      "player.glb": [{ pos: [0, 0.5, 0], scale: 1 }],
    };

    let count = 0;

    modelAssets.forEach((asset) => {
      const assetUrl = convertFileSrc(asset.path);

      loader.load(
        assetUrl,
        (gltf) => {
          const filename = asset.name.toLowerCase();
          const placements = POSITIONS[filename] || [{ pos: [count * 2, 0, 0], scale: 1 }];

          placements.forEach((placement, i) => {
            const model = i === 0 ? gltf.scene : gltf.scene.clone();
            model.position.set(...placement.pos);
            model.scale.setScalar(placement.scale);

            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);
            loaded.set(`${asset.path}_${i}`, model);
          });

          count++;
          setAssetCount(count);

          // Hide grid when we have terrain
          if (filename === "terrain.glb") {
            const grid = scene.getObjectByName("__grid");
            if (grid) grid.visible = false;
          }
        },
        undefined,
        (err) => {
          console.warn(`Failed to load ${asset.name}:`, err);
        }
      );
    });
  }, [project, assets]);

  // Initialize
  useEffect(() => {
    const cleanup = initScene();
    return () => {
      cleanup?.();
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId);
        sceneRef.current.renderer.dispose();
        const canvas = sceneRef.current.renderer.domElement;
        canvas.parentNode?.removeChild(canvas);
        sceneRef.current = null;
      }
    };
  }, [initScene]);

  // Reload when assets change
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  function resetCamera() {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    camera.position.set(5, 6, 8);
    controls.target.set(0, 0.5, 0);
    controls.update();
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Eye size={32} className="text-zinc-700" />
        <p className="text-sm text-zinc-500">Open a project to preview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800 shrink-0">
        <span className="text-[10px] text-zinc-500">
          Live 3D Preview — {assetCount} model{assetCount !== 1 ? "s" : ""} loaded
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={loadAssets}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Reload assets"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={resetCamera}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Reset camera"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Three.js canvas */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
