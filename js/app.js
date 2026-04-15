/* ═══════════════════════════════════════════════════════
   THE ENCHANTED FOREST — Main Application
   Three.js + GSAP ScrollTrigger + Lenis Smooth Scroll
   Spring Physics + Parallax + Image Reveal
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─── Spring Physics Engine ─── */
    class SpringAnimation {
        constructor({ stiffness = 100, damping = 10, mass = 1 } = {}) {
            this.stiffness = stiffness;
            this.damping = damping;
            this.mass = mass;
        }

        /* Generate a GSAP-compatible ease string using CustomEase-like cubic bezier.
           These are hand-tuned to feel "soft + slight bounce". */
        static get softBounce() {
            return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
        }

        static get smooth() {
            return 'cubic-bezier(0.22, 1, 0.36, 1)';
        }

        static get gentle() {
            return 'cubic-bezier(0.25, 0.8, 0.25, 1.05)';
        }

        /* Simulate spring for a value — returns an array of keyframes */
        simulate(from, to, duration = 1, fps = 60) {
            const frames = [];
            const totalFrames = duration * fps;
            let velocity = 0;
            let position = from;
            const dt = 1 / fps;

            for (let i = 0; i <= totalFrames; i++) {
                const springForce = -this.stiffness * (position - to);
                const dampingForce = -this.damping * velocity;
                const acceleration = (springForce + dampingForce) / this.mass;

                velocity += acceleration * dt;
                position += velocity * dt;
                frames.push(position);
            }

            return frames;
        }
    }

    /* ═══════════════════════════════════════════════════════
       1. LENIS SMOOTH SCROLL
       ═══════════════════════════════════════════════════════ */
    const lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
    });

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    /* ═══════════════════════════════════════════════════════
       2. THREE.JS — Particle Field Background
       ═══════════════════════════════════════════════════════ */
    const threeContainer = document.getElementById('three-canvas-container');
    let scene, camera, renderer, particles, particleGeometry;
    let mouseX = 0, mouseY = 0;
    let scrollProgress = 0;

    function initThree() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 50;

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        threeContainer.appendChild(renderer.domElement);

        createParticles();
        createFireflies();

        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('mousemove', onMouseMove, false);
    }

    function createParticles() {
        const count = 1200;
        particleGeometry = new THREE.BufferGeometry();

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const colorPalette = [
            new THREE.Color(0xc9a84c),  // Gold
            new THREE.Color(0x7fb98a),  // Soft green
            new THREE.Color(0x1a6e3e),  // Emerald
            new THREE.Color(0xe8d48b),  // Light gold
        ];

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 120;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i * 3]     = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 0.5;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        particles = new THREE.Points(particleGeometry, material);
        scene.add(particles);
    }

    /* Fireflies — larger glowing particles */
    let fireflies;
    const fireflyCount = 40;
    const fireflyData = [];

    function createFireflies() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(fireflyCount * 3);
        const colors = new Float32Array(fireflyCount * 3);

        const fireflyColor = new THREE.Color(0xc9a84c);

        for (let i = 0; i < fireflyCount; i++) {
            const x = (Math.random() - 0.5) * 80;
            const y = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 40;

            positions[i * 3]     = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            colors[i * 3]     = fireflyColor.r;
            colors[i * 3 + 1] = fireflyColor.g;
            colors[i * 3 + 2] = fireflyColor.b;

            fireflyData.push({
                baseX: x, baseY: y, baseZ: z,
                speed: Math.random() * 0.5 + 0.2,
                amplitude: Math.random() * 3 + 1,
                phase: Math.random() * Math.PI * 2,
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        fireflies = new THREE.Points(geometry, material);
        scene.add(fireflies);
    }

    function onMouseMove(e) {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animateThree(time) {
        requestAnimationFrame(animateThree);

        const t = time * 0.001;

        // Rotate particle field slowly
        if (particles) {
            particles.rotation.y = t * 0.03 + mouseX * 0.05;
            particles.rotation.x = Math.sin(t * 0.02) * 0.1 + mouseY * 0.03;
            // Scroll-driven z movement
            particles.position.z = -scrollProgress * 30;
            particles.material.opacity = 0.2 + Math.sin(t * 0.5) * 0.08;
        }

        // Animate fireflies
        if (fireflies) {
            const positions = fireflies.geometry.attributes.position.array;
            for (let i = 0; i < fireflyCount; i++) {
                const fd = fireflyData[i];
                positions[i * 3]     = fd.baseX + Math.sin(t * fd.speed + fd.phase) * fd.amplitude;
                positions[i * 3 + 1] = fd.baseY + Math.cos(t * fd.speed * 0.7 + fd.phase) * fd.amplitude * 0.6;
                positions[i * 3 + 2] = fd.baseZ + Math.sin(t * fd.speed * 0.5) * fd.amplitude * 0.3;
            }
            fireflies.geometry.attributes.position.needsUpdate = true;

            fireflies.material.opacity = 0.4 + Math.sin(t * 1.5) * 0.2;
            fireflies.rotation.y = t * 0.01;
        }

        // Camera subtle sway
        camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    /* ═══════════════════════════════════════════════════════
       3. GSAP SCROLL TRIGGER — Animations
       ═══════════════════════════════════════════════════════ */
    function initScrollAnimations() {

        /* ─── Scroll Progress Bar ─── */
        gsap.to('#scroll-progress-bar', {
            width: '100%',
            ease: 'none',
            scrollTrigger: {
                trigger: 'body',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3,
                onUpdate: (self) => {
                    scrollProgress = self.progress;
                },
            },
        });

        /* ─── Nav Dots — Active State ─── */
        const sections = document.querySelectorAll('.story-section');
        const navDots = document.querySelectorAll('.nav-dot');

        sections.forEach((section, index) => {
            ScrollTrigger.create({
                trigger: section,
                start: 'top center',
                end: 'bottom center',
                onEnter: () => setActiveDot(index),
                onEnterBack: () => setActiveDot(index),
            });
        });

        function setActiveDot(index) {
            navDots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }

        // Nav dot click → scroll to section
        navDots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const targetIndex = parseInt(dot.dataset.section);
                lenis.scrollTo(sections[targetIndex], { offset: 0, duration: 2 });
            });
        });

        /* ─── Hero — Entrance Stagger ─── */
        const heroItems = document.querySelectorAll('#hero .stagger-item');
        const heroTl = gsap.timeline({ delay: 0.3 });

        heroItems.forEach((item, i) => {
            const delay = parseInt(item.dataset.delay) * 0.18;
            heroTl.to(item, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1.2,
                ease: SpringAnimation.softBounce,
            }, delay);
        });

        /* ─── Stagger Items — ScrollTrigger Spring ─── */
        document.querySelectorAll('.chapter-section').forEach((section) => {
            const staggerItems = section.querySelectorAll('.stagger-item');

            staggerItems.forEach((item) => {
                const delay = parseInt(item.dataset.delay) * 0.15;

                gsap.to(item, {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    scale: 1,
                    rotation: 0,
                    duration: 1.3,
                    delay: delay,
                    ease: SpringAnimation.softBounce,
                    scrollTrigger: {
                        trigger: item,
                        start: 'top 85%',
                        end: 'top 40%',
                        toggleActions: 'play none none reverse',
                    },
                });
            });
        });

        /* ─── Image Reveal — Clip-path Mask ─── */
        document.querySelectorAll('.image-reveal').forEach((reveal) => {
            const mask = reveal.querySelector('.image-reveal-mask');

            gsap.to(mask, {
                clipPath: 'inset(0% 0 0 0)',
                duration: 1.5,
                ease: SpringAnimation.smooth,
                scrollTrigger: {
                    trigger: reveal,
                    start: 'top 80%',
                    end: 'top 30%',
                    toggleActions: 'play none none reverse',
                    onEnter: () => {
                        mask.classList.add('revealed');
                        reveal.classList.add('shine');
                    },
                    onLeaveBack: () => {
                        mask.classList.remove('revealed');
                        reveal.classList.remove('shine');
                    },
                },
            });
        });

        /* ─── Cinematic Image — Scale Zoom Out ─── */
        document.querySelectorAll('.cinematic-image').forEach((cineImg) => {
            const img = cineImg.querySelector('img');

            gsap.to(img, {
                scale: 1,
                duration: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: cineImg,
                    start: 'top 90%',
                    end: 'bottom 20%',
                    scrub: 1.2,
                },
            });
        });

        /* ─── Parallax Layers ─── */
        document.querySelectorAll('.parallax-layer').forEach((layer) => {
            const speed = parseFloat(layer.dataset.speed) || 0.1;

            gsap.to(layer, {
                y: () => speed * 200,
                ease: 'none',
                scrollTrigger: {
                    trigger: layer,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1,
                },
            });
        });

        /* ─── Gallery Horizontal Scroll ─── */
        const galleryTrack = document.getElementById('gallery-track');
        if (galleryTrack) {
            const totalScrollWidth = galleryTrack.scrollWidth - galleryTrack.parentElement.offsetWidth;

            gsap.to(galleryTrack, {
                x: -totalScrollWidth,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.gallery-section',
                    start: 'top 60%',
                    end: `+=${totalScrollWidth}`,
                    scrub: 1.5,
                    pin: false,
                },
            });
        }

        /* ─── Finale Stagger ─── */
        const finaleItems = document.querySelectorAll('#finale .stagger-item');

        finaleItems.forEach((item) => {
            const delay = parseInt(item.dataset.delay) * 0.2;

            gsap.to(item, {
                opacity: 1,
                y: 0,
                scale: 1,
                rotation: 0,
                duration: 1.4,
                delay: delay,
                ease: SpringAnimation.softBounce,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse',
                },
            });
        });

        /* ─── Restart Button ─── */
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                lenis.scrollTo(0, { duration: 3 });
            });
        }
    }

    /* ═══════════════════════════════════════════════════════
       4. HOVER SPRING EFFECTS
       ═══════════════════════════════════════════════════════ */
    function initHoverEffects() {
        /* Spring hover on story cards */
        document.querySelectorAll('.story-card').forEach((card) => {
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    y: -6,
                    scale: 1.02,
                    duration: 0.6,
                    ease: SpringAnimation.softBounce,
                    overwrite: 'auto',
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    ease: SpringAnimation.gentle,
                    overwrite: 'auto',
                });
            });
        });

        /* Magnetic effect on CTA button */
        const ctaBtn = document.querySelector('.cta-button');
        if (ctaBtn) {
            ctaBtn.addEventListener('mousemove', (e) => {
                const rect = ctaBtn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                gsap.to(ctaBtn, {
                    x: x * 0.15,
                    y: y * 0.15,
                    duration: 0.4,
                    ease: SpringAnimation.gentle,
                });
            });

            ctaBtn.addEventListener('mouseleave', () => {
                gsap.to(ctaBtn, {
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: SpringAnimation.softBounce,
                });
            });
        }
    }

    /* ═══════════════════════════════════════════════════════
       5. CURSOR GLOW TRAIL
       ═══════════════════════════════════════════════════════ */
    function initCursorGlow() {
        const glow = document.createElement('div');
        glow.id = 'cursor-glow';
        Object.assign(glow.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: '0',
            transform: 'translate(-50%, -50%)',
            transition: 'none',
        });
        document.body.appendChild(glow);

        let glowX = 0, glowY = 0;
        let targetX = 0, targetY = 0;

        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
        });

        function updateGlow() {
            // Spring-like interpolation
            glowX += (targetX - glowX) * 0.08;
            glowY += (targetY - glowY) * 0.08;
            glow.style.transform = `translate(${glowX - 150}px, ${glowY - 150}px)`;
            requestAnimationFrame(updateGlow);
        }

        updateGlow();
    }

    /* ═══════════════════════════════════════════════════════
       6. INITIALIZE EVERYTHING
       ═══════════════════════════════════════════════════════ */
    function init() {
        initThree();
        animateThree(0);
        initScrollAnimations();
        initHoverEffects();
        initCursorGlow();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
