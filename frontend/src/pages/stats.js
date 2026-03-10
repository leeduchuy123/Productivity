import { api } from '../utils/api.js';
import { formatMinutes, showToast } from '../utils/formatters.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export function renderStats() {
    const app = document.getElementById('app');
    let currentPeriod = 'week';
    let chartInstance = null;

    async function loadStats() {
        try {
            const stats = await api.getStats({ period: currentPeriod });
            renderPage(stats);
        } catch (err) {
            showToast('Failed to load stats', 'error');
            renderPage(null);
        }
    }

    function renderPage(stats) {
        const summary = stats?.summary || { totalMinutes: 0, totalSessions: 0, averageMinutesPerDay: 0 };
        const dateRange = stats ? `${formatDateShort(stats.startDate)} — ${formatDateShort(stats.endDate)}` : '';

        app.innerHTML = `
      <div class="stats-page animate-fade-in">
        <h1 class="section-title">Statistics</h1>

        <!-- Period Selector -->
        <div class="period-selector">
          ${['day', 'week', 'month', 'year'].map(p => `
            <button class="period-btn ${p === currentPeriod ? 'active' : ''}" data-period="${p}">
              ${p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          `).join('')}
        </div>

        <div class="stats-date-range">${dateRange}</div>

        <!-- Summary Cards -->
        <div class="stats-summary">
          <div class="stat-card">
            <div class="stat-value">${formatMinutes(summary.totalMinutes)}</div>
            <div class="stat-label">Total Focus</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${summary.totalSessions}</div>
            <div class="stat-label">Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatMinutes(summary.averageMinutesPerDay)}</div>
            <div class="stat-label">Avg / Day</div>
          </div>
        </div>

        <!-- Chart -->
        <div class="chart-container">
          <div class="chart-title">Focus Time</div>
          <div class="chart-wrapper">
            <canvas id="stats-chart"></canvas>
          </div>
        </div>
      </div>
    `;

        // Render chart
        if (stats?.dataPoints) {
            renderChart(stats.dataPoints);
        }

        attachEventListeners();
    }

    function renderChart(dataPoints) {
        const ctx = document.getElementById('stats-chart');
        if (!ctx) return;

        if (chartInstance) {
            chartInstance.destroy();
        }

        const labels = dataPoints.map(dp => {
            const d = new Date(dp.date + 'T00:00:00');
            if (currentPeriod === 'day') return `${d.getHours()}:00`;
            if (currentPeriod === 'week') return d.toLocaleDateString('en', { weekday: 'short' });
            if (currentPeriod === 'month') return d.getDate().toString();
            return d.toLocaleDateString('en', { month: 'short' });
        });

        const data = dataPoints.map(dp => dp.totalMinutes);

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Focus Time (min)',
                    data,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#ff6b6b',
                    pointBorderColor: '#1a1a2e',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#e8e8f0',
                        bodyColor: '#e8e8f0',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            label: (ctx) => `${formatMinutes(ctx.parsed.y)} focus time`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                        ticks: { color: '#6a6a85', font: { size: 11, family: 'Inter' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
                        ticks: {
                            color: '#6a6a85',
                            font: { size: 11, family: 'Inter' },
                            callback: (val) => formatMinutes(val)
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }

    function attachEventListeners() {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPeriod = btn.dataset.period;
                loadStats();
            });
        });
    }

    function formatDateShort(dateStr) {
        return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }

    loadStats();

    return () => {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    };
}
