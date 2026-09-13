/**
 * 3D/4D ВИЗУАЛИЗАТОР «СУ-ОРТА АЗИЯ» НА THREE.JS
 * Превосходит схему image_0.png, реализуя:
 * 1. 3D Инженерный разрез гидравлического тракта («Кризис vs Модернизация»).
 * 2. Земляные каналы с эрозией, старые текущие трубы с трещинами и брызгами.
 * 3. Красную зону утечки в почву и восходящую тепловую карту испарения.
 * 4. Слой симуляции солончаков (кристаллизация белой соли на поверхности).
 * 5. Капельное орошение, корневую систему, луковицы увлажнения и зеленые посевы.
 * 6. Динамический водоносный горизонт (пузырь аквифера: истощенный красный vs стабильный сапфировый).
 * 7. 3D Карту речного бассейна (Амударья, Сырдарья, Канал Кош-Тепа, ледники, города).
 * 8. Сеть кликабельных IoT-датчиков с рейкастингом.
 */

class WaterSimulation3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.текущий_режим = 'РАЗРЕЗ'; // 'РАЗРЕЗ' или 'КАРТА'
    this.уровень_модернизации = 0.0;
    this.кош_тепа_отбор = 0.0;
    this.засуха = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060a12);
    this.scene.fog = new THREE.FogExp2(0x060a12, 0.015);

    // Камера и рендерер
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Контроллеры камеры
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;

    // Освещение
    this.setupLighting();

    // Группы сцен
    this.groupCrossSection = new THREE.Group();
    this.groupBasinMap = new THREE.Group();
    this.scene.add(this.groupCrossSection);
    this.scene.add(this.groupBasinMap);
    this.groupBasinMap.visible = false;

    // Интерактивные объекты и частицы
    this.clickableObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Построение сцен
    this.buildCrossSectionScene();
    this.buildBasinMapScene();

    // Позиция камеры по умолчанию для разреза
    this.setCameraForCrossSection();

    // Слушатели событий
    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    // Запуск цикла анимации
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Неоновые акцентные источники света
    this.lightRedCrisis = new THREE.PointLight(0xff2244, 2.5, 30);
    this.lightRedCrisis.position.set(-5, 6, 2);
    this.scene.add(this.lightRedCrisis);

    this.lightCyanEco = new THREE.PointLight(0x00f0ff, 2.0, 30);
    this.lightCyanEco.position.set(10, 6, 2);
    this.scene.add(this.lightCyanEco);
  }

  setCameraForCrossSection() {
    this.camera.position.set(0, 8, 30);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setCameraForBasinMap() {
    this.camera.position.set(0, 28, 32);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  переключить_режим(режим) {
    this.текущий_режим = режим;
    if (режим === 'РАЗРЕЗ') {
      this.groupCrossSection.visible = true;
      this.groupBasinMap.visible = false;
      this.setCameraForCrossSection();
    } else {
      this.groupCrossSection.visible = false;
      this.groupBasinMap.visible = true;
      this.setCameraForBasinMap();
    }
  }

  // =========================================================================
  // 1. СЦЕНА 3D РАЗРЕЗА ГИДРАВЛИЧЕСКОГО ТРАКТА («КРИЗИС VS МОДЕРНИЗАЦИЯ»)
  // =========================================================================
  buildCrossSectionScene() {
    // 1. Почвенный блок (Срезанный инженерный грунт)
    const soilGeo = new THREE.BoxGeometry(32, 7, 10);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.9,
      metalness: 0.1
    });
    this.soilBlock = new THREE.Mesh(soilGeo, soilMat);
    this.soilBlock.position.set(0, -4.5, 0);
    this.soilBlock.receiveShadow = true;
    this.groupCrossSection.add(this.soilBlock);

    // 2. Слой засоления почв (Солончаки - белый кристаллический налет)
    const saltGeo = new THREE.PlaneGeometry(31.8, 9.8, 32, 16);
    // Делаем небольшую шероховатость поверхности
    const pos = saltGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (Math.random() - 0.5) * 0.15);
    }
    saltGeo.computeVertexNormals();

    this.saltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    this.saltLayer = new THREE.Mesh(saltGeo, this.saltMat);
    this.saltLayer.rotation.x = -Math.PI / 2;
    this.saltLayer.position.set(0, -0.95, 0);
    this.groupCrossSection.add(this.saltLayer);

    // 3. Зона фильтрации и утечки (Красная зона в грунте под каналом)
    const leakPlumeGeo = new THREE.ConeGeometry(7, 6, 16, 8, true);
    this.leakPlumeMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      transparent: true,
      opacity: 0.5,
      wireframe: true
    });
    this.leakPlume = new THREE.Mesh(leakPlumeGeo, this.leakPlumeMat);
    this.leakPlume.position.set(-6, -4.5, 0);
    this.leakPlume.rotation.x = Math.PI;
    this.groupCrossSection.add(this.leakPlume);

    // 4. Траектория канала/трубы (Профиль точно как в image_0.png)
    // Верхняя полка -> Спуск по диагонали -> Нижняя полка
    const pipePoints = [
      new THREE.Vector3(-15, 3.5, 0),
      new THREE.Vector3(-5, 3.5, 0),
      new THREE.Vector3(2, -0.5, 0),
      new THREE.Vector3(12, -0.5, 0)
    ];
    this.pipeCurve = new THREE.CatmullRomCurve3(pipePoints);
    this.pipeCurve.curveType = 'chordal';

    // Ветхий земляной/ржавый канал (Кризис)
    const earthenGeo = new THREE.TubeGeometry(this.pipeCurve, 64, 0.9, 16, false);
    this.earthenMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.95,
      metalness: 0.1,
      bumpScale: 0.2
    });
    this.earthenChannel = new THREE.Mesh(earthenGeo, this.earthenMat);
    this.groupCrossSection.add(this.earthenChannel);

    // Умная прозрачная труба (Модернизация)
    const smartPipeGeo = new THREE.TubeGeometry(this.pipeCurve, 64, 0.75, 24, false);
    this.smartPipeMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.85,
      ior: 1.4
    });
    this.smartPipe = new THREE.Mesh(smartPipeGeo, this.smartPipeMat);
    this.groupCrossSection.add(this.smartPipe);

    // Внутренний поток воды (Красная энергия потерь vs Голубая ламинарная вода)
    const waterFlowGeo = new THREE.TubeGeometry(this.pipeCurve, 64, 0.55, 16, false);
    this.waterFlowMat = new THREE.MeshBasicMaterial({
      color: 0xff334b,
      transparent: true,
      opacity: 0.9
    });
    this.waterFlow = new THREE.Mesh(waterFlowGeo, this.waterFlowMat);
    this.groupCrossSection.add(this.waterFlow);

    // 5. Региональный водоносный горизонт (Aquifer Gauge из image_0.png)
    // Правая часть: цилиндрический бак с пунктирной рамкой и жидкостью внутри
    const tankGroup = new THREE.Group();
    tankGroup.position.set(8.5, 3.5, 0);

    // Пунктирная историческая граница (Dashed Circle)
    const circleGeo = new THREE.BufferGeometry();
    const circlePts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(Math.cos(th) * 2.5, Math.sin(th) * 2.5, 0));
    }
    circleGeo.setFromPoints(circlePts);
    this.aquiferOutlineMat = new THREE.LineDashedMaterial({
      color: 0xff334b,
      dashSize: 0.4,
      gapSize: 0.25,
      scale: 1
    });
    this.aquiferOutline = new THREE.Line(circleGeo, this.aquiferOutlineMat);
    this.aquiferOutline.computeLineDistances();
    tankGroup.add(this.aquiferOutline);

    // Внутреннее заполнение водой (уровень меняется по слайдеру)
    const aquiferWaterGeo = new THREE.CylinderGeometry(2.3, 2.3, 2.2, 32);
    this.aquiferWaterMat = new THREE.MeshStandardMaterial({
      color: 0xff2244,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    this.aquiferWater = new THREE.Mesh(aquiferWaterGeo, this.aquiferWaterMat);
    this.aquiferWater.position.set(0, -1.2, 0);
    tankGroup.add(this.aquiferWater);

    this.groupCrossSection.add(tankGroup);

    // 6. Частицы восходящего испарения (▲ ПОТЕРИ НА ИСПАРЕНИЕ ▲)
    this.initEvaporationParticles();

    // 7. Частицы утечки и фильтрации (▼ УТЕЧКИ В ГРУНТ ▼)
    this.initLeakParticles();

    // 8. Растения и капельное орошение
    this.initPlantsAndDrip();

    // 9. IoT Датчики на трубе
    this.initIoTSensorsOnPipe();
  }

  initEvaporationParticles() {
    const pCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 8 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      velocities.push({
        y: Math.random() * 0.04 + 0.02,
        x: (Math.random() - 0.5) * 0.015
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.evapMat = new THREE.PointsMaterial({
      color: 0xff334b,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.evapParticles = new THREE.Points(geo, this.evapMat);
    this.evapVelocities = velocities;
    this.groupCrossSection.add(this.evapParticles);
  }

  initLeakParticles() {
    const pCount = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16 - 2;
      positions[i * 3 + 1] = -Math.random() * 5 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
      velocities.push({
        y: -Math.random() * 0.03 - 0.01,
        x: (Math.random() - 0.5) * 0.01
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.leakMat = new THREE.PointsMaterial({
      color: 0xff1e38,
      size: 0.28,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.leakParticles = new THREE.Points(geo, this.leakMat);
    this.leakVelocities = velocities;
    this.groupCrossSection.add(this.leakParticles);
  }

  initPlantsAndDrip() {
    this.plantsGroup = new THREE.Group();
    this.groupCrossSection.add(this.plantsGroup);

    this.plantMeshes = [];
    const plantCount = 6;
    const startX = -12;
    const stepX = 4.8;

    for (let i = 0; i < plantCount; i++) {
      const pGroup = new THREE.Group();
      const posX = startX + i * stepX;
      pGroup.position.set(posX, -0.9, 2.2);

      // Стебель и листья
      const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
      const leafGeo = new THREE.SphereGeometry(0.35, 8, 8);
      leafGeo.scale(1.4, 0.4, 0.8);

      const plantMat = new THREE.MeshStandardMaterial({
        color: 0x4a3220, // При кризисе бурый увядший
        roughness: 0.8
      });

      const stem = new THREE.Mesh(stemGeo, plantMat);
      stem.position.y = 0.6;
      pGroup.add(stem);

      const leaf1 = new THREE.Mesh(leafGeo, plantMat);
      leaf1.position.set(0.2, 1.0, 0);
      leaf1.rotation.z = 0.4;
      pGroup.add(leaf1);

      const leaf2 = new THREE.Mesh(leafGeo, plantMat);
      leaf2.position.set(-0.2, 0.8, 0);
      leaf2.rotation.z = -0.4;
      pGroup.add(leaf2);

      // Корневая система (внутри почвы)
      const rootGeo = new THREE.ConeGeometry(0.4, 1.4, 6, 1, true);
      const rootMat = new THREE.MeshBasicMaterial({
        color: 0x855030,
        wireframe: true
      });
      const roots = new THREE.Mesh(rootGeo, rootMat);
      roots.position.set(0, -0.7, 0);
      roots.rotation.x = Math.PI;
      pGroup.add(roots);

      // Влажностная луковица капельного орошения
      const bulbGeo = new THREE.SphereGeometry(0.65, 12, 12);
      const bulbMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.0,
        wireframe: true
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(0, -0.6, 0);
      pGroup.add(bulb);

      this.plantsGroup.add(pGroup);
      this.plantMeshes.push({ group: pGroup, mat: plantMat, bulbMat: bulbMat });
    }
  }

  initIoTSensorsOnPipe() {
    this.sensorNodes = [];
    const sensorPositions = [
      { t: 0.15, id: "UZB-TASH-FL-01", name: "Расходомер Чарвак-Ташкент" },
      { t: 0.45, id: "TKM-KRK-LEAK-21", name: "Акустический датчик Каракумы" },
      { t: 0.75, id: "SMART-DRIP-VALVE-77", name: "Умный клапан капельного полива" }
    ];

    sensorPositions.forEach(sp => {
      const pt = this.pipeCurve.getPoint(sp.t);
      const ringGeo = new THREE.TorusGeometry(0.95, 0.12, 12, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00a0cc,
        metalness: 0.8,
        roughness: 0.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pt);
      ring.rotation.y = Math.PI / 2;

      // Маяк/сфера телеметрии
      const beaconGeo = new THREE.SphereGeometry(0.25, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ff9d });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 1.2, 0);
      ring.add(beacon);

      ring.userData = {
        type: 'IOT_SENSOR',
        id: sp.id,
        name: sp.name
      };

      this.groupCrossSection.add(ring);
      this.sensorNodes.push(ring);
      this.clickableObjects.push(ring);
    });
  }

  // =========================================================================
  // 2. СЦЕНА 3D КАРТЫ БАССЕЙНА (АМУДАРЬЯ, СЫРДАРЬЯ, КОШ-ТЕПА, АРАЛ)
  // =========================================================================
  buildBasinMapScene() {
    // Рельефная подложка бассейна
    const terrainGeo = new THREE.PlaneGeometry(50, 40, 64, 48);
    const pos = terrainGeo.attributes.position;

    // Моделируем горы Тянь-Шаня и Памира на востоке (справа) и низины Турана/Арала на западе (слева)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let z = 0;

      // Восточные хребты (Памир, Тянь-Шань)
      if (x > 5) {
        z = Math.pow((x - 5) / 18, 2) * 5.5 + Math.sin(y * 0.8) * 0.8;
      }
      // Аральская впадина
      if (x < -10 && Math.abs(y - 5) < 8) {
        z = -1.2 + Math.cos((x + 10) * 0.3) * 0.4;
      }
      pos.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x182436,
      roughness: 0.85,
      metalness: 0.15,
      wireframe: false
    });
    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.groupBasinMap.add(this.terrainMesh);

    // Ледники на вершинах гор
    const glacierGeo = new THREE.BoxGeometry(10, 1.5, 20);
    const glacierMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      metalness: 0.4
    });
    const glaciers = new THREE.Mesh(glacierGeo, glacierMat);
    glaciers.position.set(20, 2.5, 0);
    this.groupBasinMap.add(glaciers);

    // Русло Амударьи (светящаяся 3D кривая)
    const amudaryaPts = [
      new THREE.Vector3(18, 1.8, 8),   // Пяндж / Памир
      new THREE.Vector3(10, 0.4, 6),   // Термез
      new THREE.Vector3(2, 0.2, 4),    // Керки
      new THREE.Vector3(-6, 0.1, 2),   // Бухара / Чарджоу
      new THREE.Vector3(-14, 0.05, 5), // Нукус / Дельта
      new THREE.Vector3(-18, -0.5, 6)  // Южный Арал
    ];
    this.amudaryaCurve = new THREE.CatmullRomCurve3(amudaryaPts);
    const amudaryaGeo = new THREE.TubeGeometry(this.amudaryaCurve, 64, 0.35, 8, false);
    this.amudaryaMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    this.amudaryaMesh = new THREE.Mesh(amudaryaGeo, this.amudaryaMat);
    this.groupBasinMap.add(this.amudaryaMesh);

    // Русло Сырдарьи
    const syrdaryaPts = [
      new THREE.Vector3(19, 1.9, -6),  // Нарын / Тянь-Шань
      new THREE.Vector3(11, 0.5, -4),  // Ферганская долина
      new THREE.Vector3(4, 0.2, -6),   // Чардара
      new THREE.Vector3(-6, 0.1, -8),  // Кызылорда
      new THREE.Vector3(-16, -0.2, -7) // Северный Арал
    ];
    this.syrdaryaCurve = new THREE.CatmullRomCurve3(syrdaryaPts);
    const syrdaryaGeo = new THREE.TubeGeometry(this.syrdaryaCurve, 64, 0.28, 8, false);
    this.syrdaryaMesh = new THREE.Mesh(syrdaryaGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    this.groupBasinMap.add(this.syrdaryaMesh);

    // Канал Кош-Тепа (Афганистан)
    const koshTepaPts = [
      new THREE.Vector3(9, 0.35, 6.2), // Точка водозабора Калдар
      new THREE.Vector3(7, 0.2, 9),    // Балх
      new THREE.Vector3(3, 0.15, 11),  // Джаузджан
      new THREE.Vector3(-2, 0.1, 12)   // Андхой / Фарьяб
    ];
    this.koshTepaCurve = new THREE.CatmullRomCurve3(koshTepaPts);
    this.koshTepaGeo = new THREE.TubeGeometry(this.koshTepaCurve, 32, 0.25, 8, false);
    this.koshTepaMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.koshTepaMesh = new THREE.Mesh(this.koshTepaGeo, this.koshTepaMat);
    this.groupBasinMap.add(this.koshTepaMesh);

    // Аральское море (Северный и Южный бассейны)
    const northAralGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.3, 24);
    this.northAralMesh = new THREE.Mesh(northAralGeo, new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1 }));
    this.northAralMesh.position.set(-17, -0.1, -7);
    this.groupBasinMap.add(this.northAralMesh);

    const southAralGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.3, 24);
    this.southAralMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.2 });
    this.southAralMesh = new THREE.Mesh(southAralGeo, this.southAralMat);
    this.southAralMesh.position.set(-18, -0.3, 6);
    this.groupBasinMap.add(this.southAralMesh);

    // Города Центральной Азии (3D Маяки)
    const citiesData = [
      { name: "Ташкент", pos: [8, 0.6, -3], col: 0x00f0ff },
      { name: "Алматы", pos: [16, 1.2, -9], col: 0x10b981 },
      { name: "Бишкек", pos: [13, 0.9, -7], col: 0x38bdf8 },
      { name: "Душанбе", pos: [12, 0.8, 4], col: 0xa855f7 },
      { name: "Самарканд", pos: [3, 0.3, 1], col: 0xf59e0b }
    ];

    citiesData.forEach(c => {
      const pinGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.0, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: c.col });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(c.pos[0], c.pos[1] + 1.0, c.pos[2]);

      const sphereGeo = new THREE.SphereGeometry(0.4, 12, 12);
      const sphere = new THREE.Mesh(sphereGeo, pinMat);
      sphere.position.y = 1.0;
      pin.add(sphere);

      pin.userData = {
        type: 'CITY',
        name: c.name
      };

      this.groupBasinMap.add(pin);
      this.clickableObjects.push(pin);
    });
  }

  // =========================================================================
  // ОБНОВЛЕНИЕ ДИНАМИКИ СИМУЛЯЦИИ НА КАЖДОМ КАДРЕ
  // =========================================================================
  обновить_параметры(уровень_модернизации, кош_тепа_км3, засуха) {
    this.уровень_модернизации = уровень_модернизации;
    this.кош_тепа_отбор = кош_тепа_км3;
    this.засуха = засуха;

    // 1. Плавный морфинг материалов труб и каналов
    // Ветхий земляной канал становится незаметным при 100% модернизации
    this.earthenMat.opacity = 1.0 - уровень_модернизации;
    this.earthenMat.transparent = true;

    // Умная труба становится яркой при модернизации
    this.smartPipeMat.opacity = 0.2 + уровень_модернизации * 0.75;

    // Цвет потока воды (Красный кризис 0.0 -> Голубой ламинар 1.0)
    const r = (1.0 - уровень_модернизации) * 1.0 + уровень_модернизации * 0.0;
    const g = (1.0 - уровень_модернизации) * 0.2 + уровень_модернизации * 0.94;
    const b = (1.0 - уровень_модернизации) * 0.3 + уровень_модернизации * 1.0;
    this.waterFlowMat.color.setRGB(r, g, b);

    // 2. Слой солей (солончаки): исчезает при капельном поливе
    this.saltMat.opacity = Math.max(0.02, (1.0 - уровень_модернизации * 0.95) * (засуха ? 0.95 : 0.75));

    // 3. Зона утечки (конус в грунте): сжимается до нуля
    this.leakPlumeMat.opacity = (1.0 - уровень_модернизации) * 0.6;
    this.leakPlume.scale.set(1.0 - уровень_модернизации * 0.9, 1.0 - уровень_модернизации * 0.9, 1.0 - уровень_модернизации * 0.9);

    // 4. Водоносный горизонт (Aquifer Gauge):
    // При кризисе: пустой красный бак
    // При модернизации: полный глубокий синий сапфировый водоем
    const aquiferLevel = -1.6 + уровень_модернизации * 1.4;
    this.aquiferWater.position.y = aquiferLevel;
    this.aquiferWater.scale.y = 0.2 + уровень_модернизации * 0.8;

    const aqColor = new THREE.Color().lerpColors(
      new THREE.Color(0xff2244),
      new THREE.Color(0x00f0ff),
      уровень_модернизации
    );
    this.aquiferWaterMat.color = aqColor;
    this.aquiferOutlineMat.color = aqColor;

    // 5. Растения: переход от бурых увядших к сочным зеленым
    this.plantMeshes.forEach(pm => {
      const plantCol = new THREE.Color().lerpColors(
        new THREE.Color(0x4a3220),
        new THREE.Color(0x10b981),
        уровень_модернизации
      );
      pm.mat.color = plantCol;
      // Луковицы капельного увлажнения активны при модернизации
      pm.bulbMat.opacity = уровень_модернизации * 0.65;
    });

    // 6. Интенсивность частиц испарения и утечек
    this.evapMat.opacity = (1.0 - уровень_модернизации * 0.85) * (засуха ? 1.0 : 0.6);
    this.leakMat.opacity = (1.0 - уровень_модернизации * 0.95) * 0.8;

    // 7. Влияние Канала Кош-Тепа на реку Амударья
    if (this.amudaryaMat) {
      if (кош_тепа_км3 > 6.0 && уровень_модернизации < 0.4) {
        // Река пересыхает и краснеет
        this.amudaryaMat.color.setRGB(0.9, 0.2, 0.2);
        this.southAralMat.color.setRGB(0.6, 0.1, 0.1);
        this.southAralMesh.scale.set(0.6, 0.4, 0.6);
      } else {
        this.amudaryaMat.color.setRGB(0.05, 0.65, 0.95);
        this.southAralMat.color.setRGB(0.3, 0.2, 0.8);
        this.southAralMesh.scale.set(1.0, 1.0, 1.0);
      }
    }
  }

  onClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.type && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData.type) {
        if (window.onSelect3DObject) {
          window.onSelect3DObject(obj.userData);
        }
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

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Анимация частиц испарения
    if (this.evapParticles) {
      const pos = this.evapParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + this.evapVelocities[i].y;
        let x = pos.getX(i) + this.evapVelocities[i].x;
        if (y > 9) {
          y = 1.0;
          x = (Math.random() - 0.5) * 22;
        }
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }

    // Анимация частиц утечки
    if (this.leakParticles) {
      const pos = this.leakParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + this.leakVelocities[i].y;
        if (y < -6.5) {
          y = -1.2;
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Пульсация IoT маяков
    this.sensorNodes.forEach((sn, idx) => {
      const beacon = sn.children[0];
      if (beacon) {
        const s = 1.0 + Math.sin(time * 4 + idx) * 0.25;
        beacon.scale.set(s, s, s);
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
