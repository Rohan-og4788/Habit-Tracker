const STORAGE_KEY = 'habit-tracker-v1';
const defaultHabits = [
  { id: 'habit-1', name: 'Drink water', category: 'Health', completions: ['2026-11-01', '2026-11-02', '2026-11-03'] },
  { id: 'habit-2', name: 'Read 20 pages', category: 'Learning', completions: ['2026-11-01', '2026-11-03'] },
  { id: 'habit-3', name: 'Workout', category: 'Health', completions: ['2026-11-02'] }
];

const habitForm = document.getElementById('habitForm');
const habitNameInput = document.getElementById('habitName');
const habitCategoryInput = document.getElementById('habitCategory');
const habitList = document.getElementById('habitList');
const totalHabitsEl = document.getElementById('totalHabits');
const doneTodayEl = document.getElementById('doneToday');
const bestStreakEl = document.getElementById('bestStreak');
const todayLabel = document.getElementById('todayLabel');
const filterButtons = document.querySelectorAll('.filter-btn');

let activeFilter = 'all';
let habits = loadHabits();

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadHabits() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultHabits));
    return defaultHabits;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultHabits;
  } catch (error) {
    console.error('Failed to parse habits from localStorage', error);
    return defaultHabits;
  }
}

function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function calculateStreak(completions) {
  const completionsSet = new Set(completions);
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i += 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - i);
    const key = getDateKey(current);

    if (completionsSet.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getVisibleHabits() {
  return habits.filter((habit) => {
    const isDone = habit.completions.includes(getDateKey());

    if (activeFilter === 'done') return isDone;
    if (activeFilter === 'pending') return !isDone;
    return true;
  });
}

function renderStats() {
  const todayKey = getDateKey();
  const total = habits.length;
  const doneToday = habits.filter((habit) => habit.completions.includes(todayKey)).length;
  const bestStreak = habits.reduce((max, habit) => Math.max(max, calculateStreak(habit.completions)), 0);

  totalHabitsEl.textContent = total;
  doneTodayEl.textContent = doneToday;
  bestStreakEl.textContent = bestStreak;
}

function renderHabits() {
  const visibleHabits = getVisibleHabits();

  if (!visibleHabits.length) {
    habitList.innerHTML = '<div class="empty-state">No habits in this view yet. Try adding one above.</div>';
    return;
  }

  const todayKey = getDateKey();

  habitList.innerHTML = visibleHabits
    .map((habit) => {
      const streak = calculateStreak(habit.completions);
      const isDone = habit.completions.includes(todayKey);

      return `
        <article class="habit-item">
          <div class="habit-info">
            <div class="habit-name-row">
              <span class="habit-name">${habit.name}</span>
              <span class="badge">${habit.category}</span>
            </div>
            <div class="habit-meta">
              <span class="habit-stat">🔥 ${streak} day streak</span>
              <span>${habit.completions.length} completions</span>
            </div>
          </div>
          <button class="habit-toggle ${isDone ? 'done' : ''}" data-id="${habit.id}" type="button">
            ${isDone ? 'Completed' : 'Mark done'}
          </button>
        </article>
      `;
    })
    .join('');
}

function render() {
  renderStats();
  renderHabits();

  filterButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.filter === activeFilter);
  });
}

function addHabit(event) {
  event.preventDefault();

  const name = habitNameInput.value.trim();
  const category = habitCategoryInput.value;

  if (!name) return;

  habits.unshift({
    id: crypto.randomUUID(),
    name,
    category,
    completions: []
  });

  saveHabits();
  habitForm.reset();
  habitCategoryInput.value = 'Health';
  render();
}

function toggleHabit(habitId) {
  const todayKey = getDateKey();

  habits = habits.map((habit) => {
    if (habit.id !== habitId) return habit;

    const hasToday = habit.completions.includes(todayKey);
    const completions = hasToday
      ? habit.completions.filter((day) => day !== todayKey)
      : [...habit.completions, todayKey];

    return { ...habit, completions };
  });

  saveHabits();
  render();
}

habitForm.addEventListener('submit', addHabit);

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    render();
  });
});

habitList.addEventListener('click', (event) => {
  const button = event.target.closest('.habit-toggle');
  if (!button) return;
  toggleHabit(button.dataset.id);
});

todayLabel.textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

render();
