/**
 * Контроллер интерфейса и реактивной аналитики «Су-Орта Азия».
 * Синхронизирует Three.js сцену, Chart.js графики, слайдеры, 4D таймлапс,
 * GIS слои, AI Диспетчер и Инженерный калькулятор ROI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация 3D сцены, физического движка, звука и локализации
  const sim = new HydrologySimulationClient();
  const visualizer = new WaterSimulation3D('canvas-3d', 'scene-callouts-container');

  // Web Audio API синтезатор и менеджер локализации i18n
  const audioSynth = typeof WaterAudioSynthesizer !== 'undefined' ? new WaterAudioSynthesizer() : null;
  window.audioSynth = audioSynth;

  const i18n = typeof I18nManager !== 'undefined' ? new I18nManager() : null;
  window.i18n = i18n;

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
  const btnViewDam = document.getElementById('btn-view-dam');

  // Кнопки сценариев
  const btnScenarioNormal = document.getElementById('sc-normal');
  const btnScenarioLowWater = document.getElementById('sc-low-water');
  const btnScenarioDrought = document.getElementById('sc-drought');
  const btnScenarioKoshTepa = document.getElementById('sc-kosh-tepa');
  const btnScenarioConsortium = document.getElementById('sc-consortium');

  // Виджеты звука, языка и погоды
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const soundIcon = document.getElementById('sound-icon');
  const langSelect = document.getElementById('lang-select');
  const weatherText = document.getElementById('weather-text');

  // Карточка IoT датчика
  const iotPopup = document.getElementById('iot-sensor-popup');
  const btnCloseSensorPopup = document.getElementById('btn-close-sensor-popup');
  const sensorPopupTitle = document.getElementById('sensor-popup-title');
  const sensorValFlow = document.getElementById('sensor-val-flow');
  const sensorValLevel = document.getElementById('sensor-val-level');
  const sensorValSal = document.getElementById('sensor-val-sal');
  const sensorValRssi = document.getElementById('sensor-val-rssi');

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

  // =========================================================================
  // 4D ВРЕМЕННАЯ ШКАЛА (1960–2050 гг.)
  // =========================================================================
  const timelineSlider = document.getElementById('timeline-slider');
  const currentYearDisplay = document.getElementById('current-year-display');
  const btnTimelinePlay = document.getElementById('btn-timeline-play');
  const playIcon = document.getElementById('play-icon');
  const timelineTicks = document.querySelectorAll('.timeline-ticks .tick');

  let timelinePlaying = false;
  let timelineInterval = null;

  function updateTimelineYear(year) {
    year = parseInt(year, 10);
    if (timelineSlider) timelineSlider.value = year;
    if (currentYearDisplay) currentYearDisplay.textContent = year;

    timelineTicks.forEach(t => {
      const ty = parseInt(t.dataset.year, 10);
      t.classList.toggle('active', Math.abs(ty - year) <= 5);
    });

    visualizer.установить_год(year);
  }

  if (timelineSlider) {
    timelineSlider.addEventListener('input', (e) => {
      updateTimelineYear(e.target.value);
    });
  }

  timelineTicks.forEach(tick => {
    tick.addEventListener('click', () => {
      const yr = parseInt(tick.dataset.year, 10);
      updateTimelineYear(yr);
    });
  });

  if (btnTimelinePlay) {
    btnTimelinePlay.addEventListener('click', () => {
      timelinePlaying = !timelinePlaying;
      if (timelinePlaying) {
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        timelineInterval = setInterval(() => {
          let yr = parseInt(timelineSlider.value, 10) + 1;
          if (yr > 2050) yr = 1960;
          updateTimelineYear(yr);
        }, 150);
      } else {
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        clearInterval(timelineInterval);
      }
    });
  }

  // =========================================================================
  // GIS СЛОИ (Спутник, Засоление, Влажность, Грунтовые воды)
  // =========================================================================
  const layerChips = document.querySelectorAll('.layer-chip');
  layerChips.forEach(chip => {
    chip.addEventListener('click', () => {
      layerChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const layer = chip.dataset.layer;
      visualizer.переключить_слой(layer);
    });
  });

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
    if (audioSynth) audioSynth.playRadarPing(760);
  });

  // Событие выбора IoT-сенсора
  if (btnCloseSensorPopup && iotPopup) {
    btnCloseSensorPopup.addEventListener('click', () => {
      iotPopup.style.display = 'none';
    });
  }

  window.addEventListener('iot-sensor-selected', (e) => {
    const s = e.detail;
    if (!s || !iotPopup) return;
    if (sensorPopupTitle) sensorPopupTitle.textContent = s.name || s.id;
    if (sensorValFlow) sensorValFlow.textContent = `${s.flow ? s.flow.toFixed(1) : '--'} м³/с`;
    if (sensorValLevel) sensorValLevel.textContent = `${s.level ? s.level.toFixed(2) : '--'} м`;
    if (sensorValSal) sensorValSal.textContent = `${s.sal ? s.sal.toFixed(2) : '--'} г/л`;
    if (sensorValRssi) sensorValRssi.textContent = `${s.rssi} dBm (LoRaWAN)`;
    iotPopup.style.display = 'block';

    if (audioSynth) {
      audioSynth.playRadarPing(920);
    }
  });

  // Управление звуком
  if (btnToggleSound && audioSynth) {
    btnToggleSound.addEventListener('click', () => {
      const active = audioSynth.toggleMute();
      if (soundIcon) soundIcon.textContent = active ? '🔊' : '🔇';
      btnToggleSound.classList.toggle('active', active);
    });
  }

  // Переключение языка i18n
  if (langSelect && i18n) {
    langSelect.addEventListener('change', (e) => {
      i18n.setLanguage(e.target.value);
    });
  }

  // Live погода через Open-Meteo
  async function fetchLiveWeather() {
    if (!weatherText) return;
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.2995&longitude=69.2401&current_weather=true');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json && json.current_weather) {
        const temp = json.current_weather.temperature;
        const wind = json.current_weather.windspeed;
        const sign = temp > 0 ? '+' : '';
        weatherText.textContent = `Ташкент ${sign}${temp}°C | ${wind} км/ч`;
      }
    } catch (e) {
      weatherText.textContent = 'Ташкент +24°C | 3.8 м/с';
    }
  }
  fetchLiveWeather();

  // =========================================================================
  // МОДАЛЬНОЕ ОКНО: AI ДИСПЕТЧЕР ВОДОДЕЛЕНИЯ
  // =========================================================================
  const btnOpenAi = document.getElementById('btn-open-ai');
  const btnCloseAi = document.getElementById('btn-close-ai');
  const aiModal = document.getElementById('ai-modal');
  const btnApplyAiPlan = document.getElementById('btn-apply-ai-plan');

  if (btnOpenAi && aiModal) {
    btnOpenAi.addEventListener('click', () => aiModal.style.display = 'flex');
  }
  if (btnCloseAi && aiModal) {
    btnCloseAi.addEventListener('click', () => aiModal.style.display = 'none');
  }

  if (btnApplyAiPlan) {
    btnApplyAiPlan.addEventListener('click', () => {
      // Применение Парето-оптимального режима:
      resetScenarios();
      btnScenarioConsortium.classList.add('active');
      sim.уровень_модернизации = 0.72;
      managementSlider.value = 72;
      managementValueBox.textContent = "72%";

      sim.кош_тепа_отбор_км3 = 4.5; // согласованная трансграничная квота
      koshTepaSlider.value = 4.5;
      koshTepaValue.textContent = "4.5 км³/год";

      syncUI();
      aiModal.style.display = 'none';

      // Уведомление в ленту
      if (alertFeed) {
        const notify = document.createElement('div');
        notify.className = 'alert-item stable';
        notify.style.background = 'rgba(16, 185, 129, 0.15)';
        notify.style.borderLeftColor = '#10b981';
        notify.textContent = '🚀 AI Диспетчер: Применен сбалансированный режим (Консорциум Токтогул-Нурек + 72% модернизация). Дефицит ликвидирован.';
        alertFeed.prepend(notify);
      }
    });
  }

  // =========================================================================
  // МОДАЛЬНЫЕ ОКНА: ЛАБОРАТОРИЯ, ROI КАЛЬКУЛЯТОР, СПРАВКА, ЭКСПОРТ
  // =========================================================================
  const btnOpenLab = document.getElementById('btn-open-lab');
  const btnCloseLab = document.getElementById('btn-close-lab');
  const labModal = document.getElementById('lab-modal');

  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnCloseHelp = document.getElementById('btn-close-help');
  const helpModal = document.getElementById('help-modal');

  const btnExportReport = document.getElementById('btn-export-report');

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

  if (btnExportReport) {
    btnExportReport.addEventListener('click', () => {
      window.print();
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === labModal) labModal.style.display = 'none';
    if (e.target === helpModal) helpModal.style.display = 'none';
    if (e.target === aiModal) aiModal.style.display = 'none';
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

  // Расчет в ROI калькуляторе
  const roiCanalKm = document.getElementById('roi-canal-km');
  const roiDripHa = document.getElementById('roi-drip-ha');
  const roiCropType = document.getElementById('roi-crop-type');
  const roiCapex = document.getElementById('roi-capex');
  const roiWaterSaved = document.getElementById('roi-water-saved');
  const roiCropProfit = document.getElementById('roi-crop-profit');
  const roiPayback = document.getElementById('roi-payback');

  function updateRoiCalc() {
    if (!roiCanalKm || !roiDripHa) return;
    const km = parseFloat(roiCanalKm.value) || 0;
    const ha = (parseFloat(roiDripHa.value) || 0) * 1000;
    const crop = roiCropType.value;

    const canalCostMln = km * 0.45;
    const dripCostMln = (ha * 1800) / 1e6;
    const totalCapexMln = canalCostMln + dripCostMln;

    const waterCanalKm3 = km * 0.0035;
    const waterDripKm3 = (ha * 6000) / 1e9;
    const totalWaterKm3 = waterCanalKm3 + waterDripKm3;

    let profitPerHa = 650;
    if (crop === 'orchard') profitPerHa = 1400;
    if (crop === 'wheat') profitPerHa = 420;

    const annualProfitMln = (ha * profitPerHa) / 1e6 + totalWaterKm3 * 15;
    const paybackYears = Math.max(1.2, totalCapexMln / Math.max(annualProfitMln, 1));

    if (roiCapex) roiCapex.textContent = `$${(totalCapexMln / 1000).toFixed(2)} млрд`;
    if (roiWaterSaved) roiWaterSaved.textContent = `+${totalWaterKm3.toFixed(1)} км³/год`;
    if (roiCropProfit) roiCropProfit.textContent = `+$${Math.round(annualProfitMln)} млн/год`;
    if (roiPayback) roiPayback.textContent = `${paybackYears.toFixed(1)} года`;
  }

  [roiCanalKm, roiDripHa, roiCropType].forEach(el => {
    if (el) el.addEventListener('input', updateRoiCalc);
  });
  updateRoiCalc();

  // Расчет в инженерной песочнице
  const sandboxMat = document.getElementById('sandbox-material');
  const sandboxQ0 = document.getElementById('sandbox-q0');
  const sandboxResult = document.getElementById('sandbox-result-box');

  function updateSandboxCalc() {
    if (!sandboxMat || !sandboxQ0 || !sandboxResult) return;
    const mat = sandboxMat.value;
    const q0 = parseFloat(sandboxQ0.value) || 200;

    let eff = 0.55;
    if (mat === 'clay') eff = 0.78;
    if (mat === 'concrete') eff = 0.92;
    if (mat === 'geomembrane') eff = 0.985;

    const qEnd = q0 * eff;
    const loss = q0 - qEnd;

    sandboxResult.innerHTML = `
      <div style="font-size: 0.85rem; font-weight: 700; color: #38bdf8;">
        КПД канала: ${(eff * 100).toFixed(1)}% | Доходит до потребителя: ${qEnd.toFixed(2)} м³/с (Потери: ${loss.toFixed(2)} м³/с)
      </div>
      <div style="font-size: 0.75rem; color: #cbd5e1; margin-top: 4px;">
        ${eff > 0.9 ? 'Предотвращен подъем минерализованных грунтовых вод и капиллярное засоление прилегающих земель.' : '⚠️ Высокий уровень фильтрации вызывает подтопление и солончаки (УГВ < 1.8 м).'}
      </div>
    `;
  }

  if (sandboxMat) sandboxMat.addEventListener('change', updateSandboxCalc);
  if (sandboxQ0) sandboxQ0.addEventListener('input', updateSandboxCalc);
  updateSandboxCalc();

  // 2. Инициализация графиков Chart.js
  let citiesChart, balanceChart;
  initCharts();

  function initCharts() {
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
    [btnViewMap, btnViewDual, btnViewMorph, btnViewDam].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  btnViewMap.addEventListener('click', () => {
    setActiveViewBtn(btnViewMap);
    visualizer.переключить_режим('MAP');
    if (audioSynth) audioSynth.playRadarPing(880);
  });

  btnViewDual.addEventListener('click', () => {
    setActiveViewBtn(btnViewDual);
    visualizer.переключить_режим('DUAL');
    if (audioSynth) audioSynth.playRadarPing(700);
  });

  btnViewMorph.addEventListener('click', () => {
    setActiveViewBtn(btnViewMorph);
    visualizer.переключить_режим('MORPH');
    if (audioSynth) audioSynth.playRadarPing(580);
  });

  if (btnViewDam) {
    btnViewDam.addEventListener('click', () => {
      setActiveViewBtn(btnViewDam);
      visualizer.переключить_режим('DAM');
      if (audioSynth) audioSynth.playRadarPing(500);
    });
  }

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
    if (audioSynth) audioSynth.playRadarPing(520);
    syncUI();
  });

  btnScenarioLowWater.addEventListener('click', () => {
    resetScenarios();
    btnScenarioLowWater.classList.add('active');
    sim.маловодный_год = true;
    if (audioSynth) audioSynth.playRadarPing(480);
    syncUI();
  });

  btnScenarioDrought.addEventListener('click', () => {
    resetScenarios();
    btnScenarioDrought.classList.add('active');
    sim.засуха = true;
    if (audioSynth) audioSynth.playAlertChirp();
    syncUI();
  });

  btnScenarioKoshTepa.addEventListener('click', () => {
    resetScenarios();
    btnScenarioKoshTepa.classList.add('active');
    sim.кош_тепа_отбор_км3 = 13.5;
    koshTepaSlider.value = 13.5;
    koshTepaValue.textContent = "13.5 км³/год";
    if (audioSynth) audioSynth.playAlertChirp();
    syncUI();
  });

  btnScenarioConsortium.addEventListener('click', () => {
    resetScenarios();
    btnScenarioConsortium.classList.add('active');
    sim.уровень_модернизации = 0.70;
    managementSlider.value = 70;
    managementValueBox.textContent = "70%";
    if (audioSynth) audioSynth.playRadarPing(660);
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
