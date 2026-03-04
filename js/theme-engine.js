/**
 * EduPlay Shared Theme Engine
 * Controls living background, animations, and interactive effects.
 */

const THEME_CONFIG = {
    STAR_COUNT: 60,
    CLOUD_COUNT: 4,
    EMOJIS: ["🌈", "⭐", "🎈", "🦋", "🌸", "💫", "🎊", "🌙", "✨", "🎯"]
};

function initLivingBackground() {
    initStars();
    initClouds();
    initFloatingEmojis();
    setInterval(triggerShootingStar, Math.random() * 7000 + 8000);
}

function initStars() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < THEME_CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.5),
            size: Math.random() * 2 + 1,
            opacity: Math.random(),
            speed: Math.random() * 0.05 + 0.01,
            phase: Math.random() * Math.PI * 2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.phase += s.speed;
            const currentOpacity = (Math.sin(s.phase) + 1) / 2 * 0.7 + 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

function initClouds() {
    const container = document.getElementById('cloudsContainer');
    if (!container) return;

    for (let i = 0; i < THEME_CONFIG.CLOUD_COUNT; i++) {
        // We use a wrapper for the CSS drift animation
        // and the inner cloud div for the JS mouse parallax.
        // This avoids transform property conflicts.
        const wrapper = document.createElement('div');
        wrapper.className = 'cloud-wrapper';

        const cloud = document.createElement('div');
        cloud.className = 'cloud';

        // Randomized cloud shape
        const w = Math.random() * 150 + 150;
        const h = w * 0.4;
        cloud.style.width = `${w}px`;
        cloud.style.height = `${h}px`;

        // Random start position
        wrapper.style.top = `${Math.random() * 60 + 5}%`;
        wrapper.style.left = `${Math.random() * 100}%`;

        // CSS Drift Animation on the wrapper
        const speed = Math.random() * 80 + 50;
        wrapper.style.animation = `cloudDrift ${speed}s linear infinite`;
        wrapper.style.animationDelay = `-${Math.random() * speed}s`;

        wrapper.appendChild(cloud);
        container.appendChild(wrapper);
    }
}

function initFloatingEmojis() {
    const container = document.getElementById('floatingContainer');
    if (!container) return;

    for (let i = 0; i < 15; i++) {
        const emoji = document.createElement('div');
        emoji.className = 'floating-emoji';
        emoji.textContent = THEME_CONFIG.EMOJIS[Math.floor(Math.random() * THEME_CONFIG.EMOJIS.length)];

        emoji.style.left = `${Math.random() * 100}%`;
        emoji.style.top = `${Math.random() * 100}%`;
        emoji.style.fontSize = `${Math.random() * 20 + 20}px`;

        const duration = Math.random() * 10 + 10;
        emoji.style.animation = `float ${duration}s infinite alternate ease-in-out`;
        emoji.style.animationDelay = `${Math.random() * 5}s`;

        container.appendChild(emoji);
    }
}

function triggerShootingStar() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let x = Math.random() * canvas.width;
    let y = Math.random() * (canvas.height * 0.3);
    let length = Math.random() * 80 + 50;
    let opacity = 1;

    function draw() {
        if (opacity <= 0) return;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - length, y + length);
        ctx.stroke();

        x -= 10;
        y += 10;
        opacity -= 0.05;
        requestAnimationFrame(draw);
    }
    draw();
}

function spawnClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);

    setTimeout(() => ripple.remove(), 800);
}

function initMouseParallax() {
    window.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.015;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.015;

        // Apply parallax only to the cloud elements inside the wrappers
        const clouds = document.querySelectorAll('.cloud');
        clouds.forEach(c => {
            c.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
}

// Export functions
window.eduplayTheme = {
    initLivingBackground,
    spawnClickRipple,
    initMouseParallax
};
