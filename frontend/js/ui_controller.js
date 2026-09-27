/**
 * Контроллер интерфейса и реактивной аналитики «Су-Орта Азия».
 * Синхронизирует Three.js сцену, Chart.js графики, слайдеры, выноски и Студенческую лабораторию.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация 3D сцены и физического движка
  const sim = new HydrologySimulationClient();
  const visualizer = new WaterSimulation3D('canvas-3d', 'scene-callouts-container');

  // DOM Элементы управления
  const managementSlider = document.getElementById('management-slider');
  const managementValueBox = document.getElementById('management-value-box');
  const globalUpdateToggle = document.getElementById('global-update-toggle');
  const koshTepaSlider = document.getElementById('kosh-tepa-slider');
  const koshTepaValue = document.getElementById('kosh-tepa-value');

  // Кнопки переключения 3D режимов
  const btnViewMap = document.getElementById('btn-view-map');
  const btnViewDual = document.getElementById('btn-view-dual');
  const btnViewMorph = document.getElementById('btn-view-morph');

  // Кнопки сценариев
  const btnScenarioNormal = document.getElementById('sc-normal');
  const btnScenarioLowWater = document.getElementById('sc-low-water');
  const btnScenarioDrought = document.getElementById('sc-drought');
  const btnScenarioKoshTepa = document.getElementById('sc-kosh-tepa');
  const btnScenarioConsortium = document.getElementById('sc-consortium');

  // Метрики нижнего бара
  const metricDepletionRisk = document.getElementById('metric-depletion-risk');
  const metricEfficiency = document.getElementById('metric-efficiency');
  const metricEvapLoss = document.getElementById('metric-evap-loss');
  const metricFiltLoss = document.getElementById('metric-filt-loss');

  // Панель предупреждений и таблица городов
  const alertFeed = document.getElementById('alert-feed');
  const citiesTableBody = document.getElementById('cities-table-body');

  // Инспектор узла
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorDesc = document.getElementById('inspector-desc');

  // Быстрая навигация GIS по узлам
  const navChips = document.querySelectorAll('.nav-chip');
  navChips.forEach(chip => {
    chip.addEventListener('click', () => {
      navChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const nodeId = chip.dataset.node;
      if (nodeId === 'all') {
        visualizer.setCameraForMap();
      } else {
        visualizer.focusOnNode(nodeId);
      }
    });
  });

  // Событие выбора узла кликом по 3D маяку
  window.addEventListener('gis-node-selected', (e) => {
    const node = e.detail;
    if (inspectorTitle && inspectorDesc && node) {
      inspectorTitle.textContent = node.title;
      inspectorDesc.textContent = node.desc;
    }
  });

  // Модальные окна
  const btnOpenLab = document.getElementById('btn-open-lab');
  const btnCloseLab = document.getElementById('btn-close-lab');
  const labModal = document.getElementById('lab-modal');

  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnCloseHelp = document.getElementById('btn-close-help');
  const helpModal = document.getElementById('help-modal');

  if (btnOpenLab && labModal) {
    btnOpenLab.addEventListener('click', () => labModal.style.display = 'flex');
  }
  if (btnCloseLab && labModal) {
    btnCloseLab.addEventListener('click', () => labModal.style.display = 'none');
  }

  if (btnOpenHelp && helpModal) {
    btnOpenHelp.addEventListener('click', () => helpModal.style.display = 'flex');
  }
  if (btnCloseHelp && helpModal) {
    btnCloseHelp.addEventListener('click', () => helpModal.style.display = 'none');
  }

  window.addEventListener('click', (e) => {
    if (e.target === labModal) labModal.style.display = 'none';
    if (e.target === helpModal) helpModal.style.display = 'none';
  });

  // Вкладки студенческой лаборатории
  const labTabBtns = document.querySelectorAll('.lab-tab-btn');
  const labTabContents = document.querySelectorAll('.lab-tab-content');

  labTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      labTabBtns.forEach(b => b.classList.remove('active'));
      labTabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // 2. Инициализация графиков Chart.js
  let citiesChart, balanceChart;
  initCharts();

  function initCharts() {
    // График дефицита городов
    const ctxCities = document.getElementById('citiesChart').getContext('2d');
    citiesChart = new Chart(ctxCities, {
      type: 'bar',
      data: {
        labels: ['Ташкент', 'Алматы', 'Бишкек', 'Душанбе', 'Самарканд'],
        datasets: [{
          label: 'Дефицит воды (%)',
          data: [20, 19, 15, 16, 31],
          backgroundColor: ['#f43f5e', '#f59e0b', '#0ea5e9', '#10b981', '#a855f7'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#64748b', font: { size: 9, family: 'Inter' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 9, family: 'Inter' } }
          }
        }
      }
    });

    // График баланса бассейна
    const ctxBalance = document.getElementById('balanceChart').getContext('2d');
    balanceChart = new Chart(ctxBalance, {
      type: 'doughnut',
      data: {
        labels: ['Орошение оазисов', 'Фильтрация (потери)', 'Испарение', 'Сток в Арал'],
        datasets: [{
          data: [45, 30, 18, 7],
          backgroundColor: ['#00f0ff', '#f43f5e', '#f59e0b', '#0ea5e9'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#cbd5e1', boxWidth: 8, font: { size: 9, family: 'Inter' } }
          }
        }
      }
    });
  }

  // 3. Функция синхронизации состояния
  function syncUI() {
    const data = sim.вычислить_баланс();

    // Обновление параметров 3D сцены
    visualizer.обновить_состояние({
      уровень_модернизации: sim.уровень_модернизации,
      кош_тепа_отбор_км3: sim.кош_тепа_отбор_км3,
      засуха: sim.засуха,
      маловодный_год: sim.маловодный_год
    });

    // Нижние метрики
    metricDepletionRisk.textContent = data.риск_текст;
    if (sim.уровень_модернизации < 0.25) {
      metricDepletionRisk.className = 'metric-value critical';
    } else {
      metricDepletionRisk.className = 'metric-value sustainable';
    }

    metricEfficiency.textContent = `${data.эффективность_процент}%`;
    if (metricEvapLoss) metricEvapLoss.textContent = `${data.потери_испарение_км3} км³/год`;
    if (metricFiltLoss) metricFiltLoss.textContent = `${data.потери_фильтрация_км3} км³/год`;

    // График городов
    const cityNames = ['Ташкент', 'Алматы', 'Бишкек', 'Душанбе', 'Самарканд'];
    const deficits = cityNames.map(c => parseFloat(data.города[c].дефицит_процент));
    citiesChart.data.datasets[0].data = deficits;
    citiesChart.update();

    // График баланса
    const filt = parseFloat(data.потери_фильтрация_км3);
    const evap = parseFloat(data.потери_испарение_км3);
    const aral = parseFloat(data.приток_южный_арал_км3) + parseFloat(data.приток_северный_арал_км3);
    const ag = Math.max(10, 85 - (filt + evap + aral));
    balanceChart.data.datasets[0].data = [ag, filt, evap, aral];
    balanceChart.update();

    // Таблица городов
    if (citiesTableBody) {
      citiesTableBody.innerHTML = '';
      cityNames.forEach(c => {
        const info = data.города[c];
        const tr = document.createElement('tr');
        const badgeClass = info.статус === 'КРИТИЧЕСКИЙ' ? 'critical' : (info.статус === 'ТРЕВОГА' ? 'warning' : 'stable');
        tr.innerHTML = `
          <td style="font-weight: 600; color: #f1f5f9;">${c}</td>
          <td style="text-align: center; font-family: monospace;">${info.дефицит_процент}%</td>
          <td style="text-align: center; font-family: monospace;">${info.дни_до_истощения > 365 ? 'Стабильно' : info.дни_до_истощения + ' дн.'}</td>
          <td style="text-align: right;"><span class="status-tag ${badgeClass}">${info.статус}</span></td>
        `;
        citiesTableBody.appendChild(tr);
      });
    }

    // Лента предупреждений
    if (alertFeed) {
      alertFeed.innerHTML = '';
      data.предупреждения.forEach(a => {
        const div = document.createElement('div');
        div.className = `alert-item ${a.тип}`;
        div.textContent = a.текст;
        alertFeed.appendChild(div);
      });
    }
  }

  // 4. Слушатели слайдеров
  managementSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sim.уровень_модернизации = val / 100.0;
    managementValueBox.textContent = `${val}%`;
    syncUI();
  });

  koshTepaSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sim.кош_тепа_отбор_км3 = val;
    koshTepaValue.textContent = `${val.toFixed(1)} км³/год`;
    syncUI();
  });

  globalUpdateToggle.addEventListener('change', (e) => {
    sim.глобальное_обновление = e.target.checked;
  });

  // 5. Переключение 3D режимов
  function setActiveViewBtn(btn) {
    [btnViewMap, btnViewDual, btnViewMorph].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  btnViewMap.addEventListener('click', () => {
    setActiveViewBtn(btnViewMap);
    visualizer.переключить_режим('MAP');
  });

  btnViewDual.addEventListener('click', () => {
    setActiveViewBtn(btnViewDual);
    visualizer.переключить_режим('DUAL');
  });

  btnViewMorph.addEventListener('click', () => {
    setActiveViewBtn(btnViewMorph);
    visualizer.переключить_режим('MORPH');
  });

  // 6. Сценарии
  function resetScenarios() {
    [btnScenarioNormal, btnScenarioLowWater, btnScenarioDrought, btnScenarioKoshTepa, btnScenarioConsortium].forEach(b => {
      if (b) b.classList.remove('active');
    });
    sim.засуха = false;
    sim.маловодный_год = false;
    sim.авария_утечка = false;
  }

  btnScenarioNormal.addEventListener('click', () => {
    resetScenarios();
    btnScenarioNormal.classList.add('active');
    sim.кош_тепа_отбор_км3 = 0.0;
    koshTepaSlider.value = 0;
    koshTepaValue.textContent = "0.0 км³/год";
    syncUI();
  });

  btnScenarioLowWater.addEventListener('click', () => {
    resetScenarios();
    btnScenarioLowWater.classList.add('active');
    sim.маловодный_год = true;
    syncUI();
  });

  btnScenarioDrought.addEventListener('click', () => {
    resetScenarios();
    btnScenarioDrought.classList.add('active');
    sim.засуха = true;
    syncUI();
  });

  btnScenarioKoshTepa.addEventListener('click', () => {
    resetScenarios();
    btnScenarioKoshTepa.classList.add('active');
    sim.кош_тепа_отбор_км3 = 13.5;
    koshTepaSlider.value = 13.5;
    koshTepaValue.textContent = "13.5 км³/год";
    syncUI();
  });

  btnScenarioConsortium.addEventListener('click', () => {
    resetScenarios();
    btnScenarioConsortium.classList.add('active');
    sim.уровень_модернизации = 0.70;
    managementSlider.value = 70;
    managementValueBox.textContent = "70%";
    syncUI();
  });

  // Первоначальная синхронизация
  syncUI();

  // Автоматический цикл симуляции
  setInterval(() => {
    if (sim.глобальное_обновление) {
      syncUI();
    }
  }, 1200);
});
