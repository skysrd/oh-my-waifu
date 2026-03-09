import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { AvatarController } from "../lib/avatar";

/**
 * Three.js + VRM 캐릭터 렌더링 캔버스
 */
export default function AvatarCanvas({ avatarRef, vrmPath }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);

  const initScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      30,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      20
    );
    camera.position.set(0, 1.3, 1.5);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 2, 1);
    scene.add(directionalLight);

    // VRM 캐릭터 로드
    const controller = new AvatarController();
    avatarRef.current = controller;

    if (vrmPath) {
      try {
        await controller.load(scene, vrmPath);
      } catch (e) {
        console.warn("VRM 로드 실패 - 캐릭터 없이 진행:", e.message);
      }
    }

    // 렌더 루프
    const animate = () => {
      requestAnimationFrame(animate);
      controller.update();
      renderer.render(scene, camera);
    };
    animate();

    // 리사이즈 처리
    const handleResize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [avatarRef, vrmPath]);

  useEffect(() => {
    const cleanup = initScene();
    return () => {
      cleanup?.then?.((fn) => fn?.());
      rendererRef.current?.dispose();
    };
  }, [initScene]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
