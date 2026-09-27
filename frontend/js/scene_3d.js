/**
 * ============================================================================
 * ВЫСОКОДЕТАЛИЗИРОВАННЫЙ GIS / САТЕЛЛИТНЫЙ 3D ДВОЙНИК «СУ-ОРТА АЗИЯ»
 * ============================================================================
 * Фотореалистичная 3D карта бассейна рек Центральной Азии:
 * - Процедурный спутниковый рельеф (Тянь-Шань, Памир, Арал, Каракумы, Кызылкум)
 * - Анимированные реки (Амударья, Сырдарья) и каналы (Кош-Тепа, Каракумский)
 * - Динамические водоемы (Аральское море, Токтогул, Нурек, Чарвак) с шейдерной водой
 * - Интерактивные голографические GIS-метки с зумом камеры (Fly-To)
 * - Инженерный CAD-разрез (Было vs Стало: земляное русло vs полимерный лоток)
 */

class WaterSimulation3D {
  constructor(canvasId, calloutsContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.calloutsContainer = document.getElementById(calloutsContainerId);
    
    // Режимы: 'MAP' (3D Геокарта бассейна - по умолчанию), 'DUAL' (Разрез Было vs Стало), 'MORPH' (Трансформация)
    this.текущий_режим = 'MAP';
    this.уровень_модернизации = 0.0;
    this.кош_тепа_отбор = 0.0;
    this.засуха = false;
    this.маловодный_год = false;

    // Сцена
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.008);

    // Камера
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas, 
      antialias: true, 
      powerPreference: "high-performance",
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Управление камерой OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // не уходить под землю
    this.controls.minDistance = 5;
    this.controls.maxDistance = 120;

    // Группы сцены
    this.groupMap = new THREE.Group();
    this.groupDual = new THREE.Group();
    this.groupMorph = new THREE.Group();
    
    this.scene.add(this.groupMap);
    this.scene.add(this.groupDual);
    this.scene.add(this.groupMorph);

    this.groupDual.visible = false;
    this.groupMorph.visible = false;

    // Анимационные коллекции
    this.animatedObjects = [];
    this.riverFlowParticles = [];
    this.gisHotspots = [];
    this.callouts = [];

    // Настройка освещения и окружения
    this.setupLighting();
    this.setupAtmosphere();

    // Создание 3D сцен
    this.buildBasinMapScene();
    this.buildDualTierScene();
    this.buildMorphScene();

    // Начальный вид камеры на весь бассейн
    this.setCameraForMap();

    // Слушатели событий
    window.addEventListener('resize', () => this.onResize());
    this.setupRaycaster();

    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    // Мягкий космическо-атмосферный свет
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.7);
    this.scene.add(hemiLight);

    // Основное солнце (GIS Sun) с тенями
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    this.sunLight.position.set(40, 60, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 150;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Заполняющий лазурный свет (отражение атмосферы и воды)
    const azureLight = new THREE.DirectionalLight(0x0284c7, 0.6);
    azureLight.position.set(-35, 20, -30);
    this.scene.add(azureLight);
  }

  setupAtmosphere() {
    // Тонкая сетка GIS координат в пространстве под картой
    const gridHelper = new THREE.GridHelper(90, 45, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -3.2;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  // =========================================================================
  // ГЕНЕРАТОР ТЕКСТУРЫ СПУТНИКОВОГО ЛАНДШАФТА (PROCEDURAL SATELLITE CANVAS)
  // =========================================================================
  createSatelliteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d');

    // 1. Базовый фон: песчано-степной грунт Центральной Азии
    const baseGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    baseGrad.addColorStop(0.0, '#3a3226'); // Северо-запад (Устюрт, сухая степь)
    baseGrad.addColorStop(0.3, '#785b3a'); // Кызылкум
    baseGrad.addColorStop(0.6, '#6b4f2c'); // Каракумы
    baseGrad.addColorStop(0.9, '#2c3328'); // Предгорья Тянь-Шаня
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Песчаные дюны и текстурный шум
    ctx.fillStyle = 'rgba(180, 140, 85, 0.12)';
    for (let i = 0; i < 6000; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rw = 2 + Math.random() * 8;
      const rh = 1 + Math.random() * 3;
      ctx.fillRect(rx, ry, rw, rh);
    }

    // 3. Зеленые оазисы и орошаемые долины (Фергана, Чуйская долина, дельта Амударьи, Зеравшан)
    // Ферганская долина
    this.drawOasis(ctx, 1450, 680, 160, 90, '#2d5a27', '#437c35');
    // Ташкентский оазис и р. Чирчик
    this.drawOasis(ctx, 1320, 520, 120, 70, '#36682b', '#4d8a3d');
    // Самаркандско-Бухарский оазис (Зеравшан)
    this.drawOasis(ctx, 1150, 780, 180, 60, '#345e28', '#447833');
    // Хорезмский оазис и дельта Амударьи (Нукус)
    this.drawOasis(ctx, 720, 680, 140, 100, '#2b5224', '#3d6e32');
    // Чарджоу и полоса вдоль Амударьи
    this.drawRiverBelt(ctx, 1380, 1050, 720, 680, 24, '#315c28');
    // Полоса Сырдарьи
    this.drawRiverBelt(ctx, 1500, 650, 580, 360, 18, '#32602a');

    // 4. Белые солончаки (Аралкум, высохшее дно, солончак Барсакельмес)
    const saltGrad = ctx.createRadialGradient(580, 520, 10, 580, 520, 200);
    saltGrad.addColorStop(0, 'rgba(245, 248, 255, 0.9)');
    saltGrad.addColorStop(0.5, 'rgba(215, 225, 235, 0.6)');
    saltGrad.addColorStop(1, 'rgba(180, 165, 140, 0)');
    ctx.fillStyle = saltGrad;
    ctx.beginPath();
    ctx.ellipse(580, 520, 180, 220, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 5. Горы Памира и Тянь-Шаня (скалы и вечные ледники на востоке)
    const mountainGrad = ctx.createLinearGradient(1400, 0, canvas.width, canvas.height);
    mountainGrad.addColorStop(0, 'rgba(90, 100, 115, 0.7)');
    mountainGrad.addColorStop(0.5, 'rgba(160, 175, 195, 0.85)');
    mountainGrad.addColorStop(0.85, 'rgba(240, 248, 255, 0.95)');
    ctx.fillStyle = mountainGrad;
    ctx.beginPath();
    ctx.moveTo(1450, 150);
    ctx.lineTo(2048, 0);
    ctx.lineTo(2048, 1536);
    ctx.lineTo(1550, 1536);
    ctx.lineTo(1420, 1050);
    ctx.lineTo(1500, 750);
    ctx.closePath();
    ctx.fill();

    // 6. Сетка GIS координат (тонкие линии широты и долготы)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 180) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  drawOasis(ctx, x, y, rx, ry, color1, color2) {
    const grad = ctx.createRadialGradient(x, y, 5, x, y, rx);
    grad.addColorStop(0, color2);
    grad.addColorStop(0.7, color1);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRiverBelt(ctx, x1, y1, x2, y2, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 80;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 80;
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
  }

  // =========================================================================
  // РЕЖИМ 1: 3D ГЕОКАРТА БАССЕЙНА (PHOTOREALISTIC SATELLITE GIS)
  // =========================================================================
  buildBasinMapScene() {
    const mapW = 60;
    const mapH = 46;
    const segsX = 140;
    const segsY = 110;

    // 1. Высокодетализированный меш рельефа
    const terrainGeo = new THREE.PlaneGeometry(mapW, mapH, segsX, segsY);
    const pos = terrainGeo.attributes.position;

    // Рельефная функция Центральной Азии:
    // Восток (x > 4): Высокогорье Памира (высота до 6.5) и Тянь-Шаня
    // Центр/Запад: Туранская низменность, впадины Каракумов и Арала
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = 0;

      // Горы Востока (Памир, Тянь-Шань, Гиндукуш на юге)
      if (x > 3) {
        const factor = (x - 3) / 27;
        const mountainNoise = Math.sin(x * 0.6) * Math.cos(y * 0.5) * 0.8 + Math.sin(x * 1.4 + y * 1.1) * 0.35;
        z = Math.pow(factor, 1.6) * 7.5 + mountainNoise * Math.min(factor * 2, 1.2);
        if (y < -8) z += ((-8 - y) / 15) * 2.5; // Гиндукуш
      } else {
        // Холмы и впадины Турана
        z = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.35;
      }

      // Впадина Аральского моря (x: -18..-10, y: 1..11)
      const aralDist = Math.hypot(x - (-14), y - 6);
      if (aralDist < 9) {
        z -= (1.0 - aralDist / 9) * 1.35;
      }

      // Впадина Сарыкамышского озера (x: -12, y: -2)
      const saryDist = Math.hypot(x - (-12), y - (-2));
      if (saryDist < 4) {
        z -= (1.0 - saryDist / 4) * 0.9;
      }

      // Каньоны рек
      pos.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();

    const satTexture = this.createSatelliteTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: satTexture,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: false
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.receiveShadow = true;
    this.groupMap.add(this.terrainMesh);

    // 2. Подложка-основание (GIS Base Slab с полированными срезами)
    const baseGeo = new THREE.BoxGeometry(mapW + 0.6, 2.5, mapH + 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.4,
      metalness: 0.6
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -1.3, 0);
    this.groupMap.add(baseMesh);

    // Золотисто-неоновый кант основания
    const baseEdges = new THREE.EdgesGeometry(baseGeo);
    const edgeLine = new THREE.LineSegments(baseEdges, new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.4 }));
    baseMesh.add(edgeLine);

    // 3. РЕКА АМУДАРЬЯ (Пяндж -> Термез -> Чарджоу -> Нукус -> Арал)
    const amudaryaPts = [
      new THREE.Vector3(22, 3.2, 12),
      new THREE.Vector3(15, 1.4, 8.5),
      new THREE.Vector3(8, 0.6, 5.8),
      new THREE.Vector3(0, 0.35, 3.2),
      new THREE.Vector3(-7, 0.2, 4.2),
      new THREE.Vector3(-14, 0.1, 5.8),
      new THREE.Vector3(-18, -0.15, 7.2)
    ];
    this.amudaryaCurve = new THREE.CatmullRomCurve3(amudaryaPts);
    this.amuMesh = this.createRealisticRiver(this.amudaryaCurve, 0.52, 0x0284c7, 0x38bdf8);
    this.groupMap.add(this.amuMesh);

    // 4. РЕКА СЫРДАРЬЯ (Нарын -> Фергана -> Чардара -> Кызылорда -> Малый Арал)
    const syrdaryaPts = [
      new THREE.Vector3(23, 3.6, -7.5),
      new THREE.Vector3(16, 1.6, -5.8),
      new THREE.Vector3(7, 0.6, -8.2),
      new THREE.Vector3(-3, 0.3, -9.8),
      new THREE.Vector3(-10, 0.15, -10.2),
      new THREE.Vector3(-16, -0.05, -8.5)
    ];
    this.syrdaryaCurve = new THREE.CatmullRomCurve3(syrdaryaPts);
    this.syrMesh = this.createRealisticRiver(this.syrdaryaCurve, 0.44, 0x0369a1, 0x0ea5e9);
    this.groupMap.add(this.syrMesh);

    // 5. КАРАКУМСКИЙ КАНАЛ (1100 км, Туркменистан)
    const karakumPts = [
      new THREE.Vector3(7.5, 0.55, 6.0),
      new THREE.Vector3(1.0, 0.28, 10.5),
      new THREE.Vector3(-8.0, 0.15, 14.2),
      new THREE.Vector3(-16.0, 0.1, 16.0)
    ];
    this.karakumCurve = new THREE.CatmullRomCurve3(karakumPts);
    this.karakumMesh = this.createRealisticRiver(this.karakumCurve, 0.32, 0x0284c7, 0x00f0ff);
    this.groupMap.add(this.karakumMesh);

    // 6. КАНАЛ КОШ-ТЕПА (Северный Афганистан, водозабор из Амударьи)
    const koshPts = [
      new THREE.Vector3(12.5, 1.0, 7.8), // Головной водозабор Калдар
      new THREE.Vector3(8.5, 0.6, 11.2),  // Балх
      new THREE.Vector3(3.5, 0.4, 13.6),  // Джаузджан
      new THREE.Vector3(-2.5, 0.25, 15.0) // Андхой
    ];
    this.koshCurve = new THREE.CatmullRomCurve3(koshPts);
    this.koshMesh = this.createRealisticRiver(this.koshCurve, 0.40, 0xd97706, 0xfbbf24);
    this.groupMap.add(this.koshMesh);

    // 7. ВОДОЕМЫ С РЕАЛИСТИЧНЫМИ ВОДНЫМИ ШЕЙДЕРАМИ И БЛИКАМИ
    // 7.1 Северный Малый Арал (стабилен благодаря Кокаральской дамбе)
    const northAralGeo = new THREE.CylinderGeometry(3.2, 3.0, 0.3, 32);
    const northAralMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.3,
      transparent: true,
      opacity: 0.92
    });
    this.northAralMesh = new THREE.Mesh(northAralGeo, northAralMat);
    this.northAralMesh.position.set(-16.5, 0.05, -8.5);
    this.groupMap.add(this.northAralMesh);

    // Кокаральская плотина
    const damGeo = new THREE.BoxGeometry(0.35, 0.45, 1.8);
    const damMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5 });
    const kokaralDam = new THREE.Mesh(damGeo, damMat);
    kokaralDam.position.set(-15.6, 0.15, -7.2);
    this.groupMap.add(kokaralDam);

    // 7.2 Южный Большой Арал (Усыхающий восточный/западный бассейн)
    const southAralGeo = new THREE.CylinderGeometry(4.2, 3.8, 0.25, 32);
    this.southAralMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.75
    });
    this.southAralMesh = new THREE.Mesh(southAralGeo, this.southAralMat);
    this.southAralMesh.position.set(-18.5, -0.1, 7.2);
    this.groupMap.add(this.southAralMesh);

    // 7.3 Токтогульское водохранилище (Кыргызстан, Нарын)
    const toktogulGeo = new THREE.CylinderGeometry(1.8, 1.6, 0.6, 24);
    this.toktogulMesh = new THREE.Mesh(toktogulGeo, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.15, metalness: 0.2 }));
    this.toktogulMesh.position.set(17.5, 1.8, -6.5);
    this.groupMap.add(this.toktogulMesh);

    // 7.4 Нурекское водохранилище (Таджикистан, Вахш)
    const nurekGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.5, 24);
    this.nurekMesh = new THREE.Mesh(nurekGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.2 }));
    this.nurekMesh.position.set(16.2, 1.5, 5.2);
    this.groupMap.add(this.nurekMesh);

    // 7.5 Чарвакское водохранилище (Узбекистан, Чирчик)
    const charvakGeo = new THREE.CylinderGeometry(1.2, 1.0, 0.4, 20);
    this.charvakMesh = new THREE.Mesh(charvakGeo, new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15 }));
    this.charvakMesh.position.set(12.2, 1.1, -3.2);
    this.groupMap.add(this.charvakMesh);

    // 7.6 Шардаринское водохранилище (Казахстан, Сырдарья)
    const shardaraGeo = new THREE.CylinderGeometry(1.9, 1.7, 0.35, 24);
    this.shardaraMesh = new THREE.Mesh(shardaraGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 }));
    this.shardaraMesh.position.set(6.8, 0.6, -8.2);
    this.groupMap.add(this.shardaraMesh);

    // 8. ИНТЕРАКТИВНЫЕ GIS-ХОТСПАТЫ (ГОЛОГРАФИЧЕСКИЕ ПИНЫ)
    this.createGisBeacon("aral_north", "🌊 Северный Арал (Малый Арал)", "Кокаральская плотина поддерживает уровень 42.0 м БС. Соленость снижена до 11 г/л, промысловое рыболовство восстановлено.", new THREE.Vector3(-16.5, 0.8, -8.5), 0x00f0ff);
    this.createGisBeacon("aral_south", "🏜️ Южный Арал (Аралкум)", "Критическое усыхание (соленость > 140 г/л). Пыльно-солевые бури выносят до 75 млн тонн соли ежегодно.", new THREE.Vector3(-18.5, 0.8, 7.2), 0xff334b);
    this.createGisBeacon("kosh_tepa", "⚠️ Канал Кош-Тепа (Афганистан)", "Крупнейший ирригационный проект Афганистана (285 км). Водозабор до 15 км³/год без участия в МКВК создает дефицит в низовьях Амударьи.", new THREE.Vector3(10.5, 1.6, 9.2), 0xffa500);
    this.createGisBeacon("toktogul", "⚡ Токтогульская ГЭС (Кыргызстан)", "Объем 19.5 км³. Главный регулятор стока Сырдарьи. Зимний энергетический сброс vs летний поливной режим стран низовья.", new THREE.Vector3(17.5, 2.8, -6.5), 0x00f0ff);
    this.createGisBeacon("nurek", "⚡ Нурекская ГЭС (Таджикистан)", "Объем 10.5 км³, высочайшая насыпная плотина (300 м). Формирует гидроэнергетический режим бассейна Амударьи.", new THREE.Vector3(16.2, 2.5, 5.2), 0x00f0ff);
    this.createGisBeacon("fergana", "🌾 Ферганская долина", "Густонаселенное сердце региона (14 млн чел). Интенсивное орошение хлопчатника и садов, высокий потенциал водосбережения.", new THREE.Vector3(14.0, 1.8, -2.5), 0x10b981);
    this.createGisBeacon("karakum", "🚜 Каракумский канал", "Протяженность 1375 км. Забор 11-13 км³/год из Амударьи. До 45% фильтрационных потерь в песчаном русле.", new THREE.Vector3(1.0, 1.2, 10.5), 0x38bdf8);

    // 9. Анимированные частицы речного потока
    this.createFlowParticles(this.amudaryaCurve, 250, 0x38bdf8);
    this.createFlowParticles(this.syrdaryaCurve, 180, 0x0ea5e9);
    this.createFlowParticles(this.koshCurve, 120, 0xfbbf24);
  }

  createRealisticRiver(curve, radius, mainColor, glowColor) {
    const riverGeo = new THREE.TubeGeometry(curve, 80, radius, 14, false);
    const riverMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.15,
      metalness: 0.45,
      emissive: glowColor,
      emissiveIntensity: 0.25
    });
    const mesh = new THREE.Mesh(riverGeo, riverMat);
    mesh.castShadow = true;
    return mesh;
  }

  createFlowParticles(curve, count, color) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const progress = [];

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      progress.push(t);
      const pt = curve.getPointAt(t);
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y + 0.15;
      positions[i * 3 + 2] = pt.z;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: color,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geo, mat);
    this.groupMap.add(particles);

    this.animatedObjects.push({
      update: (delta) => {
        const posAttr = geo.attributes.position;
        for (let i = 0; i < count; i++) {
          progress[i] += delta * 0.08;
          if (progress[i] > 1.0) progress[i] -= 1.0;
          const pt = curve.getPointAt(progress[i]);
          posAttr.setXYZ(i, pt.x, pt.y + 0.15, pt.z);
        }
        posAttr.needsUpdate = true;
      }
    });
  }

  createGisBeacon(id, title, desc, position, colorHex) {
    const beaconGroup = new THREE.Group();
    beaconGroup.position.copy(position);

    // Центральный светящийся маркер
    const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    beaconGroup.add(sphere);

    // Пульсирующее радарное кольцо
    const ringGeo = new THREE.RingGeometry(0.4, 0.65, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    beaconGroup.add(ring);

    // Вертикальный маяковый луч
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    beaconGroup.add(beam);

    this.groupMap.add(beaconGroup);

    // Интерактивные данные
    beaconGroup.userData = { id, title, desc, position, colorHex, mesh: sphere };
    this.gisHotspots.push(beaconGroup);

    // Анимация пульсации
    this.animatedObjects.push({
      update: (delta, time) => {
        const scale = 1.0 + Math.sin(time * 3 + position.x) * 0.25;
        ring.scale.set(scale, scale, scale);
        ringMat.opacity = 0.8 - (scale - 1.0) * 1.5;
        sphere.position.y = Math.sin(time * 2 + position.z) * 0.1;
      }
    });

    // Экранный 3D Callout
    this.addCalloutTag(title, new THREE.Vector3(position.x, position.y + 1.2, position.z), colorHex === 0xff334b ? "crisis" : "eco", "MAP", id);
  }

  // =========================================================================
  // РЕЖИМ 2: ИНЖЕНЕРНЫЙ CAD-РАЗРЕЗ (ДВУХУРОВНЕВЫЙ: БЫЛО VS СТАЛО)
  // =========================================================================
  buildDualTierScene() {
    // ВЕРХНИЙ УРОВЕНЬ: ТЕКУЩИЙ КРИЗИС
    const topGroup = new THREE.Group();
    topGroup.position.set(0, 6.5, 0);

    // Подложка разреза
    const cutBackGeo = new THREE.PlaneGeometry(36, 10);
    const topBackMat = new THREE.MeshStandardMaterial({ color: 0x160c10, roughness: 0.9 });
    const topBack = new THREE.Mesh(cutBackGeo, topBackMat);
    topBack.position.z = -2;
    topGroup.add(topBack);

    // Слои грунта (суглинок, песок, водоносный горизонт)
    const soilLayer1 = new THREE.Mesh(new THREE.BoxGeometry(34, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0x422f25, roughness: 0.95 }));
    soilLayer1.position.set(0, -3.2, 0);
    topGroup.add(soilLayer1);

    // Земляной канал с фильтрацией (Красная зона потерь)
    const canalCrisisPts = [
      new THREE.Vector3(-15, 2.0, 0),
      new THREE.Vector3(-4, 2.0, 0),
      new THREE.Vector3(2, -1.2, 0),
      new THREE.Vector3(14, -1.2, 0)
    ];
    const canalCrisisCurve = new THREE.CatmullRomCurve3(canalCrisisPts);
    const canalCrisisGeo = new THREE.TubeGeometry(canalCrisisCurve, 64, 0.6, 16, false);
    const canalCrisisMat = new THREE.MeshStandardMaterial({ color: 0xff334b, roughness: 0.4, emissive: 0x550010 });
    topGroup.add(new THREE.Mesh(canalCrisisGeo, canalCrisisMat));

    // Стрелки и брызги утечек в песок
    for (let i = -10; i <= 10; i += 4) {
      const leak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xff2d4a, wireframe: true }));
      leak.position.set(i, -0.5, 0);
      leak.rotation.z = Math.PI;
      topGroup.add(leak);
    }

    // Солевая корка на поверхности
    const saltPl = new THREE.Mesh(new THREE.PlaneGeometry(33.8, 2.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    saltPl.rotation.x = -Math.PI / 2;
    saltPl.position.set(0, -2.05, 0);
    topGroup.add(saltPl);

    this.groupDual.add(topGroup);

    // НИЖНИЙ УРОВЕНЬ: МОДЕРНИЗИРОВАННАЯ ЭКОСИСТЕМА
    const btmGroup = new THREE.Group();
    btmGroup.position.set(0, -6.5, 0);

    const btmBackMat = new THREE.MeshStandardMaterial({ color: 0x081524, roughness: 0.9 });
    const btmBack = new THREE.Mesh(cutBackGeo, btmBackMat);
    btmBack.position.z = -2;
    btmGroup.add(btmBack);

    // Плодородная почва с капельным поливом
    const btmSoil = new THREE.Mesh(new THREE.BoxGeometry(34, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.9 }));
    btmSoil.position.set(0, -3.2, 0);
    btmGroup.add(btmSoil);

    // Полимерный лоток / композитная труба (КПД 98%)
    const canalEcoGeo = new THREE.TubeGeometry(canalCrisisCurve, 64, 0.6, 24, false);
    const canalEcoMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x005577,
      transmission: 0.7,
      opacity: 0.9,
      transparent: true,
      roughness: 0.1
    });
    btmGroup.add(new THREE.Mesh(canalEcoGeo, canalEcoMat));

    // Трубки капельного орошения и зеленые ростки
    for (let i = -12; i <= 12; i += 3) {
      const plant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 }));
      plant.position.set(i, -1.3, 0.8);
      btmGroup.add(plant);
    }

    this.groupDual.add(btmGroup);

    this.addCalloutTag("ХРОНИЧЕСКИЕ ПОТЕРИ 45% (ЗЕМЛЯНОЕ РУСЛО)", new THREE.Vector3(-4, 9.5, 0), "crisis", "DUAL");
    this.addCalloutTag("МОДЕРНИЗИРОВАННЫЙ КАНАЛ + КАПЕЛЬНЫЙ ПОЛИВ (КПД 98%)", new THREE.Vector3(-4, -3.5, 0), "eco", "DUAL");
  }

  // =========================================================================
  // РЕЖИМ 3: МОРФИНГ СРЕЗА (0-100%)
  // =========================================================================
  buildMorphScene() {
    const morphGroup = new THREE.Group();
    morphGroup.position.set(0, 0, 0);

    const pipePts = [
      new THREE.Vector3(-15, 2.5, 0),
      new THREE.Vector3(-4, 2.5, 0),
      new THREE.Vector3(2, -0.5, 0),
      new THREE.Vector3(14, -0.5, 0)
    ];
    this.morphCurve = new THREE.CatmullRomCurve3(pipePts);
    const morphGeo = new THREE.TubeGeometry(this.morphCurve, 64, 0.7, 24, false);
    this.morphMat = new THREE.MeshPhysicalMaterial({
      color: 0xff334b,
      roughness: 0.3
    });
    this.morphMesh = new THREE.Mesh(morphGeo, this.morphMat);
    morphGroup.add(this.morphMesh);

    // Блок почвы
    const soil = new THREE.Mesh(new THREE.BoxGeometry(34, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x2e2017, roughness: 0.9 }));
    soil.position.set(0, -3.2, 0);
    morphGroup.add(soil);

    this.groupMorph.add(morphGroup);

    this.addCalloutTag("РЕЖИМ ПЛАВНОЙ ТРАНСФОРМАЦИИ ИНФРАСТРУКТУРЫ", new THREE.Vector3(0, 4.5, 0), "eco", "MORPH");
  }

  // =========================================================================
  // УПРАВЛЕНИЕ КАМЕРОЙ И ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
  // =========================================================================
  setCameraForMap() {
    this.flyCameraTo(new THREE.Vector3(0, 36, 42), new THREE.Vector3(0, 0, 2));
  }

  setCameraForDual() {
    this.flyCameraTo(new THREE.Vector3(0, 0, 38), new THREE.Vector3(0, 0, 0));
  }

  setCameraForMorph() {
    this.flyCameraTo(new THREE.Vector3(0, 2, 34), new THREE.Vector3(0, 0, 0));
  }

  flyCameraTo(targetPos, targetLookAt, duration = 1.2) {
    const startPos = this.camera.position.clone();
    const startLook = this.controls.target.clone();
    let startTime = null;

    const animateFly = (now) => {
      if (!startTime) startTime = now;
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startLook, targetLookAt, ease);
      this.controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateFly);
      }
    };
    requestAnimationFrame(animateFly);
  }

  переключить_режим(режим) {
    this.текущий_режим = режим;
    this.groupMap.visible = (режим === 'MAP');
    this.groupDual.visible = (режим === 'DUAL');
    this.groupMorph.visible = (режим === 'MORPH');

    if (режим === 'MAP') this.setCameraForMap();
    else if (режим === 'DUAL') this.setCameraForDual();
    else if (режим === 'MORPH') this.setCameraForMorph();

    this.updateCalloutsVisibility();
  }

  focusOnNode(nodeId) {
    const node = this.gisHotspots.find(h => h.userData.id === nodeId);
    if (node) {
      const pos = node.userData.position;
      this.flyCameraTo(
        new THREE.Vector3(pos.x, pos.y + 12, pos.z + 14),
        new THREE.Vector3(pos.x, pos.y, pos.z)
      );
    }
  }

  // =========================================================================
  // РЕАКТИВНОЕ ОБНОВЛЕНИЕ ПАРАМЕТРОВ СИМУЛЯЦИИ
  // =========================================================================
  обновить_состояние(data) {
    if (!data) return;
    this.уровень_модернизации = data.уровень_модернизации !== undefined ? data.уровень_модернизации : this.уровень_модернизации;
    this.кош_тепа_отбор = data.кош_тепа_отбор_км3 !== undefined ? data.кош_тепа_отбор_км3 : this.кош_тепа_отбор;
    this.засуха = data.засуха !== undefined ? data.засуха : this.засуха;
    this.маловодный_год = data.маловодный_год !== undefined ? data.маловодный_год : this.маловодный_год;

    // 1. Динамическое изменение Южного Арала
    if (this.southAralMesh && this.southAralMat) {
      const recoveryScale = 0.5 + this.уровень_модернизации * 0.7 - (this.кош_тепа_отбор / 15) * 0.35 - (this.засуха ? 0.25 : 0);
      const clampedScale = Math.max(0.2, Math.min(recoveryScale, 1.25));
      this.southAralMesh.scale.set(clampedScale, 1.0, clampedScale);

      if (this.уровень_модернизации > 0.6) {
        this.southAralMat.color.setHex(0x0284c7);
        this.southAralMat.opacity = 0.88;
      } else {
        this.southAralMat.color.setHex(0x1e3a8a);
        this.southAralMat.opacity = 0.6;
      }
    }

    // 2. Морфинг-материал
    if (this.morphMat) {
      const r = 1.0 - this.уровень_модернизации;
      const g = 0.2 + this.уровень_модернизации * 0.7;
      const b = this.уровень_модернизации;
      this.morphMat.color.setRGB(r, g, b);
      if (this.уровень_модернизации > 0.5) {
        this.morphMat.transmission = 0.6;
        this.morphMat.opacity = 0.9;
        this.morphMat.transparent = true;
      } else {
        this.morphMat.transmission = 0.0;
        this.morphMat.transparent = false;
      }
    }
  }

  // =========================================================================
  // СИСТЕМА ВЫНОСОК (3D CALLOUT LABELS)
  // =========================================================================
  addCalloutTag(text, worldPos, type = "eco", mode = "MAP", id = null) {
    const el = document.createElement('div');
    el.className = `callout-tag ${type} ${mode}`;
    el.innerHTML = `<span class="callout-dot"></span><span class="callout-txt">${text}</span>`;
    if (id) {
      el.dataset.id = id;
      el.addEventListener('click', () => this.focusOnNode(id));
    }
    this.calloutsContainer.appendChild(el);

    this.callouts.push({
      element: el,
      worldPos: worldPos,
      mode: mode
    });
  }

  updateCalloutsVisibility() {
    this.callouts.forEach(c => {
      if (c.mode === this.текущий_режим) {
        c.element.style.display = 'flex';
      } else {
        c.element.style.display = 'none';
      }
    });
  }

  updateCalloutsPositions() {
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    const tempV = new THREE.Vector3();

    this.callouts.forEach(c => {
      if (c.mode !== this.текущий_режим) return;
      tempV.copy(c.worldPos);
      tempV.project(this.camera);

      // Проверка видимости перед камерой
      if (tempV.z > 1.0 || tempV.z < -1.0) {
        c.element.style.opacity = '0';
        return;
      }

      const screenX = (tempV.x * widthHalf) + widthHalf;
      const screenY = -(tempV.y * heightHalf) + heightHalf;

      c.element.style.transform = `translate(-50%, -100%) translate(${screenX}px, ${screenY}px)`;
      c.element.style.opacity = '1';
    });
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.текущий_режим !== 'MAP') return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const interactiveMeshes = this.gisHotspots.map(h => h.userData.mesh);
      const intersects = this.raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const parentHotspot = this.gisHotspots.find(h => h.userData.mesh === hitMesh);
        if (parentHotspot) {
          this.focusOnNode(parentHotspot.userData.id);
          // Триггер события для UI
          window.dispatchEvent(new CustomEvent('gis-node-selected', { detail: parentHotspot.userData }));
        }
      }
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    // Обновление анимаций
    this.animatedObjects.forEach(obj => obj.update(delta, elapsedTime));

    // Обновление координат экранных 3D бирок
    this.updateCalloutsPositions();

    this.renderer.render(this.scene, this.camera);
  }
}

window.WaterSimulation3D = WaterSimulation3D;
