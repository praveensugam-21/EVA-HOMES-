import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

const INK = "#101114";

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The search card sits centered, ~max-w-3xl (768px) wide — roughly ±2.6
// world units at this camera's distance/fov. Every house is kept outside
// that zone (with margin) so the card never hides them.
function House({ position, scale = 1, spinSpeed = 0.15, roofColor, bodyColor }) {
  const groupRef = useRef();
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(1, 0.7, 1), []);
  const roofGeo = useMemo(() => new THREE.ConeGeometry(0.85, 0.6, 4), []);

  // Each house spins gently in place — position never changes, so it can
  // never drift back under the card the way rotating the whole cluster
  // around the origin would.
  useFrame((_, delta) => {
    if (!groupRef.current || prefersReducedMotion) return;
    groupRef.current.rotation.y += delta * spinSpeed;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* soft grounding shadow so the house doesn't look like it's floating */}
      <mesh position={[0, -0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.12} />
      </mesh>

      <mesh position={[0, 0.35, 0]} geometry={bodyGeo}>
        <meshStandardMaterial color={bodyColor} roughness={0.6} />
      </mesh>
      <lineSegments position={[0, 0.35, 0]}>
        <edgesGeometry args={[bodyGeo]} />
        <lineBasicMaterial color={INK} />
      </lineSegments>

      {/* door */}
      <mesh position={[0, 0.12, 0.502]}>
        <planeGeometry args={[0.28, 0.44]} />
        <meshStandardMaterial color="#5b3a29" />
      </mesh>
      {/* windows */}
      <mesh position={[-0.32, 0.46, 0.502]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#bfe3f2" />
      </mesh>
      <mesh position={[0.32, 0.46, 0.502]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#bfe3f2" />
      </mesh>

      <mesh position={[0, 1, 0]} rotation={[0, Math.PI / 4, 0]} geometry={roofGeo}>
        <meshStandardMaterial color={roofColor} roughness={0.5} />
      </mesh>
      <lineSegments position={[0, 1, 0]} rotation={[0, Math.PI / 4, 0]}>
        <edgesGeometry args={[roofGeo]} />
        <lineBasicMaterial color={INK} />
      </lineSegments>
    </group>
  );
}

function Cloud({ position, scale = 1 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || prefersReducedMotion) return;
    ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 0.08 + position[1]) * 0.4;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.42, 0.08, 0]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.4, 0.05, 0]}>
        <sphereGeometry args={[0.26, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function MagnifyingGlass() {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current || prefersReducedMotion) return;
    const t = clock.getElapsedTime() * 0.6;
    // This runs in its own tiny canvas anchored via CSS right next to the
    // heading (see SearchGlyph + Hero.jsx), so "close to the text" is a
    // DOM/CSS offset, not something guessed at in world-space coordinates.
    ref.current.position.x = Math.sin(t) * 0.1;
    ref.current.position.y = Math.sin(t * 1.3) * 0.08;
    ref.current.rotation.z = 0.25 + Math.sin(t * 0.7) * 0.1;
  });

  return (
    <group ref={ref} rotation={[0.35, 0, 0.25]}>
      <mesh>
        <torusGeometry args={[0.62, 0.11, 20, 56]} />
        <meshStandardMaterial color={INK} metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[0.5, -0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.11, 0.11, 0.9, 16]} />
        <meshStandardMaterial color={INK} metalness={0.3} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={0.7} />

      {/* Left cluster — clear of the card's left edge */}
      <House position={[-5.7, -0.3, -0.4]} scale={0.9} spinSpeed={0.12} roofColor="#e0665a" bodyColor="#faf6f0" />
      <House position={[-4.0, -0.55, 0.5]} scale={0.68} spinSpeed={0.18} roofColor="#4f7fbf" bodyColor="#fdfdfb" />

      {/* Right cluster — clear of the card's right edge */}
      <House position={[4.2, -0.4, 0.3]} scale={0.8} spinSpeed={0.15} roofColor="#e8b23d" bodyColor="#fdfdfb" />
      <House position={[6.0, -0.25, -0.5]} scale={1} spinSpeed={0.1} roofColor="#5cae6f" bodyColor="#faf6f0" />

      {/* Clouds sit well clear of the fixed header's band (h-16, z-50) so
          they're never rendered behind/blurred by it — kept lower and closer
          to the houses' horizontal spread instead of hugging the very top. */}
      <Cloud position={[-5.6, 2.1, -1]} scale={1.1} />
      <Cloud position={[5.8, 2.3, -1]} scale={1.3} />
    </>
  );
}

/**
 * Purely decorative — colorful low-poly houses (with door/windows for
 * character) flanking both sides of the hero search card, grounded with
 * soft shadows, plus drifting clouds kept clear of the fixed header's band.
 * pointer-events-none in the parent keeps it from ever intercepting clicks;
 * prefers-reduced-motion freezes all motion, and it's hidden entirely below
 * the lg breakpoint (see Hero.jsx) since there's no side margin left for it
 * on narrow screens.
 */
export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 1.4, 8.5], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <Scene />
    </Canvas>
  );
}

/**
 * A small standalone canvas holding just the magnifying glass, meant to be
 * placed via CSS right next to a heading (see Hero.jsx) — positioning it
 * this way means "how close to the text" is a simple, reliable CSS offset
 * instead of fragile world-space math against the full hero scene.
 */
export function SearchGlyph() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 3.4], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 3]} intensity={0.6} />
      <MagnifyingGlass />
    </Canvas>
  );
}
