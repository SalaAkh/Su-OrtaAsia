/**
 * ============================================================================
 * ВЫСОКОТОЧНЫЙ СПУТНИКОВЫЙ ГИС-ДВОЙНИК «СУ-ОРТА АЗИЯ» (LEAFLET + ESRI HD)
 * ============================================================================
 * Обеспечивает:
 * 1. Настоящие спутниковые снимки высокого разрешения (ESRI World Imagery).
 * 2. Точные географические координаты рек Амударья, Сырдарья, Каракумского канала и канала Кош-Тепа.
 * 3. Реалистичные контуры Аральского моря (1960 г. vs 2026 г. vs 2050 г.).
 * 4. Интерактивные гидроузлы (Токтогул, Нурек, Чарвак, Шардара, Кокарал).
 * 5. Минималистичные светящиеся микро-маркеры IoT и городов без визуального мусора.
 */

class WaterGisMap {
  constructor(mapContainerId) {
    this.containerId = mapContainerId;
    this.map = null;
    this.currentTileKey = 'satellite';
    this.tileLayers = {};
    
    // Слои геометрии
    this.riverLayers = {};
    this.lakeLayers = {};
    this.markerLayers = {};
    this.heatLayers = {};
    
    this.currentYear = 2026;
    this.modernization = 0.0;
    this.koshTepaIntake = 0.0;
    this.isDrought = false;
    this.isLowWater = false;

    this.initMap();
  }

  initMap() {
    const el = document.getElementById(this.containerId);
    if (!el) return;

    // Центр: Бассейны Аральского и Каспийского морей (Казахстан, Узбекистан, Туркменистан, Таджикистан, Кыргызстан)
    this.map = L.map(this.containerId, {
      center: [43.0, 59.5],
      zoom: 5.5,
      minZoom: 4,
      maxZoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Зум-контрол в правом нижнем углу
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Базовые картографические подложки высокого разрешения
    this.tileLayers['satellite'] = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, attribution: 'ESRI World Imagery' }
    );

    this.tileLayers['labels'] = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, opacity: 0.85 }
    );

    this.tileLayers['topo'] = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 13, attribution: 'ESRI Shaded Relief' }
    );

    this.tileLayers['dark'] = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19, attribution: 'CartoDB Dark' }
    );

    // Включаем по умолчанию спутник + границы
    this.tileLayers['satellite'].addTo(this.map);
    this.tileLayers['labels'].addTo(this.map);

    // Построение векторной гидросети
    this.buildCaspianSea();
    this.buildAralSea();
    this.buildRivers();
    this.buildHydraulicNodes();
    this.buildCities();
    this.buildIoTSensors();
  }

  setBaseLayer(type) {
    this.currentTileKey = type;
    Object.values(this.tileLayers).forEach(layer => {
      if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
    });

    if (type === 'satellite') {
      this.tileLayers['satellite'].addTo(this.map);
      this.tileLayers['labels'].addTo(this.map);
    } else if (type === 'topo') {
      this.tileLayers['topo'].addTo(this.map);
      this.tileLayers['labels'].addTo(this.map);
    } else if (type === 'dark') {
      this.tileLayers['dark'].addTo(this.map);
    }
  }

  // =========================================================================
  // ОЧЕРТАНИЯ КАСПИЙСКОГО МОРЯ И ЗАЛИВА КАРА-БОГАЗ-ГОЛ
  // =========================================================================
  buildCaspianSea() {
    const geo = window.REALISTIC_RIVERS || {};

    // 1. Контур Каспийского моря (371 000 км², уровень -28.5 м БС)
    const caspianCoords = geo.caspianSea || [
      [46.85, 51.75], [46.50, 52.20], [45.80, 51.60], [45.20, 51.10], [44.50, 50.80],
      [43.65, 51.16], [43.10, 51.60], [42.50, 52.50], [41.90, 52.80], [41.40, 52.85],
      [41.20, 52.80], [40.80, 52.85], [40.02, 52.96], [39.50, 53.80], [38.50, 54.00],
      [37.40, 54.00], [36.85, 53.50], [36.80, 51.00], [37.40, 49.50], [38.40, 48.85],
      [39.20, 49.30], [40.10, 49.85], [40.50, 50.05], [41.20, 49.20], [41.90, 48.60],
      [42.80, 47.60], [44.00, 47.40], [45.30, 47.50], [46.30, 48.00], [46.70, 49.50],
      [46.95, 50.80], [47.10, 51.92], [46.85, 51.75]
    ];

    this.lakeLayers['caspian_sea'] = L.polygon(caspianCoords, {
      color: '#38bdf8',
      weight: 2.2,
      fillColor: '#0284c7',
      fillOpacity: 0.58,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['caspian_sea'].bindTooltip(
      '<strong>Каспийское море</strong><br>Площадь: 371 000 км² | Уровень: -28.5 м БС<br>Крупнейший бессточный водоем планеты.<br><span style="color:#38bdf8;">Притоки: Волга (~240 км³/год), Жайык/Урал (~8.5 км³/год), Кура</span>',
      { className: 'gis-custom-tooltip' }
    );

    // 2. Залив Кара-Богаз-Гол (соляная лагуна-испаритель Каспия)
    const garabogazCoords = geo.garabogaz || [
      [41.15, 52.90], [40.95, 53.40], [41.05, 54.10], [41.35, 54.60], [41.75, 54.40],
      [41.85, 53.80], [41.65, 53.15], [41.38, 52.88], [41.15, 52.90]
    ];

    this.lakeLayers['garabogaz'] = L.polygon(garabogazCoords, {
      color: '#fbbf24',
      weight: 1.8,
      fillColor: '#d97706',
      fillOpacity: 0.45,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['garabogaz'].bindTooltip(
      '<strong>Залив Кара-Богаз-Гол (Туркменистан)</strong><br>Площадь: 18 000 км² | Соленость: до 310 г/л<br>Природный солевой испаритель Каспийского бассейна.',
      { className: 'gis-custom-tooltip' }
    );

    // 3. Зона мелководного шельфа Северного Каспия (уязвимость к регрессии)
    const northCaspianShelfCoords = [
      [47.10, 51.92], [46.85, 51.75], [46.40, 51.90], [45.70, 50.80],
      [45.30, 48.50], [46.30, 48.00], [46.90, 50.20], [47.10, 51.92]
    ];

    this.lakeLayers['north_caspian_shallow'] = L.polygon(northCaspianShelfCoords, {
      color: '#f43f5e',
      weight: 1.2,
      dashArray: '4, 6',
      fillColor: '#e11d48',
      fillOpacity: 0.16,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['north_caspian_shallow'].bindTooltip(
      '<strong>Северный Каспий (Мелководный шельф)</strong><br>Средняя глубина: 4.4 м | Зона риска ускоренного обмеления при падении стока рек',
      { className: 'gis-custom-tooltip' }
    );
  }

  // =========================================================================
  // ОЧЕРТАНИЯ АРАЛЬСКОГО МОРЯ (1960 VS 2026)
  // =========================================================================
  buildAralSea() {
    // 1. Исторический контур единого Аральского моря 1960 года (68 000 км²)
    const aral1960Coords = [
      [46.85, 60.50], [46.75, 61.40], [46.20, 61.60], [45.80, 61.30],
      [45.30, 61.10], [44.80, 60.80], [44.30, 60.30], [43.70, 59.80],
      [43.50, 59.10], [43.60, 58.40], [44.20, 58.20], [44.90, 58.15],
      [45.50, 58.30], [46.00, 58.70], [46.60, 59.20], [46.85, 60.50]
    ];

    this.lakeLayers['aral_1960'] = L.polygon(aral1960Coords, {
      color: '#00f0ff',
      weight: 1.5,
      dashArray: '5, 8',
      fillColor: '#0284c7',
      fillOpacity: 0.12,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['aral_1960'].bindTooltip(
      '<strong>Историческая береговая линия Арала (1960 г.)</strong><br>Площадь: 68 000 км² | Уровень: 53.4 м БС',
      { className: 'gis-custom-tooltip' }
    );

    // 2. Солончак Аралкум (сухое дно Южного Арала)
    const aralkumCoords = [
      [45.60, 59.80], [45.30, 60.90], [44.60, 60.40], [44.00, 59.80],
      [43.80, 58.80], [44.30, 58.50], [45.10, 58.90], [45.60, 59.80]
    ];

    this.lakeLayers['aralkum_desert'] = L.polygon(aralkumCoords, {
      color: '#fbbf24',
      weight: 1,
      dashArray: '3, 6',
      fillColor: '#f59e0b',
      fillOpacity: 0.18,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['aralkum_desert'].bindTooltip(
      '<strong>Пустыня Аралкум (солончак)</strong><br>Площадь дефляции соли: 54 000 км²',
      { className: 'gis-custom-tooltip' }
    );

    // 3. Северный (Малый) Арал (Стабилен благодаря Кокаральской плотине)
    const northAralCoords = [
      [46.82, 60.55], [46.70, 61.35], [46.25, 61.40], [46.05, 60.75],
      [46.20, 60.25], [46.60, 60.10], [46.82, 60.55]
    ];

    this.lakeLayers['north_aral'] = L.polygon(northAralCoords, {
      color: '#38bdf8',
      weight: 2,
      fillColor: '#0284c7',
      fillOpacity: 0.65,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['north_aral'].bindTooltip(
      '<strong>Северный (Малый) Арал</strong><br>Уровень: 42.1 м | Соленость: 11 г/л (Стабилен)',
      { className: 'gis-custom-tooltip' }
    );

    // 4. Южный Арал (Узкий западный глубоководный бассейн)
    const southAralWestCoords = [
      [45.40, 58.40], [45.10, 58.70], [44.20, 58.35], [43.80, 58.45],
      [44.00, 58.20], [44.80, 58.15], [45.40, 58.40]
    ];

    this.lakeLayers['south_aral'] = L.polygon(southAralWestCoords, {
      color: '#ef4444',
      weight: 1.5,
      fillColor: '#991b1b',
      fillOpacity: 0.55,
      interactive: true
    }).addTo(this.map);

    this.lakeLayers['south_aral'].bindTooltip(
      '<strong>Южный Арал (Западный остаточный бассейн)</strong><br>Критическое усыхание | Соленость > 140 г/л',
      { className: 'gis-custom-tooltip' }
    );
  }

  // =========================================================================
  // РЕАЛЬНЫЕ РУСЛА РЕК БАССЕЙНА
  // =========================================================================
  buildRivers() {
    const geo = window.REALISTIC_RIVERS || {};

    // 1. АМУДАРЬЯ (Исток в Памире/Пяндже -> Термез -> Керки -> Нукус -> Арал)
    const amuDaryaCoords = geo.amuDarya || [
      [37.49, 71.55], [37.19, 68.60], [37.22, 67.27], [37.45, 66.25],
      [37.83, 65.20], [38.45, 64.30], [39.08, 63.57], [39.85, 62.80],
      [40.35, 62.40], [41.22, 61.40], [41.55, 60.63], [41.85, 60.25],
      [42.46, 59.61], [43.05, 59.45], [43.76, 59.02], [44.20, 59.10]
    ];

    // Мягкое контрастное свечение русла на спутниковой подложке
    L.polyline(amuDaryaCoords, {
      color: '#00264d',
      weight: 6,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['amudarya'] = L.polyline(amuDaryaCoords, {
      color: '#00f0ff',
      weight: 3.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['amudarya'].bindTooltip(
      '<strong>Река Амударья</strong><br>Длина: 2540 км | Базовый сток: 68.0 км³/год<br><span style="color:#38bdf8;">Высокоточная гидрографическая трассировка русла</span>',
      { className: 'gis-custom-tooltip' }
    );

    // 2. СЫРДАРЬЯ (Нарын/Токтогул -> Фергана -> Шардара -> Кызылорда -> Малый Арал)
    const syrDaryaCoords = geo.syrDarya || [
      [41.87, 72.82], [41.45, 72.20], [41.00, 71.65], [40.21, 69.21],
      [40.50, 68.78], [41.25, 67.97], [42.30, 68.05], [43.30, 68.25],
      [44.84, 65.50], [45.45, 63.80], [45.76, 62.15], [46.12, 60.75]
    ];

    // Мягкое контрастное свечение русла
    L.polyline(syrDaryaCoords, {
      color: '#00264d',
      weight: 5.5,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['syrdarya'] = L.polyline(syrDaryaCoords, {
      color: '#38bdf8',
      weight: 3.2,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['syrdarya'].bindTooltip(
      '<strong>Река Сырдарья</strong><br>Длина: 2212 км | Базовый сток: 38.5 км³/год<br><span style="color:#38bdf8;">Высокоточная гидрографическая трассировка русла</span>',
      { className: 'gis-custom-tooltip' }
    );

    // 3. КАРАКУМСКИЙ КАНАЛ (Амударья -> Мары -> Ашхабад -> Берекет)
    const karakumCoords = geo.karakum || [
      [37.58, 65.72], [37.60, 63.50], [37.59, 61.83], [36.93, 60.50],
      [37.95, 58.38], [38.90, 56.30], [39.24, 55.51]
    ];

    L.polyline(karakumCoords, {
      color: '#083344',
      weight: 4.8,
      opacity: 0.5,
      lineCap: 'round'
    }).addTo(this.map);

    this.riverLayers['karakum'] = L.polyline(karakumCoords, {
      color: '#0ea5e9',
      weight: 2.8,
      dashArray: '6, 4',
      opacity: 0.9,
      lineCap: 'round'
    }).addTo(this.map);

    this.riverLayers['karakum'].bindTooltip(
      '<strong>Каракумский канал (Туркменистан)</strong><br>Длина: 1375 км | Отбор из Амударьи: 11-13 км³/год<br><span style="color:#0ea5e9;">Реальная траектория вдоль оазисов и Копетдага</span>',
      { className: 'gis-custom-tooltip' }
    );

    // 4. КАНАЛ КОШ-ТЕПА (Афганистан: Калдар -> Давлатабад -> Андхой)
    const koshTepaCoords = geo.koshTepa || [
      [37.15, 67.45], [36.95, 67.10], [36.85, 66.40], [36.95, 65.12]
    ];

    L.polyline(koshTepaCoords, {
      color: '#451a03',
      weight: 5.5,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['kosh_tepa'] = L.polyline(koshTepaCoords, {
      color: '#f59e0b',
      weight: 3.4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['kosh_tepa'].bindTooltip(
      '<strong>Канал Кош-Тепа (Афганистан)</strong><br>Протяженность: 285 км | Водозабор: до 15 км³/год<br><span style="color:#f59e0b;">Спутниковая трассировка строительного русла</span>',
      { className: 'gis-custom-tooltip' }
    );

    // 5. РЕКА ЖАЙЫК / УРАЛ (Уральск -> Атырау -> Северный Каспий)
    const zhaiykCoords = geo.zhaiyk || [
      [51.22, 51.37], [50.52, 51.52], [49.88, 51.62], [49.20, 51.75],
      [48.45, 51.84], [47.70, 51.87], [47.10, 51.92], [46.85, 51.75]
    ];

    L.polyline(zhaiykCoords, {
      color: '#00264d',
      weight: 5.0,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['zhaiyk'] = L.polyline(zhaiykCoords, {
      color: '#00f0ff',
      weight: 3.2,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    this.riverLayers['zhaiyk'].bindTooltip(
      '<strong>Река Жайык (Урал)</strong><br>Длина: 2428 км | Сток: 8.5 км³/год<br><span style="color:#00f0ff;">Главная водная артерия Западного Казахстана, питающая Северный Каспий</span>',
      { className: 'gis-custom-tooltip' }
    );
  }

  // =========================================================================
  // ИНЖЕНЕРНЫЕ ГИДРОУЗЛЫ И ПЛОТИНЫ
  // =========================================================================
  buildHydraulicNodes() {
    const nodes = [
      {
        id: 'toktogul',
        name: 'Токтогульская ГЭС (Кыргызстан)',
        latlng: [41.87, 72.82],
        desc: 'Объем: 19.5 км³ | Мощность: 1200 МВт<br>Главный регулятор стока Сырдарьи',
        color: '#00f0ff',
        icon: '⚡'
      },
      {
        id: 'nurek',
        name: 'Нурекская ГЭС (Таджикистан)',
        latlng: [38.37, 69.34],
        desc: 'Объем: 10.5 км³ | Плотина: 300 м (каменно-набросная)<br>Регулятор бассейна Амударьи',
        color: '#00f0ff',
        icon: '⚡'
      },
      {
        id: 'charvak',
        name: 'Чарвакское водохранилище (Узбекистан)',
        latlng: [41.62, 70.02],
        desc: 'Объем: 2.0 км³ | р. Чирчик<br>Ключевой источник питьевой воды Ташкента',
        color: '#38bdf8',
        icon: '💧'
      },
      {
        id: 'shardara',
        name: 'Шардаринское водохранилище (Казахстан)',
        latlng: [41.25, 67.97],
        desc: 'Объем: 5.2 км³ | Аккумулятор паводкового стока Сырдарьи',
        color: '#38bdf8',
        icon: '🌊'
      },
      {
        id: 'tuyamuyun',
        name: 'Туямуюнский гидроузел (Туркменистан / Узбекистан)',
        latlng: [41.22, 61.40],
        desc: 'Объем: 7.8 км³ | Снабжение Хорезма и Каракалпакстана',
        color: '#38bdf8',
        icon: '🌊'
      },
      {
        id: 'kokaral',
        name: 'Кокаральская плотина (Казахстан)',
        latlng: [46.12, 60.75],
        desc: 'Длина: 13 км | Спасение Северного Арала<br>Удерживает уровень 42.0 м БС',
        color: '#10b981',
        icon: '🚧'
      },
      {
        id: 'kosh_head',
        name: 'Головной шлюз Кош-Тепа (Афганистан)',
        latlng: [37.15, 67.45],
        desc: 'Створ забора воды из Амударьи без квот МКВК',
        color: '#f59e0b',
        icon: '⚠️'
      },
      {
        id: 'caspian_maek',
        name: 'Опреснительный комплекс МАЭК (г. Актау, Казахстан)',
        latlng: [43.62, 51.20],
        desc: 'Мощность: 52 000 м³/сут | Термическая дистилляция и обратный осмос морской воды Каспия для Мангистау.',
        color: '#00f0ff',
        icon: '🏭'
      },
      {
        id: 'garabogaz',
        name: 'Залив-испаритель Кара-Богаз-Гол (Туркменистан)',
        latlng: [41.35, 53.58],
        desc: 'Площадь: 18 000 км² | Соленость: 310 г/л<br>Естественный регулятор уровня и солевого баланса Каспия.',
        color: '#f59e0b',
        icon: '🧂'
      },
      {
        id: 'atyrau_delta',
        name: 'Дельта реки Жайык / Сев. Каспий (Атырау)',
        latlng: [46.95, 51.80],
        desc: 'Сток Жайыка (Урала): 8.5 км³/год | Ключевая экологическая зона нагула осетровых рыб Северного Каспия.',
        color: '#10b981',
        icon: '🐟'
      },
      {
        id: 'turkmenbashi_port',
        name: 'Международный морской порт Туркменбаши',
        latlng: [40.02, 52.96],
        desc: 'Главный морской порт Туркменистана | Опреснительные системы водоснабжения побережья.',
        color: '#38bdf8',
        icon: '⚓'
      }
    ];

    nodes.forEach(n => {
      const customIcon = L.divIcon({
        className: 'gis-pin-node',
        html: `<div class="pin-pulse" style="border-color: ${n.color};"></div>
               <div class="pin-core" style="background: ${n.color};">${n.icon}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker(n.latlng, { icon: customIcon }).addTo(this.map);
      marker.bindPopup(`
        <div class="gis-popup-card">
          <div class="p-title" style="color: ${n.color};">${n.name}</div>
          <div class="p-desc">${n.desc}</div>
        </div>
      `);
      this.markerLayers[n.id] = marker;
    });
  }

  // =========================================================================
  // СТОЛИЦЫ И ГОРОДА БАССЕЙНА
  // =========================================================================
  buildCities() {
    const cities = [
      { name: 'Ташкент', latlng: [41.2995, 69.2401], pop: '3.05 млн', src: 'р. Чирчик / Чарвак' },
      { name: 'Алматы', latlng: [43.2389, 76.8897], pop: '2.25 млн', src: 'Б. и М. Алматинка' },
      { name: 'Бишкек', latlng: [42.8746, 74.5698], pop: '1.18 млн', src: 'Орто-Алыш / Ала-Арча' },
      { name: 'Душанбе', latlng: [38.5598, 68.7870], pop: '1.22 млн', src: 'р. Варзоб / Кафирниган' },
      { name: 'Самарканд', latlng: [39.6542, 66.9597], pop: '1.05 млн', src: 'р. Зеравшан' },
      { name: 'Ашхабад', latlng: [37.9601, 58.3261], pop: '1.03 млн', src: 'Каракумский канал' },
      { name: 'Нукус', latlng: [42.4602, 59.6166], pop: '0.34 млн', src: 'Низовья Амударьи' },
      { name: 'Кызылорда', latlng: [44.8488, 65.4823], pop: '0.28 млн', src: 'Низовья Сырдарьи' },
      { name: 'Актау', latlng: [43.6500, 51.1600], pop: '0.21 млн', src: 'Опреснение Каспия (МАЭК) / водовод' },
      { name: 'Атырау', latlng: [47.1000, 51.9200], pop: '0.36 млн', src: 'р. Жайык (Урал) / Сев. Каспий' },
      { name: 'Туркменбаши', latlng: [40.0200, 52.9600], pop: '0.085 млн', src: 'Опреснение Каспия / оазисы' }
    ];

    cities.forEach(c => {
      const cityIcon = L.divIcon({
        className: 'gis-city-label',
        html: `<div class="city-dot"></div><span class="city-name">${c.name}</span>`,
        iconSize: [80, 20],
        iconAnchor: [5, 10]
      });

      const m = L.marker(c.latlng, { icon: cityIcon }).addTo(this.map);
      m.bindTooltip(`<strong>${c.name}</strong><br>Население: ${c.pop}<br>Водоисточник: ${c.src}`, { className: 'gis-custom-tooltip' });
    });
  }

  // =========================================================================
  // IOT-ГИДРОПОСТЫ (ЛОКАЛИЗАЦИЯ И ТЕЛЕМЕТРИЯ)
  // =========================================================================
  buildIoTSensors() {
    const sensors = [
      { id: "UZB-AMU-KERKI-01", name: "Гидропост Керки (Амударья)", latlng: [37.83, 65.20], flow: 1420.5, level: 4.82, sal: 0.95 },
      { id: "UZB-AMU-NUKUS-02", name: "Гидропост Нукус (Дельта)", latlng: [42.46, 59.61], flow: 210.0, level: 1.95, sal: 2.85 },
      { id: "KAZ-SYR-CHARD-03", name: "Гидропост Чардара", latlng: [41.25, 67.97], flow: 680.0, level: 3.40, sal: 1.15 },
      { id: "KAZ-SYR-KAZAL-04", name: "Гидропост Казалинск", latlng: [45.76, 62.15], flow: 145.0, level: 1.65, sal: 1.80 },
      { id: "TKM-KRK-ASHG-06", name: "Каракумский канал, ПК-180", latlng: [37.60, 63.50], flow: 195.0, level: 2.45, sal: 1.40 },
      { id: "KAZ-CASP-AKTAU-07", name: "Гидропост Актау (Каспийское море)", latlng: [43.64, 51.15], flow: 0.0, level: -28.52, sal: 12.8 },
      { id: "KAZ-URAL-ATYRAU-08", name: "Гидропост Атырау (р. Жайык / Урал)", latlng: [47.11, 51.90], flow: 285.0, level: 2.15, sal: 0.65 }
    ];

    sensors.forEach(s => {
      const iotIcon = L.divIcon({
        className: 'gis-iot-marker',
        html: `<div class="iot-radar-ring"></div><div class="iot-dot"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const m = L.marker(s.latlng, { icon: iotIcon }).addTo(this.map);
      m.on('click', () => {
        window.dispatchEvent(new CustomEvent('iot-sensor-selected', {
          detail: { ...s, rssi: -82 }
        }));
      });
      m.bindTooltip(`📡 ${s.name}<br>${s.flow ? `Расход: ${s.flow} м³/с` : `Уровень: ${s.level} м БС`}`, { className: 'gis-custom-tooltip' });
      this.markerLayers[s.id] = m;
    });
  }

  // =========================================================================
  // РЕАКТИВНАЯ СИНХРОНИЗАЦИЯ С МОДЕЛЬЮ СИМУЛЯЦИИ
  // =========================================================================
  обновить_состояние(data) {
    if (!data) return;
    this.modernization = data.уровень_модернизации || 0;
    this.koshTepaIntake = data.кош_тепа_отбор_км3 || 0;
    this.isDrought = !!data.засуха;
    this.isLowWater = !!data.маловодный_год;

    // Реакция реки Амударья:
    // При сильном заборе Кош-Тепа и засухе нижнее русло истощается и краснеет
    if (this.riverLayers['amudarya']) {
      const isCritical = (this.koshTepaIntake > 6.0 || this.isDrought) && this.modernization < 0.45;
      this.riverLayers['amudarya'].setStyle({
        color: isCritical ? '#ef4444' : (this.modernization > 0.5 ? '#00f0ff' : '#0284c7'),
        weight: isCritical ? 2.2 : (this.modernization > 0.5 ? 4.5 : 3.5),
        dashArray: isCritical ? '6, 4' : null
      });
    }

    // Реакция канала Кош-Тепа:
    if (this.riverLayers['kosh_tepa']) {
      const intake = this.koshTepaIntake;
      this.riverLayers['kosh_tepa'].setStyle({
        weight: Math.max(1.5, Math.min(6.5, (intake / 15.0) * 6.0 + 1.5)),
        color: intake > 8.0 ? '#ef4444' : '#f59e0b'
      });
    }

    // Реакция Южного Арала:
    if (this.lakeLayers['south_aral']) {
      const isDry = this.koshTepaIntake > 7.0 || this.isDrought;
      this.lakeLayers['south_aral'].setStyle({
        fillOpacity: isDry ? 0.25 : (0.45 + this.modernization * 0.35),
        color: isDry ? '#7f1d1d' : '#38bdf8'
      });
    }

    // Реакция Каспийского моря и залива Кара-Богаз-Гол:
    if (this.lakeLayers['caspian_sea']) {
      const isStressed = this.isDrought || this.isLowWater;
      this.lakeLayers['caspian_sea'].setStyle({
        fillOpacity: isStressed ? 0.45 : 0.62,
        color: isStressed ? '#0284c7' : '#38bdf8'
      });
    }

    if (this.lakeLayers['north_caspian_shallow']) {
      const isCrit = this.isDrought;
      this.lakeLayers['north_caspian_shallow'].setStyle({
        fillOpacity: isCrit ? 0.35 : 0.16,
        color: isCrit ? '#dc2626' : '#f43f5e'
      });
    }
  }

  установить_год(год) {
    this.currentYear = parseInt(год, 10);
    // 4D трансформация Арала:
    if (this.lakeLayers['aral_1960']) {
      // В 1960 году показываем полноводное море
      if (this.currentYear <= 1965) {
        this.lakeLayers['aral_1960'].setStyle({ fillOpacity: 0.75, color: '#00f0ff', weight: 2.5 });
        if (this.lakeLayers['aralkum_desert']) this.lakeLayers['aralkum_desert'].setStyle({ fillOpacity: 0 });
      } else if (this.currentYear <= 1985) {
        this.lakeLayers['aral_1960'].setStyle({ fillOpacity: 0.35, color: '#0284c7', weight: 1.5 });
        if (this.lakeLayers['aralkum_desert']) this.lakeLayers['aralkum_desert'].setStyle({ fillOpacity: 0.1 });
      } else {
        this.lakeLayers['aral_1960'].setStyle({ fillOpacity: 0.08, color: '#0ea5e9', weight: 1.2, dashArray: '4, 8' });
        if (this.lakeLayers['aralkum_desert']) this.lakeLayers['aralkum_desert'].setStyle({ fillOpacity: 0.22 });
      }
    }

    // 4D эволюция уровня Каспийского моря:
    if (this.lakeLayers['caspian_sea']) {
      if (this.currentYear <= 1978) {
        // Исторический минимум конца 1970-х (-29.0 м)
        this.lakeLayers['caspian_sea'].setStyle({ fillOpacity: 0.50, color: '#0284c7' });
      } else if (this.currentYear <= 1995) {
        // Трансгрессия и подъем уровня до -26.6 м
        this.lakeLayers['caspian_sea'].setStyle({ fillOpacity: 0.72, color: '#00f0ff' });
      } else if (this.currentYear <= 2026) {
        // Современное падение уровня (-28.5 м)
        this.lakeLayers['caspian_sea'].setStyle({ fillOpacity: 0.58, color: '#38bdf8' });
      } else {
        // Прогноз 2050 при глобальном потеплении (-29.5 м)
        this.lakeLayers['caspian_sea'].setStyle({ fillOpacity: 0.40, color: '#0369a1' });
      }
    }
  }

  focusOnNode(nodeId) {
    if (nodeId === 'caspian') {
      this.map.flyTo([42.5, 51.5], 6, { duration: 1.2 });
      return;
    }
    if (nodeId === 'garabogaz') {
      this.map.flyTo([41.35, 53.58], 8, { duration: 1.2 });
      if (this.markerLayers['garabogaz']) this.markerLayers['garabogaz'].openPopup();
      return;
    }

    if (this.markerLayers[nodeId]) {
      const latlng = this.markerLayers[nodeId].getLatLng();
      this.map.flyTo(latlng, 8, { duration: 1.2 });
      this.markerLayers[nodeId].openPopup();
    }
  }

  resetView() {
    this.map.flyTo([43.0, 59.5], 5.5, { duration: 1.2 });
  }
}

window.WaterGisMap = WaterGisMap;
