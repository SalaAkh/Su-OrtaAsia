/**
 * Контроллер интерфейса и реактивной аналитики «Су-Орта Азия».
 * Синхронизирует Three.js сцену, Chart.js графики, слайдеры, 4D таймлапс,
 * GIS слои, AI Диспетчер и Инженерный калькулятор ROI.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация GIS карты, 3D сцены, физического движка, звука и локализации
  const sim = new HydrologySimulationClient();
  const visualizer = new WaterSimulation3D('canvas-3d', 'scene-callouts-container');
  const gisMap = typeof WaterGisMap !== 'undefined' ? new WaterGisMap('gis-map') : null;
  window.gisMap = gisMap;

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

  // Кнопки переключения картографии и 3D режимов
  const btnViewSat = document.getElementById('btn-view-sat');
  const btnViewTopo = document.getElementById('btn-view-topo');
  const btnViewDark = document.getElementById('btn-view-dark');
  const btnViewDam = document.getElementById('btn-view-dam');
  const btnViewDual = document.getElementById('btn-view-dual');

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
    if (gisMap) gisMap.установить_год(year);
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
      if (gisMap) {
        if (layer === 'satellite') gisMap.setBaseLayer('satellite');
        else if (layer === 'salinity') gisMap.setBaseLayer('dark');
        else if (layer === 'moisture') gisMap.setBaseLayer('topo');
        else if (layer === 'groundwater') gisMap.setBaseLayer('dark');
      }
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
        if (gisMap) gisMap.resetView();
        visualizer.setCameraForMap();
      } else {
        if (gisMap) gisMap.focusOnNode(nodeId);
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

  // =========================================================================
  // УПРАВЛЕНИЕ БОКОВОЙ ПАНЕЛЬЮ (SLIDING SIDEBAR) & ВКЛАДКАМИ
  // =========================================================================
  const hudSidebar = document.getElementById('hud-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const btnOpenSidebarFloating = document.getElementById('btn-open-sidebar-floating');
  const sidebarTabBtns = document.querySelectorAll('.sidebar-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function setSidebarOpen(open) {
    if (!hudSidebar) return;
    hudSidebar.classList.toggle('collapsed', !open);
    if (btnToggleSidebar) btnToggleSidebar.classList.toggle('active', open);
    if (btnOpenSidebarFloating) btnOpenSidebarFloating.style.display = open ? 'none' : 'flex';

    // Инвалидируем размер карты Leaflet и 3D сцены для плавного масштабирования
    setTimeout(() => {
      if (gisMap && gisMap.map) gisMap.map.invalidateSize();
      if (visualizer && visualizer.onWindowResize) visualizer.onWindowResize();
    }, 320);
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      const isCollapsed = hudSidebar && hudSidebar.classList.contains('collapsed');
      setSidebarOpen(isCollapsed);
    });
  }

  if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener('click', () => {
      setSidebarOpen(false);
    });
  }

  if (btnOpenSidebarFloating) {
    btnOpenSidebarFloating.addEventListener('click', () => {
      setSidebarOpen(true);
    });
  }

  // Переключение вкладок в панели управления
  sidebarTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarTabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTabId = btn.dataset.tab;
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) targetPane.classList.add('active');

      // Ресайз графиков Chart.js при переходе на вкладку Аналитики
      if (targetTabId === 'tab-analytics') {
        setTimeout(() => {
          if (typeof citiesChart !== 'undefined' && citiesChart) citiesChart.resize();
          if (typeof balanceChart !== 'undefined' && balanceChart) balanceChart.resize();
        }, 50);
      }
    });
  });

  // Горячая клавиша для быстрого переключения панели (~ / ` / Alt+B)
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~' || (e.altKey && e.key.toLowerCase() === 'b')) {
      e.preventDefault();
      const isCollapsed = hudSidebar && hudSidebar.classList.contains('collapsed');
      setSidebarOpen(isCollapsed);
    }
  });

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

  // Элементы тренажера инженерных миссий
  const btnOpenMissions = document.getElementById('btn-open-missions');
  const btnCloseMissions = document.getElementById('btn-close-missions');
  const missionsModal = document.getElementById('missions-modal');

  // Элементы официального отчета
  const reportModal = document.getElementById('report-modal');
  const btnCloseReport = document.getElementById('btn-close-report');
  const btnPrintReportAction = document.getElementById('btn-print-report-action');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportCsv = document.getElementById('btn-export-csv');

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

  if (btnOpenMissions && missionsModal) {
    btnOpenMissions.addEventListener('click', () => {
      missionsModal.style.display = 'flex';
      if (audioSynth) audioSynth.playRadarPing(840);
    });
  }
  if (btnCloseMissions && missionsModal) {
    btnCloseMissions.addEventListener('click', () => missionsModal.style.display = 'none');
  }

  if (btnExportReport) {
    btnExportReport.addEventListener('click', () => {
      openOfficialReport();
    });
  }

  if (btnCloseReport && reportModal) {
    btnCloseReport.addEventListener('click', () => reportModal.style.display = 'none');
  }

  if (btnPrintReportAction) {
    btnPrintReportAction.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      exportReportJSON();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      exportReportCSV();
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === labModal) labModal.style.display = 'none';
    if (e.target === helpModal) helpModal.style.display = 'none';
    if (e.target === aiModal) aiModal.style.display = 'none';
    if (e.target === missionsModal) missionsModal.style.display = 'none';
    if (e.target === reportModal) reportModal.style.display = 'none';
  });

  // =========================================================================
  // ЛОГИКА СИТУАЦИОННОГО ТРЕНАЖЕРА (ИНЖЕНЕРНЫЕ МИССИИ)
  // =========================================================================
  const missionTabBtns = document.querySelectorAll('.mission-tab-btn');
  missionTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      missionTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.mission-view').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetView = document.getElementById(`mission-view-${btn.dataset.mission}`);
      if (targetView) targetView.classList.add('active');
      if (audioSynth) audioSynth.playRadarPing(720);
    });
  });

  // --- Миссия 1: Кош-Тепа и засуха ---
  const m1LeverLining = document.getElementById('m1-lever-lining');
  const m1LeverDrip = document.getElementById('m1-lever-drip');
  const m1LeverIot = document.getElementById('m1-lever-iot');
  const m1LeverPact = document.getElementById('m1-lever-pact');

  const m1SpentVal = document.getElementById('m1-spent-val');
  const m1BudgetBar = document.getElementById('m1-budget-bar');
  const m1SavedWater = document.getElementById('m1-saved-water');
  const m1RemainingDeficit = document.getElementById('m1-remaining-deficit');
  const m1Score = document.getElementById('m1-score');
  const m1Rank = document.getElementById('m1-rank');
  const btnM1Apply = document.getElementById('btn-m1-apply');
  const btnM1Reset = document.getElementById('btn-m1-reset');

  function updateM1Evaluation() {
    let spent = 0;
    let saved = 0;
    let score = 0;

    if (m1LeverLining && m1LeverLining.checked) { spent += 140; saved += 2.8; score += 35; }
    if (m1LeverDrip && m1LeverDrip.checked) { spent += 190; saved += 3.4; score += 40; }
    if (m1LeverIot && m1LeverIot.checked) { spent += 50; saved += 0.9; score += 15; }
    if (m1LeverPact && m1LeverPact.checked) { spent += 70; saved += 2.5; score += 25; }

    const budgetLimit = 450;
    const isOverbudget = spent > budgetLimit;
    const pct = Math.min(100, (spent / budgetLimit) * 100);

    if (m1SpentVal) m1SpentVal.textContent = `$${spent} млн / $${budgetLimit} млн`;
    if (m1BudgetBar) {
      m1BudgetBar.style.width = `${pct}%`;
      m1BudgetBar.classList.toggle('danger', isOverbudget);
    }

    if (m1SavedWater) m1SavedWater.textContent = `+${saved.toFixed(1)} км³/год`;

    // Исходный дефицит 44%
    const baseDeficit = 44.0;
    const deficitReduction = saved * 4.6;
    const finalDeficit = Math.max(2.1, baseDeficit - deficitReduction);

    if (m1RemainingDeficit) {
      m1RemainingDeficit.textContent = `${finalDeficit.toFixed(1)}%`;
      m1RemainingDeficit.style.color = finalDeficit <= 5.0 ? '#10b981' : (finalDeficit <= 18.0 ? '#fbbf24' : '#ef4444');
    }

    if (isOverbudget) {
      score = Math.max(0, score - 30);
    }

    if (m1Score) m1Score.textContent = `${score} / 100`;
    if (m1Rank) {
      if (score >= 90) {
        m1Rank.className = 'rank-tag gold';
        m1Rank.textContent = 'Золотой стандарт МКВК';
      } else if (score >= 70) {
        m1Rank.className = 'rank-tag silver';
        m1Rank.textContent = 'Успешное сдерживание';
      } else if (score > 0) {
        m1Rank.className = 'rank-tag failed';
        m1Rank.textContent = isOverbudget ? 'Превышен лимит бюджета!' : 'Критический дефицит сохраняется';
      } else {
        m1Rank.className = 'rank-tag unrated';
        m1Rank.textContent = 'Ожидание решения';
      }
    }
  }

  [m1LeverLining, m1LeverDrip, m1LeverIot, m1LeverPact].forEach(el => {
    if (el) el.addEventListener('change', updateM1Evaluation);
  });

  if (btnM1Reset) {
    btnM1Reset.addEventListener('click', () => {
      [m1LeverLining, m1LeverDrip, m1LeverIot, m1LeverPact].forEach(el => { if (el) el.checked = false; });
      updateM1Evaluation();
    });
  }

  if (btnM1Apply) {
    btnM1Apply.addEventListener('click', () => {
      sim.маловодный_год = true;
      sim.засуха = true;
      const pact = m1LeverPact && m1LeverPact.checked;
      sim.кош_тепа_отбор_км3 = pact ? 6.5 : 11.5;

      let mod = 0.15;
      if (m1LeverLining && m1LeverLining.checked) mod += 0.30;
      if (m1LeverDrip && m1LeverDrip.checked) mod += 0.35;
      if (m1LeverIot && m1LeverIot.checked) mod += 0.15;
      sim.уровень_модернизации = Math.min(1.0, mod);

      if (managementSlider) {
        managementSlider.value = Math.round(sim.уровень_модернизации * 100);
        if (managementValueBox) managementValueBox.textContent = `${managementSlider.value}%`;
      }
      if (koshTepaSlider) {
        koshTepaSlider.value = sim.кош_тепа_отбор_км3;
        if (koshTepaValue) koshTepaValue.textContent = `${sim.кош_тепа_отбор_км3.toFixed(1)} км³/год`;
      }

      syncUI();
      if (missionsModal) missionsModal.style.display = 'none';
      if (audioSynth) audioSynth.playNotificationChime();
    });
  }

  // --- Миссия 2: Программа «Кокарал-2» ---
  const m2LeverRice = document.getElementById('m2-lever-rice');
  const m2LeverDam = document.getElementById('m2-lever-dam');
  const m2LeverDelta = document.getElementById('m2-lever-delta');

  const m2SpentVal = document.getElementById('m2-spent-val');
  const m2BudgetBar = document.getElementById('m2-budget-bar');
  const m2AralInflow = document.getElementById('m2-aral-inflow');
  const m2Salinity = document.getElementById('m2-salinity');
  const m2Score = document.getElementById('m2-score');
  const m2Rank = document.getElementById('m2-rank');
  const btnM2Apply = document.getElementById('btn-m2-apply');
  const btnM2Reset = document.getElementById('btn-m2-reset');

  function updateM2Evaluation() {
    let spent = 0;
    let extraInflow = 0;
    let score = 0;

    if (m2LeverRice && m2LeverRice.checked) { spent += 110; extraInflow += 1.9; score += 35; }
    if (m2LeverDam && m2LeverDam.checked) { spent += 130; extraInflow += 1.8; score += 45; }
    if (m2LeverDelta && m2LeverDelta.checked) { spent += 80; extraInflow += 0.8; score += 20; }

    const budgetLimit = 320;
    const isOverbudget = spent > budgetLimit;
    const pct = Math.min(100, (spent / budgetLimit) * 100);

    if (m2SpentVal) m2SpentVal.textContent = `$${spent} млн / $${budgetLimit} млн`;
    if (m2BudgetBar) {
      m2BudgetBar.style.width = `${pct}%`;
      m2BudgetBar.classList.toggle('danger', isOverbudget);
    }

    const baseInflow = 1.2;
    const currentInflow = baseInflow + extraInflow;
    if (m2AralInflow) m2AralInflow.textContent = `${currentInflow.toFixed(1)} км³/год`;

    const baseSal = 19.5;
    const finalSal = Math.max(8.0, baseSal - extraInflow * 2.6);
    if (m2Salinity) {
      m2Salinity.textContent = `${finalSal.toFixed(1)} г/л`;
      m2Salinity.style.color = finalSal <= 10.0 ? '#10b981' : (finalSal <= 14.0 ? '#fbbf24' : '#ef4444');
    }

    if (m2Score) m2Score.textContent = `${score} / 100`;
    if (m2Rank) {
      if (score >= 95) {
        m2Rank.className = 'rank-tag gold';
        m2Rank.textContent = 'Экосистема спасена (Кокарал-2)';
      } else if (score >= 70) {
        m2Rank.className = 'rank-tag silver';
        m2Rank.textContent = 'Частичная стабилизация';
      } else if (score > 0) {
        m2Rank.className = 'rank-tag failed';
        m2Rank.textContent = 'Недостаточный приток';
      } else {
        m2Rank.className = 'rank-tag unrated';
        m2Rank.textContent = 'Ожидание решения';
      }
    }
  }

  [m2LeverRice, m2LeverDam, m2LeverDelta].forEach(el => {
    if (el) el.addEventListener('change', updateM2Evaluation);
  });

  if (btnM2Reset) {
    btnM2Reset.addEventListener('click', () => {
      [m2LeverRice, m2LeverDam, m2LeverDelta].forEach(el => { if (el) el.checked = false; });
      updateM2Evaluation();
    });
  }

  if (btnM2Apply) {
    btnM2Apply.addEventListener('click', () => {
      sim.уровень_модернизации = Math.min(1.0, sim.уровень_модернизации + 0.4);
      if (managementSlider) {
        managementSlider.value = Math.round(sim.уровень_модернизации * 100);
        if (managementValueBox) managementValueBox.textContent = `${managementSlider.value}%`;
      }
      syncUI();
      if (missionsModal) missionsModal.style.display = 'none';
      if (audioSynth) audioSynth.playNotificationChime();
    });
  }

  // --- Миссия 3: Ликвидация аварии на дюкере ---
  const btnLeakStep1 = document.getElementById('btn-leak-step1');
  const btnLeakStep2 = document.getElementById('btn-leak-step2');
  const btnLeakStep3 = document.getElementById('btn-leak-step3');
  const stepLeak1 = document.getElementById('step-leak-1');
  const stepLeak2 = document.getElementById('step-leak-2');
  const stepLeak3 = document.getElementById('step-leak-3');
  const m3ResultBanner = document.getElementById('m3-result-banner');
  const m3LeakFlow = document.getElementById('m3-leak-flow');

  if (btnLeakStep1) {
    btnLeakStep1.addEventListener('click', () => {
      stepLeak1.classList.add('completed');
      btnLeakStep1.disabled = true;
      btnLeakStep1.textContent = '✓ Затворы закрыты';
      stepLeak2.classList.remove('disabled');
      if (btnLeakStep2) btnLeakStep2.disabled = false;
      if (m3LeakFlow) m3LeakFlow.textContent = '-12.0 м³/с';
      if (audioSynth) audioSynth.playRadarPing(650);
    });
  }

  if (btnLeakStep2) {
    btnLeakStep2.addEventListener('click', () => {
      stepLeak2.classList.add('completed');
      btnLeakStep2.disabled = true;
      btnLeakStep2.textContent = '✓ Байпас активен';
      stepLeak3.classList.remove('disabled');
      if (btnLeakStep3) btnLeakStep3.disabled = false;
      if (m3LeakFlow) m3LeakFlow.textContent = '-2.5 м³/с';
      if (audioSynth) audioSynth.playRadarPing(800);
    });
  }

  if (btnLeakStep3) {
    btnLeakStep3.addEventListener('click', () => {
      stepLeak3.classList.add('completed');
      btnLeakStep3.disabled = true;
      btnLeakStep3.textContent = '✓ Тампонада завершена';
      if (m3LeakFlow) {
        m3LeakFlow.textContent = '0.0 м³/с (НОРМА)';
        m3LeakFlow.style.color = '#10b981';
      }
      if (m3ResultBanner) m3ResultBanner.style.display = 'block';
      if (audioSynth) audioSynth.playNotificationChime();
    });
  }

  // =========================================================================
  // ГЕНЕРАТОР ОФИЦИАЛЬНОГО АНАЛИТИЧЕСКОГО ПАСПОРТА МКВК
  // =========================================================================
  function openOfficialReport() {
    if (!reportModal) return;
    const data = sim.вычислить_баланс();

    // Дата и серийный номер
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const regNum = `ICWC-ASB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const elDateStr = document.getElementById('rep-date-str');
    const elRegNum = document.getElementById('rep-reg-num');
    const elTopTime = document.getElementById('report-timestamp-top');

    if (elDateStr) elDateStr.textContent = `${dateStr} (${timeStr})`;
    if (elRegNum) elRegNum.textContent = regNum;
    if (elTopTime) elTopTime.textContent = `Сформирован: ${dateStr} ${timeStr}`;

    // Секция 1: Общий водный баланс
    const tbodyBalance = document.getElementById('rep-balance-tbody');
    if (tbodyBalance) {
      tbodyBalance.innerHTML = '';
      const items = [
        { name: 'Сток бассейна р. Амударья (исток)', base: '68.0 км³/год', cur: `${data.сток_амударья_км3} км³/год`, diff: `${(data.сток_амударья_км3 - 68.0).toFixed(1)} км³`, status: data.сток_амударья_км3 < 50 ? 'КРИТИЧЕСКИЙ' : 'НОРМА' },
        { name: 'Сток бассейна р. Сырдарья (исток)', base: '38.5 км³/год', cur: `${data.сток_сырдарья_км3} км³/год`, diff: `${(data.сток_сырдарья_км3 - 38.5).toFixed(1)} км³`, status: data.сток_сырдарья_км3 < 30 ? 'ДЕФИЦИТ' : 'НОРМА' },
        { name: 'Водозабор Канала Кош-Тепа (Афганистан)', base: '0.0 км³/год', cur: `${data.отбор_кош_тепа_км3} км³/год`, diff: `-${data.отбор_кош_тепа_км3} км³`, status: data.отбор_кош_тепа_км3 > 6.0 ? 'ВНЕ КВОТ МКВК' : 'РЕГУЛИРУЕМЫЙ' },
        { name: 'Потери на фильтрацию в земляных руслах', base: '26.8 км³/год', cur: `${data.потери_фильтрация_км3} км³/год`, diff: `Снижение: ${(26.8 - parseFloat(data.потери_фильтрация_км3)).toFixed(1)} км³`, status: parseFloat(data.потери_фильтрация_км3) > 15 ? 'НЕПРОИЗВОДИТЕЛЬНЫЕ' : 'ОПТИМАЛЬНО' },
        { name: 'Потери на зеркальное испарение каналов', base: '14.2 км³/год', cur: `${data.потери_испарение_км3} км³/год`, diff: `Эв-потери: ${data.потери_испарение_км3} км³`, status: 'КЛИМАТИЧЕСКИЙ' },
        { name: 'Суммарный приток в дельту и Аральское море', base: '12.5 км³/год', cur: `${(parseFloat(data.приток_южный_арал_км3) + parseFloat(data.приток_северный_арал_км3)).toFixed(1)} км³/год`, diff: `Южный: ${data.приток_южный_арал_км3}, Сев: ${data.приток_северный_арал_км3}`, status: parseFloat(data.приток_южный_арал_км3) < 0.5 ? 'ЭКО-КРИЗИС' : 'ПОДДЕРЖАНИЕ' }
      ];

      items.forEach(it => {
        const tr = document.createElement('tr');
        const color = it.status.includes('КРИТИЧЕСКИЙ') || it.status.includes('ЭКО-КРИЗИС') ? '#dc2626' : (it.status.includes('ДЕФИЦИТ') || it.status.includes('ВНЕ КВОТ') ? '#d97706' : '#16a34a');
        tr.innerHTML = `
          <td><strong>${it.name}</strong></td>
          <td>${it.base}</td>
          <td><strong>${it.cur}</strong></td>
          <td>${it.diff}</td>
          <td><span style="font-weight: 700; color: ${color};">${it.status}</span></td>
        `;
        tbodyBalance.appendChild(tr);
      });
    }

    // Секция 2: Квоты МКВК
    const tbodyQuotas = document.getElementById('rep-quotas-tbody');
    if (tbodyQuotas) {
      tbodyQuotas.innerHTML = '';
      const quotas = [
        { country: 'Узбекистан (бассейн Аму и Сыр)', quota: '42.2% / 50.5%', fact: `${(data.сток_амударья_км3 * 0.40).toFixed(1)} км³/год`, deficit: `${Math.max(0, 100 - (sim.уровень_модернизации * 70 + 40)).toFixed(1)}%` },
        { country: 'Туркменистан (Каракумский бассейн)', quota: '42.3% (Амударья)', fact: `${(data.сток_амударья_км3 * 0.38).toFixed(1)} км³/год`, deficit: `${Math.max(0, 100 - (sim.уровень_модернизации * 65 + 45)).toFixed(1)}%` },
        { country: 'Казахстан (низовья Сырдарьи)', quota: '42.0% (Сырдарья)', fact: `${(data.сток_сырдарья_км3 * 0.39).toFixed(1)} км³/год`, deficit: `${Math.max(0, 100 - (sim.уровень_модернизации * 80 + 35)).toFixed(1)}%` },
        { country: 'Таджикистан (Вахш, Нурек)', quota: '15.5% (верховья)', fact: `${(data.сток_амударья_км3 * 0.15).toFixed(1)} км³/год`, deficit: '0.0% (Стабильно)' },
        { country: 'Кыргызстан (Нарын, Токтогул)', quota: 'Формирование стока', fact: `${(data.сток_сырдарья_км3 * 0.65).toFixed(1)} км³/год`, deficit: 'Энергетический баланс' }
      ];

      quotas.forEach(q => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${q.country}</strong></td>
          <td>${q.quota}</td>
          <td>${q.fact}</td>
          <td style="font-weight: 600; color: ${q.deficit.startsWith('0') ? '#16a34a' : '#d97706'};">${q.deficit}</td>
        `;
        tbodyQuotas.appendChild(tr);
      });
    }

    const elKoshEval = document.getElementById('rep-kosh-evaluation');
    if (elKoshEval) {
      if (sim.кош_тепа_отбор_км3 > 8.0) {
        elKoshEval.textContent = `Канал Кош-Тепа отбирает максимальный объем ${sim.кош_тепа_отбор_км3.toFixed(1)} км³/год. Фиксируется острый дефицит в Аму-Бухарском и Каракумском каналах. Рекомендуется подписание трехстороннего протокола вододеления.`;
      } else if (sim.кош_тепа_отбор_км3 > 3.0) {
        elKoshEval.textContent = `Канал Кош-Тепа производит умеренный забор ${sim.кош_тепа_отбор_км3.toFixed(1)} км³/год. Дефицит компенсирован мерами внутрибассейновой модернизации каналов.`;
      } else {
        elKoshEval.textContent = `Забор канала Кош-Тепа находится на базовом уровне ${sim.кош_тепа_отбор_км3.toFixed(1)} км³/год. Транзитные квоты низовий соблюдены в полном объеме.`;
      }
    }

    const elGridEff = document.getElementById('rep-grid-eff');
    if (elGridEff) elGridEff.textContent = `${data.эффективность_процент}%`;

    const elAralSouth = document.getElementById('rep-aral-south');
    if (elAralSouth) elAralSouth.textContent = `${data.приток_южный_арал_км3} км³/год`;

    const elAralNorth = document.getElementById('rep-aral-north');
    if (elAralNorth) elAralNorth.textContent = `${data.приток_северный_арал_км3} км³/год`;

    // Секция 3: Города
    const tbodyCities = document.getElementById('rep-cities-tbody');
    if (tbodyCities) {
      tbodyCities.innerHTML = '';
      const cityNames = ['Ташкент', 'Алматы', 'Бишкек', 'Душанбе', 'Самарканд'];
      cityNames.forEach(c => {
        const info = data.города[c];
        const tr = document.createElement('tr');
        const color = info.статус === 'КРИТИЧЕСКИЙ' ? '#dc2626' : (info.статус === 'ТРЕВОГА' ? '#d97706' : '#16a34a');
        tr.innerHTML = `
          <td><strong>${c}</strong></td>
          <td>${(sim.города[c].население / 1e6).toFixed(2)} млн чел.</td>
          <td>${sim.города[c].источник}</td>
          <td><strong>${info.дефицит_процент}%</strong></td>
          <td>${info.дни_до_истощения > 365 ? '&gt; 12 мес.' : info.дни_до_истощения + ' дн.'}</td>
          <td><span style="font-weight: 700; color: ${color};">${info.статус}</span></td>
        `;
        tbodyCities.appendChild(tr);
      });
    }

    // Секция 4: Инвестиционный аудит
    const km = 1200;
    const ha = 450000;
    const capex = (km * 0.45 + (ha * 1800) / 1e6).toFixed(2);
    const saved = (km * 0.0035 + (ha * 6000) / 1e9).toFixed(1);
    const profit = Math.round((ha * 650) / 1e6);
    const payback = (capex / profit).toFixed(1);

    const elCapex = document.getElementById('rep-capex-val');
    const elSaved = document.getElementById('rep-saved-val');
    const elProfit = document.getElementById('rep-profit-val');
    const elPayback = document.getElementById('rep-payback-val');

    if (elCapex) elCapex.textContent = `$${capex} млрд`;
    if (elSaved) elSaved.textContent = `+${saved} км³/год`;
    if (elProfit) elProfit.textContent = `+$${profit} млн/год`;
    if (elPayback) elPayback.textContent = `${payback} года`;

    // Секция 5: Резолюция
    const elRes = document.getElementById('rep-resolution-text');
    if (elRes) {
      if (sim.засуха || sim.маловодный_год) {
        elRes.textContent = `Внимание! Симуляция выполняется в стрессовых гидрометеорологических условиях (маловодный год / засуха). Эффективность водораспределения составляет ${data.эффективность_процент}%. Рекомендуется немедленная активация Межгосударственного энергетического консорциума с поставками угля и мазута в верховья для предотвращения внеплановых зимних сбросов Токтогульского водохранилища.`;
      } else {
        elRes.textContent = `Гидрологическая обстановка в бассейнах Амударьи и Сырдарьи стабильна. Инженерная модернизация ирригационных магистралей обеспечивает сохранение водных ресурсов на уровне ${(parseFloat(data.потери_фильтрация_км3)).toFixed(1)} км³/год непроизводительных потерь. Рекомендовано масштабирование капельного орошения.`;
      }
    }

    reportModal.style.display = 'flex';
    if (audioSynth) audioSynth.playRadarPing(880);
  }

  // Экспорт данных в JSON
  function exportReportJSON() {
    const data = sim.вычислить_баланс();
    const payload = {
      документ: 'Паспорт водного баланса Центральной Азии',
      рег_номер: document.getElementById('rep-reg-num')?.textContent || 'ICWC-2026',
      дата_генерации: new Date().toISOString(),
      состояние_симуляции: {
        модернизация_процент: (sim.уровень_модернизации * 100).toFixed(1),
        кош_тепа_отбор_км3: sim.кош_тепа_отбор_км3,
        маловодный_год: sim.маловодный_год,
        засуха: sim.засуха
      },
      гидрологический_баланс: data
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water_twin_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (audioSynth) audioSynth.playNotificationChime();
  }

  // Экспорт данных в CSV
  function exportReportCSV() {
    const data = sim.вычислить_баланс();
    let csv = '\uFEFF'; // BOM для корректного отображения кириллицы в Excel
    csv += 'Категория,Параметр,Значение,Единица измерения,Статус\n';
    csv += `Баланс,Сток Амударьи,${data.сток_амударья_км3},км3/год,Исток\n`;
    csv += `Баланс,Сток Сырдарьи,${data.сток_сырдарья_км3},км3/год,Исток\n`;
    csv += `Баланс,Забор Кош-Тепа,${data.отбор_кош_тепа_км3},км3/год,Афганистан\n`;
    csv += `Баланс,Потери на фильтрацию,${data.потери_фильтрация_км3},км3/год,Русла\n`;
    csv += `Баланс,Потери на испарение,${data.потери_испарение_км3},км3/год,Зеркало\n`;
    csv += `Баланс,Приток в Южный Арал,${data.приток_южный_арал_км3},км3/год,Дельта\n`;
    csv += `Баланс,Приток в Северный Арал,${data.приток_северный_арал_км3},км3/год,Кокарал\n`;

    const cityNames = ['Ташкент', 'Алматы', 'Бишкек', 'Душанбе', 'Самарканд'];
    cityNames.forEach(c => {
      const info = data.города[c];
      csv += `Город,${c},${info.дефицит_процент},%,${info.статус}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water_quotas_and_cities_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (audioSynth) audioSynth.playNotificationChime();
  }

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

    if (gisMap) {
      gisMap.обновить_состояние({
        уровень_модернизации: sim.уровень_модернизации,
        кош_тепа_отбор_км3: sim.кош_тепа_отбор_км3,
        засуха: sim.засуха,
        маловодный_год: sim.маловодный_год
      });
    }

    // Нижние метрики и карточка живого статуса
    if (metricDepletionRisk) {
      metricDepletionRisk.textContent = data.риск_текст;
      if (sim.уровень_модернизации < 0.25) {
        metricDepletionRisk.className = 'metric-value critical';
      } else {
        metricDepletionRisk.className = 'metric-value sustainable';
      }
    }

    if (metricEfficiency) metricEfficiency.textContent = `${data.эффективность_процент}%`;
    if (metricEvapLoss) metricEvapLoss.textContent = `${data.потери_испарение_км3} км³/год`;
    if (metricFiltLoss) metricFiltLoss.textContent = `${data.потери_фильтрация_км3} км³/год`;

    // Синхронизация плавающей плашки статуса на карте
    const quickRisk = document.getElementById('quick-risk-indicator');
    const quickEff = document.getElementById('quick-eff-indicator');
    if (quickRisk) quickRisk.textContent = `Баланс: ${data.риск_текст}`;
    if (quickEff) quickEff.textContent = `Эффективность: ${data.эффективность_процент}%`;

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

  // 5. Переключение режимов картографии и 3D
  function setActiveViewBtn(btn) {
    [btnViewSat, btnViewTopo, btnViewDark, btnViewDam, btnViewDual].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  const gisMapEl = document.getElementById('gis-map');
  const canvas3dEl = document.getElementById('canvas-3d');

  function showGisMap() {
    if (gisMapEl) gisMapEl.style.display = 'block';
    if (canvas3dEl) canvas3dEl.style.display = 'none';
    if (gisMap && gisMap.map) gisMap.map.invalidateSize();
  }

  function show3dCanvas() {
    if (gisMapEl) gisMapEl.style.display = 'none';
    if (canvas3dEl) canvas3dEl.style.display = 'block';
  }

  if (btnViewSat) {
    btnViewSat.addEventListener('click', () => {
      setActiveViewBtn(btnViewSat);
      showGisMap();
      if (gisMap) gisMap.setBaseLayer('satellite');
      if (audioSynth) audioSynth.playRadarPing(880);
    });
  }

  if (btnViewTopo) {
    btnViewTopo.addEventListener('click', () => {
      setActiveViewBtn(btnViewTopo);
      showGisMap();
      if (gisMap) gisMap.setBaseLayer('topo');
      if (audioSynth) audioSynth.playRadarPing(820);
    });
  }

  if (btnViewDark) {
    btnViewDark.addEventListener('click', () => {
      setActiveViewBtn(btnViewDark);
      showGisMap();
      if (gisMap) gisMap.setBaseLayer('dark');
      if (audioSynth) audioSynth.playRadarPing(760);
    });
  }

  if (btnViewDam) {
    btnViewDam.addEventListener('click', () => {
      setActiveViewBtn(btnViewDam);
      show3dCanvas();
      visualizer.переключить_режим('DAM');
      if (audioSynth) audioSynth.playRadarPing(650);
    });
  }

  if (btnViewDual) {
    btnViewDual.addEventListener('click', () => {
      setActiveViewBtn(btnViewDual);
      show3dCanvas();
      visualizer.переключить_режим('DUAL');
      if (audioSynth) audioSynth.playRadarPing(700);
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
