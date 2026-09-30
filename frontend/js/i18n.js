/**
 * ============================================================================
 * МОДУЛЬ МЕЖДУНАРОДНОЙ ЛОКАЛИЗАЦИИ (I18N) «СУ-ОРТА АЗИЯ»
 * ============================================================================
 * Поддержка 4 языков бассейна: Русский, O'zbekcha, Қазақша, English
 */

const I18N_DICT = {
  ru: {
    brand_sub: "Бассейн Аральского моря: Амударья, Сырдарья, Токтогул, Нурек и Канал Кош-Тепа",
    view_map: "3D Спутниковая карта",
    view_dual: "CAD-разрез каналов",
    view_morph: "Трансформация (0-100%)",
    view_dam: "3D ГЭС в разрезе",
    btn_ai: "🧠 AI Диспетчер",
    btn_lab: "Лаборатория инженера",
    btn_missions: "🎯 Миссии инженера",
    btn_report: "Отчет МКВК",
    scenarios_title: "СЦЕНАРИИ СТРЕСС-ТЕСТИРОВАНИЯ",
    sc_normal: "Базовый баланс",
    sc_normal_sub: "Многолетний средний сток",
    sc_low_water: "Маловодный год",
    sc_low_water_sub: "-30% ледникового стока",
    sc_drought: "Климатическая засуха",
    sc_drought_sub: "+4.5°C и экстремальное испарение",
    sc_kosh_tepa: "Кош-Тепа (Максимум)",
    sc_kosh_tepa_sub: "Водозабор 15 км³/год",
    sc_consortium: "⚡ Водно-энергетический консорциум",
    sc_consortium_sub: "Зимний энергообмен (уголь/газ) ⇄ Летний поливной сброс",
    kosh_label: "Водозабор Кош-Тепа (Афганистан):",
    modernization_label: "Уровень модернизации бассейна:",
    auto_sim: "Автосимуляция",
    risk_label: "РИСК ИСТОЩЕНИЯ",
    efficiency_label: "ЭФФЕКТИВНОСТЬ СЕТИ",
    evap_label: "ПОТЕРИ ИСПАРЕНИЯ",
    filt_label: "ПОТЕРИ ФИЛЬТРАЦИИ",
    cities_title: "ДЕФИЦИТ ВОДЫ В АГЛОМЕРАЦИЯХ",
    balance_title: "СТРУКТУРА ВОДНОГО БАЛАНСА (КМ³/ГОД)"
  },
  uz: {
    brand_sub: "Orol dengizi havzasi: Amudaryo, Sirdaryo, To'xtagul, Norak va Qo'shtepa kanali",
    view_map: "3D Sun'iy yo'ldosh xaritasi",
    view_dual: "Kanallarning CAD kesimi",
    view_morph: "Transformatsiya (0-100%)",
    view_dam: "3D GES kesimi",
    btn_ai: "🧠 AI Dispetcher",
    btn_lab: "Muhandis laboratoriyasi",
    btn_missions: "🎯 Muhandis missiyalari",
    btn_report: "Davlatlararo hisobot",
    scenarios_title: "STRESS-TEST SSENARIYLARI",
    sc_normal: "Bazaviy muvozanat",
    sc_normal_sub: "Ko'p yillik o'rtacha oqim",
    sc_low_water: "Kam suvli yil",
    sc_low_water_sub: "-30% muzlik oqimi",
    sc_drought: "Iqlimiy qurg'oqchilik",
    sc_drought_sub: "+4.5°C va ekstremal bug'lanish",
    sc_kosh_tepa: "Qo'shtepa (Maksimal)",
    sc_kosh_tepa_sub: "Suv olish 15 km³/yil",
    sc_consortium: "⚡ Suv-energetika konsorsiumi",
    sc_consortium_sub: "Qishki energiya almashinuvi ⇄ Yozgi sug'orish oqimi",
    kosh_label: "Qo'shtepa kanali suv olishi (Afg'oniston):",
    modernization_label: "Havzani modernizatsiya qilish darajasi:",
    auto_sim: "Avtosimulyatsiya",
    risk_label: "TUGASH XAVFI",
    efficiency_label: "TIZIM SAMARADORLIGI",
    evap_label: "BUG'LANISH YO'QOTISHLARI",
    filt_label: "FILTRATSIYA YO'QOTISHLARI",
    cities_title: "SHAHARLARDA SUV TANQISLIGI",
    balance_title: "SUV BALANSI STRUKTURASI (KM³/YIL)"
  },
  kz: {
    brand_sub: "Арал теңізі алабы: Әмудария, Сырдария, Тоқтағұл, Нұрек және Қоштепа каналы",
    view_map: "3D Спутниктік карта",
    view_dual: "Каналдардың CAD тілігі",
    view_morph: "Трансформация (0-100%)",
    view_dam: "3D СЭС тілігі",
    btn_ai: "🧠 AI Диспетчер",
    btn_lab: "Инженерлік зертхана",
    btn_missions: "🎯 Инженер миссиялары",
    btn_report: "МКҮК есебі",
    scenarios_title: "СТРЕСС-ТЕСТ СЦЕНАРИЙЛЕРІ",
    sc_normal: "Негізгі баланс",
    sc_normal_sub: "Көпжылдық орташа ағын",
    sc_low_water: "Су тапшы жыл",
    sc_low_water_sub: "-30% мұздық ағыны",
    sc_drought: "Климаттық қуаңшылық",
    sc_drought_sub: "+4.5°C және шектен тыс булану",
    sc_kosh_tepa: "Қоштепа (Максимум)",
    sc_kosh_tepa_sub: "Су алу 15 км³/жыл",
    sc_consortium: "⚡ Су-энергетикалық консорциум",
    sc_consortium_sub: "Қысқы көмір/газ ⇄ Жазғы суару ағыны",
    kosh_label: "Қоштепа каналынан су алу (Ауғанстан):",
    modernization_label: "Алапты жаңғырту деңгейі:",
    auto_sim: "Автосимуляция",
    risk_label: "САРҚЫЛУ ҚАУПІ",
    efficiency_label: "ЖҮЙЕ ТИІМДІЛІГІ",
    evap_label: "БУЛАНУ ШЫҒЫНЫ",
    filt_label: "СҮЗІЛУ ШЫҒЫНЫ",
    cities_title: "ҚАЛАЛАРДАҒЫ СУ ТАПШЫЛЫҒЫ",
    balance_title: "СУ БАЛАНСЫ ҚҰРЫЛЫМЫ (КМ³/ЖЫЛ)"
  },
  en: {
    brand_sub: "Aral Sea Basin: Amu Darya, Syr Darya, Toktogul, Nurek and Qosh Tepa Canal",
    view_map: "3D Satellite Map",
    view_dual: "CAD Canal Cross-Section",
    view_morph: "Transformation (0-100%)",
    view_dam: "3D Dam Cross-Section",
    btn_ai: "🧠 AI Dispatcher",
    btn_lab: "Engineer Laboratory",
    btn_missions: "🎯 Engineering Missions",
    btn_report: "ICWC Report",
    scenarios_title: "STRESS-TEST SCENARIOS",
    sc_normal: "Baseline Balance",
    sc_normal_sub: "Multi-year mean flow",
    sc_low_water: "Low-water Year",
    sc_low_water_sub: "-30% glacial runoff",
    sc_drought: "Climate Drought",
    sc_drought_sub: "+4.5°C anomaly & extreme evaporation",
    sc_kosh_tepa: "Qosh Tepa (Max)",
    sc_kosh_tepa_sub: "Intake 15 km³/year",
    sc_consortium: "⚡ Water-Energy Consortium",
    sc_consortium_sub: "Winter power exchange ⇄ Summer irrigation release",
    kosh_label: "Qosh Tepa Canal Intake (Afghanistan):",
    modernization_label: "Basin Modernization Level:",
    auto_sim: "Auto Simulation",
    risk_label: "DEPLETION RISK",
    efficiency_label: "GRID EFFICIENCY",
    evap_label: "EVAPORATION LOSS",
    filt_label: "SEEPAGE LOSS",
    cities_title: "DRINKING WATER DEFICIT IN CITIES",
    balance_title: "WATER BALANCE STRUCTURE (KM³/YEAR)"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = 'ru';
  }

  setLanguage(lang) {
    if (!I18N_DICT[lang]) return;
    this.currentLang = lang;
    const dict = I18N_DICT[lang];

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Обновление заголовков сценариев
    const titleEl = document.querySelector('.brand-sub');
    if (titleEl && dict.brand_sub) titleEl.textContent = dict.brand_sub;
  }
}

window.I18nManager = I18nManager;
