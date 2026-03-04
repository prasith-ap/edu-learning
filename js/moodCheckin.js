/**
 * EduPlay - Mood Check-in System
 * Full-screen overlay to ask the user how they are feeling before a quiz.
 */

function showMoodCheckin(username, callback) {
    const overlay = document.createElement('div');
    overlay.id = 'mood-checkin-overlay';

    // Base Overlay Styles
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.95)',
        zIndex: '1500',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Nunito", sans-serif',
        transition: 'opacity 800ms ease',
        opacity: '0'
    });

    // Inject Styles if not already present
    if (!document.getElementById('mood-checkin-styles')) {
        const style = document.createElement('style');
        style.id = 'mood-checkin-styles';
        style.textContent = `
      .mood-card {
        background: white;
        padding: 3rem 4rem;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(108, 99, 255, 0.15);
        text-align: center;
        transform: translateY(20px);
        opacity: 0;
        animation: slideUpFade 0.6s ease forwards;
        max-width: 90vw;
      }
      
      .mood-heading {
        color: #6C63FF;
        font-size: 2.2rem;
        font-weight: 800;
        margin-bottom: 2.5rem;
      }
      
      .mood-buttons-container {
        display: flex;
        gap: 1.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .mood-btn {
        background: #f4f5f7;
        border: none;
        border-radius: 50%;
        width: 80px;
        height: 80px;
        font-size: 64px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      
      .mood-btn span {
        font-size: 1rem;
        color: #666;
        font-weight: 600;
        margin-top: 10px;
        position: absolute;
        bottom: -30px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .mood-btn:hover span {
        opacity: 1;
      }
      
      .mood-btn.happy:hover { transform: scale(1.3); box-shadow: 0 0 20px rgba(255, 217, 61, 0.6); animation: bounce 0.5s; background: rgba(255, 217, 61, 0.1); }
      .mood-btn.good:hover { transform: scale(1.3); box-shadow: 0 0 20px rgba(78, 203, 113, 0.6); animation: bounce 0.5s; background: rgba(78, 203, 113, 0.1); }
      .mood-btn.neutral:hover { transform: scale(1.3); box-shadow: 0 0 20px rgba(76, 201, 240, 0.6); animation: bounce 0.5s; background: rgba(76, 201, 240, 0.1); }
      .mood-btn.sad:hover { transform: scale(1.3); box-shadow: 0 0 20px rgba(255, 107, 53, 0.6); animation: bounce 0.5s; background: rgba(255, 107, 53, 0.1); }
      .mood-btn.upset:hover { transform: scale(1.3); box-shadow: 0 0 20px rgba(255, 107, 157, 0.6); animation: bounce 0.5s; background: rgba(255, 107, 157, 0.1); }
      
      .mood-btn.selected {
        font-size: 80px;
        width: 100px;
        height: 100px;
        background: transparent !important;
        box-shadow: none !important;
        animation: none !important;
      }
      
      .mood-buttons-container.has-selection .mood-btn:not(.selected) {
        opacity: 0.3;
        transform: scale(0.8);
        pointer-events: none;
      }
      
      .mood-btn.selected span {
        opacity: 0;
      }
      
      .mood-success-msg {
        color: #4ECB71;
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 3rem;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.4s ease;
      }
      
      .mood-success-msg.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
      @keyframes bounce { 0%, 100% { transform: scale(1.3) translateY(0); } 50% { transform: scale(1.3) translateY(-10px); } }
    `;
        document.head.appendChild(style);
    }

    overlay.innerHTML = `
    <div class="mood-card">
      <h2 class="mood-heading">Hey ${username || 'Explorer'}! How are you feeling? 😊</h2>
      <div class="mood-buttons-container">
        <button class="mood-btn happy" data-mood="happy">😄<span>Super!</span></button>
        <button class="mood-btn good" data-mood="good">😊<span>Good</span></button>
        <button class="mood-btn neutral" data-mood="neutral">😐<span>Okay</span></button>
        <button class="mood-btn sad" data-mood="sad">😔<span>Not great</span></button>
        <button class="mood-btn upset" data-mood="upset">😢<span>Sad</span></button>
      </div>
      <div class="mood-success-msg">Got it! Let's go! 🚀</div>
    </div>
  `;

    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });

    // Add interactions
    const buttons = overlay.querySelectorAll('.mood-btn');
    const container = overlay.querySelector('.mood-buttons-container');
    const successMsg = overlay.querySelector('.mood-success-msg');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMood = btn.dataset.mood;

            // Save to session storage
            sessionStorage.setItem('currentMood', selectedMood);

            // UI Updates
            container.classList.add('has-selection');
            btn.classList.add('selected');
            successMsg.classList.add('show');

            // Wait 800ms then fade out overlay
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.remove();
                    if (callback) callback(selectedMood);
                }, 800);
            }, 800);
        });
    });
}

window.showMoodCheckin = showMoodCheckin;
