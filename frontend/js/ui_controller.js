/**
 * Контроллер интерфейса и реактивной аналитики «Су-Орта Азия».
 * Синхронизирует Three.js сцену, Chart.js графики, слайдеры и WebSocket телеметрию.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация 3D сцены и физического движка
  const sim = new HydrologySimulationClient();
  const visualizer = new WaterSimulation3D('canvas-3d');

  // DOM Элементы
  const managementSlider = document.getElementById('management-slider');
  const managementValueBox = document.getElementById('management-value-box');
  const globalUpdateToggle = document.getElementById('global-update-toggle');
  const koshTepaSlider = document.getElementById('kosh-tepa-slider');
  const koshTepaValue = document.getElementById('kosh-tepa-value');

  // Кнопки режимов камеры
  const btnViewCross = document.getElementById('btn-view-cross');
  const btnViewMap = document.getElementById('btn-view-map');

  // Кнопки сценариев
  const btnScenarioNormal = document.getElementById('sc-normal');
  const btnScenarioLowWater = document.getElementById('sc-low-water');
  const btnScenarioDrought = document.getElementById('sc-drought');
  const btnScenarioKoshTepa = document.getElementById('sc-kosh-tepa');
  const btnScenarioAccident = document.getElementById('sc-accident');

  // Метрики нижнего бара
  const metricDepletionRisk = document.getElementById('metric-depletion-risk');
  const metricEfficiency = document.getElementById('metric-efficiency');
  const metricEvapLoss = document.getElementById('metric-evap-loss');
  const metricFiltLoss = document.getElementById('metric-filt-loss');

  // Панель предупреждений
  const alertFeed = document.getElementById('alert-feed');

  // Модальная карточка инспектора IoT
  const inspectorCard = document.getElementById('inspector-card');
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorFlow = document.getElementById('insp-flow');
  const inspectorPressure = document.getElementById('insp-pressure');
  const inspectorMoisture = document.getElementById('insp-moisture');
  const inspectorSalinity = document.getElementById('insp-salinity');
  const inspectorLeakProb = document.getElementById('insp-leak-prob');
  const inspectorClose = document.getElementById('inspector-close');

  // Таблица городов
  const citiesTableBody = document.getElementById('cities-table-body');

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
          data: [0, 0, 0, 0, 0],
          backgroundColor: ['#ff334b', '#ffaa00', '#0ea5e9', '#10b981', '#a855f7'],
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
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#cbd5e1', font: { size: 10 } }
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
          backgroundColor: ['#00f0ff', '#ff334b', '#ffaa00', '#0ea5e9'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#cbd5e1', boxWidth: 10, font: { size: 10 } }
          }
        }
      }
    });
  }

  // 3. Функция синхронизации состояния
  function syncUI() {
    const data = sim.вычислить_баланс();

    // Обновление 3D сцены
    visualizer.обновить_параметры(
      sim.уровень_модернизации,
      sim.кош_тепа_отбор_км3,
      sim.засуха
    );

    // Нижние метрики (точно как в image_0.png)
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
        const badgeCol = info.статус === 'КРИТИЧЕСКИЙ' ? 'color: #ff334b;' : (info.статус === 'ТРЕВОГА' ? 'color: #ffaa00;' : 'color: #00ff9d;');
        tr.innerHTML = `
          <td style="padding: 4px 6px; font-weight: 600;">${c}</td>
          <td style="padding: 4px 6px; text-align: center; font-family: monospace;">${info.дефицит_процент}%</td>
          <td style="padding: 4px 6px; text-align: center; font-family: monospace;">${info.дни_до_истощения > 365 ? 'Стабильно' : info.дни_до_истощения + ' дн.'}</td>
          <td style="padding: 4px 6px; text-align: right; font-weight: 700; ${badgeCol}">${info.статус}</td>
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
    managementValueBox.textContent = val;
    syncUI();
    sendWebSocketUpdate({ уровень_модернизации: sim.уровень_модернизации });
  });

  koshTepaSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sim.кош_тепа_отбор_км3 = val;
    koshTepaValue.textContent = `${val.toFixed(1)} км³/год`;
    syncUI();
    sendWebSocketUpdate({ кош_тепа_отбор_км3: val });
  });

  globalUpdateToggle.addEventListener('change', (e) => {
    sim.глобальное_обновление = e.target.checked;
  });

  // 5. Переключение режимов 3D камеры
  btnViewCross.addEventListener('click', () => {
    btnViewCross.classList.add('active');
    btnViewMap.classList.remove('active');
    visualizer.переключить_режим('РАЗРЕЗ');
  });

  btnViewMap.addEventListener('click', () => {
    btnViewMap.classList.add('active');
    btnViewCross.classList.remove('active');
    visualizer.переключить_режим('КАРТА');
  });

  // 6. Сценарии
  function resetScenarios() {
    [btnScenarioNormal, btnScenarioLowWater, btnScenarioDrought, btnScenarioKoshTepa, btnScenarioAccident].forEach(b => {
      b.classList.remove('active');
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

  btnScenarioAccident.addEventListener('click', () => {
    resetScenarios();
    btnScenarioAccident.classList.add('active');
    sim.авария_утечка = true;
    syncUI();
  });

  // 7. Инспектор 3D объектов (Клик по IoT датчикам)
  window.onSelect3DObject = (data) => {
    if (data.type === 'IOT_SENSOR') {
      inspectorTitle.textContent = `${data.id}: ${data.name}`;
      
      const mod = sim.уровень_модернизации;
      const flow = (42.5 * (1.0 + (Math.random() - 0.5) * 0.05)).toFixed(2);
      const press = sim.авария_утечка ? "2.1 бар (ПАДЕНИЕ)" : (5.4 + mod * 0.8).toFixed(1) + " бар";
      const moist = (16.0 + mod * 26.0).toFixed(1) + " %";
      const sal = (2.8 * (1.0 - mod * 0.75)).toFixed(2) + " г/л";
      const leak = sim.авария_утечка ? "94 % (КРИТИЧЕСКАЯ УТЕЧКА)" : Math.max(1, Math.round(15 * (1.0 - mod))).toString() + " %";

      inspectorFlow.textContent = `${flow} м³/с`;
      inspectorPressure.textContent = press;
      inspectorMoisture.textContent = moist;
      inspectorSalinity.textContent = sal;
      inspectorLeakProb.textContent = leak;

      inspectorCard.style.display = 'block';
    }
  };

  inspectorClose.addEventListener('click', () => {
    inspectorCard.style.display = 'none';
  });

  // 8. WebSocket интеграция с Python бэкендом
  let ws = null;
  function connectWebSocket() {
    try {
      ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => {
        const dot = document.getElementById('ws-status-dot');
        const text = document.getElementById('ws-status-text');
        if (dot) dot.style.background = '#10b981';
        if (text) text.textContent = 'Python Бэкенд: Активен (WS)';
      };
      ws.onmessage = (evt) => {
        // При получении серверных данных
        try {
          const s = JSON.parse(evt.data);
          // Синхронизация с сервером
        } catch (e) {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
      };
    } catch (e) {}
  }
  connectWebSocket();

  function sendWebSocketUpdate(payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  // Первоначальная синхронизация
  syncUI();

  // Периодический цикл для живой телеметрии
  setInterval(() => {
    if (sim.глобальное_обновление) {
      syncUI();
    }
  }, 1200);
});
