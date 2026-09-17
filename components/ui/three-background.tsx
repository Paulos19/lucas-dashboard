'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';

export function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDarkRef = useRef(true);

  useEffect(() => {
    isDarkRef.current = resolvedTheme === 'dark';
  }, [resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Verificar se usuário prefere redução de movimento
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 45;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Dynamic Geometry: Ambient floating particle field + undulating mesh grid
    const planeGeo = new THREE.PlaneGeometry(120, 90, 48, 36);
    
    // Armazenar posições originais para deformação senoidal
    const posAttribute = planeGeo.attributes.position;
    const originalPositions = new Float32Array(posAttribute.array);

    // Shader Material or Wireframe with glowing points
    const planeMat = new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: isDarkRef.current ? 0.07 : 0.04,
      color: isDarkRef.current ? 0x3b82f6 : 0x2563eb,
    });

    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = -Math.PI / 3.5;
    mesh.position.y = -10;
    scene.add(mesh);

    // Floating Ambient Particles (Luzes estelares/orbes de IA suaves)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 110;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      particleSpeeds[i] = 0.2 + Math.random() * 0.4;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    // Particle Texture Canvas (Circle Glow)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(96, 165, 250, 1)');
      grad.addColorStop(0.4, 'rgba(59, 130, 246, 0.4)');
      grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: 3.5,
      map: particleTexture,
      transparent: true,
      opacity: isDarkRef.current ? 0.45 : 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Parallax
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 4;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 3;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Não consumir recursos quando a janela estiver oculta
      if (document.hidden) return;

      const elapsedTime = clock.getElapsedTime();

      // Suavizar movimento do mouse (Lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      mesh.rotation.z = currentMouseX * 0.05;
      mesh.rotation.y = currentMouseY * 0.03;

      // Atualizar cores e opacidades dependendo do tema atual
      const isDark = isDarkRef.current;
      planeMat.color.setHex(isDark ? 0x3b82f6 : 0x2563eb);
      planeMat.opacity = isDark ? 0.08 : 0.035;
      particleMat.opacity = isDark ? 0.5 : 0.22;

      // Ondulação suave nos vértices do plano
      if (!prefersReducedMotion) {
        const positions = planeGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          const u = originalPositions[i];
          const v = originalPositions[i + 1];
          // Onda combinada harmônica
          const wave = Math.sin(u * 0.08 + elapsedTime * 0.6) * 
                       Math.cos(v * 0.08 + elapsedTime * 0.4) * 2.5;
          positions[i + 2] = wave;
        }
        planeGeo.attributes.position.needsUpdate = true;

        // Partículas flutuando suavemente
        const pArr = particleGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pArr[i * 3 + 1] += Math.sin(elapsedTime * particleSpeeds[i] + i) * 0.02;
        }
        particleGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      planeGeo.dispose();
      planeMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden transition-opacity duration-700" 
      aria-hidden="true"
    />
  );
}
