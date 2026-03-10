import { api } from '../utils/api.js';
import { getToday, showToast, formatDate, getLocalISODate } from '../utils/formatters.js';

export function renderHabitDetail(params) {
    const app = document.getElementById('app');
    const habitId = params.id;
    let habit = null;
    let logs = [];
    let historyOffsetPeriods = 0;
    let strengthOffset = 0;

    async function loadHabitData() {
        try {
            habit = await api.getHabitById(habitId);
            logs = habit.logs || [];
            renderPage();
        } catch (err) {
            showToast('Failed to load habit details', 'error');
            window.location.hash = '#/habits';
        }
    }

    // ── EMA Score Engine ──
    function buildScoresMap() {
        const sortedLogs = [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
        const logMap = {};
        sortedLogs.forEach(l => logMap[l.logDate] = l);

        const today = new Date(getToday());
        const earliestStr = sortedLogs.length > 0 ? sortedLogs[0].logDate : getToday();
        const startOfTime = new Date(earliestStr);
        const limit = new Date(today);
        limit.setDate(limit.getDate() - 180);
        const timelineStart = startOfTime < limit ? startOfTime : limit;

        const alpha = 0.15;
        let prevEma = 0, streak = 0;
        const map = {};

        let cursor = new Date(timelineStart);
        while (cursor <= today) {
            const ds = getLocalISODate(cursor);
            const log = logMap[ds];
            const tv = parseFloat(habit.targetValue) || 1;
            const av = log ? (parseFloat(log.value) || 0) : 0;
            let dr = 0;

            if (habit.type === 'boolean') {
                dr = log && log.completed ? 1 : 0;
            } else if (habit.targetMode === 'at_least') {
                dr = Math.min(av / tv, 1);
                if (isNaN(dr)) dr = 0;
            } else {
                dr = (!log || (!log.completed && av === 0)) ? 1 : (av <= tv ? 1 : Math.max(0, 1 - (av - tv) / tv));
            }

            streak = dr === 1 ? streak + 1 : 0;
            prevEma = alpha * dr + (1 - alpha) * prevEma;
            map[ds] = Math.min((prevEma + Math.min(streak / 100, 0.15)) * 100, 100);
            cursor.setDate(cursor.getDate() + 1);
        }
        return map;
    }

    // ── Strength Line Chart ──
    function generateChartSVG() {
        const scoresMap = buildScoresMap();
        const today = new Date(getToday());

        const dayShift = strengthOffset * 30;
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - dayShift);
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29);

        const chartData = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
            const ds = getLocalISODate(cur);
            chartData.push({ date: new Date(cur), score: Math.round(scoresMap[ds] || 0) });
            cur.setDate(cur.getDate() + 1);
        }

        const W = 900, H = 400;
        const PL = 55, PR = 20, PT = 20, PB = 50;
        const gW = W - PL - PR, gH = H - PT - PB;

        const x = i => PL + (i / (chartData.length - 1)) * gW;
        const y = v => PT + gH - (v / 100) * gH;

        const grid = [0, 20, 40, 60, 80, 100].map(v => {
            const yy = y(v);
            return `<line x1="${PL}" y1="${yy}" x2="${W - PR}" y2="${yy}" stroke="var(--border-color)" stroke-width="1" opacity="0.3"/>
                    <text x="${PL - 10}" y="${yy + 5}" fill="var(--text-muted)" font-size="15" font-weight="500" text-anchor="end">${v}%</text>`;
        }).join('');

        const step = Math.max(1, Math.floor(chartData.length / 6));
        const xLabels = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1)
            .map(d => {
                const i = chartData.indexOf(d);
                return `<text x="${x(i)}" y="${H - 12}" fill="var(--text-muted)" font-size="14" font-weight="500" text-anchor="middle">${d.date.getDate()}/${d.date.getMonth() + 1}</text>`;
            }).join('');

        const pts = chartData.map((d, i) => `${x(i)},${y(d.score)}`).join(' ');
        const areaPath = `M${x(0)},${y(chartData[0].score)} ${chartData.map((d, i) => `L${x(i)},${y(d.score)}`).join(' ')} L${x(chartData.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

        const lastScore = chartData[chartData.length - 1].score;
        const lastX = x(chartData.length - 1);
        const lastY = y(lastScore);

        return `
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;">
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${habit.color}" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="${habit.color}" stop-opacity="0.02"/>
                </linearGradient>
            </defs>
            ${grid}
            <path d="${areaPath}" fill="url(#areaGrad)"/>
            <polyline fill="none" stroke="${habit.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
            ${chartData.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.score)}" r="4" fill="${habit.color}"/>`).join('')}
            <circle cx="${lastX}" cy="${lastY}" r="7" fill="${habit.color}" stroke="var(--bg-card)" stroke-width="3"/>
            <text x="${lastX}" y="${lastY - 14}" fill="${habit.color}" font-size="16" font-weight="700" text-anchor="middle">${lastScore}%</text>
            ${xLabels}
        </svg>`;
    }

    // ── History Calendar ──
    function getHistoryRange() {
        const today = new Date(getToday());
        const currentMonth = today.getMonth();
        const year = today.getFullYear();
        const monthShift = historyOffsetPeriods * 3;
        const endMonth = currentMonth - monthShift;
        const endDate = new Date(year, endMonth + 1, 0);
        const startDate = new Date(year, endMonth - 2, 1);
        return { startDate, endDate };
    }

    function generateCalendarGrid() {
        const { startDate, endDate } = getHistoryRange();
        const calStart = new Date(startDate);
        calStart.setDate(calStart.getDate() - calStart.getDay());

        const calEnd = new Date(endDate);
        if (calEnd.getDay() !== 6) calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()));

        const weeks = [];
        let curr = new Date(calStart);
        while (curr <= calEnd) {
            const week = [];
            for (let i = 0; i < 7; i++) { week.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
            weeks.push(week);
        }

        const monthsMap = {};
        weeks.forEach((w, i) => {
            const firstDay = w.find(d => d.getDate() === 1);
            if (firstDay) {
                const isJan = firstDay.getMonth() === 0;
                monthsMap[i] = firstDay.toLocaleString('en-US', { month: 'short' }) + (isJan ? ` ${firstDay.getFullYear()}` : '');
            } else if (i === 0) {
                monthsMap[i] = w[6].toLocaleString('en-US', { month: 'short', year: 'numeric' });
            }
        });

        let monthRowHtml = `<div style="display:grid;grid-template-columns:repeat(${weeks.length},1fr) 40px;margin-bottom:8px;">`;
        for (let i = 0; i < weeks.length; i++) {
            if (monthsMap[i]) monthRowHtml += `<div style="grid-column:${i + 1};font-size:13px;font-weight:500;color:var(--text-muted);white-space:nowrap;">${monthsMap[i]}</div>`;
        }
        monthRowHtml += `</div>`;

        let gridHtml = `<div style="display:grid;grid-template-columns:repeat(${weeks.length},1fr) 40px;gap:4px;">`;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayDateStr = getToday();

        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < weeks.length; col++) {
                const d = weeks[col][row];
                const dateStr = getLocalISODate(d);
                const log = logs.find(l => l.logDate === dateStr);

                let isCompleted = false;
                if (log) {
                    isCompleted = habit.type === 'boolean' ? log.completed :
                        (habit.targetMode === 'at_least' ? parseFloat(log.value) >= parseFloat(habit.targetValue) : parseFloat(log.value) <= parseFloat(habit.targetValue));
                }

                const isOuter = d < startDate || d > endDate;
                let bg = 'rgba(255,255,255,0.08)', color = 'var(--text-secondary)', fontWeight = 'normal', opacity = '1';

                if (isCompleted) { bg = habit.color; color = '#fff'; fontWeight = 'bold'; if (isOuter) opacity = '0.6'; }
                else if (dateStr > todayDateStr) opacity = '0.2';
                else if (isOuter) opacity = '0.3';

                gridHtml += `<div title="${dateStr}" style="background:${bg};color:${color};font-weight:${fontWeight};opacity:${opacity};display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:2px;aspect-ratio:1;user-select:none;">${d.getDate()}</div>`;
            }
            gridHtml += `<div style="display:flex;align-items:center;padding-left:8px;font-size:12px;color:var(--text-muted);">${dayNames[row]}</div>`;
        }
        gridHtml += `</div>`;

        const { startDate: ts, endDate: te } = getHistoryRange();
        return `
            <div style="width:100%;overflow-x:auto;padding-bottom:6px;">${monthRowHtml}${gridHtml}</div>
            <div style="font-size:11px;text-align:center;color:var(--text-muted);margin-top:12px;">Showing ${formatDate(ts)} – ${formatDate(te)}</div>`;
    }

    // ── Render ──
    function renderPage() {
        if (!habit) return;

        let targetText = habit.type === 'numeric'
            ? `${habit.targetMode === 'at_least' ? 'At least' : 'At most'} ${habit.targetValue} ${habit.unit || ''}`
            : 'Yes / No';

        app.innerHTML = `
            <div class="habit-detail-page animate-fade-in">
                <div class="habit-detail-header">
                    <button class="back-btn" id="back-btn">← Back</button>
                    <div class="habit-title">
                        <span class="habit-icon-large" style="background:${habit.color}20;color:${habit.color}">${habit.icon}</span>
                        <div class="title-text">
                            <h1 style="color:${habit.color}">${habit.name}</h1>
                            <p class="text-muted">Target: ${targetText}</p>
                        </div>
                    </div>
                </div>

                <div class="chart-section stagger">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <h2>Habit's Strength</h2>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button id="strength-prev" class="habits-date-btn">◀</button>
                            <span id="strength-label" style="font-size:13px;color:var(--text-muted);min-width:110px;text-align:center;">Last 30 Days</span>
                            <button id="strength-next" class="habits-date-btn" ${strengthOffset === 0 ? 'disabled style="opacity:0.3"' : ''}>▶</button>
                        </div>
                    </div>
                    <div id="strength-chart-container">
                        ${generateChartSVG()}
                    </div>
                </div>

                <div class="chart-section stagger">
                    <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <h2>History <span>(3 Months)</span></h2>
                        <div style="display:flex;gap:8px;">
                            <button id="history-prev" class="habits-date-btn">◀</button>
                            <button id="history-next" class="habits-date-btn" ${historyOffsetPeriods === 0 ? 'disabled style="opacity:0.3"' : ''}>▶</button>
                        </div>
                    </div>
                    <div id="calendar-container-inner">
                        ${generateCalendarGrid()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.hash = '#/habits';
        });

        // Strength navigation
        function refreshStrength() {
            document.getElementById('strength-chart-container').innerHTML = generateChartSVG();
            const label = document.getElementById('strength-label');
            if (label) {
                if (strengthOffset === 0) {
                    label.textContent = 'Last 30 Days';
                } else {
                    const today = new Date(getToday());
                    const end = new Date(today); end.setDate(end.getDate() - strengthOffset * 30);
                    const start = new Date(end); start.setDate(start.getDate() - 29);
                    label.textContent = `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`;
                }
            }
            const nextBtn = document.getElementById('strength-next');
            if (nextBtn) { nextBtn.disabled = strengthOffset === 0; nextBtn.style.opacity = strengthOffset === 0 ? '0.3' : '1'; }
        }

        document.getElementById('strength-prev')?.addEventListener('click', () => { strengthOffset++; refreshStrength(); });
        document.getElementById('strength-next')?.addEventListener('click', () => { if (strengthOffset > 0) { strengthOffset--; refreshStrength(); } });

        // History navigation
        document.getElementById('history-prev')?.addEventListener('click', () => {
            historyOffsetPeriods++;
            document.getElementById('calendar-container-inner').innerHTML = generateCalendarGrid();
            const btn = document.getElementById('history-next');
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        });
        document.getElementById('history-next')?.addEventListener('click', () => {
            if (historyOffsetPeriods > 0) {
                historyOffsetPeriods--;
                document.getElementById('calendar-container-inner').innerHTML = generateCalendarGrid();
                if (historyOffsetPeriods === 0) {
                    const btn = document.getElementById('history-next');
                    if (btn) { btn.disabled = true; btn.style.opacity = '0.3'; }
                }
            }
        });
    }

    loadHabitData();
    return () => { };
}
