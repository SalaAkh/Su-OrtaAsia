/**
 * СУ-ОРТА АЗИЯ — Интерактивный презентационный лендинг.
 * Логика: живой калькулятор модернизации и водного баланса,
 * плавный скроллинг, анимация счетчиков и передача параметров в ГИС симулятор.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Навбар: добавление класса при скролле
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // 2. Интерактивный калькулятор эффекта модернизации
  const calcSlider = document.getElementById('calc-slider');
  const calcSliderVal = document.getElementById('calc-slider-val');
  const calcScenarioChips = document.querySelectorAll('.calc-chip');

  // Результаты
  const resSavings = document.getElementById('res-savings');
  const resEfficiency = document.getElementById('res-efficiency');
  const resDeficit = document.getElementById('res-deficit');
  const resAral = document.getElementById('res-aral');
  const resRoi = document.getElementById('res-roi');
  const btnLaunchWithParams = document.getElementById('btn-launch-with-params');

  let currentScenario = 'normal'; // normal, drought, kosh-tepa

  function updateCalculator() {
    const mod = parseInt(calcSlider.value, 10);
    calcSliderVal.textContent = `${mod}%`;

    // Базовые расчеты
    let baseDeficit = 28.5; // %
    let baseSavingsMax = 24.5; // км³/год
    let koshPenalty = 0;

    if (currentScenario === 'drought') {
      baseDeficit = 42.0;
    } else if (currentScenario === 'kosh-tepa') {
      baseDeficit = 48.0;
      koshPenalty = 15.0;
    }

    // Сэкономленный объем воды
    const saved = ((mod / 100) * baseSavingsMax).toFixed(1);
    resSavings.textContent = `+${saved} км³`;

    // Эффективность сети
    const eff = Math.round(35 + (mod * 0.65));
    resEfficiency.textContent = `${eff}%`;

    // Дефицит городов
    const remainingDeficit = Math.max(1.8, (baseDeficit - (mod * 0.38))).toFixed(1);
    resDeficit.textContent = `${remainingDeficit}%`;
    if (remainingDeficit < 8) {
      resDeficit.className = 'res-val green';
    } else if (remainingDeficit < 22) {
      resDeficit.className = 'res-val amber';
    } else {
      resDeficit.className = 'res-val';
    }

    // Приток в Северный Арал
    const aralFlow = (2.1 + (mod * 0.085)).toFixed(1);
    resAral.textContent = `${aralFlow} км³/год`;

    // Совокупная экономия (ROI)
    const roiVal = (mod * 0.032).toFixed(1);
    resRoi.textContent = `$${roiVal} млрд`;

    // Обновление ссылки кнопки запуска
    if (btnLaunchWithParams) {
      btnLaunchWithParams.href = `/app.html?mod=${mod}&sc=${currentScenario}`;
    }
  }

  if (calcSlider) {
    calcSlider.addEventListener('input', updateCalculator);
  }

  calcScenarioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      calcScenarioChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentScenario = chip.dataset.scenario;
      updateCalculator();
    });
  });

  // Инициализация калькулятора
  updateCalculator();

  // 3. Плавная анимация числовых счетчиков при скролле
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  function runCounterAnimation() {
    if (animated) return;
    const statsSection = document.querySelector('.hero-stats-grid');
    if (!statsSection) return;

    const rect = statsSection.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom >= 0) {
      animated = true;
      statNumbers.forEach(stat => {
        stat.style.opacity = '1';
      });
    }
  }

  window.addEventListener('scroll', runCounterAnimation);
  runCounterAnimation();
});
