/**
 * EduPlay — Animated Story Intro System
 * Full-screen overlay injected before a quiz starts with 
 * subject-specific CSS animations and text reveals.
 */

function showStoryIntro(module, callback) {
    // 1. Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'story-intro-overlay';

    // Base overlay styles (added via inline styles for independence, could also be CSS)
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(circle, #1a0533 0%, #0d0221 100%)',
        zIndex: '1000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: '"Source Sans Pro", sans-serif',
        overflow: 'hidden',
        transition: 'opacity 500ms ease',
        opacity: '0'
    });

    // 2. Inject CSS Animations if not present
    if (!document.getElementById('story-intro-styles')) {
        const style = document.createElement('style');
        style.id = 'story-intro-styles';
        style.textContent = `
      .story-text-container { margin-top: 2rem; text-align: center; }
      .story-line { font-size: 2rem; font-weight: bold; text-shadow: 0 0 10px rgba(255,255,255,0.8); min-height: 2.5rem; }
      .story-word { opacity: 0; display: inline-block; margin: 0 0.3rem; transform: translateY(10px); transition: all 300ms ease; }
      .story-word.visible { opacity: 1; transform: translateY(0); }
      
      .skip-btn { position: absolute; bottom: 2rem; right: 2rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.8rem 1.5rem; border-radius: 50px; cursor: pointer; font-size: 1.1rem; transition: background 0.2s; }
      .skip-btn:hover { background: rgba(255,255,255,0.2); }

      /* Math Animations */
      @keyframes flyRocket { 0% { transform: translate(-50vw, -20vh) scale(0.5); } 100% { transform: translate(50vw, -5vh) scale(1.5); } }
      .math-rocket { position: absolute; font-size: 4rem; animation: flyRocket 3s linear forwards; }
      @keyframes starBurst { 0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(1) rotate(180deg); opacity: 0; } }
      .math-star { position: absolute; top: 40%; left: 50%; font-size: 2rem; transform: translate(-50%, -50%) scale(0); opacity: 0; animation: starBurst 1s forwards cubic-bezier(0.1, 0.8, 0.2, 1); }

      /* English Animations */
      .english-book-container { perspective: 1000px; width: 100px; height: 80px; position: relative; }
      .book-half { position: absolute; width: 50px; height: 80px; background: white; border-radius: 5px; top: 0; transform-origin: left center; }
      .book-left { left: 0; transform-origin: right center; background: linear-gradient(to left, #ddd, #fff); border-radius: 5px 0 0 5px; }
      .book-right { right: 0; background: linear-gradient(to right, #ddd, #fff); border-radius: 0 5px 5px 0; transform: rotateY(0deg); animation: openBook 1.5s forwards ease-out; }
      @keyframes openBook { 0% { transform: rotateY(-180deg); } 100% { transform: rotateY(0deg); } }
      @keyframes floatWord { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-100px) scale(1.2); opacity: 0; } }
      .floating-word { position: absolute; top: 20%; font-family: "Dancing Script", cursive; color: #C084FC; font-size: 2rem; opacity: 0; }

      /* GK Animations */
      @keyframes spinGlobe { 0% { transform: rotate(0deg) scale(0.5); } 100% { transform: rotate(360deg) scale(1.5); } }
      .gk-globe { font-size: 5rem; animation: spinGlobe 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      @keyframes sparkleExplode { 0% { transform: translate(0,0) scale(0); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1.5); opacity: 0; } }
      .gk-sparkle { position: absolute; font-size: 1.5rem; opacity: 0; animation: sparkleExplode 1s forwards ease-out; }
    `;
        document.head.appendChild(style);
    }

    // 3. Build Content structure
    const contentMap = {
        'mathematics': {
            animHTML: `
        <div class="math-rocket">🚀</div>
        ${[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dist = 150;
                return `<div class="math-star" style="--tx: ${Math.cos(angle) * dist}px; --ty: ${Math.sin(angle) * dist}px; animation-delay: ${0.2 + (i * 0.1)}s">🌟</div>`;
            }).join('')}
      `,
            lines: [
                "You're a Math Explorer",
                "entering the Number Galaxy...",
                "Solve the mysteries within! 🌟"
            ],
            timing: [0, 2000, 3500] // delays before showing line (in ms)
        },
        'english': {
            animHTML: `
        <div class="english-book-container">
          <div class="book-half book-left"></div>
          <div class="book-half book-right"></div>
        </div>
        <div class="floating-word" style="left: 40%; animation: floatWord 2s 0.5s forwards;">stories</div>
        <div class="floating-word" style="left: 55%; animation: floatWord 2.5s 0.8s forwards;">words</div>
        <div class="floating-word" style="left: 48%; animation: floatWord 2s 1.2s forwards;">worlds</div>
      `,
            lines: [
                "Step into the Story Realm",
                "where words come alive...",
                "Write your legend! ✨"
            ],
            timing: [0, 2000, 3500]
        },
        'general-knowledge': {
            animHTML: `
        <div class="gk-globe">🌍</div>
        ${[...Array(12)].map((_, i) => {
                const dx = (Math.random() - 0.5) * 200;
                const dy = (Math.random() - 0.5) * 200;
                return `<div class="gk-sparkle" style="--dx: ${dx}px; --dy: ${dy}px; animation-delay: ${0.5 + Math.random() * 0.5}s">✨</div>`;
            }).join('')}
      `,
            lines: [
                "Welcome, World Explorer",
                "The planet holds its secrets...",
                "Can you unlock them? 🔍"
            ],
            timing: [0, 2000, 3500]
        }
    };

    // Default fallback if unknown module
    const config = contentMap[module] || contentMap['general-knowledge'];

    // Lines container
    let linesHTML = config.lines.map((line, idx) => {
        // Wrap words in spans for reveal animation
        const words = line.split(' ').map(w => `<span class="story-word">${w}</span>`).join(' ');
        return `<div class="story-line" id="story-line-${idx}"></div>`;
    }).join('');

    overlay.innerHTML = `
    <div style="position: relative; width: 100%; height: 30vh; display: flex; justify-content: center; align-items: center;">
      ${config.animHTML}
    </div>
    <div class="story-text-container">
      ${linesHTML}
    </div>
    <button class="skip-btn">Skip ▶</button>
  `;

    document.body.appendChild(overlay);

    // 4. Cleanup & End Logic
    let isFinished = false;
    let wordTimers = [];

    function finish() {
        if (isFinished) return;
        isFinished = true;
        wordTimers.forEach(clearTimeout); // Stop any pending text reveals

        // Fade out
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                overlay.remove();
            }
            callback();
        }, 500); // Wait for CSS opacity transition
    }

    // Skip button listener
    overlay.querySelector('.skip-btn').addEventListener('click', finish);

    // Trigger initial fade in over next frame
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });

    // 5. Word-by-word reveal logic
    config.lines.forEach((line, lineIdx) => {
        const delay = config.timing[lineIdx];
        const words = line.split(' ');

        // Schedule line reveal
        wordTimers.push(setTimeout(() => {
            const lineContainer = document.getElementById(`story-line-${lineIdx}`);
            if (!lineContainer) return;

            // Add words progressively
            words.forEach((word, wordIdx) => {
                const span = document.createElement('span');
                span.className = 'story-word';
                span.innerHTML = word + '&nbsp;';
                lineContainer.appendChild(span);

                wordTimers.push(setTimeout(() => {
                    span.classList.add('visible');
                }, wordIdx * 200)); // 200ms between each word
            });
        }, delay));
    });

    // 6. Final auto-finish timer
    setTimeout(finish, 4000); // Hardstop 4000ms
}

// Attach globally
window.showStoryIntro = showStoryIntro;
