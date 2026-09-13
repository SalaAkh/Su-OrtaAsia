-- ============================================================================
-- ЦИФРОВОЙ ДВОЙНИК «СУ-ОРТА АЗИЯ» (ГИДРОСИСТЕМА БАССЕЙНА АРАЛЬСКОГО МОРЯ)
-- СХЕМА БАЗЫ ДАННЫХ: PostgreSQL 15+ с расширениями PostGIS и TimescaleDB
-- ============================================================================

-- Подключение необходимых расширений для пространственных и временных данных
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
-- CREATE EXTENSION IF NOT EXISTS timescaledb; -- Опционально для TimescaleDB

-- Схема для гидрологических и пространственных данных
CREATE SCHEMA IF NOT EXISTS hydro;
SET search_path TO hydro, public;

-- ============================================================================
-- 1. СПРАВОЧНИКИ И ГЕОПРОСТРАНСТВЕННЫЕ БАССЕЙНЫ
-- ============================================================================

CREATE TABLE IF NOT EXISTS basins (
    basin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- Например: 'Бассейн реки Амударья', 'Бассейн реки Сырдарья'
    code VARCHAR(20) UNIQUE NOT NULL,        -- 'AMU_DARYA', 'SYR_DARYA', 'ARAL_SEA'
    area_sq_km NUMERIC(12, 2) NOT NULL,      -- Площадь водосбора, кв. км
    annual_flow_avg_km3 NUMERIC(6, 2),       -- Среднемноголетний сток, км³/год
    countries TEXT[] NOT NULL,               -- Массив стран: ['KGZ', 'TJK', 'UZB', 'TKM', 'KAZ', 'AFG']
    geom GEOMETRY(MultiPolygon, 4326)        -- Векторные границы водосбора
);

-- ============================================================================
-- 2. СЕГМЕНТЫ РЕК (AMU DARYA, SYR DARYA, VAKHSH, PANJ, NARYN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS river_segments (
    segment_id SERIAL PRIMARY KEY,
    basin_id INT REFERENCES basins(basin_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,              -- 'Амударья - Верхнее течение', 'Сырдарья - Ферганский участок'
    river_name VARCHAR(100) NOT NULL,        -- 'Амударья', 'Сырдарья', 'Вахш', 'Пяндж', 'Нарын'
    stream_order INT DEFAULT 1,              -- Порядок водотока по Стралеру
    length_km NUMERIC(8, 2) NOT NULL,
    base_flow_m3s NUMERIC(10, 2) NOT NULL,   -- Базовый расход, м³/с
    roughness_manning NUMERIC(4, 3) DEFAULT 0.035, -- Коэффициент шероховатости Маннинга
    slope NUMERIC(6, 5) DEFAULT 0.0004,      -- Гидравлический уклон
    mineralization_g_l NUMERIC(5, 2) DEFAULT 0.5, -- Минерализация воды, г/л
    geom GEOMETRY(LineStringZM, 4326) NOT NULL -- Геометрия русла с Z (высота) и M (километраж)
);

CREATE INDEX IF NOT EXISTS idx_river_segments_geom ON river_segments USING GIST(geom);

-- ============================================================================
-- 3. КАНАЛЫ И ГИДРОТЕХНИЧЕСКИЕ СООРУЖЕНИЯ
-- (Включая Каракумский канал, Кош-Тепа, Аму-Бухарский, Каршинский)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE canal_lining_type AS ENUM (
        'EARTHEN',          -- Земляное необлицованное русло (потери до 40-50%)
        'CONCRETE_FLUME',   -- Железобетонные плиты/лотки (потери 10-15%)
        'GEOMEMBRANE',      -- Полимерные геомембраны с герметизацией (потери 3-5%)
        'SMART_COMPOSITE'   -- Закрытый композитный трубопровод с датчиками IoT (потери < 1%)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS canals (
    canal_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- 'Каракумский канал', 'Канал Кош-Тепа', 'Аму-Бухарский канал'
    country_code VARCHAR(3) NOT NULL,        -- 'TKM', 'AFG', 'UZB', 'KAZ', 'KGZ'
    source_river VARCHAR(100) NOT NULL,      -- Река-донор стока
    design_capacity_m3s NUMERIC(8, 2),       -- Проектная пропускная способность, м³/с
    annual_intake_km3 NUMERIC(6, 2),         -- Фактический среднегодовой забор, км³/год
    length_km NUMERIC(8, 2) NOT NULL,
    lining canal_lining_type DEFAULT 'EARTHEN',
    filtration_loss_rate NUMERIC(4, 3) DEFAULT 0.400, -- Коэффициент потерь на фильтрацию (0.4 = 40%)
    evaporation_surface_sq_km NUMERIC(8, 2), -- Площадь водного зеркала канала, кв. км
    is_transboundary_disputed BOOLEAN DEFAULT FALSE, -- Флаг споров (например, Кош-Тепа без квот МКВК)
    geom GEOMETRY(LineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_canals_geom ON canals USING GIST(geom);

-- ============================================================================
-- 4. ВОДОХРАНИЛИЩА И ОЗЕРА
-- (Токтогул, Нурек, Чарвак, Туямуюн, Северный и Южный Арал)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservoirs (
    reservoir_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- 'Токтогульское', 'Нурекское', 'Чарвакское', 'Аральское море (Северное)'
    basin_id INT REFERENCES basins(basin_id),
    country_code VARCHAR(3) NOT NULL,
    total_capacity_km3 NUMERIC(6, 2) NOT NULL, -- Полный объем, км³
    active_capacity_km3 NUMERIC(6, 2) NOT NULL,-- Полезный объем, км³
    dead_storage_km3 NUMERIC(6, 2) NOT NULL,  -- Мертвый объем, км³
    current_volume_km3 NUMERIC(6, 2) NOT NULL, -- Текущее заполнение, км³
    surface_area_sq_km NUMERIC(8, 2) NOT NULL, -- Площадь зеркала, кв. км
    normal_pool_level_m NUMERIC(6, 2),        -- НПУ (нормальный подпорный уровень), м
    dead_pool_level_m NUMERIC(6, 2),          -- УМО (уровень мертвого объема), м
    current_level_m NUMERIC(6, 2),            -- Текущий уровень, м
    critical_threshold_km3 NUMERIC(6, 2),     -- Критический уровень тревоги
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reservoirs_geom ON reservoirs USING GIST(geom);

-- ============================================================================
-- 5. МЕГАПОЛИСЫ И ВОДОСНАБЖЕНИЕ НАСЕЛЕНИЯ
-- (Алматы, Ташкент, Самарканд, Бишкек, Душанбе)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cities_water_supply (
    city_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- 'Ташкент', 'Алматы', 'Бишкек', 'Душанбе', 'Самарканд'
    country_code VARCHAR(3) NOT NULL,
    population INT NOT NULL,                 -- Численность населения
    daily_demand_m3_capita NUMERIC(6, 2) DEFAULT 0.35, -- Потребление на человека, м³/сут
    total_annual_demand_km3 NUMERIC(6, 3),   -- Суммарная потребность, км³/год
    primary_water_source VARCHAR(150),       -- 'р. Чирчик / Чарвакское вдхр.', 'Подземные воды Чуйской долины'
    glacier_dependency_percent NUMERIC(5, 2),-- Доля ледникового питания (%)
    current_deficit_percent NUMERIC(5, 2) DEFAULT 0.0, -- Текущий дефицит (%)
    days_to_critical_depletion INT,          -- Прогноз дней до критического дефицита при засухе
    geom GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities_water_supply USING GIST(geom);

-- ============================================================================
-- 6. СЕТЬ УМНЫХ ДАТЧИКОВ (IoT NODES) И ТЕЛЕМЕТРИЯ
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE iot_sensor_type AS ENUM (
        'ULTRASONIC_FLOWMETER',  -- Ультразвуковой расходомер (м³/с)
        'PRESSURE_TRANSDUCER',   -- Датчик давления в магистрали (бар / МПа)
        'SOIL_MOISTURE_PROBE',   -- Тензиометрический зонд влажности почвы (%)
        'CONDUCTIVITY_SALINITY', -- Кондуктометр минерализации / солесодержания (EC, г/л)
        'ACOUSTIC_LEAK_DETECTOR',-- Акустический датчик утечек и шумов гидравлики
        'GROUNDWATER_PIEZOMETER' -- Пьезометр уровня грунтовых вод (м)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS iot_sensors (
    sensor_id VARCHAR(32) PRIMARY KEY,       -- Например: 'UZB-TASH-FL-042', 'TKM-KRK-LEAK-108'
    sensor_type iot_sensor_type NOT NULL,
    canal_id INT REFERENCES canals(canal_id) ON DELETE SET NULL,
    river_segment_id INT REFERENCES river_segments(segment_id) ON DELETE SET NULL,
    installation_depth_m NUMERIC(4, 2) DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'ACTIVE',     -- 'ACTIVE', 'WARNING', 'ALERT_LEAK', 'OFFLINE'
    battery_level_percent NUMERIC(5, 2) DEFAULT 100.0,
    sampling_interval_sec INT DEFAULT 5,     -- Частота опроса, сек
    geom GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_iot_sensors_geom ON iot_sensors USING GIST(geom);

-- Таблица временных рядов телеметрии (структура под гипертаблицу TimescaleDB)
CREATE TABLE IF NOT EXISTS iot_telemetry_timeseries (
    time TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(32) REFERENCES iot_sensors(sensor_id) ON DELETE CASCADE,
    flow_rate_m3s NUMERIC(8, 3),             -- Расход воды, м³/с
    pressure_bar NUMERIC(6, 2),              -- Давление, бар
    soil_moisture_vol_percent NUMERIC(5, 2), -- Объемная влажность почвы, %
    salinity_ec_ds_m NUMERIC(6, 2),          -- Электропроводность солей, dS/m
    mineralization_g_l NUMERIC(6, 3),        -- Минерализация, г/л
    water_table_depth_m NUMERIC(5, 2),       -- Глубина залегания грунтовых вод, м
    leak_probability_percent NUMERIC(5, 2),  -- Оценка вероятности утечки алгоритмом, %
    PRIMARY KEY (time, sensor_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_time ON iot_telemetry_timeseries(sensor_id, time DESC);

-- ============================================================================
-- 7. СЕТКА ЗАСОЛЕНИЯ ПОЧВ И ОЦЕНКИ СОЛОНЧАКОВ
-- ============================================================================

CREATE TABLE IF NOT EXISTS soil_salinity_grid (
    grid_id SERIAL PRIMARY KEY,
    cell_x INT NOT NULL,
    cell_y INT NOT NULL,
    region_name VARCHAR(100),                -- 'Каракалпакстан', 'Хорезмский оазис', 'Бухарская обл.'
    salinity_solid_residue_percent NUMERIC(5, 3), -- Плотный солевой остаток, % (0.1% - норма, >1.0% - солончак)
    toxic_salts_meq_100g NUMERIC(6, 2),      -- Токсичные соли, мг-экв/100г почвы
    groundwater_table_depth_m NUMERIC(4, 2), -- Глубина УГВ (критическая < 2.0 м)
    irrigation_type VARCHAR(50) DEFAULT 'FURROW', -- 'FURROW' (бороздковый), 'DRIP' (капельный)
    crop_yield_loss_percent NUMERIC(5, 2),   -- Потери урожайности, %
    geom GEOMETRY(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_soil_salinity_geom ON soil_salinity_grid USING GIST(geom);

-- ============================================================================
-- 8. МЕЖГОСУДАРСТВЕННЫЕ КВОТЫ ВОДОДЕЛЕНИЯ МКВК И АНАЛИЗ ОТКЛОНЕНИЙ
-- ============================================================================

CREATE TABLE IF NOT EXISTS mkvk_quotas (
    quota_id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,        -- 'KAZ', 'KGZ', 'TJK', 'TKM', 'UZB'
    basin_code VARCHAR(20) NOT NULL,         -- 'AMU_DARYA', 'SYR_DARYA'
    vegetation_period_quota_km3 NUMERIC(6, 3) NOT NULL, -- Квота на вегетацию (апрель-октябрь)
    non_vegetation_period_quota_km3 NUMERIC(6, 3) NOT NULL,
    actual_withdrawal_km3 NUMERIC(6, 3) DEFAULT 0.0,
    kosh_tepa_unregulated_intake_km3 NUMERIC(6, 3) DEFAULT 0.0, -- Дополнительный отбор Афганистаном
    deficit_risk_level VARCHAR(20) DEFAULT 'NORMAL'
);

-- ============================================================================
-- ХРАНИМЫЕ ПРОЦЕДУРЫ И ФУНКЦИИ ДЛЯ РАСЧЕТА ВОДНОГО БАЛАНСА
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_filtration_loss(
    length_km NUMERIC,
    intake_flow_m3s NUMERIC,
    lining_type canal_lining_type
) RETURNS NUMERIC AS $$
DECLARE
    loss_factor NUMERIC;
BEGIN
    CASE lining_type
        WHEN 'EARTHEN' THEN loss_factor := 0.0035;          -- 35-45% на 100 км
        WHEN 'CONCRETE_FLUME' THEN loss_factor := 0.0009;   -- 9-12% на 100 км
        WHEN 'GEOMEMBRANE' THEN loss_factor := 0.0003;      -- 3% на 100 км
        WHEN 'SMART_COMPOSITE' THEN loss_factor := 0.00005; -- <0.5%
        ELSE loss_factor := 0.0020;
    END CASE;
    
    RETURN intake_flow_m3s * (1.0 - EXP(-loss_factor * length_km));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION simulate_amudarya_balance(
    upstream_inflow_km3 NUMERIC,
    kosh_tepa_diversion_km3 NUMERIC,
    modernization_ratio NUMERIC -- 0.0 (старые каналы) до 1.0 (капельный полив + закрытые русла)
) RETURNS TABLE (
    net_downstream_flow_km3 NUMERIC,
    karakum_intake_km3 NUMERIC,
    filtration_loss_km3 NUMERIC,
    evaporation_loss_km3 NUMERIC,
    aral_sea_inflow_km3 NUMERIC,
    status_alert TEXT
) AS $$
DECLARE
    v_eff_loss_rate NUMERIC;
    v_downstream NUMERIC;
    v_karakum NUMERIC;
    v_filt NUMERIC;
    v_evap NUMERIC;
    v_aral NUMERIC;
    v_alert TEXT := 'НОРМАЛЬНЫЙ БАЛАНС';
BEGIN
    v_eff_loss_rate := 0.55 * (1.0 - modernization_ratio * 0.70);
    v_downstream := GREATEST(0.0, upstream_inflow_km3 - kosh_tepa_diversion_km3);
    v_karakum := LEAST(11.0, v_downstream * 0.25);
    v_filt := v_downstream * v_eff_loss_rate * 0.65;
    v_evap := v_downstream * v_eff_loss_rate * 0.35;
    v_aral := GREATEST(0.0, v_downstream - v_karakum - v_filt - v_evap - 18.0);
    
    IF kosh_tepa_diversion_km3 > 8.0 AND modernization_ratio < 0.3 THEN
        v_alert := 'КРИТИЧЕСКИЙ ДЕФИЦИТ: Угроза полного пересыхания дельты Амударьи!';
    ELSIF v_aral < 1.0 THEN
        v_alert := 'ПРЕДУПРЕЖДЕНИЕ: Нулевой приток в остаточный водоем Южного Арала!';
    END IF;
    
    RETURN QUERY SELECT v_downstream, v_karakum, v_filt, v_evap, v_aral, v_alert;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
