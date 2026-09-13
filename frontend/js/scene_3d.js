/**
 * ВЫСОКОДЕТАЛИЗИРОВАННЫЙ 3D/4D ВИЗУАЛИЗАТОР «СУ-ОРТА АЗИЯ»
 * Полностью превосходит image_0.png и обеспечивает абсолютную понятность:
 * 1. Режим Двухуровневого Сравнения («Было vs Стало») точно как в image_0.png.
 * 2. Режим Интерактивной Трансформации (по слайдеру 0-100%).
 * 3. Режим 3D Географической Карты Центральной Азии с четкими подписями рек, городов, озер и канала Кош-Тепа.
 * 4. Динамическая привязка экранных меток (3D Callout Tags) к мировым координатам объектов.
 */

class WaterSimulation3D {
  constructor(canvasId, calloutsContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.calloutsContainer = document.getElementById(calloutsContainerId);
    
    // Режимы: 'DUAL' (Двухуровневый как в image_0.png), 'MORPH' (Интерактивный срез), 'MAP' (3D Карта)
    this.текущий_режим = 'DUAL';
    this.уровень_модернизации = 0.0;
    this.кош_тепа_отбор = 0.0;
    this.засуха = false;

    // Сцена
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050811);

    // Камера
    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Управление камерой OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;

    // Группы сцены
    this.groupDual = new THREE.Group();      // Двухуровневый разрез
    this.groupMorph = new THREE.Group();     // Одиночный морфинг-разрез
    this.groupMap = new THREE.Group();       // Географическая карта
    
    this.scene.add(this.groupDual);
    this.scene.add(this.groupMorph);
    this.scene.add(this.groupMap);

    this.groupMorph.visible = false;
    this.groupMap.visible = false;

    // Массив 3D выносок для трекинга координат
    this.callouts = [];

    // Настройка освещения
    this.setupLighting();

    // Создание объектов для каждого режима
    this.buildDualTierScene();
    this.buildMorphScene();
    this.buildBasinMapScene();

    // Установка камеры по умолчанию для режима DUAL
    this.setCameraForDual();

    // Слушатели событий
    window.addEventListener('resize', () => this.onResize());

    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    const amb = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(amb);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(15, 30, 20);
    this.scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x0ea5e9, 0.8);
    backLight.position.set(-15, -10, -15);
    this.scene.add(backLight);
  }

  setCameraForDual() {
    this.camera.position.set(0, 0, 36);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setCameraForMorph() {
    this.camera.position.set(0, 2, 30);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setCameraForMap() {
    this.camera.position.set(0, 26, 32);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  переключить_режим(режим) {
    this.текущий_режим = режим;
    this.groupDual.visible = (режим === 'DUAL');
    this.groupMorph.visible = (режим === 'MORPH');
    this.groupMap.visible = (режим === 'MAP');

    if (режим === 'DUAL') this.setCameraForDual();
    else if (режим === 'MORPH') this.setCameraForMorph();
    else if (режим === 'MAP') this.setCameraForMap();

    this.updateCalloutsVisibility();
  }

  // =========================================================================
  // РЕЖИМ 1: ДВУХУРОВНЕВЫЙ РАЗРЕЗ (ТОЧНО КАК В IMAGE_0.PNG)
  // Верх: Кризис (красный). Низ: Модернизация (лазурный).
  // =========================================================================
  buildDualTierScene() {
    // ВЕРХНИЙ УРОВЕНЬ: ТЕКУЩИЙ КРИЗИС (Y = +6.0)
    const topGroup = new THREE.Group();
    topGroup.position.set(0, 6.0, 0);

    // Рамка-подложка верхнего блока (стиль image_0.png)
    const topBackGeo = new THREE.PlaneGeometry(34, 9.5);
    const topBackMat = new THREE.MeshBasicMaterial({
      color: 0x1f080c,
      side: THREE.DoubleSide
    });
    const topBack = new THREE.Mesh(topBackGeo, topBackMat);
    topBack.position.z = -1.5;
    topGroup.add(topBack);

    // Контурная светящаяся рамка
    const topWireGeo = new THREE.EdgesGeometry(topBackGeo);
    const topWireMat = new THREE.LineBasicMaterial({ color: 0xff334b, linewidth: 2 });
    topGroup.add(new THREE.LineSegments(topWireGeo, topWireMat));

    // Почвенный блок внизу верхней полки
    const topSoilGeo = new THREE.BoxGeometry(32, 2.5, 3);
    const topSoilMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
    const topSoil = new THREE.Mesh(topSoilGeo, topSoilMat);
    topSoil.position.set(0, -3.2, 0);
    topGroup.add(topSoil);

    // Слой солончаков (белая корка соли на поверхности почвы)
    const saltGeo = new THREE.PlaneGeometry(31.8, 2.8);
    const saltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });
    const saltMesh = new THREE.Mesh(saltGeo, saltMat);
    saltMesh.rotation.x = -Math.PI / 2;
    saltMesh.position.set(0, -1.9, 0);
    topGroup.add(saltMesh);

    // Красная труба / земляной канал с характерным изгибом из image_0.png:
    // Горизонтальный участок слева -> наклон вниз -> горизонтальный участок справа
    const curvePointsCrisis = [
      new THREE.Vector3(-15, 1.8, 0),
      new THREE.Vector3(-5, 1.8, 0),
      new THREE.Vector3(1, -1.4, 0),
      new THREE.Vector3(13, -1.4, 0)
    ];
    const curveCrisis = new THREE.CatmullRomCurve3(curvePointsCrisis);
    const pipeCrisisGeo = new THREE.TubeGeometry(curveCrisis, 64, 0.45, 16, false);
    const pipeCrisisMat = new THREE.MeshStandardMaterial({
      color: 0xff334b,
      emissive: 0x880015,
      roughness: 0.3,
      metalness: 0.2
    });
    const pipeCrisis = new THREE.Mesh(pipeCrisisGeo, pipeCrisisMat);
    topGroup.add(pipeCrisis);

    // Свищи и утечки воды из трубы (красные брызги)
    const leakGeo = new THREE.ConeGeometry(0.8, 1.6, 8);
    const leakMat = new THREE.MeshBasicMaterial({ color: 0xff1e38, wireframe: true });
    const leak1 = new THREE.Mesh(leakGeo, leakMat);
    leak1.position.set(-2, 0.2, 0);
    leak1.rotation.z = Math.PI;
    topGroup.add(leak1);

    const leak2 = new THREE.Mesh(leakGeo, leakMat);
    leak2.position.set(4, -1.8, 0);
    leak2.rotation.z = Math.PI;
    topGroup.add(leak2);

    // Круглый резервуар истощенного аквифера (справа)
    const circleOutlineGeo = new THREE.BufferGeometry();
    const cPts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      cPts.push(new THREE.Vector3(Math.cos(th) * 2.0, Math.sin(th) * 2.0, 0));
    }
    circleOutlineGeo.setFromPoints(cPts);
    const outlineMatCrisis = new THREE.LineDashedMaterial({ color: 0xff334b, dashSize: 0.4, gapSize: 0.2 });
    const outlineCrisis = new THREE.Line(circleOutlineGeo, outlineMatCrisis);
    outlineCrisis.computeLineDistances();
    outlineCrisis.position.set(9.0, 1.8, 0);
    topGroup.add(outlineCrisis);

    // Красная жидкость на дне истощенного резервуара
    const waterCrisisGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.7, 24);
    const waterCrisisMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const waterCrisis = new THREE.Mesh(waterCrisisGeo, waterCrisisMat);
    waterCrisis.position.set(9.0, 0.6, 0);
    topGroup.add(waterCrisis);

    // Частицы восходящего испарения
    this.topEvapParticles = this.createParticleField(120, 0xff334b, 20, 4, 2, 0.03);
    this.topEvapParticles.position.set(-2, 1.8, 0);
    topGroup.add(this.topEvapParticles);

    this.groupDual.add(topGroup);

    // =========================================================================
    // НИЖНИЙ УРОВЕНЬ: МОДЕРНИЗИРОВАННАЯ ЭКОСИСТЕМА (Y = -6.0)
    // =========================================================================
    const btmGroup = new THREE.Group();
    btmGroup.position.set(0, -6.0, 0);

    // Рамка-подложка нижнего блока
    const btmBackGeo = new THREE.PlaneGeometry(34, 9.5);
    const btmBackMat = new THREE.MeshBasicMaterial({ color: 0x071526, side: THREE.DoubleSide });
    const btmBack = new THREE.Mesh(btmBackGeo, btmBackMat);
    btmBack.position.z = -1.5;
    btmGroup.add(btmBack);

    const btmWireGeo = new THREE.EdgesGeometry(btmBackGeo);
    const btmWireMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });
    btmGroup.add(new THREE.LineSegments(btmWireGeo, btmWireMat));

    // Почвенный блок внизу
    const btmSoilGeo = new THREE.BoxGeometry(32, 2.5, 3);
    const btmSoilMat = new THREE.MeshStandardMaterial({ color: 0x241913, roughness: 0.9 });
    const btmSoil = new THREE.Mesh(btmSoilGeo, btmSoilMat);
    btmSoil.position.set(0, -3.2, 0);
    btmGroup.add(btmSoil);

    // Лазурная умная композитная труба
    const curveEco = new THREE.CatmullRomCurve3(curvePointsCrisis);
    const pipeEcoGeo = new THREE.TubeGeometry(curveEco, 64, 0.45, 24, false);
    const pipeEcoMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x007799,
      transmission: 0.6,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1
    });
    const pipeEco = new THREE.Mesh(pipeEcoGeo, pipeEcoMat);
    btmGroup.add(pipeEco);

    // Внутренний ламинарный поток чистой воды
    const waterEcoGeo = new THREE.TubeGeometry(curveEco, 64, 0.3, 16, false);
    const waterEcoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    btmGroup.add(new THREE.Mesh(waterEcoGeo, waterEcoMat));

    // Умные датчики IoT (светящиеся кольца на трубе)
    [-10, -2, 6].forEach(posX => {
      const ringGeo = new THREE.TorusGeometry(0.65, 0.08, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(posX, posX < 0 ? 1.8 : -1.4, 0);
      ring.rotation.y = Math.PI / 2;
      btmGroup.add(ring);
    });

    // Зеленые растения с капельным орошением вдоль нижней трубы
    [-12, -7, -3, 2, 7, 11].forEach(px => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(px, -2.0, 0.5);

      // Зеленый росток
      const stemGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.1, 8);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.55;
      plantGroup.add(stem);

      const leafGeo = new THREE.SphereGeometry(0.28, 8, 8);
      leafGeo.scale(1.4, 0.3, 0.8);
      const leaf = new THREE.Mesh(leafGeo, stemMat);
      leaf.position.set(0.15, 0.9, 0);
      plantGroup.add(leaf);

      // Корневая луковица увлажнения капельного полива
      const rootGeo = new THREE.SphereGeometry(0.5, 10, 10);
      const rootMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true });
      const rootBulb = new THREE.Mesh(rootGeo, rootMat);
      rootBulb.position.set(0, -0.4, 0);
      plantGroup.add(rootBulb);

      btmGroup.add(plantGroup);
    });

    // Полный стабильный синий аквифер (справа)
    const outlineMatEco = new THREE.LineBasicMaterial({ color: 0x00f0ff });
    const outlineEco = new THREE.Line(circleOutlineGeo, outlineMatEco);
    outlineEco.position.set(9.0, 1.8, 0);
    btmGroup.add(outlineEco);

    const waterEcoTankGeo = new THREE.CylinderGeometry(1.9, 1.9, 3.6, 24);
    const waterEcoTankMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      roughness: 0.1
    });
    const waterEcoTank = new THREE.Mesh(waterEcoTankGeo, waterEcoTankMat);
    waterEcoTank.position.set(9.0, 1.8, 0);
    btmGroup.add(waterEcoTank);

    this.groupDual.add(btmGroup);

    // Добавление 3D выносок для режима DUAL
    this.addCalloutTag("НЕЭФФЕКТИВНЫЙ ПОЛИВ: 60% ПОТЕРЬ", new THREE.Vector3(-9, 8.5, 0), "crisis", "DUAL");
    this.addCalloutTag("▲ ТЕПЛОВЫЕ ПОТЕРИ НА ИСПАРЕНИЕ ▲", new THREE.Vector3(-2, 10.5, 0), "crisis", "DUAL");
    this.addCalloutTag("▼ СКРЫТЫЕ УТЕЧКИ: 15% В ГРУНТ ▼", new THREE.Vector3(-3, 3.5, 0), "crisis", "DUAL");
    this.addCalloutTag("ЗАСОЛЕНИЕ ПОЧВ (СОЛОНЧАКИ)", new THREE.Vector3(4, 3.6, 0), "crisis", "DUAL");
    this.addCalloutTag("АКВИФЕР: КРИТИЧЕСКИЙ ДЕФИЦИТ 10 ЛЕТ", new THREE.Vector3(9, 9.8, 0), "crisis", "DUAL");

    this.addCalloutTag("ТОЧНОЕ ОРОШЕНИЕ: 68% ЭФФЕКТИВНОСТИ", new THREE.Vector3(-9, -3.5, 0), "eco", "DUAL");
    this.addCalloutTag("СЕТЬ УМНЫХ ДАТЧИКОВ IoT: 100% УЧЕТ", new THREE.Vector3(-2, -3.5, 0), "eco", "DUAL");
    this.addCalloutTag("КАПЕЛЬНЫЙ ПОЛИВ КОРНЕЙ", new THREE.Vector3(5, -8.6, 0), "eco", "DUAL");
    this.addCalloutTag("СТАБИЛЬНЫЙ ВОДОНОСНЫЙ ГОРИЗОНТ", new THREE.Vector3(9, -2.2, 0), "eco", "DUAL");
  }

  // =========================================================================
  // РЕЖИМ 2: ОДИНОЧНЫЙ ИНТЕРАКТИВНЫЙ МОРФИНГ-РАЗРЕЗ (0 - 100%)
  // =========================================================================
  buildMorphScene() {
    // Почвенный блок
    const soilGeo = new THREE.BoxGeometry(32, 6, 6);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x2d1f18, roughness: 0.9 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.set(0, -4.0, 0);
    this.groupMorph.add(soil);

    // Слой соли
    const saltGeo = new THREE.PlaneGeometry(31.8, 5.8);
    this.morphSaltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.9 });
    const salt = new THREE.Mesh(saltGeo, this.morphSaltMat);
    salt.rotation.x = -Math.PI / 2;
    salt.position.set(0, -0.98, 0);
    this.groupMorph.add(salt);

    // Труба / канал
    const pipePoints = [
      new THREE.Vector3(-15, 2.5, 0),
      new THREE.Vector3(-5, 2.5, 0),
      new THREE.Vector3(1, -0.5, 0),
      new THREE.Vector3(13, -0.5, 0)
    ];
    this.morphCurve = new THREE.CatmullRomCurve3(pipePoints);
    const morphPipeGeo = new THREE.TubeGeometry(this.morphCurve, 64, 0.6, 24, false);
    this.morphPipeMat = new THREE.MeshStandardMaterial({
      color: 0xff334b,
      roughness: 0.3
    });
    this.morphPipe = new THREE.Mesh(morphPipeGeo, this.morphPipeMat);
    this.groupMorph.add(this.morphPipe);

    // Водоносный горизонт (справа)
    const tankGeo = new THREE.CylinderGeometry(2.4, 2.4, 3.8, 24);
    this.morphTankMat = new THREE.MeshStandardMaterial({ color: 0xff2244, roughness: 0.2 });
    this.morphTank = new THREE.Mesh(tankGeo, this.morphTankMat);
    this.morphTank.position.set(9.0, 2.5, 0);
    this.groupMorph.add(this.morphTank);

    // Частицы испарения
    this.morphEvap = this.createParticleField(150, 0xff334b, 20, 5, 3, 0.035);
    this.morphEvap.position.set(-2, 2.5, 0);
    this.groupMorph.add(this.morphEvap);

    // Растения
    this.morphPlants = [];
    [-11, -6, -1, 4, 8, 12].forEach(px => {
      const pGroup = new THREE.Group();
      pGroup.position.set(px, -0.95, 1.2);
      const sGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: 0x4a3220 });
      const stem = new THREE.Mesh(sGeo, pMat);
      stem.position.y = 0.6;
      pGroup.add(stem);
      this.groupMorph.add(pGroup);
      this.morphPlants.push({ group: pGroup, mat: pMat });
    });

    this.addCalloutTag("РЕГУЛИРУЕМЫЙ ГИДРАВЛИЧЕСКИЙ ТРАКТ", new THREE.Vector3(-4, 4.2, 0), "crisis", "MORPH");
    this.addCalloutTag("РЕГИОНАЛЬНЫЙ ВОДОНОСНЫЙ ГОРИЗОНТ", new THREE.Vector3(9, 5.2, 0), "crisis", "MORPH");
  }

  // =========================================================================
  // РЕЖИМ 3: 3D ГЕОГРАФИЧЕСКАЯ КАРТА БАССЕЙНА ЦЕНТРАЛЬНОЙ АЗИИ
  // Полноценная географическая карта с реками, городами, озерами и Кош-Тепа
  // =========================================================================
  buildBasinMapScene() {
    // Подложка бассейна с текстурой высот
    const terrainGeo = new THREE.PlaneGeometry(54, 42, 64, 48);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = 0;
      // Восточные горы (Тянь-Шань, Памир)
      if (x > 6) z = Math.pow((x - 6) / 16, 2) * 6.0;
      // Аральская котловина
      if (x < -10 && Math.abs(y - 4) < 10) z = -1.2;
      pos.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x121c2e,
      roughness: 0.85,
      metalness: 0.1
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    this.groupMap.add(terrain);

    // Заснеженные ледники Тянь-Шаня и Памира
    const iceGeo = new THREE.BoxGeometry(10, 1.8, 22);
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, metalness: 0.3 });
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(21, 2.5, 0);
    this.groupMap.add(ice);

    // Река АМУДАРЬЯ (Пяндж -> Вахш -> Термез -> Чарджоу -> Нукус -> Арал)
    const amudaryaPts = [
      new THREE.Vector3(18, 1.8, 9),
      new THREE.Vector3(11, 0.6, 6.5),
      new THREE.Vector3(2, 0.3, 4.2),
      new THREE.Vector3(-6, 0.15, 2.5),
      new THREE.Vector3(-14, 0.1, 5),
      new THREE.Vector3(-19, -0.4, 6)
    ];
    this.amudaryaCurve = new THREE.CatmullRomCurve3(amudaryaPts);
    const amuGeo = new THREE.TubeGeometry(this.amudaryaCurve, 64, 0.45, 12, false);
    this.amuMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    this.amuMesh = new THREE.Mesh(amuGeo, this.amuMat);
    this.groupMap.add(this.amuMesh);

    // Река СЫРДАРЬЯ (Нарын -> Фергана -> Чардара -> Кызылорда -> Малый Арал)
    const syrdaryaPts = [
      new THREE.Vector3(19, 1.9, -6),
      new THREE.Vector3(12, 0.6, -4.5),
      new THREE.Vector3(4, 0.3, -6.5),
      new THREE.Vector3(-6, 0.15, -8.5),
      new THREE.Vector3(-16, -0.2, -7.5)
    ];
    this.syrdaryaCurve = new THREE.CatmullRomCurve3(syrdaryaPts);
    const syrGeo = new THREE.TubeGeometry(this.syrdaryaCurve, 64, 0.38, 12, false);
    this.syrMesh = new THREE.Mesh(syrGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    this.groupMap.add(this.syrMesh);

    // КАРАКУМСКИЙ КАНАЛ (1100 км, Туркменистан)
    const karakumPts = [
      new THREE.Vector3(5, 0.25, 4.8),
      new THREE.Vector3(-2, 0.15, 9.5),
      new THREE.Vector3(-10, 0.1, 13.0)
    ];
    const karakumCurve = new THREE.CatmullRomCurve3(karakumPts);
    const karakumGeo = new THREE.TubeGeometry(karakumCurve, 32, 0.28, 8, false);
    const karakumMesh = new THREE.Mesh(karakumGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    this.groupMap.add(karakumMesh);

    // КАНАЛ КОШ-ТЕПА (Северный Афганистан, водозабор из Амударьи)
    const koshPts = [
      new THREE.Vector3(10, 0.45, 6.8), // Головной водозабор Калдар
      new THREE.Vector3(7, 0.3, 9.8),   // Балх
      new THREE.Vector3(2, 0.2, 12.2),  // Джаузджан
      new THREE.Vector3(-4, 0.15, 13.5) // Андхой / Фарьяб
    ];
    this.koshCurve = new THREE.CatmullRomCurve3(koshPts);
    const koshGeo = new THREE.TubeGeometry(this.koshCurve, 32, 0.35, 10, false);
    this.koshMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.koshMesh = new THREE.Mesh(koshGeo, this.koshMat);
    this.groupMap.add(this.koshMesh);

    // ВОДОЕМЫ:
    // 1. Северное Аральское море (Малый Арал)
    const northAralGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.3, 24);
    const northAral = new THREE.Mesh(northAralGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 }));
    northAral.position.set(-17, -0.05, -7.5);
    this.groupMap.add(northAral);

    // 2. Южное Аральское море (Большой Арал / Аралкум)
    const southAralGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.3, 24);
    this.southAralMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.2 });
    this.southAralMesh = new THREE.Mesh(southAralGeo, this.southAralMat);
    this.southAralMesh.position.set(-19, -0.2, 6);
    this.groupMap.add(this.southAralMesh);

    // 3. Токтогульское водохранилище
    const toktogulGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 16);
    const toktogul = new THREE.Mesh(toktogulGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    toktogul.position.set(15, 1.2, -5.5);
    this.groupMap.add(toktogul);

    // 4. Чарвакское водохранилище
    const charvakGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 16);
    const charvak = new THREE.Mesh(charvakGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    charvak.position.set(9.5, 0.8, -2.8);
    this.groupMap.add(charvak);

    // 5. Нурекское водохранилище
    const nurekGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16);
    const nurek = new THREE.Mesh(nurekGeo, new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
    nurek.position.set(13, 1.0, 4.5);
    this.groupMap.add(nurek);

    // Метки рек и объектов на карте
    this.addCalloutTag("Р. АМУДАРЬЯ (68 км³/год)", new THREE.Vector3(-2, 1.2, 2.5), "eco", "MAP");
    this.addCalloutTag("Р. СЫРДАРЬЯ (38.5 км³/год)", new THREE.Vector3(-1, 1.2, -7.5), "eco", "MAP");
    this.addCalloutTag("КАРАКУМСКИЙ КАНАЛ (11 км³/год)", new THREE.Vector3(-3, 1.0, 10.5), "eco", "MAP");
    this.addCalloutTag("⚠️ КАНАЛ КОШ-ТЕПА (АФГАНИСТАН: до 15 км³/год)", new THREE.Vector3(4, 1.5, 11.5), "crisis", "MAP");

    this.addCalloutTag("СЕВЕРНЫЙ АРАЛ (МАЛЫЙ АРАЛ)", new THREE.Vector3(-17, 1.2, -7.5), "eco", "MAP");
    this.addCalloutTag("ЮЖНЫЙ АРАЛ (УСЫХАЮЩИЙ АРАЛКУМ)", new THREE.Vector3(-19, 1.0, 6), "crisis", "MAP");
    this.addCalloutTag("ТОКТОГУЛЬСКОЕ ВДХР. (19.5 км³)", new THREE.Vector3(15, 2.2, -5.5), "eco", "MAP");
    this.addCalloutTag("НУРЕКСКОЕ ВДХР. (10.5 км³)", new THREE.Vector3(13, 2.0, 4.5), "eco", "MAP");

    // Города Центральной Азии
    this.addCalloutTag("ТАШКЕНТ (3.1 млн)", new THREE.Vector3(8, 1.6, -3.2), "eco", "MAP");
    this.addCalloutTag("АЛМАТЫ (2.3 млн)", new THREE.Vector3(17, 2.2, -9.5), "eco", "MAP");
    this.addCalloutTag("БИШКЕК (1.2 млн)", new THREE.Vector3(14, 1.8, -7.2), "eco", "MAP");
    this.addCalloutTag("ДУШАНБЕ (1.2 млн)", new THREE.Vector3(11.5, 1.6, 4.2), "eco", "MAP");
    this.addCalloutTag("САМАРКАНД (1.1 млн)", new THREE.Vector3(3.5, 1.2, 1.2), "crisis", "MAP");
    this.addCalloutTag("АШХАБАД (1.0 млн)", new THREE.Vector3(-10, 1.0, 13.5), "crisis", "MAP");
    this.addCalloutTag("НУКУС (КАРАКАЛПАКСТАН)", new THREE.Vector3(-14, 1.0, 5), "crisis", "MAP");
  }

  createParticleField(count, color, rangeX, rangeY, rangeZ, speedY) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * rangeX;
      pos[i * 3 + 1] = Math.random() * rangeY;
      pos[i * 3 + 2] = (Math.random() - 0.5) * rangeZ;
      vels.push({ y: Math.random() * speedY + 0.015 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: color,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.userData = { velocities: vels, rangeY: rangeY };
    return points;
  }

  // Создание экранных выносок (3D Callout Tags)
  addCalloutTag(text, worldPos, styleClass, mode) {
    const div = document.createElement('div');
    div.className = `callout-tag ${styleClass}`;
    div.innerHTML = `<span class="tag-dot"></span><span>${text}</span>`;
    this.calloutsContainer.appendChild(div);

    this.callouts.push({
      element: div,
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
    const tempV = new THREE.Vector3();
    const wHalf = window.innerWidth / 2;
    const hHalf = window.innerHeight / 2;

    this.callouts.forEach(c => {
      if (c.mode !== this.текущий_режим) return;

      tempV.copy(c.worldPos);
      tempV.project(this.camera);

      // Если объект за камерой
      if (tempV.z > 1) {
        c.element.style.display = 'none';
        return;
      }

      c.element.style.display = 'flex';
      const x = (tempV.x * wHalf) + wHalf;
      const y = -(tempV.y * hHalf) + hHalf;
      c.element.style.left = `${x}px`;
      c.element.style.top = `${y}px`;
    });
  }

  обновить_параметры(уровень_модернизации, кош_тепа_км3, засуха) {
    this.уровень_модернизации = уровень_модернизации;
    this.кош_тепа_отбор = кош_тепа_км3;
    this.засуха = засуха;

    // Обновление морфинг-разреза (Режим MORPH)
    if (this.morphPipeMat) {
      const col = new THREE.Color().lerpColors(
        new THREE.Color(0xff334b),
        new THREE.Color(0x00f0ff),
        уровень_модернизации
      );
      this.morphPipeMat.color = col;

      if (this.morphTankMat) {
        this.morphTankMat.color = col;
        this.morphTank.position.y = 1.0 + уровень_модернизации * 1.8;
      }
      if (this.morphSaltMat) {
        this.morphSaltMat.opacity = Math.max(0.02, (1.0 - уровень_модернизации * 0.95));
      }
      if (this.morphPlants) {
        this.morphPlants.forEach(p => {
          p.mat.color = new THREE.Color().lerpColors(
            new THREE.Color(0x4a3220),
            new THREE.Color(0x10b981),
            уровень_модернизации
          );
        });
      }
    }

    // Обновление карты при отборе Кош-Тепа
    if (this.amuMat) {
      if (кош_тепа_км3 > 6.0 && уровень_модернизации < 0.4) {
        this.amuMat.color.setRGB(0.9, 0.2, 0.2); // Амударья истощается
        this.southAralMat.color.setRGB(0.5, 0.1, 0.1);
      } else {
        this.amuMat.color.setRGB(0.02, 0.52, 0.78);
        this.southAralMat.color.setRGB(0.39, 0.4, 0.95);
      }
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Анимация частиц пара
    [this.topEvapParticles, this.morphEvap].forEach(pts => {
      if (pts) {
        const pos = pts.geometry.attributes.position;
        const vels = pts.userData.velocities;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + vels[i].y;
          if (y > pts.userData.rangeY + 1.5) y = 0.0;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateCalloutsPositions();
  }
}
