/* ═══════════════════════════════════════════════════════
   MLN111 STORY SCROLL — Main Application
   Three.js · GSAP ScrollTrigger · Lenis · Spring Physics
   ═══════════════════════════════════════════════════════ */
;(function () {
    'use strict';

    /* ─────────────────────────────────────────
       SPRING EASING PRESETS
       ───────────────────────────────────────── */
    const Spring = {
        // Soft bounce — main animation feel
        bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
        // Smooth deceleration
        smooth:  'cubic-bezier(0.22, 1.0, 0.36, 1)',
        // Gentle overshoot
        gentle:  'cubic-bezier(0.25, 0.46, 0.45, 1.04)',
        // Power3 out — for scrubs
        power3:  'power3.out',
    };

    // Custom GSAP ease that simulates spring with slight bounce
    // Using a CustomEase-like function
    function springEase(t) {
        const c4 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1
            : Math.pow(2, -12 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    /* ═══════════════════════════════════════════════════════
       1. FULLPAGE SCROLL SETUP
       No Lenis — we control all scrolling via GSAP
       ═══════════════════════════════════════════════════════ */
    let fpCurrentIndex = 0;
    let fpIsAnimating = false;
    const FP_DURATION = 1.0;  // seconds for scroll animation
    const FP_COOLDOWN = 800;  // ms total lockout between scrolls

    function fpGetSections() {
        return document.querySelectorAll('.section');
    }

    function fpGoTo(index) {
        const sections = fpGetSections();
        if (index < 0 || index >= sections.length || fpIsAnimating) return;
        fpIsAnimating = true;
        fpCurrentIndex = index;

        const target = sections[index].offsetTop;

        gsap.to(window, {
            scrollTo: { y: target, autoKill: false },
            duration: FP_DURATION,
            ease: 'power3.inOut',
            onComplete: function() {
                setTimeout(function() { fpIsAnimating = false; }, FP_COOLDOWN - FP_DURATION * 1000);
            },
        });
    }

    // Block ALL native scrolling
    window.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (fpIsAnimating) return;
        if (e.deltaY > 0) fpGoTo(fpCurrentIndex + 1);
        else if (e.deltaY < 0) fpGoTo(fpCurrentIndex - 1);
    }, { passive: false, capture: true });

    // Touch support
    let fpTouchY = 0;
    window.addEventListener('touchstart', function(e) {
        fpTouchY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', function(e) {
        if (fpIsAnimating) return;
        var diff = fpTouchY - e.changedTouches[0].clientY;
        if (diff > 40) fpGoTo(fpCurrentIndex + 1);
        else if (diff < -40) fpGoTo(fpCurrentIndex - 1);
    }, { passive: true });

    // Keyboard
    window.addEventListener('keydown', function(e) {
        if (fpIsAnimating) return;
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault(); fpGoTo(fpCurrentIndex + 1);
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault(); fpGoTo(fpCurrentIndex - 1);
        } else if (e.key === 'Home') {
            e.preventDefault(); fpGoTo(0);
        } else if (e.key === 'End') {
            e.preventDefault(); fpGoTo(fpGetSections().length - 1);
        }
    });

    // Detect starting section
    (function() {
        var sections = fpGetSections();
        var st = window.scrollY;
        for (var i = sections.length - 1; i >= 0; i--) {
            if (st >= sections[i].offsetTop - 50) { fpCurrentIndex = i; break; }
        }
    })();

    /* ═══════════════════════════════════════════════════════
       2. THREE.JS — Floating Particles Background
       ═══════════════════════════════════════════════════════ */
    const canvas = document.getElementById('three-canvas');
    let scene, camera, renderer;
    let particleSystem, dustSystem;
    let mouseX = 0, mouseY = 0;
    let scrollY = 0;

    function initThree() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.z = 60;

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        createParticles();
        createDust();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        });
    }

    /* Ambient particles — gold dust */
    function createParticles() {
        const count = 800;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const cols = new Float32Array(count * 3);

        const palette = [
            new THREE.Color(0xc4a35a),
            new THREE.Color(0xddc88e),
            new THREE.Color(0x8c7a48),
            new THREE.Color(0xe8e2d6),
        ];

        for (let i = 0; i < count; i++) {
            pos[i * 3]     = (Math.random() - 0.5) * 140;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 140;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 80;

            const c = palette[Math.floor(Math.random() * palette.length)];
            cols[i * 3]     = c.r;
            cols[i * 3 + 1] = c.g;
            cols[i * 3 + 2] = c.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        particleSystem = new THREE.Points(geo, mat);
        scene.add(particleSystem);
    }

    /* Floating dust motes — larger, fewer, dreamy */
    const dustData = [];
    function createDust() {
        const count = 30;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const col = new THREE.Color(0xc4a35a);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 30;
            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            dustData.push({
                bx: x, by: y, bz: z,
                speed: Math.random() * 0.3 + 0.1,
                amp: Math.random() * 4 + 1,
                phase: Math.random() * Math.PI * 2,
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

        const mat = new THREE.PointsMaterial({
            size: 3.5,
            color: col,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        dustSystem = new THREE.Points(geo, mat);
        scene.add(dustSystem);
    }

    function animateThree(time) {
        requestAnimationFrame(animateThree);
        const t = time * 0.001;

        if (particleSystem) {
            particleSystem.rotation.y = t * 0.015 + mouseX * 0.03;
            particleSystem.rotation.x = Math.sin(t * 0.01) * 0.05 + mouseY * 0.015;
            particleSystem.position.y = scrollY * 0.05;
            particleSystem.material.opacity = 0.12 + Math.sin(t * 0.3) * 0.04;
        }

        if (dustSystem) {
            const positions = dustSystem.geometry.attributes.position.array;
            for (let i = 0; i < dustData.length; i++) {
                const d = dustData[i];
                positions[i * 3]     = d.bx + Math.sin(t * d.speed + d.phase) * d.amp;
                positions[i * 3 + 1] = d.by + Math.cos(t * d.speed * 0.6 + d.phase) * d.amp * 0.5;
                positions[i * 3 + 2] = d.bz + Math.sin(t * d.speed * 0.3) * d.amp * 0.2;
            }
            dustSystem.geometry.attributes.position.needsUpdate = true;
            dustSystem.material.opacity = 0.25 + Math.sin(t * 0.8) * 0.1;
        }

        // Camera drift
        camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.015;
        camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.015;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    /* ═══════════════════════════════════════════════════════
       3. GSAP SCROLL ANIMATIONS
       ═══════════════════════════════════════════════════════ */
    function initAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        /* ─── Scroll Progress Bar ─── */
        gsap.to('#scroll-bar', {
            width: '100%',
            ease: 'none',
            scrollTrigger: {
                trigger: 'body',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.2,
                onUpdate: (self) => { scrollY = self.progress * 100; }
            },
        });

        /* ─── Nav Dots Active State ─── */
        const allSections = document.querySelectorAll('.section');
        const navDots = document.querySelectorAll('.nav-dot');

        allSections.forEach((sec, i) => {
            ScrollTrigger.create({
                trigger: sec,
                start: 'top 50%',
                end: 'bottom 50%',
                onEnter: () => activateDot(i),
                onEnterBack: () => activateDot(i),
            });
        });

        function activateDot(idx) {
            navDots.forEach((d, i) => d.classList.toggle('active', i === idx));
        }

        navDots.forEach((dot) => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.dataset.index);
                fpGoTo(idx);
            });
        });

        /* ─── HERO Entrance — Stagger Spring ─── */
        const heroItems = document.querySelectorAll('.section--hero .anim-item');
        const heroTl = gsap.timeline({ delay: 0.4 });

        heroItems.forEach((item) => {
            const d = parseInt(item.dataset.delay) * 0.2;
            heroTl.to(item, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1.4,
                ease: Spring.bounce,
            }, d);
        });

        /* ─── IMAGE REVEAL — Clip-path Mask ─── */
        document.querySelectorAll('.image-reveal-mask').forEach((mask) => {
            const wrap = mask.closest('.story__image-wrap') || mask.closest('.finale__bg');

            ScrollTrigger.create({
                trigger: mask.closest('.section'),
                start: 'top 80%',
                end: 'top 20%',
                onEnter: () => {
                    // Animate clip-path reveal
                    gsap.to(mask, {
                        clipPath: 'inset(0 0 0% 0)',
                        duration: 1.6,
                        ease: Spring.smooth,
                        onComplete: () => {
                            mask.classList.add('revealed');
                            if (wrap) wrap.classList.add('shine');
                        }
                    });
                },
                onLeaveBack: () => {
                    gsap.to(mask, {
                        clipPath: 'inset(0 0 100% 0)',
                        duration: 0.8,
                        ease: 'power2.inOut',
                        onComplete: () => {
                            mask.classList.remove('revealed');
                            if (wrap) wrap.classList.remove('shine');
                        }
                    });
                },
            });
        });

        /* ─── CAPTION STAGGER — Spring entrance ─── */
        document.querySelectorAll('.section--story, .section--finale').forEach((section) => {
            const items = section.querySelectorAll('.anim-item');

            items.forEach((item) => {
                const delay = parseInt(item.dataset.delay) * 0.18;
                const xStart = item.classList.contains('caption__desc') ? 0 : 0;
                const yStart = parseFloat(getComputedStyle(item).transform.split(',')[5]) || 40;

                gsap.fromTo(item,
                    {
                        opacity: 0,
                        y: yStart,
                        scale: item.dataset.delay === '0' && item.classList.contains('finale__ornament')
                            ? 0.4 : 1,
                        rotation: item.classList.contains('finale__ornament') ? -180 : 0,
                    },
                    {
                        opacity: item.classList.contains('caption__index') ? 0.15 : 1,
                        y: 0,
                        scale: 1,
                        rotation: 0,
                        duration: 1.5,
                        delay: delay,
                        ease: Spring.bounce,
                        scrollTrigger: {
                            trigger: item,
                            start: 'top 88%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                );
            });

            // Special: divider scaleX
            const dividers = section.querySelectorAll('.caption__divider, .finale__divider');
            dividers.forEach((div) => {
                gsap.fromTo(div,
                    { scaleX: 0, opacity: 0 },
                    {
                        scaleX: 1,
                        opacity: 1,
                        duration: 1.2,
                        ease: Spring.smooth,
                        scrollTrigger: {
                            trigger: div,
                            start: 'top 88%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                );
            });
        });

        /* ─── PARALLAX IMAGES ─── */
        document.querySelectorAll('.parallax-img').forEach((layer) => {
            const speed = parseFloat(layer.dataset.speed) || 0.1;

            gsap.to(layer, {
                y: () => -(speed * window.innerHeight * 0.8),
                ease: 'none',
                scrollTrigger: {
                    trigger: layer.closest('.section'),
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.5,
                },
            });
        });

        /* ─── CINEMATIC ZOOM on scroll ─── */
        document.querySelectorAll('.image-reveal-mask img').forEach((img) => {
            gsap.to(img, {
                scale: 1.0,
                ease: 'none',
                scrollTrigger: {
                    trigger: img.closest('.section'),
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 2,
                },
            });
        });

        /* ─── RESTART BUTTON ─── */
        const btnTop = document.getElementById('btn-top');
        if (btnTop) {
            btnTop.addEventListener('click', () => {
                fpGoTo(0);
            });
        }
    }

    /* ═══════════════════════════════════════════════════════
       4. CURSOR GLOW
       ═══════════════════════════════════════════════════════ */
    function initCursorGlow() {
        const glow = document.createElement('div');
        glow.id = 'cursor-glow';
        document.body.appendChild(glow);

        let cx = 0, cy = 0;
        let tx = 0, ty = 0;

        document.addEventListener('mousemove', (e) => {
            tx = e.clientX;
            ty = e.clientY;
        });

        (function update() {
            cx += (tx - cx) * 0.06;
            cy += (ty - cy) * 0.06;
            glow.style.transform = `translate(${cx - 175}px, ${cy - 175}px)`;
            requestAnimationFrame(update);
        })();
    }

    /* ═══════════════════════════════════════════════════════
       5. HOVER SPRING EFFECTS
       ═══════════════════════════════════════════════════════ */
    function initHovers() {
        /* Magnetic effect on restart button */
        const btn = document.getElementById('btn-top');
        if (!btn) return;

        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top - r.height / 2;
            gsap.to(btn, { x: x * 0.2, y: y * 0.2, duration: 0.4, ease: Spring.gentle });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: Spring.bounce });
        });
    }

    /* ═══════════════════════════════════════════════════════
       BOOT
       ═══════════════════════════════════════════════════════ */
    function boot() {
        initThree();
        animateThree(0);
        initAnimations();
        initCursorGlow();
        initHovers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
