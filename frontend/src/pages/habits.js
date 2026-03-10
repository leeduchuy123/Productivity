import { api } from '../utils/api.js';
import { getToday, showToast, formatDate, getLocalISODate } from '../utils/formatters.js';

const ICONS = ['✅', '📚', '💧', '🏋️', '🧘', '💊', '🥗', '🚶', '📝', '🎵', '💤', '🌅', '🧹', '🚫', '💰', '🎯'];
const COLORS = ['#ff6b6b', '#ffa502', '#2ed573', '#3742fa', '#a855f7', '#00d2d3', '#ff4757', '#1e90ff', '#ff6348', '#7bed9f'];

export function renderHabits() {
  const app = document.getElementById('app');
  let currentDate = getToday();
  let habits = [];

  async function loadHabits() {
    try {
      habits = await api.getHabits(currentDate);
      renderPage();
    } catch (err) {
      showToast('Failed to load habits', 'error');
      renderPage();
    }
  }

  function renderPage() {
    const dateObj = new Date(currentDate + 'T00:00:00');
    const isToday = currentDate === getToday();

    app.innerHTML = `
      <div class="habits-page animate-fade-in">
        <div class="habits-header">
          <h1 class="section-title">Habits</h1>
          <div class="habits-date-nav">
            <button class="habits-date-btn" id="date-prev">◀</button>
            <span class="habits-date">${isToday ? 'Today' : formatDate(dateObj)}</span>
            <button class="habits-date-btn" id="date-next" ${isToday ? 'disabled style="opacity:0.3"' : ''}>▶</button>
          </div>
        </div>

        <div class="habit-list stagger" id="habit-list">
          ${habits.length === 0 ? `
            <div class="habits-empty">
              <div class="habits-empty-icon">🌱</div>
              <div class="habits-empty-text">No habits yet</div>
              <p class="text-muted">Start building good habits today</p>
            </div>
          ` : habits.map(h => renderHabitCard(h)).join('')}
        </div>

        <button class="add-habit-btn" id="add-habit-btn">
          <span>+</span> Add Habit
        </button>
      </div>
    `;

    attachEventListeners();
  }

  function renderHabitCard(h) {
    const progress = h.progress || 0;
    const r = 18;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress / 100);

    const isCompleted = h.type === 'boolean' && h.todayLog?.completed;
    const currentValue = h.type === 'numeric' && h.todayLog ? parseFloat(h.todayLog.value || 0) : 0;

    let metaText = '';
    if (h.type === 'numeric') {
      metaText = `${h.targetMode === 'at_least' ? 'At least' : 'At most'} ${h.targetValue} ${h.unit || ''}`;
    } else {
      metaText = 'Yes / No';
    }

    return `
      <div class="habit-card" style="--habit-color: ${h.color}" data-habit-id="${h.id}">
        <button class="habit-delete-btn" data-delete-id="${h.id}" title="Delete">✕</button>
        <div class="habit-icon">${h.icon}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-meta">${metaText}</div>
        </div>
        <div class="habit-progress">
          <svg class="habit-progress-ring" viewBox="0 0 44 44">
            <circle class="habit-progress-bg" cx="22" cy="22" r="${r}" />
            <circle class="habit-progress-fill" cx="22" cy="22" r="${r}"
              stroke="${h.color}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
            />
          </svg>
          <span class="habit-progress-text" style="color:${h.color}">${progress}%</span>
        </div>
        <div class="habit-action">
          ${h.type === 'boolean' ? `
            <button class="habit-check ${isCompleted ? 'checked' : ''}" data-check-id="${h.id}">
              ${isCompleted ? '✓' : ''}
            </button>
          ` : `
            <input type="number" class="habit-numeric-input" data-numeric-id="${h.id}"
              value="${currentValue}" step="0.5" min="0" placeholder="0" />
            <span class="habit-unit">${h.unit || ''}</span>
          `}
        </div>
      </div>
    `;
  }

  function attachEventListeners() {
    // Date navigation
    document.getElementById('date-prev')?.addEventListener('click', () => {
      const parts = currentDate.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() - 1);
      currentDate = getLocalISODate(d);
      loadHabits();
    });

    document.getElementById('date-next')?.addEventListener('click', () => {
      const parts = currentDate.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      const nextDateStr = getLocalISODate(d);
      if (nextDateStr <= getToday()) {
        currentDate = nextDateStr;
        loadHabits();
      }
    });

    // Add habit
    document.getElementById('add-habit-btn')?.addEventListener('click', showHabitModal);

    // Toggle boolean habit
    document.querySelectorAll('.habit-check').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.checkId;
        const isChecked = btn.classList.contains('checked');
        try {
          await api.logHabit(id, { date: currentDate, completed: !isChecked });
          await loadHabits();
          if (!isChecked) showToast('✅ Habit completed!');
        } catch (err) {
          showToast('Failed to update', 'error');
        }
      });
    });

    // Numeric habit input
    document.querySelectorAll('.habit-numeric-input').forEach(input => {
      let debounceTimer;
      input.addEventListener('change', async () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const id = input.dataset.numericId;
          const value = parseFloat(input.value) || 0;
          try {
            await api.logHabit(id, { date: currentDate, value, completed: value > 0 });
            await loadHabits();
          } catch (err) {
            showToast('Failed to update', 'error');
          }
        }, 500);
      });
    });

    // Delete habit
    document.querySelectorAll('.habit-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this habit?')) {
          try {
            await api.deleteHabit(btn.dataset.deleteId);
            showToast('Habit deleted');
            await loadHabits();
          } catch (err) {
            showToast('Failed to delete', 'error');
          }
        }
      });
    });

    // Navigate to Habit Detail
    document.querySelectorAll('.habit-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const isActionBtn = e.target.closest('.habit-action') ||
          e.target.closest('.habit-delete-btn') ||
          e.target.closest('button') || e.target.closest('input');
        if (!isActionBtn) {
          window.location.hash = `#/habit/${card.dataset.habitId}`;
        }
      });
      card.style.cursor = 'pointer';
    });
  }

  function showHabitModal(editHabit = null) {
    const isEdit = editHabit && typeof editHabit === 'object' && editHabit.id;
    const initial = isEdit ? editHabit : {
      name: '', type: 'boolean', targetValue: '', targetMode: 'at_least', unit: '', icon: '✅', color: '#ff6b6b'
    };

    let habitType = initial.type;
    let selectedIcon = initial.icon;
    let selectedColor = initial.color;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    function renderModal() {
      overlay.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${isEdit ? 'Edit Habit' : 'New Habit'}</h2>
            <button class="modal-close" id="modal-close">✕</button>
          </div>

          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" id="habit-name" placeholder="e.g. Drink water" value="${initial.name}" />
          </div>

          <div class="form-group">
            <label class="form-label">Type</label>
            <div class="type-toggle">
              <button class="type-toggle-btn ${habitType === 'boolean' ? 'active' : ''}" data-type="boolean">Yes / No</button>
              <button class="type-toggle-btn ${habitType === 'numeric' ? 'active' : ''}" data-type="numeric">Measurable</button>
            </div>
          </div>

          ${habitType === 'numeric' ? `
            <div class="form-group">
              <label class="form-label">Target</label>
              <div class="form-row">
                <select class="form-input" id="habit-target-mode">
                  <option value="at_least" ${initial.targetMode === 'at_least' ? 'selected' : ''}>At least</option>
                  <option value="at_most" ${initial.targetMode === 'at_most' ? 'selected' : ''}>At most</option>
                </select>
                <input type="number" class="form-input" id="habit-target-value" placeholder="8" value="${initial.targetValue || ''}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Unit</label>
              <input type="text" class="form-input" id="habit-unit" placeholder="e.g. glasses, pages, km" value="${initial.unit || ''}" />
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Icon</label>
            <div class="emoji-grid">
              ${ICONS.map(icon => `
                <button class="emoji-option ${icon === selectedIcon ? 'active' : ''}" data-icon="${icon}">${icon}</button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-grid">
              ${COLORS.map(color => `
                <button class="color-option ${color === selectedColor ? 'active' : ''}" data-color="${color}"
                  style="background:${color}; color:${color}"></button>
              `).join('')}
            </div>
          </div>

          <button class="btn btn-primary" id="save-habit-btn" style="width:100%;margin-top:12px">
            ${isEdit ? 'Update Habit' : 'Create Habit'}
          </button>
        </div>
      `;

      // Events
      overlay.querySelector('#modal-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelectorAll('.type-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          habitType = btn.dataset.type;
          renderModal();
        });
      });

      overlay.querySelectorAll('.emoji-option').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          overlay.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      overlay.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = btn.dataset.color;
          overlay.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      overlay.querySelector('#save-habit-btn').addEventListener('click', async () => {
        const name = overlay.querySelector('#habit-name').value.trim();
        if (!name) { showToast('Please enter a name', 'error'); return; }

        const data = {
          name,
          type: habitType,
          icon: selectedIcon,
          color: selectedColor
        };

        if (habitType === 'numeric') {
          data.targetValue = parseFloat(overlay.querySelector('#habit-target-value')?.value) || 1;
          data.targetMode = overlay.querySelector('#habit-target-mode')?.value || 'at_least';
          data.unit = overlay.querySelector('#habit-unit')?.value || '';
        }

        try {
          if (isEdit) {
            await api.updateHabit(initial.id, data);
            showToast('Habit updated! ✅');
          } else {
            await api.createHabit(data);
            showToast('Habit created! 🎉');
          }
          overlay.remove();
          await loadHabits();
        } catch (err) {
          showToast('Failed to save habit', 'error');
        }
      });
    }

    document.body.appendChild(overlay);
    renderModal();
  }

  loadHabits();

  return () => { };
}
