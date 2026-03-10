import { api } from '../utils/api.js';
import { formatTime, showToast } from '../utils/formatters.js';

const FOCUS_OPTIONS = [
    { label: '📚 Study', value: 'Study' },
    { label: '💻 Work', value: 'Work' },
    { label: '✍️ Writing', value: 'Writing' },
    { label: '🎨 Creative', value: 'Creative' },
    { label: '📖 Reading', value: 'Reading' },
    { label: '🧘 Meditation', value: 'Meditation' },
    { label: '🏋️ Exercise', value: 'Exercise' },
    { label: '🎯 Other', value: 'Other' }
];

function createNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return {
            play: () => {
                const playTing = (t) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.type = 'sine'; osc.frequency.value = 880;
                    gain.gain.setValueAtTime(0.3, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                    osc.start(t); osc.stop(t + 0.5);
                };
                const t = audioCtx.currentTime;
                playTing(t); playTing(t + 0.3); playTing(t + 0.8); playTing(t + 1.1);
            }
        };
    } catch { return { play: () => { } }; }
}

export function renderPomodoro() {
    const app = document.getElementById('app');
    let selectedDuration = 25;
    let selectedFocus = '';
    let timerInterval = null;
    let remainingSeconds = 25 * 60;
    let isRunning = false;
    let currentSessionId = null;
    let totalSeconds = 25 * 60;
    const notificationSound = createNotificationSound();

    // Audio state
    let musicAudio = null;
    let soundAudio = null;
    let musicPlaylist = [];
    let musicIndex = 0;
    let musicPlaying = false;
    let soundPlaying = false;
    let musicVolume = 50;
    let soundVolume = 30;

    const CIRCUMFERENCE = 2 * Math.PI * 120;

    // Restore state
    function saveState() {
        localStorage.setItem('pomodoroState', JSON.stringify({
            selectedDuration, selectedFocus, remainingSeconds, isRunning, currentSessionId, totalSeconds,
            lastTick: Date.now(),
            musicPlaying, soundPlaying, musicVolume, soundVolume
        }));
    }

    try {
        const s = JSON.parse(localStorage.getItem('pomodoroState'));
        if (s) {
            selectedDuration = s.selectedDuration || 5;
            selectedFocus = s.selectedFocus || '';
            currentSessionId = s.currentSessionId || null;
            totalSeconds = s.totalSeconds || 25 * 60;
            musicPlaying = s.musicPlaying || false;
            soundPlaying = s.soundPlaying || false;
            musicVolume = s.musicVolume ?? 50;
            soundVolume = s.soundVolume ?? 30;
            if (s.isRunning) {
                const elapsed = Math.floor((Date.now() - s.lastTick) / 1000);
                remainingSeconds = s.remainingSeconds - elapsed;
                isRunning = true;
            } else {
                remainingSeconds = s.remainingSeconds !== undefined ? s.remainingSeconds : 25 * 60;
            }
        }
    } catch { }

    // ── Render ──
    function render() {
        app.innerHTML = `
        <div class="pomodoro-page animate-fade-in">
            <div class="pomodoro-bg" id="pomodoro-bg"></div>

            <!-- Timer Ring (draggable) -->
            <div class="timer-container" id="timer-container">
                <svg class="timer-ring" viewBox="0 0 256 256" id="timer-svg">
                    <defs>
                        <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#ff6b6b" />
                            <stop offset="100%" style="stop-color:#ffa502" />
                        </linearGradient>
                    </defs>
                    <circle class="timer-ring-bg" cx="128" cy="128" r="120" />
                    <circle class="timer-ring-progress" cx="128" cy="128" r="120"
                        stroke-dasharray="${CIRCUMFERENCE}"
                        stroke-dashoffset="${CIRCUMFERENCE * (1 - remainingSeconds / totalSeconds)}"
                    />
                    <!-- Drag handle -->
                    <circle class="timer-drag-handle" id="drag-handle" cx="128" cy="8" r="10"
                        fill="#ff6b6b" stroke="white" stroke-width="3" style="cursor:grab;filter:drop-shadow(0 0 6px rgba(255,107,107,0.5))" />
                </svg>
                <div class="timer-display">
                    <div class="timer-time" id="timer-time">${formatTime(remainingSeconds)}</div>
                    <div class="timer-duration-hint" id="duration-hint">${selectedDuration} min</div>
                    <div class="timer-label">${selectedFocus || 'Focus Time'}</div>
                </div>
            </div>

            <!-- Timer Controls -->
            <div class="timer-controls">
                <button class="timer-btn-secondary" id="btn-reset" title="Reset">🔄</button>
                <button class="timer-btn-main" id="btn-play-pause" title="${isRunning ? 'Pause' : 'Start'}">
                    ${isRunning ? '⏸' : '▶'}
                </button>
                <button class="timer-btn-secondary" id="btn-skip" title="Skip">⏭</button>
            </div>

            <!-- Focus Selector -->
            <div class="focus-selector">
                <div class="focus-options">
                    ${FOCUS_OPTIONS.map(f => `
                        <button class="focus-chip ${f.value === selectedFocus ? 'active' : ''}" data-focus="${f.value}">
                            ${f.label}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Media Bar (minimalist) -->
            <div class="media-bar" id="media-bar">
                <button class="media-pill" id="pill-music" title="Music">
                    <span class="pill-icon">🎵</span>
                    <span class="pill-label" id="pill-music-label">Music</span>
                </button>
                <button class="media-pill" id="pill-sound" title="Sound">
                    <span class="pill-icon">🔊</span>
                    <span class="pill-label" id="pill-sound-label">Sound</span>
                </button>
                <button class="media-pill" id="pill-bg" title="Background">
                    <span class="pill-icon">🖼️</span>
                    <span class="pill-label">BG</span>
                </button>
            </div>

            <!-- Hidden file inputs -->
            <input type="file" id="music-upload-input" accept="audio/*" style="display:none" />
            <input type="file" id="sound-upload-input" accept="audio/*" style="display:none" />
            <input type="file" id="bg-upload-input" accept="image/*" style="display:none" />
        </div>`;

        attachEventListeners();
        loadBackground();
        loadMediaState();
        updateDragHandlePosition();
    }

    // ── Drag-to-set-duration on Ring ──
    function attachDragListeners() {
        const svg = document.getElementById('timer-svg');
        const container = document.getElementById('timer-container');
        if (!svg || !container) return;

        let isDragging = false;

        function getAngleFromEvent(e) {
            // Returns 0-360 where 0 = 12 o'clock, clockwise
            const rect = container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            /// atan2 trả về radian, * 180/PI để sang độ.
            // Mặc định: 3h là 0 độ.
            let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);

            // Cộng thêm 90 để đẩy 12h về 0 độ
            angle += 90;

            // Chuẩn hóa về khoảng [0, 360]
            if (angle < 0) angle += 360;
            return angle;
        }

        function setDurationFromAngle(angle) {
            // Clock face: 0° (12 o'clock) = 5 min, each 30° = 5 min, 330° (11 o'clock) = 60 min
            // So minutes = round(angle / 6) rounded to nearest 5, then clamp [5, 60]
            // 360° / 60min = 6° per minute
            let minutes = Math.round(angle / 6 / 5) * 5; // snap to 5-min
            if (minutes <= 0) minutes = 5;   // 0° snaps to 5 (the start)
            if (minutes > 60) minutes = 60;
            if (minutes === selectedDuration) return;
            selectedDuration = minutes;
            remainingSeconds = selectedDuration * 60;
            totalSeconds = remainingSeconds;
            saveState();
            updateTimerDisplay();
            updateDragHandlePosition();
            const hint = document.getElementById('duration-hint');
            if (hint) hint.textContent = `${selectedDuration} min`;
        }

        function onStart(e) {
            if (isRunning) return;
            isDragging = true;
            e.preventDefault();
        }
        function onMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            setDurationFromAngle(getAngleFromEvent(e));
        }
        function onEnd() { isDragging = false; }

        const handle = document.getElementById('drag-handle');
        if (handle) {
            handle.addEventListener('mousedown', onStart);
            handle.addEventListener('touchstart', onStart, { passive: false });
        }
        // Also allow dragging anywhere on ring bg
        svg.addEventListener('mousedown', (e) => {
            if (isRunning) return;
            isDragging = true;
            setDurationFromAngle(getAngleFromEvent(e));
        });
        svg.addEventListener('touchstart', (e) => {
            if (isRunning) return;
            isDragging = true;
            setDurationFromAngle(getAngleFromEvent(e));
        }, { passive: false });

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
    }

    function updateDragHandlePosition() {
        const handle = document.getElementById('drag-handle');
        if (!handle) return;

        // clockDegs: 0 phút = 0 độ, 15 phút = 90 độ...
        const clockDegs = selectedDuration * 6;

        // CHÚ Ý: Vì CSS đã rotate(-90deg), nên 0 độ của SVG đã là 12h rồi.
        // Ta chỉ cần dùng đúng số độ của đồng hồ.
        const svgAngleRad = (clockDegs) * Math.PI / 180;

        const cx = 128 + 120 * Math.cos(svgAngleRad);
        const cy = 128 + 120 * Math.sin(svgAngleRad);

        handle.setAttribute('cx', cx);
        handle.setAttribute('cy', cy);
    }


    // ── Event Listeners ──
    function attachEventListeners() {
        document.getElementById('btn-play-pause').addEventListener('click', toggleTimer);
        document.getElementById('btn-reset').addEventListener('click', resetTimer);
        document.getElementById('btn-skip').addEventListener('click', skipTimer);

        // Focus chips
        document.querySelectorAll('.focus-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                selectedFocus = selectedFocus === chip.dataset.focus ? '' : chip.dataset.focus;
                saveState();
                render();
            });
        });

        // Media pills
        document.getElementById('pill-music').addEventListener('click', () => showMediaPanel('music'));
        document.getElementById('pill-sound').addEventListener('click', () => showMediaPanel('sound'));
        document.getElementById('pill-bg').addEventListener('click', () => showMediaPanel('image'));

        // Drag
        attachDragListeners();
    }

    // ── Timer Logic ──
    async function toggleTimer() {
        if (isRunning) pauseTimer();
        else startTimer();
    }

    async function startTimer() {
        if (!currentSessionId) {
            try {
                const session = await api.startSession({ duration: selectedDuration, focusLabel: selectedFocus || null });
                currentSessionId = session.id;
            } catch {
                showToast('Failed to start session', 'error');
                return;
            }
        }
        isRunning = true;
        saveState();
        updateControls();

        timerInterval = setInterval(() => {
            remainingSeconds--;
            saveState();
            updateTimerDisplay();
            if (remainingSeconds <= 0) completeSession();
        }, 1000);
    }

    function pauseTimer() {
        isRunning = false;
        clearInterval(timerInterval);
        saveState();
        updateControls();
    }

    function resetTimer() {
        pauseTimer();
        remainingSeconds = selectedDuration * 60;
        totalSeconds = remainingSeconds;
        currentSessionId = null;
        saveState();
        updateTimerDisplay();
        updateDragHandlePosition();
        updateControls();
    }

    async function skipTimer() {
        if (currentSessionId) await completeSession();
        else resetTimer();
    }

    async function completeSession() {
        pauseTimer();
        if (currentSessionId) {
            try {
                await api.completeSession(currentSessionId);
                showToast('🎉 Pomodoro completed!');
            } catch { showToast('Error completing session', 'error'); }
        }
        notificationSound.play();
        // Stop music and sound on session complete
        if (musicAudio) { musicAudio.pause(); musicAudio = null; }
        if (soundAudio) { soundAudio.pause(); soundAudio = null; }
        musicPlaying = false;
        soundPlaying = false;
        remainingSeconds = selectedDuration * 60;
        totalSeconds = remainingSeconds;
        currentSessionId = null;
        isRunning = false;
        saveState();
        updateTimerDisplay();
        updateDragHandlePosition();
        updateControls();
        // Update pill labels
        const mLabel = document.getElementById('pill-music-label');
        if (mLabel) mLabel.textContent = 'Music';
        const sLabel = document.getElementById('pill-sound-label');
        if (sLabel) sLabel.textContent = 'Sound';
    }

    function updateTimerDisplay() {
        const timeEl = document.getElementById('timer-time');
        if (timeEl) timeEl.textContent = formatTime(remainingSeconds);

        const progress = document.querySelector('.timer-ring-progress');
        if (progress) {
            // Chia cho 3600 để thanh progress tỉ lệ thuận với 60 phút trên mặt đồng hồ
            const offset = CIRCUMFERENCE * (1 - remainingSeconds / 3600);
            progress.setAttribute('stroke-dashoffset', offset);
        }
    }

    function updateControls() {
        const btn = document.getElementById('btn-play-pause');
        if (btn) { btn.innerHTML = isRunning ? '⏸' : '▶'; btn.title = isRunning ? 'Pause' : 'Start'; }
    }

    // ── Music Playlist ──
    function loadMusicPlaylist(mediaList) {
        musicPlaylist = mediaList;
        localStorage.setItem('musicPlaylist', JSON.stringify(musicPlaylist));
        musicIndex = 0;
        if (musicPlaylist.length > 0) playMusicTrack(0);
    }

    function playMusicTrack(index) {
        if (index >= musicPlaylist.length) { musicIndex = 0; index = 0; }
        if (musicPlaylist.length === 0) return;
        musicIndex = index;
        const track = musicPlaylist[musicIndex];

        if (musicAudio) { musicAudio.pause(); musicAudio = null; }
        musicAudio = new Audio(api.mediaUrl(track.url));
        musicAudio.volume = musicVolume / 100;
        musicAudio.addEventListener('ended', () => playMusicTrack(musicIndex + 1));

        if (musicPlaying) musicAudio.play();

        const label = document.getElementById('pill-music-label');
        if (label) label.textContent = track.originalName || track.original_name || 'Music';
    }

    function toggleMusicPlay() {
        if (!musicAudio && musicPlaylist.length > 0) playMusicTrack(0);
        if (!musicAudio) { showToast('Upload music first', 'error'); return; }
        if (musicAudio.paused) { musicAudio.play(); musicPlaying = true; }
        else { musicAudio.pause(); musicPlaying = false; }
    }

    // ── Sound (single loop) ──
    function loadSoundTrack(media) {
        if (soundAudio) { soundAudio.pause(); soundAudio = null; }
        soundAudio = new Audio(api.mediaUrl(media.url));
        soundAudio.loop = true;
        soundAudio.volume = soundVolume / 100;
        localStorage.setItem('selectedSound', JSON.stringify(media));
        const label = document.getElementById('pill-sound-label');
        if (label) label.textContent = media.originalName || media.original_name || 'Sound';
    }

    function toggleSoundPlay() {
        if (!soundAudio) { showToast('Select a sound first', 'error'); return; }
        if (soundAudio.paused) { soundAudio.play(); soundPlaying = true; }
        else { soundAudio.pause(); soundPlaying = false; }
    }

    // ── Restore media from localStorage ──
    function loadMediaState() {
        try {
            const pl = localStorage.getItem('musicPlaylist');
            if (pl) {
                musicPlaylist = JSON.parse(pl);
                // Auto-resume music if it was playing when page was left
                if (musicPlaying && musicPlaylist.length > 0) {
                    playMusicTrack(musicIndex);
                    // playMusicTrack will call .play() because musicPlaying = true
                }
            }

            const ss = localStorage.getItem('selectedSound');
            if (ss) {
                loadSoundTrack(JSON.parse(ss));
                // Auto-resume sound if it was playing
                if (soundPlaying && soundAudio) {
                    soundAudio.play().catch(() => { });
                }
            }
        } catch { }
    }

    // ── Background ──
    async function loadBackground() {
        try {
            const setting = await api.getSetting('pomodoro_bg');
            if (setting && setting.value) {
                const bgEl = document.getElementById('pomodoro-bg');
                if (bgEl) bgEl.style.backgroundImage = `url(${api.mediaUrl(setting.value)})`;
            }
        } catch { }
    }

    // ── Media Panel (Modal) ──
    async function showMediaPanel(type) {
        try {
            const media = await api.getMedia(type);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const isMusic = type === 'music';
            const isSound = type === 'sound';
            const isImage = type === 'image';

            const title = isImage ? '🖼️ Backgrounds' : isMusic ? '🎵 Music Playlist' : '🔊 Sounds';

            overlay.innerHTML = `
            <div class="modal" style="max-width:420px;">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" id="modal-close">✕</button>
                </div>

                ${isMusic || isSound ? `
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
                    <button class="media-pill active" id="modal-play-toggle" style="flex:1;justify-content:center;">
                        ${isMusic ? (musicPlaying ? '⏸ Pause' : '▶ Play All') : (soundPlaying ? '⏸ Pause' : '▶ Play')}
                    </button>
                    <div style="display:flex;align-items:center;gap:8px;flex:1;">
                        <span style="font-size:14px;">🔉</span>
                        <input type="range" class="volume-slider" id="modal-volume" min="0" max="100" value="${isMusic ? musicVolume : soundVolume}" style="flex:1;" />
                    </div>
                </div>` : ''}

                <div class="media-list" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                    ${media.length === 0 ? '<p class="text-muted" style="text-align:center;padding:24px;">No files yet. Upload below.</p>' : ''}
                    ${media.map((m, i) => `
                        <div class="media-item ${isMusic && i === musicIndex ? 'active' : ''}" data-idx="${i}" data-media-id="${m.id}" data-url="${m.url}" style="
                            display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
                            border-radius:10px;background:var(--bg-input);border:1px solid var(--border-color);cursor:pointer;transition:all 0.2s;">
                            <span style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${m.originalName || m.original_name}</span>
                            <button class="btn-del" data-delete-id="${m.id}" style="background:none;border:none;color:#ff3b30;font-size:16px;cursor:pointer;padding:4px 8px;">✕</button>
                        </div>
                    `).join('')}
                </div>

                <button class="btn btn-primary" id="modal-upload-btn" style="width:100%;margin-top:14px;">
                    + Upload ${isImage ? 'Image' : isMusic ? 'Music' : 'Sound'}
                </button>
                <input type="file" id="modal-file-input" accept="${isImage ? 'image/*' : 'audio/*'}" style="display:none" />
            </div>`;

            document.body.appendChild(overlay);

            overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

            // Play toggle
            overlay.querySelector('#modal-play-toggle')?.addEventListener('click', () => {
                if (isMusic) toggleMusicPlay();
                else if (isSound) toggleSoundPlay();
                const btn = overlay.querySelector('#modal-play-toggle');
                if (btn) {
                    if (isMusic) btn.textContent = musicPlaying ? '⏸ Pause' : '▶ Play All';
                    else btn.textContent = soundPlaying ? '⏸ Pause' : '▶ Play';
                }
            });

            // Volume
            overlay.querySelector('#modal-volume')?.addEventListener('input', (e) => {
                const v = parseInt(e.target.value);
                if (isMusic) { musicVolume = v; if (musicAudio) musicAudio.volume = v / 100; }
                else { soundVolume = v; if (soundAudio) soundAudio.volume = v / 100; }
            });

            // Select item
            overlay.querySelectorAll('[data-media-id]').forEach(row => {
                row.addEventListener('click', async (e) => {
                    if (e.target.closest('.btn-del')) return;
                    const url = row.dataset.url;
                    if (isImage) {
                        const bgEl = document.getElementById('pomodoro-bg');
                        if (bgEl) bgEl.style.backgroundImage = `url(${api.mediaUrl(url)})`;
                        await api.setSetting('pomodoro_bg', url);
                        showToast('Background updated! 🖼️');
                        overlay.remove();
                    } else if (isMusic) {
                        // Play this track from the full playlist
                        musicPlaylist = media;
                        localStorage.setItem('musicPlaylist', JSON.stringify(musicPlaylist));
                        const idx = parseInt(row.dataset.idx);
                        musicPlaying = true;
                        playMusicTrack(idx);
                        showToast('🎵 Now playing');
                        overlay.remove();
                    } else if (isSound) {
                        const m = media.find(x => x.id == row.dataset.mediaId);
                        if (m) { loadSoundTrack(m); soundPlaying = false; }
                        showToast('🔊 Sound selected');
                        overlay.remove();
                    }
                });
            });

            // Delete
            overlay.querySelectorAll('.btn-del').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this file?')) {
                        await api.deleteMedia(btn.dataset.deleteId);
                        overlay.remove();
                        showMediaPanel(type);
                    }
                });
            });

            // Upload
            overlay.querySelector('#modal-upload-btn').addEventListener('click', () => {
                overlay.querySelector('#modal-file-input').click();
            });
            overlay.querySelector('#modal-file-input').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    await api.uploadMedia(type, file);
                    showToast('Uploaded!');
                    overlay.remove();
                    showMediaPanel(type);
                } catch { showToast('Upload failed', 'error'); }
            });

        } catch { showToast('Failed to load media', 'error'); }
    }

    // ── Init ──
    render();

    if (isRunning) {
        if (remainingSeconds <= 0) completeSession();
        else startTimer();
    }

    return () => {
        clearInterval(timerInterval);
        if (musicAudio) { musicAudio.pause(); musicAudio = null; }
        if (soundAudio) { soundAudio.pause(); soundAudio = null; }
    };
}
