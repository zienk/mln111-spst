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

    /* ─── TYPEWRITER UTILITIES (outer scope) ─── */
    function typewriterPlay(el, speed, delay) {
        // Kill any running typewriter on this element
        if (el._typeTimer) clearTimeout(el._typeTimer);
        if (el._typeInterval) clearInterval(el._typeInterval);

        const originalText = el.getAttribute('data-original-text') || el.textContent.trim();
        el.setAttribute('data-original-text', originalText);
        el.textContent = '';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        el.classList.remove('typed');
        el.classList.add('typing');

        let i = 0;
        el._typeTimer = setTimeout(function() {
            el._typeInterval = setInterval(function() {
                if (i < originalText.length) {
                    el.textContent += originalText.charAt(i);
                    i++;
                } else {
                    clearInterval(el._typeInterval);
                    el._typeInterval = null;
                    el.classList.remove('typing');
                    el.classList.add('typed');
                }
            }, speed);
        }, delay);
    }

    function typewriterReset(el) {
        if (el._typeTimer) { clearTimeout(el._typeTimer); el._typeTimer = null; }
        if (el._typeInterval) { clearInterval(el._typeInterval); el._typeInterval = null; }
        el.textContent = '';
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.classList.remove('typing', 'typed');
    }

    /** Manually play entry animations for a section (called after scroll completes) */
    function fpAnimateEnter(section) {
        // Animate .anim-item elements (titles, indexes, ornaments, etc.)
        const items = section.querySelectorAll('.anim-item');
        items.forEach((item) => {
            // Skip typewriter elements — they have their own animation below
            if (item.classList.contains('caption__text') || item.classList.contains('caption__desc') ||
                item.classList.contains('finale__text')) {
                return;
            }
            const delay = parseInt(item.dataset.delay) * 0.18;
            const targetOpacity = item.classList.contains('caption__index') ? 0.15 : 1;
            gsap.fromTo(item,
                { opacity: 0, y: 40, scale: item.classList.contains('finale__ornament') ? 0.4 : 1,
                  rotation: item.classList.contains('finale__ornament') ? -180 : 0 },
                { opacity: targetOpacity, y: 0, scale: 1, rotation: 0,
                  duration: 1.5, delay: delay, ease: Spring.bounce }
            );
        });

        // Dividers (including epic__line)
        const dividers = section.querySelectorAll('.caption__divider, .finale__divider, .epic__line');
        dividers.forEach((div) => {
            gsap.fromTo(div,
                { scaleX: 0, opacity: 0 },
                { scaleX: 1, opacity: 1, duration: 1.2, ease: Spring.smooth }
            );
        });

        // Image reveal — handle multiple masks (e.g. dual section)
        const masks = section.querySelectorAll('.image-reveal-mask');
        masks.forEach((mask, i) => {
            const wrap = mask.closest('.story__image-wrap') || mask.closest('.finale__bg') ||
                         mask.closest('.cinematic__bg') || mask.closest('.epic__bg') ||
                         mask.closest('.dual__image-wrap');
            gsap.to(mask, {
                clipPath: 'inset(0 0 0% 0)',
                duration: 1.6,
                delay: i * 0.2,
                ease: Spring.smooth,
                onComplete: () => {
                    mask.classList.add('revealed');
                    if (wrap) wrap.classList.add('shine');
                }
            });
        });

        // Typewriter for quote and desc
        const quoteEl = section.querySelector('.caption__text, .finale__text');
        const descEl = section.querySelector('.caption__desc');
        if (quoteEl) typewriterPlay(quoteEl, 35, 400);
        if (descEl) typewriterPlay(descEl, 18, 900);
    }

    /** Reset a section's elements to their initial hidden state */
    function fpResetSection(section) {
        const items = section.querySelectorAll('.anim-item');
        items.forEach((item) => {
            gsap.set(item, { opacity: 0, y: 40, scale: 1, rotation: 0 });
        });
        const dividers = section.querySelectorAll('.caption__divider, .finale__divider, .epic__line');
        dividers.forEach((div) => {
            gsap.set(div, { scaleX: 0, opacity: 0 });
        });

        // Clear inline styles on content containers & parent wrappers so they’re visible next time
        const containers = section.querySelectorAll(
            '.hero__content, .hero__title, .finale__content, .finale__title, ' +
            '.cinematic__content, .epic__content, .story__caption, .dual__caption'
        );
        containers.forEach((c) => gsap.set(c, { clearProps: 'all' }));

        // Reset ALL image masks (handles dual-image sections)
        const masks = section.querySelectorAll('.image-reveal-mask');
        masks.forEach((mask) => {
            gsap.set(mask, { clipPath: 'inset(0 0 100% 0)' });
            mask.classList.remove('revealed');
            const wrap = mask.closest('.story__image-wrap') || mask.closest('.finale__bg') ||
                         mask.closest('.cinematic__bg') || mask.closest('.epic__bg') ||
                         mask.closest('.dual__image-wrap');
            if (wrap) wrap.classList.remove('shine');
        });
        // Reset typewriter
        const quoteEl = section.querySelector('.caption__text, .finale__text');
        const descEl = section.querySelector('.caption__desc');
        if (quoteEl) typewriterReset(quoteEl);
        if (descEl) typewriterReset(descEl);
    }

    function fpGoTo(index) {
        const sections = fpGetSections();
        if (index < 0 || index >= sections.length || fpIsAnimating) return;
        fpIsAnimating = true;

        const prevIndex = fpCurrentIndex;
        fpCurrentIndex = index;
        const direction = index > prevIndex ? 1 : -1; // 1 = down, -1 = up

        const currentSection = sections[prevIndex];
        const targetSection = sections[index];
        const targetY = targetSection.offsetTop;

        // ── EXIT ANIMATION on current section ──
        // Use .anim-item to target only leaf-level animated elements,
        // NEVER parent wrappers (h2.finale__title, h1.hero__title) which
        // would be faded but never restored, causing invisible content.
        const exitElements = currentSection.querySelectorAll('.anim-item');
        const exitImage = currentSection.querySelector(
            '.story__image-wrap, .finale__bg, .cinematic__bg, .epic__bg, .dual__images'
        );

        const exitTl = gsap.timeline({
            onComplete: function() {
                // Reset the exited section to initial hidden state
                fpResetSection(currentSection);

                // ── SCROLL to target section ──
                gsap.to(window, {
                    scrollTo: { y: targetY, autoKill: false },
                    duration: FP_DURATION,
                    ease: 'power3.inOut',
                    onComplete: function() {
                        if (exitImage) gsap.set(exitImage, { clearProps: 'opacity,scale' });

                        // ── ENTER ANIMATION on target section ──
                        fpAnimateEnter(targetSection);

                        // Refresh ScrollTrigger to sync state
                        ScrollTrigger.refresh();

                        setTimeout(function() { fpIsAnimating = false; }, 200);
                    },
                });
            }
        });

        // Fade + slide text out
        if (exitElements.length > 0) {
            exitTl.to(exitElements, {
                opacity: 0,
                y: -30 * direction,
                duration: 0.35,
                stagger: 0.03,
                ease: 'power2.in',
            }, 0);
        }

        // Slight fade on image
        if (exitImage) {
            exitTl.to(exitImage, {
                opacity: 0.3,
                scale: 0.97,
                duration: 0.4,
                ease: 'power2.in',
            }, 0);
        }
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
       2. THREE.JS — Floating Star Particles Background
       ═══════════════════════════════════════════════════════ */
    const canvas = document.getElementById('three-canvas');
    let scene, camera, renderer;
    let particleSystem, dustSystem;
    let mouseX = 0, mouseY = 0;
    let scrollY = 0;

    /* Generate a glowing star texture via Canvas */
    function createStarTexture(size, points, color) {
        const sz = size || 64;
        const cv = document.createElement('canvas');
        cv.width = sz;
        cv.height = sz;
        const ctx = cv.getContext('2d');
        const cx = sz / 2;
        const cy = sz / 2;
        const outerR = sz * 0.42;
        const innerR = outerR * 0.38;
        const pts = points || 5;

        // Soft glow behind the star
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR * 1.3);
        glow.addColorStop(0, (color || 'rgba(221,200,142,') + '0.5)');
        glow.addColorStop(0.4, (color || 'rgba(221,200,142,') + '0.15)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, sz, sz);

        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI / pts) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Fill star with gradient
        const starGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
        starGrad.addColorStop(0, '#fffbe6');
        starGrad.addColorStop(0.5, color ? color.replace('rgba', '').slice(0, -1) : '#ddc88e');
        starGrad.addColorStop(1, '#c4a35a');
        ctx.fillStyle = starGrad;
        ctx.fill();

        const tex = new THREE.CanvasTexture(cv);
        tex.needsUpdate = true;
        return tex;
    }

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

    /* Ambient particles — gold stars */
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

        const starTex = createStarTexture(64, 5);

        const mat = new THREE.PointsMaterial({
            size: 1.5,
            map: starTex,
            vertexColors: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        particleSystem = new THREE.Points(geo, mat);
        scene.add(particleSystem);
    }

    /* Floating dust motes — larger stars, fewer, dreamy */
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

        const starTex = createStarTexture(128, 5);

        const mat = new THREE.PointsMaterial({
            size: 5.0,
            map: starTex,
            color: col,
            transparent: true,
            opacity: 0.45,
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

        /* ─── Animations for story/finale sections are handled by
           fpAnimateEnter / fpResetSection (called from fpGoTo).
           ScrollTrigger is NOT used for these to avoid conflicts
           with the fullpage scroll system. ─── */

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
        // Pre-store original text for all typewriter target elements
        document.querySelectorAll('.caption__text, .caption__desc, .finale__text').forEach((el) => {
            if (!el.getAttribute('data-original-text')) {
                el.setAttribute('data-original-text', el.textContent.trim());
            }
        });

        initThree();
        animateThree(0);
        initAnimations();
        initCursorGlow();
        initHovers();

        // If starting at a non-hero section, animate it in
        if (fpCurrentIndex > 0) {
            const sections = fpGetSections();
            fpAnimateEnter(sections[fpCurrentIndex]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
