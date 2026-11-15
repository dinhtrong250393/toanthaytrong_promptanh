import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  Lightbulb,
  Play,
  RotateCcw,
  Box,
  BookOpen,
} from "lucide-react";
import { LAMP_COORDINATE_SYSTEMS } from "../data/curriculumData";
import { MathTex } from "./MathTex";
import { playLaserSound } from "../utils/sound";

type SimMode = "lamp" | "box";

// Pre-allocated math helpers outside render loop
const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpMid = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

function detectSoftwareGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createTextSprite(
  text: string,
  color = "#F8FAFC",
  bgColor = "rgba(15, 23, 42, 0.88)",
  fontSize = 36
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 512;
  canvas.height = 128;

  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 28;
  const boxW = Math.min(canvas.width - 16, metrics.width + padX * 2);
  const boxH = 68;
  const x = (canvas.width - boxW) / 2;
  const y = (canvas.height - boxH) / 2;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.3, 0.325, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function createGridTexture(
  bgHex: string,
  lineHex: string,
  cells = 8
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);

  const step = size / cells;
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCylinderBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  _tmpDir.subVectors(p2, p1);
  const len = _tmpDir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, Math.max(len, 0.001), 16);
  const mesh = new THREE.Mesh(geo, material);
  _tmpMid.addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(_tmpMid);
  if (len > 0.0001) {
    mesh.quaternion.setFromUnitVectors(_upAxis, _tmpDir.normalize());
  }
  return mesh;
}

function updateCylinderBetween(
  mesh: THREE.Mesh,
  p1: THREE.Vector3,
  p2: THREE.Vector3
) {
  _tmpDir.subVectors(p2, p1);
  const len = _tmpDir.length();
  mesh.scale.set(1, Math.max(len, 0.001), 1);
  _tmpMid.addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(_tmpMid);
  if (len > 0.0001) {
    mesh.quaternion.setFromUnitVectors(_upAxis, _tmpDir.normalize());
  }
}

function createVectorArrowGroup(
  from: THREE.Vector3,
  to: THREE.Vector3,
  colorHex: number,
  shaftRadius = 0.022
): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.4,
  });

  const dir = new THREE.Vector3().subVectors(to, from);
  const totalLen = dir.length();
  if (totalLen < 0.01) return group;
  const headLen = Math.min(0.18, totalLen * 0.25);
  const shaftLen = Math.max(0.01, totalLen - headLen);
  const unit = dir.clone().normalize();

  const shaftEnd = from.clone().addScaledVector(unit, shaftLen);
  const shaft = createCylinderBetween(from, shaftEnd, shaftRadius, mat);
  group.add(shaft);

  const coneGeo = new THREE.ConeGeometry(shaftRadius * 2.4, headLen, 16);
  const cone = new THREE.Mesh(coneGeo, mat);
  cone.position.copy(from).addScaledVector(unit, shaftLen + headLen * 0.5);
  cone.quaternion.setFromUnitVectors(_upAxis, unit);
  group.add(cone);

  return group;
}

export const Tab3DSimulation: React.FC = () => {
  const [simMode, setSimMode] = useState<SimMode>("lamp");
  const [coordSystemId, setCoordSystemId] = useState<1 | 2 | 3>(1);
  const [lampT, setLampT] = useState<number>(0); // 0 = A, 1 = B
  const [isAnimatingLamp, setIsAnimatingLamp] = useState(false);
  const [laserEnabled, setLaserEnabled] = useState(false);

  // Box mode state (Bài 2.26 & 2.37)
  const [showM226, setShowM226] = useState(true);
  const [showG237, setShowG237] = useState(true);
  const [isObliqueBox, setIsObliqueBox] = useState(true);

  // UI HUD states
  const [dockExpanded, setDockExpanded] = useState(true);
  const [showProofDrawer, setShowProofDrawer] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Mutable ref state synced to Three.js without tearing down WebGL
  const sceneStateRef = useRef({
    simMode,
    coordSystemId,
    targetLampT: lampT,
    currentLampT: lampT,
    laserEnabled,
    showM226,
    showG237,
    isObliqueBox,
    cameraTargetGoal: null as THREE.Vector3 | null,
    cameraPosGoal: null as THREE.Vector3 | null,
    dirtySceneRebuild: true,
    dirtyBoxRebuild: true,
  });

  const requestRenderRef = useRef<() => void>(() => {});

  // Sync React states into mutable ref
  useEffect(() => {
    const st = sceneStateRef.current;
    const modeChanged = st.simMode !== simMode;
    st.simMode = simMode;
    st.coordSystemId = coordSystemId;
    st.targetLampT = lampT;
    st.laserEnabled = laserEnabled;
    st.showM226 = showM226;
    st.showG237 = showG237;
    st.isObliqueBox = isObliqueBox;

    if (modeChanged) {
      if (simMode === "lamp") {
        st.cameraPosGoal = new THREE.Vector3(4.3, 3.6, 4.4);
        st.cameraTargetGoal = new THREE.Vector3(1.2, 1.8, 1.3);
      } else {
        st.cameraPosGoal = new THREE.Vector3(3.4, 2.3, 3.8);
        st.cameraTargetGoal = new THREE.Vector3(0.2, 0.0, -0.1);
      }
    }
    st.dirtySceneRebuild = true;
    st.dirtyBoxRebuild = true;
    requestRenderRef.current();
  }, [
    simMode,
    coordSystemId,
    lampT,
    laserEnabled,
    showM226,
    showG237,
    isObliqueBox,
  ]);

  // Animate lamp A -> B toggle
  useEffect(() => {
    if (!isAnimatingLamp) return;
    let raf = 0;
    const start = performance.now();
    const startVal = lampT >= 0.99 ? 0 : lampT;
    const duration = 1400;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // Smooth easeInOutCubic
      const eased =
        p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const nextVal = startVal + (1 - startVal) * eased;
      setLampT(Number(nextVal.toFixed(3)));
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setIsAnimatingLamp(false);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isAnimatingLamp]);

  // Initialize Three.js once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.032);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    camera.position.set(4.3, 3.6, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      handleContextRestored
    );

    // Studio Environment Reflection (mandatory for PBR brass/glass)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-4, 4, -4);
    scene.add(rimLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.0;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.target.set(1.2, 1.8, 1.3);
    controls.update();

    controls.addEventListener("start", () => {
      sceneStateRef.current.cameraPosGoal = null;
      sceneStateRef.current.cameraTargetGoal = null;
    });

    // =========================================================================
    // GROUP 1: LAMP SCENE (Bài 2.42 SGK)
    // =========================================================================
    const lampSceneGroup = new THREE.Group();
    scene.add(lampSceneGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createGridTexture("#1e293b", "#334155", 8);
    floorTex.anisotropy = maxAniso;
    const wallTex = createGridTexture("#162032", "#263449", 8);
    wallTex.anisotropy = maxAniso;

    // Room dimensions: 3.4m x 3.4m, height 3.0m
    const roomSize = 3.4;
    const roomHeight = 3.0;

    // Floor (y = 0)
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.78,
      metalness: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomSize),
      floorMat
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(roomSize / 2, 0, roomSize / 2);
    floorMesh.receiveShadow = true;
    lampSceneGroup.add(floorMesh);

    // Wall 1 (Back wall at z = 0)
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const wallBack = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomHeight),
      wallMat
    );
    wallBack.position.set(roomSize / 2, roomHeight / 2, 0);
    wallBack.receiveShadow = true;
    lampSceneGroup.add(wallBack);

    // Wall 2 (Left wall at x = 0)
    const wallLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomHeight),
      wallMat
    );
    wallLeft.rotation.y = Math.PI / 2;
    wallLeft.position.set(0, roomHeight / 2, roomSize / 2);
    wallLeft.receiveShadow = true;
    lampSceneGroup.add(wallLeft);

    // Semi-transparent Ceiling (y = 3.0) + structural ceiling beams
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ceilingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roomSize, roomSize),
      ceilingMat
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.set(roomSize / 2, roomHeight, roomSize / 2);
    lampSceneGroup.add(ceilingMesh);

    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.5,
    });
    const beamX = new THREE.Mesh(
      new THREE.BoxGeometry(roomSize, 0.06, 0.06),
      beamMat
    );
    beamX.position.set(roomSize / 2, roomHeight, 0);
    const beamZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, roomSize),
      beamMat
    );
    beamZ.position.set(0, roomHeight, roomSize / 2);
    const cornerPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, roomHeight, 0.06),
      beamMat
    );
    cornerPost.position.set(0, roomHeight / 2, 0);
    lampSceneGroup.add(beamX, beamZ, cornerPost);

    // Wall labels
    const wall1Label = createTextSprite(
      "Tường 1 (y = 0)",
      "#94A3B8",
      "rgba(15,23,42,0.8)",
      30
    );
    wall1Label.position.set(2.55, 2.72, 0.08);
    const wall2Label = createTextSprite(
      "Tường 2 (x = 0)",
      "#94A3B8",
      "rgba(15,23,42,0.8)",
      30
    );
    wall2Label.position.set(0.08, 2.72, 2.55);
    const ceilingLabel = createTextSprite(
      "Trần nhà (cao 3,0m)",
      "#CBD5E1",
      "rgba(15,23,42,0.8)",
      30
    );
    ceilingLabel.position.set(2.5, 3.12, 2.5);
    lampSceneGroup.add(wall1Label, wall2Label, ceilingLabel);

    // Coordinate Axes Group (rebuilt per system 1, 2, 3)
    const axesGroup = new THREE.Group();
    lampSceneGroup.add(axesGroup);

    // Point A and B exact 3D world positions
    const posA = new THREE.Vector3(1.2, 2.5, 1.6);
    const posB = new THREE.Vector3(1.5, 2.6, 1.5);

    // Ghost marker at A & target marker at B
    const markerMatA = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.75,
    });
    const markerA = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 20),
      markerMatA
    );
    markerA.position.copy(posA);
    const labelA = createTextSprite("A", "#38BDF8", "rgba(15,23,42,0.92)", 42);
    labelA.scale.set(0.45, 0.22, 1);
    labelA.position.set(posA.x - 0.16, posA.y - 0.18, posA.z);

    const markerMatB = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.75,
    });
    const markerB = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 20),
      markerMatB
    );
    markerB.position.copy(posB);
    const labelB = createTextSprite("B", "#FBBF24", "rgba(15,23,42,0.92)", 42);
    labelB.scale.set(0.45, 0.22, 1);
    labelB.position.set(posB.x + 0.18, posB.y + 0.16, posB.z);

    lampSceneGroup.add(markerA, labelA, markerB, labelB);

    // Composite 6-part Hanging Lamp Model
    const lampAssembly = new THREE.Group();
    lampSceneGroup.add(lampAssembly);

    // Part 1: Ceiling canopy (positioned on ceiling dynamically)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const canopyGroup = new THREE.Group();
    const canopyBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.035, 24),
      canopyMat
    );
    const canopyNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16),
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.9,
        roughness: 0.2,
      })
    );
    canopyNut.position.y = -0.025;
    canopyGroup.add(canopyBase, canopyNut);
    lampSceneGroup.add(canopyGroup);

    // Part 2: Dynamic Suspension Cord (unit height cylinder scaled each frame)
    const cordMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.75,
      metalness: 0.2,
    });
    const cordMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1, 12),
      cordMat
    );
    lampSceneGroup.add(cordMesh);

    // Part 3: Brass Socket Collar (LatheGeometry)
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.18,
    });
    const socketPoints = [
      new THREE.Vector2(0.0, 0.14),
      new THREE.Vector2(0.032, 0.14),
      new THREE.Vector2(0.038, 0.09),
      new THREE.Vector2(0.055, 0.06),
      new THREE.Vector2(0.055, 0.02),
    ];
    const socketMesh = new THREE.Mesh(
      new THREE.LatheGeometry(socketPoints, 24),
      brassMat
    );
    socketMesh.castShadow = true;

    // Part 4: Flared Lampshade (LatheGeometry)
    const shadePoints = [
      new THREE.Vector2(0.055, 0.055),
      new THREE.Vector2(0.11, 0.03),
      new THREE.Vector2(0.17, -0.03),
      new THREE.Vector2(0.19, -0.08),
    ];
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const shadeMesh = new THREE.Mesh(
      new THREE.LatheGeometry(shadePoints, 32),
      shadeMat
    );
    shadeMesh.castShadow = true;

    // Part 5: Bottom Rim Trim
    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.008, 12, 32),
      brassMat
    );
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -0.08;

    // Part 6: Glowing Filament Bulb + PointLight (centered at (0,0,0) of lampAssembly!)
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    });
    const bulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 24, 24),
      bulbMat
    );
    const lampLight = new THREE.PointLight(0xfde68a, 2.2, 6.5, 1.8);
    lampLight.position.set(0, -0.02, 0);

    lampAssembly.add(socketMesh, shadeMesh, rimMesh, bulbMesh, lampLight);

    // Dashed projection lines from lamp center to Wall 1, Wall 2, Ceiling, Floor
    const dashLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.08,
      gapSize: 0.06,
      transparent: true,
      opacity: 0.9,
    });
    const dashFloorMat = new THREE.LineDashedMaterial({
      color: 0x34d399,
      dashSize: 0.08,
      gapSize: 0.06,
      transparent: true,
      opacity: 0.85,
    });

    const projToWallXGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const projToWallX = new THREE.Line(projToWallXGeo, dashLineMat);

    const projToWallZGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const projToWallZ = new THREE.Line(projToWallZGeo, dashLineMat);

    const projToFloorGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const projToFloor = new THREE.Line(projToFloorGeo, dashFloorMat);

    lampSceneGroup.add(projToWallX, projToWallZ, projToFloor);

    // Laser Beam AB group
    const laserGroup = new THREE.Group();
    const laserCoreMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    const laserCore = createCylinderBetween(posA, posB, 0.015, laserCoreMat);
    const laserHaloMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const laserHalo = createCylinderBetween(posA, posB, 0.04, laserHaloMat);
    const laserLabel = createTextSprite(
      "AB = √0,11 ≈ 0,33m",
      "#FDA4AF",
      "rgba(136, 19, 55, 0.9)",
      32
    );
    laserLabel.position.set(1.35, 2.86, 1.55);
    laserGroup.add(laserCore, laserHalo, laserLabel);
    lampSceneGroup.add(laserGroup);

    // Helper to rebuild axes for System 1, 2, or 3
    const rebuildAxes = (sysId: 1 | 2 | 3) => {
      while (axesGroup.children.length > 0) {
        axesGroup.remove(axesGroup.children[0]);
      }

      const originY = sysId === 3 ? 0 : roomHeight;
      const ozSign = sysId === 1 ? -1 : 1;
      const origin = new THREE.Vector3(0, originY, 0);

      // Origin sphere
      const oSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0xf8fafc,
          emissiveIntensity: 0.5,
        })
      );
      oSphere.position.copy(origin);
      axesGroup.add(oSphere);

      const oLabel = createTextSprite("O", "#FFFFFF", "rgba(15,23,42,0.92)", 40);
      oLabel.scale.set(0.45, 0.22, 1);
      oLabel.position.set(-0.18, originY + (sysId === 1 ? 0.16 : -0.15), -0.15);
      axesGroup.add(oLabel);

      // Ox axis (+X_3js)
      const oxEnd = new THREE.Vector3(2.8, originY, 0);
      axesGroup.add(createVectorArrowGroup(origin, oxEnd, 0xf43f5e, 0.02));
      const xLbl = createTextSprite("x", "#FDA4AF", "rgba(15,23,42,0.9)", 40);
      xLbl.scale.set(0.4, 0.2, 1);
      xLbl.position.set(2.92, originY, 0);
      axesGroup.add(xLbl);

      // Oy axis (+Z_3js)
      const oyEnd = new THREE.Vector3(0, originY, 2.8);
      axesGroup.add(createVectorArrowGroup(origin, oyEnd, 0x10b981, 0.02));
      const yLbl = createTextSprite("y", "#6EE7B7", "rgba(15,23,42,0.9)", 40);
      yLbl.scale.set(0.4, 0.2, 1);
      yLbl.position.set(0, originY, 2.92);
      axesGroup.add(yLbl);

      // Oz axis
      const ozLen = sysId === 3 ? 3.2 : 1.65;
      const ozEnd = new THREE.Vector3(0, originY + ozSign * ozLen, 0);
      axesGroup.add(createVectorArrowGroup(origin, ozEnd, 0x38bdf8, 0.02));
      const zLbl = createTextSprite("z", "#7DD3FC", "rgba(15,23,42,0.9)", 40);
      zLbl.scale.set(0.4, 0.2, 1);
      zLbl.position.set(0, originY + ozSign * (ozLen + 0.16), 0);
      axesGroup.add(zLbl);
    };

    // =========================================================================
    // GROUP 2: PARALLELEPIPED SCENE (Bài 2.26 & 2.37 SGK)
    // =========================================================================
    const boxSceneGroup = new THREE.Group();
    scene.add(boxSceneGroup);

    const rebuildBoxScene = (
      oblique: boolean,
      show226: boolean,
      show237: boolean
    ) => {
      while (boxSceneGroup.children.length > 0) {
        boxSceneGroup.remove(boxSceneGroup.children[0]);
      }

      // Ground subtle blueprint grid plane below parallelepiped
      const baseGrid = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
      baseGrid.position.y = -1.15;
      boxSceneGroup.add(baseGrid);

      // Base vertices ABCD
      const A = new THREE.Vector3(-1.1, -0.85, 0.75);
      const B = new THREE.Vector3(0.95, -0.85, 0.75);
      const D = oblique
        ? new THREE.Vector3(-0.55, -0.85, -0.8)
        : new THREE.Vector3(-1.1, -0.85, -0.8);
      const C = new THREE.Vector3().addVectors(B, D).sub(A);

      const shift = oblique
        ? new THREE.Vector3(0.45, 1.75, -0.35)
        : new THREE.Vector3(0, 1.75, 0);
      const Ap = A.clone().add(shift);
      const Bp = B.clone().add(shift);
      const Cp = C.clone().add(shift);
      const Dp = D.clone().add(shift);

      // Parallelepiped translucent faces
      const faceVerts = new Float32Array([
        // Bottom ABCD
        A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z,
        A.x, A.y, A.z, C.x, C.y, C.z, D.x, D.y, D.z,
        // Top A'B'C'D'
        Ap.x, Ap.y, Ap.z, Bp.x, Bp.y, Bp.z, Cp.x, Cp.y, Cp.z,
        Ap.x, Ap.y, Ap.z, Cp.x, Cp.y, Cp.z, Dp.x, Dp.y, Dp.z,
        // Front ABB'A'
        A.x, A.y, A.z, B.x, B.y, B.z, Bp.x, Bp.y, Bp.z,
        A.x, A.y, A.z, Bp.x, Bp.y, Bp.z, Ap.x, Ap.y, Ap.z,
        // Back DCC'D'
        D.x, D.y, D.z, C.x, C.y, C.z, Cp.x, Cp.y, Cp.z,
        D.x, D.y, D.z, Cp.x, Cp.y, Cp.z, Dp.x, Dp.y, Dp.z,
        // Left ADD'A'
        A.x, A.y, A.z, D.x, D.y, D.z, Dp.x, Dp.y, Dp.z,
        A.x, A.y, A.z, Dp.x, Dp.y, Dp.z, Ap.x, Ap.y, Ap.z,
        // Right BCC'B'
        B.x, B.y, B.z, C.x, C.y, C.z, Cp.x, Cp.y, Cp.z,
        B.x, B.y, B.z, Cp.x, Cp.y, Cp.z, Bp.x, Bp.y, Bp.z,
      ]);
      const boxFaceGeo = new THREE.BufferGeometry();
      boxFaceGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(faceVerts, 3)
      );
      boxFaceGeo.computeVertexNormals();
      const boxFaceMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.08,
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      boxSceneGroup.add(new THREE.Mesh(boxFaceGeo, boxFaceMat));

      // Crisp 12 Edges of Parallelepiped
      const edgesPairs: [THREE.Vector3, THREE.Vector3][] = [
        [A, B], [B, C], [C, D], [D, A],
        [Ap, Bp], [Bp, Cp], [Cp, Dp], [Dp, Ap],
        [A, Ap], [B, Bp], [C, Cp], [D, Dp],
      ];
      const edgeMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.5,
        metalness: 0.3,
      });
      edgesPairs.forEach(([p1, p2]) => {
        boxSceneGroup.add(createCylinderBetween(p1, p2, 0.011, edgeMat));
      });

      // Vertices spheres + labels
      const vertexDefs: { pt: THREE.Vector3; label: string; offset: [number, number, number] }[] = [
        { pt: A, label: "A", offset: [-0.18, -0.14, 0.16] },
        { pt: B, label: "B", offset: [0.18, -0.14, 0.16] },
        { pt: C, label: "C", offset: [0.18, -0.14, -0.16] },
        { pt: D, label: "D", offset: [-0.18, -0.14, -0.16] },
        { pt: Ap, label: "A'", offset: [-0.18, 0.18, 0.12] },
        { pt: Bp, label: "B'", offset: [0.18, 0.18, 0.12] },
        { pt: Cp, label: "C'", offset: [0.18, 0.18, -0.14] },
        { pt: Dp, label: "D'", offset: [-0.18, 0.18, -0.14] },
      ];
      const vMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.3,
        metalness: 0.4,
      });
      vertexDefs.forEach(({ pt, label, offset }) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), vMat);
        s.position.copy(pt);
        boxSceneGroup.add(s);

        const sp = createTextSprite(label, "#F8FAFC", "rgba(15,23,42,0.88)", 36);
        sp.scale.set(0.42, 0.21, 1);
        sp.position.set(pt.x + offset[0], pt.y + offset[1], pt.z + offset[2]);
        boxSceneGroup.add(sp);
      });

      // Bài 2.26: Midpoint M of CC' and Vector Decomposition
      if (show226) {
        const M = new THREE.Vector3().addVectors(C, Cp).multiplyScalar(0.5);
        const mMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.7,
        });
        const mSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.068, 24, 24),
          mMat
        );
        mSphere.position.copy(M);
        boxSceneGroup.add(mSphere);

        const mLabel = createTextSprite(
          "M (Trung điểm CC')",
          "#6EE7B7",
          "rgba(6, 78, 59, 0.92)",
          30
        );
        mLabel.scale.set(1.25, 0.3, 1);
        mLabel.position.set(M.x + 0.55, M.y, M.z - 0.1);
        boxSceneGroup.add(mLabel);

        // Vector arrows: AB, AD, 1/2 AA' (from C to M), and resultant AM
        boxSceneGroup.add(createVectorArrowGroup(A, B, 0xf43f5e, 0.018)); // AB
        boxSceneGroup.add(createVectorArrowGroup(A, D, 0x10b981, 0.018)); // AD
        boxSceneGroup.add(createVectorArrowGroup(C, M, 0xf59e0b, 0.018)); // 1/2 CC' = 1/2 AA'
        boxSceneGroup.add(createVectorArrowGroup(A, M, 0x06b6d4, 0.025)); // AM

        // Highlight AC dashed on floor to show AB + AD = AC
        const acGeo = new THREE.BufferGeometry().setFromPoints([A, C]);
        const acLine = new THREE.Line(
          acGeo,
          new THREE.LineDashedMaterial({
            color: 0x94a3b8,
            dashSize: 0.08,
            gapSize: 0.05,
          })
        );
        acLine.computeLineDistances();
        boxSceneGroup.add(acLine);
      }

      // Bài 2.37: Triangle BDA', Centroid G, Diagonal AC' showing AG = 1/3 AC'
      if (show237) {
        const G = new THREE.Vector3()
          .addVectors(B, D)
          .add(Ap)
          .divideScalar(3);

        // Second trisection point K = 2/3 AC' for crystal-clear 3-part visual
        const K = new THREE.Vector3().lerpVectors(A, Cp, 2 / 3);

        // Shaded triangle BDA'
        const triVerts = new Float32Array([
          B.x, B.y, B.z,
          D.x, D.y, D.z,
          Ap.x, Ap.y, Ap.z,
        ]);
        const triGeo = new THREE.BufferGeometry();
        triGeo.setAttribute("position", new THREE.BufferAttribute(triVerts, 3));
        triGeo.computeVertexNormals();
        const triMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.22,
          roughness: 0.4,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        boxSceneGroup.add(new THREE.Mesh(triGeo, triMat));

        // Triangle BDA' edges
        const triEdgeMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          emissive: 0xd97706,
          emissiveIntensity: 0.35,
        });
        boxSceneGroup.add(createCylinderBetween(B, D, 0.015, triEdgeMat));
        boxSceneGroup.add(createCylinderBetween(D, Ap, 0.015, triEdgeMat));
        boxSceneGroup.add(createCylinderBetween(Ap, B, 0.015, triEdgeMat));

        // Medians of BDA' intersecting at G
        const midBD = new THREE.Vector3().addVectors(B, D).multiplyScalar(0.5);
        const midDA = new THREE.Vector3().addVectors(D, Ap).multiplyScalar(0.5);
        const midAB = new THREE.Vector3().addVectors(Ap, B).multiplyScalar(0.5);

        const medMat = new THREE.LineDashedMaterial({
          color: 0xfde68a,
          dashSize: 0.07,
          gapSize: 0.05,
        });
        [
          [Ap, midBD],
          [B, midDA],
          [D, midAB],
        ].forEach(([p1, p2]) => {
          const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const l = new THREE.Line(g, medMat);
          l.computeLineDistances();
          boxSceneGroup.add(l);
        });

        // Space Diagonal AC' (split visually into AG, GK, KC')
        const diagMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.65,
        });
        boxSceneGroup.add(createCylinderBetween(A, Cp, 0.022, diagMat));

        // Centroid G sphere (1/3 AC')
        const gSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.078, 24, 24),
          new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            emissive: 0xe11d48,
            emissiveIntensity: 0.85,
          })
        );
        gSphere.position.copy(G);
        boxSceneGroup.add(gSphere);

        // Trisection tick sphere K (2/3 AC')
        const kSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.048, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.5,
          })
        );
        kSphere.position.copy(K);
        boxSceneGroup.add(kSphere);

        const gLabel = createTextSprite(
          "G (AG = 1/3 AC')",
          "#FDA4AF",
          "rgba(136, 19, 55, 0.92)",
          30
        );
        gLabel.scale.set(1.2, 0.29, 1);
        gLabel.position.set(G.x - 0.55, G.y + 0.25, G.z + 0.15);
        boxSceneGroup.add(gLabel);
      }
    };

    // Pre-compile shaders if hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Coalesced On-Demand & Transition Render Pipeline
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== "function") {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let builtCoordSystemId = -1;

    function syncAndDraw(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const st = sceneStateRef.current;

      lampSceneGroup.visible = st.simMode === "lamp";
      boxSceneGroup.visible = st.simMode === "box";

      if (st.simMode === "lamp") {
        if (builtCoordSystemId !== st.coordSystemId) {
          rebuildAxes(st.coordSystemId);
          builtCoordSystemId = st.coordSystemId;
        }

        // Smoothly damp lamp interpolation
        st.currentLampT = THREE.MathUtils.damp(
          st.currentLampT,
          st.targetLampT,
          10,
          dt
        );
        const curPos = _tmpVecA.lerpVectors(posA, posB, st.currentLampT);
        lampAssembly.position.copy(curPos);

        // Update ceiling canopy and suspension cord
        canopyGroup.position.set(curPos.x, roomHeight - 0.015, curPos.z);
        const cordTop = new THREE.Vector3(curPos.x, roomHeight, curPos.z);
        const cordBottom = new THREE.Vector3(
          curPos.x,
          curPos.y + 0.135,
          curPos.z
        );
        updateCylinderBetween(cordMesh, cordTop, cordBottom);

        // Update dashed projection lines
        const wxPos = projToWallX.geometry.attributes
          .position as THREE.BufferAttribute;
        wxPos.setXYZ(0, curPos.x, curPos.y, curPos.z);
        wxPos.setXYZ(1, 0, curPos.y, curPos.z);
        wxPos.needsUpdate = true;
        projToWallX.computeLineDistances();

        const wzPos = projToWallZ.geometry.attributes
          .position as THREE.BufferAttribute;
        wzPos.setXYZ(0, curPos.x, curPos.y, curPos.z);
        wzPos.setXYZ(1, curPos.x, curPos.y, 0);
        wzPos.needsUpdate = true;
        projToWallZ.computeLineDistances();

        const wfPos = projToFloor.geometry.attributes
          .position as THREE.BufferAttribute;
        wfPos.setXYZ(0, curPos.x, curPos.y, curPos.z);
        wfPos.setXYZ(1, curPos.x, 0, curPos.z);
        wfPos.needsUpdate = true;
        projToFloor.computeLineDistances();
        projToFloor.visible = st.coordSystemId === 3;

        laserGroup.visible = st.laserEnabled;

        if (Math.abs(st.currentLampT - st.targetLampT) > 0.002) {
          renderDirty = true;
        }
      } else if (st.dirtyBoxRebuild) {
        rebuildBoxScene(st.isObliqueBox, st.showM226, st.showG237);
        st.dirtyBoxRebuild = false;
      }

      // Smooth camera preset easing
      if (st.cameraPosGoal && st.cameraTargetGoal) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          st.cameraPosGoal.x,
          6,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          st.cameraPosGoal.y,
          6,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          st.cameraPosGoal.z,
          6,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          st.cameraTargetGoal.x,
          6,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          st.cameraTargetGoal.y,
          6,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          st.cameraTargetGoal.z,
          6,
          dt
        );

        const dist =
          camera.position.distanceTo(st.cameraPosGoal) +
          controls.target.distanceTo(st.cameraTargetGoal);
        if (dist < 0.02) {
          st.cameraPosGoal = null;
          st.cameraTargetGoal = null;
        } else {
          renderDirty = true;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        syncAndDraw(now);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener("change", requestRender);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Initial render
    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.removeEventListener("change", requestRender);
      controls.dispose();
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        handleContextRestored
      );
      envTex.dispose();
      floorTex.dispose();
      wallTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentSystem = useMemo(
    () =>
      LAMP_COORDINATE_SYSTEMS.find((s) => s.id === coordSystemId) ??
      LAMP_COORDINATE_SYSTEMS[0],
    [coordSystemId]
  );

  // Interpolated coordinate display
  const liveCoords = useMemo(() => {
    const [ax, ay, az] = currentSystem.pointA;
    const [bx, by, bz] = currentSystem.pointB;
    const x = ax + (bx - ax) * lampT;
    const y = ay + (by - ay) * lampT;
    const z = az + (bz - az) * lampT;
    return `(${x.toFixed(2).replace(".", ",")}; ${y
      .toFixed(2)
      .replace(".", ",")}; ${z.toFixed(2).replace(".", ",")})`;
  }, [currentSystem, lampT]);

  const handleResetCamera = () => {
    const st = sceneStateRef.current;
    if (simMode === "lamp") {
      st.cameraPosGoal = new THREE.Vector3(4.3, 3.6, 4.4);
      st.cameraTargetGoal = new THREE.Vector3(1.2, 1.8, 1.3);
    } else {
      st.cameraPosGoal = new THREE.Vector3(3.4, 2.3, 3.8);
      st.cameraTargetGoal = new THREE.Vector3(0.2, 0.0, -0.1);
    }
    requestRenderRef.current();
  };

  const handleCameraCollinear = () => {
    const st = sceneStateRef.current;
    st.cameraPosGoal = new THREE.Vector3(2.8, 0.5, 2.9);
    st.cameraTargetGoal = new THREE.Vector3(0.2, 0.0, 0.0);
    requestRenderRef.current();
  };

  const handleTriggerLaser = () => {
    const next = !laserEnabled;
    setLaserEnabled(next);
    if (next) {
      playLaserSound(true);
      setShowProofDrawer(true);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      {/* Main 3D Viewport Container */}
      <div className="relative h-[calc(100vh-120px)] min-h-[580px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] shadow-lg">
        {/* Isolated WebGL Mount Point (Zero React children inside) */}
        <div ref={canvasMountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {/* WebGL Fallback if Context Lost */}
        {contextLost && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <p className="text-base font-semibold">
              Kết nối đồ họa WebGL tạm gián đoạn.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Tải lại mô phỏng 3D
            </button>
          </div>
        )}

        {/* Top-Left Minimal Spec HUD (No backdrop-filter over WebGL) */}
        <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-[85vw] sm:max-w-md">
          <div
            style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}
            className="pointer-events-auto rounded-xl border border-slate-700/80 px-4 py-3 text-slate-100"
          >
            <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold">
              <span>
                {simMode === "lamp"
                  ? "Bài 2.42 SGK · Chiếc đèn treo"
                  : "Bài 2.26 & 2.37 SGK · Hình hộp ABCD.A'B'C'D'"}
              </span>
            </div>
            {simMode === "lamp" ? (
              <div className="mt-1 space-y-0.5 text-xs text-slate-300">
                <div className="font-medium text-white">
                  {currentSystem.shortName}
                </div>
                <div className="font-mono tabular-nums text-sky-300">
                  Vị trí đèn P{liveCoords}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-300">
                Kéo chuột hoặc chạm 1 ngón để xoay, 2 ngón để thu phóng không gian 3D.
              </div>
            )}
          </div>
        </div>

        {/* Top-Right KaTeX Proof Toggle Button */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCamera}
            title="Đặt lại góc nhìn"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700/80 px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Góc nhìn chuẩn</span>
          </button>

          <button
            type="button"
            onClick={() => setShowProofDrawer((v) => !v)}
            style={{
              backgroundColor: showProofDrawer
                ? "#0284C7"
                : "rgba(15, 23, 42, 0.92)",
            }}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700/80 px-3.5 text-xs font-semibold text-white transition-colors hover:opacity-95 cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{showProofDrawer ? "Ẩn lời giải" : "Lời giải KaTeX"}</span>
          </button>
        </div>

        {/* Collapsible KaTeX Proof Panel (Positioned cleanly at top-right below button, compact) */}
        {showProofDrawer && (
          <div
            style={{ backgroundColor: "rgba(15, 23, 42, 0.94)" }}
            className="absolute top-16 right-4 z-10 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-700/80 p-4 text-slate-100 shadow-xl"
          >
            {simMode === "lamp" ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400">
                    Chứng minh bất biến khoảng cách AB
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    Hệ trục ({currentSystem.id})
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="rounded-lg bg-slate-900/90 px-3 py-2 overflow-x-auto">
                    <MathTex tex={currentSystem.coordATex} />
                  </div>
                  <div className="rounded-lg bg-slate-900/90 px-3 py-2 overflow-x-auto">
                    <MathTex tex={currentSystem.coordBTex} />
                  </div>
                  <div className="rounded-lg bg-slate-900/90 px-3 py-2 overflow-x-auto text-sky-300">
                    <MathTex tex={currentSystem.vecABTex} />
                  </div>
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2.5 overflow-x-auto text-rose-200">
                    <MathTex tex={currentSystem.distTex} />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Nhận xét: Dù đổi gốc O (trần sang sàn) hay đổi chiều tia Oz, tọa độ A và B thay đổi nhưng khoảng cách{" "}
                  <strong className="text-white">AB = √0,11 ≈ 0,33m</strong> luôn là đại lượng hình học bất biến!
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="border-b border-slate-800 pb-2 font-bold text-sky-400">
                  Biểu diễn vectơ trong hình hộp
                </div>
                {showM226 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 space-y-1">
                    <div className="font-semibold text-emerald-300">
                      Bài 2.26 · Trung điểm M của CC&apos;
                    </div>
                    <div className="overflow-x-auto text-slate-100">
                      <MathTex tex="\\overrightarrow{AM} = \\overrightarrow{AB} + \\overrightarrow{AD} + \\frac{1}{2}\\overrightarrow{AA'}" />
                    </div>
                  </div>
                )}
                {showG237 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2.5 space-y-1">
                    <div className="font-semibold text-amber-300">
                      Bài 2.37 · Trọng tâm G của ΔBDA&apos;
                    </div>
                    <div className="overflow-x-auto text-slate-100">
                      <MathTex tex="3\\overrightarrow{AG} = \\overrightarrow{AB}+\\overrightarrow{AD}+\\overrightarrow{AA'} = \\overrightarrow{AC'}" />
                    </div>
                    <div className="overflow-x-auto text-rose-200">
                      <MathTex tex="\\implies \\overrightarrow{AG} = \\frac{1}{3}\\overrightarrow{AC'} \\; (A,G,C' \\text{ thẳng hàng})" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center px-3">
          <button
            type="button"
            onClick={() => setDockExpanded((v) => !v)}
            style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}
            className="pointer-events-auto mb-1.5 flex items-center gap-1.5 rounded-lg border border-slate-700/80 px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:text-white cursor-pointer"
          >
            {dockExpanded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Thu gọn bảng điều khiển
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Mở bảng điều khiển
              </>
            )}
          </button>

          {dockExpanded && (
            <div
              style={{ backgroundColor: "rgba(15, 23, 42, 0.94)" }}
              className="pointer-events-auto w-full max-w-[940px] rounded-2xl border border-slate-700/80 p-3.5 text-slate-100 shadow-2xl"
            >
              {/* Top Row of Dock: Mode Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1 rounded-lg bg-slate-800/90 p-1">
                  <button
                    type="button"
                    onClick={() => setSimMode("lamp")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      simMode === "lamp"
                        ? "bg-sky-600 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    Chế độ 1: Chiếc đèn treo (2.42)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimMode("box")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      simMode === "box"
                        ? "bg-sky-600 text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    Chế độ 2: Hình hộp (2.26 &amp; 2.37)
                  </button>
                </div>

                {simMode === "lamp" ? (
                  <button
                    type="button"
                    onClick={handleTriggerLaser}
                    className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      laserEnabled
                        ? "bg-rose-600 text-white"
                        : "border border-rose-500/50 bg-rose-950/50 text-rose-200 hover:bg-rose-900/60"
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    {laserEnabled
                      ? "Tắt tia Laser AB"
                      : "Bắn tia Laser đo khoảng cách AB"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCameraCollinear}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/50 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Góc nhìn A, G, C&apos; thẳng hàng
                  </button>
                )}
              </div>

              {/* Bottom Row of Dock: Mode Controls */}
              {simMode === "lamp" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                  {/* 3 Coordinate System Buttons */}
                  <div className="md:col-span-7 flex flex-wrap gap-1.5">
                    {LAMP_COORDINATE_SYSTEMS.map((sys) => {
                      const active = sys.id === coordSystemId;
                      return (
                        <button
                          key={sys.id}
                          type="button"
                          onClick={() => setCoordSystemId(sys.id)}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer ${
                            active
                              ? "border-sky-400 bg-sky-950/80 text-sky-100"
                              : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-white"
                          }`}
                        >
                          <span className="font-bold">Hệ ({sys.id}):</span>{" "}
                          {sys.id === 1
                            ? "O góc trần, Oz ↓"
                            : sys.id === 2
                            ? "O góc trần, Oz ↑"
                            : "O góc sàn (3m), Oz ↑"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lamp A -> B Slider + Move Button */}
                  <div className="md:col-span-5 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (lampT >= 0.99) setLampT(0);
                        setIsAnimatingLamp(true);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Di chuyển đèn A → B
                    </button>

                    <div className="flex flex-1 items-center gap-2 min-w-[140px]">
                      <span className="font-mono text-xs font-bold text-sky-300">
                        A
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={lampT}
                        onChange={(e) => {
                          setIsAnimatingLamp(false);
                          setLampT(parseFloat(e.target.value));
                        }}
                        aria-label="Vị trí đèn từ A sang B"
                        className="h-2 w-full cursor-pointer accent-amber-400"
                      />
                      <span className="font-mono text-xs font-bold text-amber-300">
                        B
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowM226((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        showM226
                          ? "border-emerald-400 bg-emerald-950/70 text-emerald-100"
                          : "border-slate-700 bg-slate-900/60 text-slate-400"
                      }`}
                    >
                      {showM226 ? (
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      Bài 2.26: Trung điểm M của CC&apos;
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowG237((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        showG237
                          ? "border-amber-400 bg-amber-950/70 text-amber-100"
                          : "border-slate-700 bg-slate-900/60 text-slate-400"
                      }`}
                    >
                      {showG237 ? (
                        <Eye className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      Bài 2.37: Trọng tâm G (ΔBDA&apos;) &amp; AC&apos;
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsObliqueBox((v) => !v)}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
                  >
                    Dạng hình: {isObliqueBox ? "Hình hộp xiên (tổng quát)" : "Hình hộp chữ nhật"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
