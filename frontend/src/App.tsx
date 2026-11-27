import {ExecutiveReport} from './ExecutiveReport';
import {initialLanguage,persistLanguage,displayError,localeFor,fraction} from './international';
import {CommandPalette} from './CommandPalette';
import {buildSearchIndex} from './searchIndex';
import {navigateSearchResult} from './searchNavigation';
import {validateSimulationResponse} from './apiValidation';
import {ContextSelect} from './ContextSelect';
import {ScenarioNotice, scenarioNotes} from './ScenarioNotice';
import {exportConfirmedRun} from './provenance.js';
import {ResponsiveSlider} from './ResponsiveSlider';
import engineSource from '../../backend/app/engine/fair_monte_carlo.py?raw';
import apiSource from '../../backend/app/main.py?raw';
import composeSource from '../../docker-compose.yml?raw';
import tailwindSource from '../tailwind.config.js?raw';
import {runInWorker} from './workerClient';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield,
  Sliders,
  BarChart2,
  Layers,
  FileText,
  Terminal,
  Play,
  RefreshCw,
  Download,
  Printer,
  Check,
  Copy,
  ChevronRight,
  AlertTriangle,
  Lock,
  Server,
  Database,
  Globe,
  Cpu,
  Activity,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Hash,
  BookOpen,
  FolderTree,
  Code,
  Box,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { THREAT_CONTROLS_MAP } from './data/threatControls';

// ============================================================================
// 1. LOCALIZATION DICTIONARY (STRICT B2B TERMINOLOGY RU / EN)
// ============================================================================
const I18N = {
  ru: {
    appTitle: 'WayQuant',
    appSubtitle: 'Моделирование киберрисков Open FAIR',
    version: 'v3.0.0-ENT',
    sidebar: {
      contextHeader: 'КОНТЕКСТ МОДЕЛИРОВАНИЯ',
      assetLabel: 'Целевой актив',
      threatLabel: 'Вектор угрозы',
      iterationsLabel: 'Итераций Монте-Карло',
      seedLabel: 'Детерминированный seed',
      currencyLabel: 'Базовая валюта',
      navHeader: 'РАБОЧИЕ МОДУЛИ',
      tabs: {
        input: '1. Параметры (Open FAIR)',
        simulation: '2. Панель моделирования',
        controls: '3. Защитные меры NIST & ROSI',
        export: '4. Отчет для Совета (PDF)',
        architecture: '5. Архитектура и Код (Python/Docker)'
      },
      engineStatus: 'ВЫЧИСЛИТЕЛЬНОЕ ЯДРО',
      statusReady: 'ВЕКТОРИЗОВАНО / АКТИВНО',
      execTime: 'Время расчета',
      confidenceLevel: 'Квантиль',
      localFallback: 'Бэкенд недоступен — расчет выполнен локально в браузере.'
    },
    assets: {
      payment_gw: 'Основной платёжный шлюз (PCI-DSS Tier 1)',
      cloud_dwh: 'Корпоративное облачное хранилище (PII / FinData)',
      swift_node: 'Узел межбанковских расчётов SWIFT',
      iam_dir: 'Корпоративный каталог учётных записей (AD/SSO)',
      scada_grid: 'Диспетчеризация энергосети SCADA (CISA Energy)',
      ehr_lake: 'Хранилище медицинских записей (HIPAA / HL7 FHIR)',
      ach_clearing: 'Федеральный клиринг и расчёты ACH (DORA)',
      water_ot: 'Телеметрия очистки городской воды OT (CISA Water)'
    },
    threats: {
      ransomware: 'Кампания шифровальщика с двойным вымогательством',
      exfiltration: 'Целевая эксфильтрация данных (APT)',
      ddos: 'Каскадный отказ сервиса (DDoS)',
      supply_chain: 'Компрометация цепочки поставок (CI/CD)',
      bec: 'Фишинг на базе ИИ и мошенничество BEC против руководства',
      edge_zero_day: 'Эксплуатация уязвимости нулевого дня на граничном устройстве (VPN)',
      insider: 'Злоумышленный привилегированный инсайдер / саботаж',
      dependency_poisoning: 'Отравление CI/CD-конвейера и зависимостей'
    },
    inputTab: {
      title: 'Калибровка параметров Open FAIR',
      subtitle: 'Задайте трёхточечные оценки (минимум, мода, верхняя оценка) для частоты событий и масштаба ущерба. Прямые потери моделируются модифицированным распределением Beta-PERT, вторичные потери — логнормальным распределением с тяжелым хвостом.',
      presetBtn: 'Сбросить к эталонному профилю актива',
      runNowBtn: 'Запустить расчет (50 000 итераций)',
      lefSection: 'Частота событий ущерба (LEF)',
      lefDesc: 'Количество успешных реализаций риска в год. Используется как интенсивность процесса Пуассона.',
      plmSection: 'Прямой ущерб на инцидент (PLM)',
      plmDesc: 'Прямые операционные затраты: простой, восстановление инфраструктуры, криминалистика (DFIR), выкуп.',
      slmSection: 'Вторичный ущерб: нижняя граница / мода / P95',
      slmDesc: 'Регуляторные штрафы, судебные иски, отток клиентов, репутационные потери (Логнормальное распределение).',
      minLabel: 'Минимум',
      modeLabel: 'Наиболее вероятное значение',
      maxLabel: 'Максимум',
      gammaLabel: 'Параметр формы (λ)',
      slefProbLabel: 'Вероятность вторичного ущерба (SLEF %)',
      eventsPerYear: 'событий / год',
      densityPreview: 'Условная иллюстрация формы',
      fairTaxonomy: 'Структурная декомпозиция Open FAIR',
      expectedSingleLoss: 'Ожидаемый ущерб на 1 инцидент (SLE)',
      syntheticPresetNotice: 'Иллюстративные синтетические сценарии; не являются эмпирически откалиброванными данными.'
    },
    simTab: {
      title: 'Панель стохастического моделирования Монте-Карло',
      subtitle: 'Распределение годовых потерь; VaR95 — квантиль ущерба, а не доверительный интервал.',
      runBtn: 'Выполнить расчёт',
      recalculating: 'Вычисление...',
      kpiAle: 'Ожидаемые годовые потери (ALE)',
      kpiAleSub: 'Математическое ожидание годового ущерба',
      kpiVar95: 'Кибер-VaR (95-й процентиль)',
      kpiVar95Sub: '95-й процентиль моделируемых годовых потерь',
      kpiCvar99: 'Экстремальный хвост (CVaR 99%)',
      kpiCvar99Sub: 'Средний ущерб в 1% наихудших сценариев',
      kpiZeroProb: 'Вероятность года без потерь',
      kpiZeroProbSub: 'Доля лет с нулевым денежным ущербом',
      lecTitle: 'Кривая превышения потерь (Loss Exceedance Curve — LEC)',
      lecSubtitle: 'Вероятность того, что совокупный годовой ущерб превысит заданный финансовый порог P(Loss > X)',
      histTitle: 'Гистограмма ненулевых годовых потерь',
      histSubtitle: 'Доля каждого интервала (%) среди лет с ненулевым ущербом; интервалы покрывают всю выборку, включая хвост',
      logScaleToggle: 'Логарифмическая шкала X',
      riskToleranceLabel: 'Порог толерантности к риску',
      secMaterialityLabel: 'Сценарный денежный порог (не юридическая существенность)',
      percentileTableTitle: 'Квантильная матрица распределения годовых потерь',
      percentileCol: 'Перцентиль',
      totalLossCol: 'Совокупный ущерб',
      primaryCol: 'Прямой ущерб (Beta-PERT)',
      secondaryCol: 'Вторичный ущерб (логнормальное распределение)',
      exceedProbCol: 'Вероятность превышения'
    },
    controlsTab: {
      title: 'Защитные меры NIST CSF 2.0 и сценарный анализ ROSI',
      subtitle: 'Выберите защитные меры для пересчёта остаточного риска, моделируемого снижения ущерба и рентабельности инвестиций в защиту (ROSI).',
      activeControlsCount: 'Активных контролов',
      annualSecSpend: 'Годовой бюджет мер (OPEX+CAPEX)',
      preventedLoss: 'Моделируемое снижение ущерба (ΔALE)',
      netBenefit: 'Ожидаемый чистый финансовый эффект',
      rosiMetric: 'Рентабельность ИБ (ROSI)',
      residualVar: 'Остаточный кибер-VaR (95%)',
      baselineLabel: 'Исходный риск',
      residualLabel: 'Остаточный риск',
      costLabel: 'Стоимость / год',
      lefReduction: 'Снижение частоты (LEF)',
      plmReduction: 'Снижение прямого ущерба',
      slmReduction: 'Сжатие хвоста (SLM)',
      comparisonChartTitle: 'Сравнение исходного и остаточного риска',
      comparisonChartSub: 'Визуализация смещения финансового профиля риска после внедрения выбранного портфеля защитных мер NIST'
    },
    exportTab: {
      title: 'Отчёт для совета директоров',
      subtitle: 'Стандартизированный двухстраничный финансово-аналитический меморандум для CISO, Комитета по аудиту и Совета директоров.',
      printPdfBtn: 'Печать / сохранить PDF',
      exportJsonBtn: 'Скачать JSON-артефакт симуляции',
      page1Label: 'Страница 1 — резюме оценки риска',
      page2Label: 'Страница 2 — портфель мер и анализ ROSI',
      confidentialBanner: 'Оценка риска для руководства',
      execSummaryTitle: '1. Резюме количественной оценки киберриска',
      execMethodology: 'Оценка использует упрощённую FAIR-ориентированную модель годовых потерь и стохастическое моделирование Монте-Карло; это не сертификация или оценка соответствия требованиям.',
      boardRecTitle: '4. Анализ финансового эффекта',
      signOffCiso: 'Директор по информационной безопасности (CISO)',
      signOffCro: 'Директор по управлению рисками (CRO)',
      signOffDate: 'Дата верификации модели'
    },
    archTab: {
      title: 'Системная архитектура, Дизайн-система и Продакшен-код (Python / FastAPI / Docker)',
      subtitle: 'Исходные файлы и структура WayQuant: векторизованное ядро NumPy, конфигурация Tailwind и Docker Compose.',
      copyBtn: 'Копировать код',
      copiedBtn: 'Скопировано',
      sections: {
        structure: '1. Архитектура и директории',
        tailwind: '2. Дизайн-система (Tailwind)',
        pythonEngine: '3. Математическое ядро (Python NumPy)',
        fastapi: '4. FastAPI Сервер (REST API)',
        docker: '5. Docker & docker-compose.yml'
      }
    }
  },
  en: {
    appTitle: 'WayQuant',
    appSubtitle: 'Open FAIR Cyber Risk Quantification Engine',
    version: 'v3.0.0-ENT',
    sidebar: {
      contextHeader: 'SIMULATION CONTEXT',
      assetLabel: 'Target Enterprise Asset',
      threatLabel: 'Threat Vector Profile',
      iterationsLabel: 'Monte Carlo Iterations',
      seedLabel: 'Deterministic PRNG Seed',
      currencyLabel: 'Reporting Currency',
      navHeader: 'WORKSPACE MODULES',
      tabs: {
        input: '1. Open FAIR Inputs',
        simulation: '2. Simulation Dashboard',
        controls: '3. NIST Controls & ROSI',
        export: '4. Executive Report (PDF)',
        architecture: '5. Architecture & Code'
      },
      engineStatus: 'COMPUTE ENGINE STATUS',
      statusReady: 'VECTORIZED / ONLINE',
      execTime: 'Compute Latency',
      confidenceLevel: 'Quantile level',
      localFallback: 'Backend unavailable — simulation completed locally in this browser.'
    },
    assets: {
      payment_gw: 'Core Payment Gateway (PCI-DSS Tier 1)',
      cloud_dwh: 'Enterprise Cloud Data Lake (PII / FinData)',
      swift_node: 'SWIFT Interbank Settlement Node',
      iam_dir: 'Global Identity & Access Directory (AD/SSO)',
      scada_grid: 'SCADA / Smart Grid Energy Dispatch (CISA Energy)',
      ehr_lake: 'EHR Patient Core Lake (HIPAA / HL7 FHIR)',
      ach_clearing: 'Federal ACH Clearing & Settlement Engine (DORA)',
      water_ot: 'OT Municipal Water Treatment Telemetry (CISA Water)'
    },
    threats: {
      ransomware: 'Double-Extortion Ransomware Campaign',
      exfiltration: 'Targeted Data Exfiltration (APT)',
      ddos: 'Cascading Service Disruption (DDoS)',
      supply_chain: 'Supply Chain Compromise (CI/CD Injection)',
      bec: 'AI-Driven Spear Phishing & Executive BEC Fraud',
      edge_zero_day: 'Edge Appliance Zero-Day Exploitation (VPN/Gateway)',
      insider: 'Malicious Privileged Insider / Sabotage',
      dependency_poisoning: 'CI/CD Pipeline & Dependency Poisoning'
    },
    inputTab: {
      title: 'Open FAIR Parameter Calibration',
      subtitle: 'Configure three-point estimates (Min, Mode, Max) for Loss Event Frequency and Loss Magnitude. Primary losses use Modified Beta-PERT; secondary losses follow a heavy-tailed Lognormal distribution.',
      presetBtn: 'Reset to Asset Reference Baseline',
      runNowBtn: 'Execute Simulation (50,000 Runs)',
      lefSection: 'Loss Event Frequency (LEF)',
      lefDesc: 'Annualized rate of successful threat events modeled as a Poisson arrival process.',
      plmSection: 'Primary Loss Magnitude (PLM)',
      plmDesc: 'Direct incident costs: operational downtime, infrastructure rebuild, DFIR retainers, extortion.',
      slmSection: 'Secondary Loss: Floor / Mode / P95',
      slmDesc: 'Regulatory fines, class-action litigation, customer churn, credit/reputation fallout (Lognormal tail).',
      minLabel: 'Minimum (Min)',
      modeLabel: 'Most Likely (Mode)',
      maxLabel: 'Maximum (Max)',
      gammaLabel: 'Shape Parameter (λ)',
      slefProbLabel: 'Secondary Loss Probability (SLEF %)',
      eventsPerYear: 'events / year',
      densityPreview: 'Schematic distribution illustration',
      fairTaxonomy: 'Open FAIR Structural Decomposition',
      expectedSingleLoss: 'Expected Single Loss Event (SLE)',
      syntheticPresetNotice: 'Illustrative synthetic baseline scenario; not empirically calibrated data.'
    },
    simTab: {
      title: 'Monte Carlo Stochastic Simulation Dashboard',
      subtitle: 'Annual loss exposure; VaR95 is a loss quantile, not a confidence interval.',
      runBtn: 'Run Simulation',
      recalculating: 'Computing...',
      kpiAle: 'Expected Annual Loss (ALE)',
      kpiAleSub: 'Mean annualized financial exposure',
      kpiVar95: 'Cyber VaR (95th percentile)',
      kpiVar95Sub: '95th percentile annual loss threshold',
      kpiCvar99: 'Tail VaR / Expected Shortfall (99%)',
      kpiCvar99Sub: 'Mean loss across worst 1% tail scenarios',
      kpiZeroProb: 'Zero-Loss Year Probability',
      kpiZeroProbSub: 'Share of simulated years with zero monetary loss',
      lecTitle: 'Loss Exceedance Curve (LEC)',
      lecSubtitle: 'Complementary cumulative probability P(Annual Loss > X) across financial thresholds',
      histTitle: 'Heavy-Tail Annual Loss Histogram',
      histSubtitle: 'Bin shares (%) conditional on non-zero loss years; bins cover the full sample, including the tail',
      logScaleToggle: 'Logarithmic X-Axis',
      riskToleranceLabel: 'Board Risk Appetite Threshold',
      secMaterialityLabel: 'Scenario loss threshold (not legal materiality)',
      percentileTableTitle: 'Annual Loss Percentile Decomposition Matrix',
      percentileCol: 'Percentile',
      totalLossCol: 'Total Annual Loss',
      primaryCol: 'Primary Loss (Beta-PERT)',
      secondaryCol: 'Secondary Tail (Lognormal)',
      exceedProbCol: 'Exceedance Prob.'
    },
    controlsTab: {
      title: 'NIST CSF 2.0 Controls & ROSI Analysis (What-If Analysis)',
      subtitle: 'Toggle compensating security controls to dynamically recalculate Residual Risk, Prevented Annual Loss, Net Benefit, and Return on Security Investment (ROSI).',
      activeControlsCount: 'Active NIST Controls',
      annualSecSpend: 'Annual Control Spend (OPEX+CAPEX)',
      preventedLoss: 'Prevented Annual Loss (Delta ALE)',
      netBenefit: 'Net Financial Benefit',
      rosiMetric: 'Return on Security Investment (ROSI)',
      residualVar: 'Residual Cyber VaR (95%)',
      baselineLabel: 'Baseline Exposure',
      residualLabel: 'Residual Exposure',
      costLabel: 'Annual Cost',
      lefReduction: 'LEF Frequency Reduction',
      plmReduction: 'Primary Loss Reduction',
      slmReduction: 'Secondary Tail Compression',
      comparisonChartTitle: 'Loss Exceedance Curve Compression: Baseline vs. Residual Risk',
      comparisonChartSub: 'Quantifiable shift in annual loss exceedance probability after deploying selected NIST controls'
    },
    exportTab: {
      title: 'Executive Board Report Generator (2-Page PDF)',
      subtitle: 'Standardized two-page financial risk memorandum engineered for the Board of Directors, Audit Committee, and CISO.',
      printPdfBtn: 'Print / Save PDF Report',
      exportJsonBtn: 'Download Simulation Audit JSON',
      page1Label: 'PAGE 1 OF 2 — EXECUTIVE RISK SUMMARY & CYBER VaR EXPOSURE',
      page2Label: 'PAGE 2 OF 2 — NIST CONTROL PORTFOLIO & ROSI GOVERNANCE',
      confidentialBanner: 'Executive Risk Assessment',
      execSummaryTitle: '1. Executive Cyber Risk Quantification Summary',
      execMethodology: 'Quantification uses a simplified FAIR-inspired model using vectorized Monte Carlo simulation (50,000 annualized iterations).',
      boardRecTitle: '4. Capital Allocation & Control Recommendation',
      signOffCiso: 'Chief Information Security Officer (CISO)',
      signOffCro: 'Chief Risk Officer (CRO)',
      signOffDate: 'Model Verification Date'
    },
    archTab: {
      title: 'System Architecture, Design System & Production Code (Python / FastAPI / Docker)',
      subtitle: 'Maintained source files: directory structure, vectorized NumPy Monte Carlo core, Tailwind configuration, and Docker Compose stack.',
      copyBtn: 'Copy Code',
      copiedBtn: 'Copied',
      sections: {
        structure: '1. Architecture & Directory Tree',
        tailwind: '2. Design System (Tailwind)',
        pythonEngine: '3. Python Vectorized Engine',
        fastapi: '4. FastAPI Endpoints',
        docker: '5. Docker & docker-compose.yml'
      }
    }
  }
};

// ============================================================================
// 2. PRESET SCENARIOS BY ASSET & THREAT VECTOR
// ============================================================================
const makePreset = (values) => {
  const [
    lefMin, lefMode, lefMax,
    plmMin, plmMode, plmMax,
    slefProb,
    slmMin, slmMode, slmMax,
    riskAppetite
  ] = values;
  return {
    lefMin, lefMode, lefMax, lefGamma: 4.0,
    plmMin, plmMode, plmMax, plmGamma: 4.0,
    slefProb, slmMin, slmMode, slmMax, riskAppetite
  };
};

const ASSET_PRESETS = {
  payment_gw: {
    ransomware: makePreset([0.25, 0.85, 2.40, 180000, 650000, 2400000, 0.65, 250000, 950000, 8500000, 3200000]),
    exfiltration: makePreset([0.15, 0.55, 1.80, 95000, 320000, 1100000, 0.85, 500000, 1850000, 14500000, 4000000]),
    ddos: makePreset([0.80, 2.10, 5.50, 60000, 240000, 980000, 0.35, 80000, 310000, 2200000, 2500000]),
    supply_chain: makePreset([0.10, 0.35, 1.20, 300000, 920000, 3500000, 0.75, 450000, 1600000, 12000000, 3500000]),
    bec: makePreset([0.35, 1.10, 3.20, 85000, 420000, 2600000, 0.72, 180000, 1250000, 9200000, 3300000]),
    edge_zero_day: makePreset([0.12, 0.42, 1.60, 210000, 780000, 3200000, 0.68, 300000, 1400000, 10500000, 3700000]),
    insider: makePreset([0.08, 0.28, 1.10, 120000, 520000, 2100000, 0.62, 250000, 1100000, 7600000, 3000000]),
    dependency_poisoning: makePreset([0.10, 0.38, 1.40, 240000, 880000, 3800000, 0.76, 380000, 1700000, 13200000, 3900000])
  },
  cloud_dwh: {
    ransomware: makePreset([0.20, 0.70, 2.00, 120000, 480000, 1900000, 0.70, 350000, 1250000, 11000000, 3500000]),
    exfiltration: makePreset([0.30, 0.90, 2.50, 110000, 380000, 1400000, 0.90, 600000, 2200000, 18000000, 4500000]),
    ddos: makePreset([0.40, 1.10, 3.00, 45000, 160000, 620000, 0.25, 50000, 180000, 1200000, 2000000]),
    supply_chain: makePreset([0.15, 0.45, 1.50, 220000, 750000, 2900000, 0.80, 500000, 1900000, 15000000, 4000000]),
    bec: makePreset([0.45, 1.35, 3.80, 70000, 360000, 2100000, 0.78, 450000, 1850000, 14500000, 4200000]),
    edge_zero_day: makePreset([0.18, 0.58, 1.90, 140000, 560000, 2300000, 0.82, 520000, 2100000, 16000000, 4300000]),
    insider: makePreset([0.10, 0.34, 1.25, 95000, 410000, 1700000, 0.74, 380000, 1550000, 11800000, 3600000]),
    dependency_poisoning: makePreset([0.16, 0.52, 1.75, 190000, 690000, 2800000, 0.83, 570000, 2250000, 17500000, 4400000])
  },
  swift_node: {
    ransomware: makePreset([0.12, 0.42, 1.50, 260000, 950000, 3900000, 0.64, 420000, 1650000, 12500000, 4300000]),
    exfiltration: makePreset([0.16, 0.55, 1.85, 180000, 620000, 2500000, 0.88, 780000, 2850000, 22000000, 5200000]),
    ddos: makePreset([0.65, 1.85, 4.80, 95000, 360000, 1450000, 0.42, 140000, 520000, 3900000, 3600000]),
    supply_chain: makePreset([0.13, 0.40, 1.35, 340000, 1180000, 4700000, 0.78, 620000, 2300000, 18000000, 4800000]),
    bec: makePreset([0.28, 0.82, 2.60, 130000, 680000, 4300000, 0.76, 360000, 1550000, 11800000, 4100000]),
    edge_zero_day: makePreset([0.14, 0.46, 1.65, 290000, 1020000, 4200000, 0.70, 480000, 1900000, 14800000, 4600000]),
    insider: makePreset([0.07, 0.25, 0.95, 160000, 610000, 2700000, 0.68, 410000, 1650000, 12600000, 3900000]),
    dependency_poisoning: makePreset([0.12, 0.39, 1.30, 310000, 1090000, 4500000, 0.81, 680000, 2500000, 19500000, 4900000])
  },
  iam_dir: {
    ransomware: makePreset([0.22, 0.76, 2.20, 140000, 570000, 2200000, 0.69, 330000, 1280000, 9800000, 3400000]),
    exfiltration: makePreset([0.24, 0.78, 2.30, 150000, 520000, 2050000, 0.87, 690000, 2600000, 19800000, 4700000]),
    ddos: makePreset([0.30, 0.92, 2.70, 50000, 185000, 740000, 0.30, 65000, 245000, 1850000, 2300000]),
    supply_chain: makePreset([0.14, 0.43, 1.45, 210000, 760000, 3100000, 0.79, 480000, 1820000, 13900000, 3800000]),
    bec: makePreset([0.55, 1.60, 4.50, 110000, 580000, 3600000, 0.84, 300000, 1420000, 11000000, 3900000]),
    edge_zero_day: makePreset([0.20, 0.65, 2.10, 180000, 720000, 2950000, 0.83, 430000, 1750000, 13400000, 4000000]),
    insider: makePreset([0.13, 0.42, 1.55, 130000, 560000, 2300000, 0.78, 350000, 1400000, 10800000, 3500000]),
    dependency_poisoning: makePreset([0.15, 0.48, 1.65, 220000, 790000, 3250000, 0.80, 500000, 1920000, 14600000, 4000000])
  },
  scada_grid: {
    ransomware: makePreset([0.10, 0.36, 1.25, 420000, 1580000, 6200000, 0.72, 500000, 1950000, 15500000, 5500000]),
    exfiltration: makePreset([0.08, 0.30, 1.10, 190000, 720000, 2900000, 0.80, 520000, 2050000, 16000000, 4800000]),
    ddos: makePreset([0.35, 1.05, 3.20, 360000, 1320000, 5200000, 0.61, 460000, 1800000, 14200000, 5200000]),
    supply_chain: makePreset([0.12, 0.39, 1.45, 510000, 1860000, 7400000, 0.78, 680000, 2600000, 20500000, 6100000]),
    bec: makePreset([0.18, 0.58, 1.90, 170000, 740000, 3000000, 0.76, 320000, 1300000, 9800000, 4300000]),
    edge_zero_day: makePreset([0.16, 0.52, 1.85, 620000, 2280000, 9100000, 0.73, 720000, 2800000, 22000000, 6500000]),
    insider: makePreset([0.06, 0.22, 0.88, 470000, 1720000, 6900000, 0.70, 610000, 2350000, 18400000, 5700000]),
    dependency_poisoning: makePreset([0.09, 0.32, 1.20, 530000, 1940000, 7800000, 0.79, 700000, 2700000, 21200000, 6300000])
  },
  ehr_lake: {
    ransomware: makePreset([0.18, 0.62, 1.90, 250000, 980000, 4100000, 0.77, 720000, 2750000, 21500000, 4800000]),
    exfiltration: makePreset([0.26, 0.82, 2.45, 190000, 710000, 2950000, 0.94, 1050000, 3900000, 30500000, 6200000]),
    ddos: makePreset([0.22, 0.72, 2.20, 85000, 330000, 1380000, 0.43, 150000, 580000, 4500000, 3300000]),
    supply_chain: makePreset([0.16, 0.51, 1.75, 330000, 1240000, 5100000, 0.86, 820000, 3100000, 24500000, 5500000]),
    bec: makePreset([0.38, 1.12, 3.40, 125000, 610000, 3850000, 0.82, 610000, 2380000, 18600000, 5000000]),
    edge_zero_day: makePreset([0.20, 0.64, 2.05, 260000, 1010000, 4250000, 0.88, 880000, 3300000, 25800000, 5700000]),
    insider: makePreset([0.12, 0.40, 1.50, 180000, 700000, 2900000, 0.91, 920000, 3500000, 27400000, 5600000]),
    dependency_poisoning: makePreset([0.15, 0.49, 1.70, 350000, 1310000, 5400000, 0.88, 850000, 3250000, 25500000, 5800000])
  },
  ach_clearing: {
    ransomware: makePreset([0.16, 0.55, 1.80, 300000, 1120000, 4600000, 0.70, 450000, 1750000, 13800000, 5000000]),
    exfiltration: makePreset([0.14, 0.48, 1.65, 210000, 790000, 3250000, 0.91, 720000, 2750000, 21600000, 5400000]),
    ddos: makePreset([0.55, 1.62, 4.50, 240000, 920000, 3800000, 0.57, 300000, 1180000, 9400000, 4700000]),
    supply_chain: makePreset([0.14, 0.46, 1.58, 390000, 1450000, 5950000, 0.82, 620000, 2380000, 18700000, 5600000]),
    bec: makePreset([0.42, 1.25, 3.70, 160000, 760000, 4850000, 0.86, 420000, 1750000, 13800000, 4900000]),
    edge_zero_day: makePreset([0.18, 0.59, 1.95, 330000, 1230000, 5100000, 0.77, 520000, 2050000, 16000000, 5300000]),
    insider: makePreset([0.10, 0.34, 1.30, 190000, 730000, 3050000, 0.83, 470000, 1850000, 14500000, 4600000]),
    dependency_poisoning: makePreset([0.13, 0.43, 1.50, 410000, 1510000, 6200000, 0.84, 650000, 2500000, 19700000, 5700000])
  },
  water_ot: {
    ransomware: makePreset([0.09, 0.33, 1.18, 310000, 1180000, 4900000, 0.66, 380000, 1480000, 11600000, 4600000]),
    exfiltration: makePreset([0.07, 0.25, 0.92, 145000, 550000, 2250000, 0.74, 260000, 1020000, 8000000, 3700000]),
    ddos: makePreset([0.26, 0.82, 2.60, 280000, 1060000, 4400000, 0.52, 340000, 1320000, 10400000, 4500000]),
    supply_chain: makePreset([0.11, 0.36, 1.32, 420000, 1560000, 6400000, 0.76, 510000, 1980000, 15600000, 5200000]),
    bec: makePreset([0.15, 0.48, 1.62, 115000, 490000, 3100000, 0.72, 210000, 850000, 6600000, 3500000]),
    edge_zero_day: makePreset([0.17, 0.55, 1.90, 520000, 1940000, 8000000, 0.71, 620000, 2400000, 18900000, 5700000]),
    insider: makePreset([0.08, 0.27, 1.02, 350000, 1320000, 5500000, 0.68, 430000, 1680000, 13200000, 4900000]),
    dependency_poisoning: makePreset([0.08, 0.29, 1.08, 440000, 1630000, 6700000, 0.77, 540000, 2100000, 16500000, 5400000])
  }
};

function getPresetForContext(assetKey, threatKey) {
  const preset = ASSET_PRESETS[assetKey]?.[threatKey];
  if (!preset) {
    throw new Error(`No scenario preset found for asset "${assetKey}" and threat "${threatKey}".`);
  }
  return { ...preset };
}

// ============================================================================
// 3. NIST CSF 2.0 / SP 800-53 SECURITY CONTROLS CATALOG
// ============================================================================
const THREAT_CONTROL_KEYS = {
  ransomware: 'ransomware',
  exfiltration: 'apt',
  ddos: 'ddos',
  supply_chain: 'supply_chain',
  bec: 'phishing_bec',
  edge_zero_day: 'zero_day',
  insider: 'insider',
  dependency_poisoning: 'cicd_poisoning'
};

function getControlsForThreat(threatKey) {
  const controlKey = THREAT_CONTROL_KEYS[threatKey];
  const threatControls = THREAT_CONTROLS_MAP[controlKey];
  if (!threatControls) {
    throw new Error(`No security controls found for threat "${threatKey}".`);
  }

  return threatControls.map((control) => ({
    id: control.id,
    code: control.nist,
    name: control.name,
    desc: control.desc,
    annualCost: control.cost,
    lefReduction: Math.abs(control.lef) / 100,
    plmReduction: Math.abs(control.plm) / 100,
    slmReduction: Math.abs(control.slm) / 100,
    enabled: false
  }));
}

// ============================================================================
// 4. HIGH-PERFORMANCE VECTORIZED MONTE CARLO ENGINE (TYPED ARRAYS)
// ============================================================================
// Deterministic Mulberry32 PRNG for reproducible B2B auditability
// ============================================================================
// 5. PRODUCTION CODE TEMPLATES FOR TAB 5 (ARCHITECTURE & CODE)
// ============================================================================
const PRODUCTION_ARTIFACTS = {structure:'See README.md for the maintained architecture.',pythonEngine:engineSource,fastapi:apiSource,docker:composeSource,tailwind:tailwindSource};
// Deployment routing only; both execution paths retain the audited model.
const browserOnlyDeployment = import.meta.env.VITE_EXECUTION_MODE === 'browser';

// ============================================================================
// 6. FORMATTING HELPERS
// ============================================================================
function formatMoney(val, currency = 'USD', compact = false, lang = 'en') {
  if (val === undefined || val === null || Number.isNaN(val)) return '—';
  const symbol = currency === 'EUR' ? '€' : '$';
  const absVal = Math.abs(val), sign = val < 0 ? '-' : '';
  if (compact) {
    for (const [scale,en,ru,digits] of [[1e12,'T',' трлн',2],[1e9,'B',' млрд',2],[1e6,'M',' млн',2],[1e3,'K',' тыс.',0]] as const) {
      if (absVal>=scale) return `${sign}${symbol}${fraction(absVal/scale,lang,digits)}${lang==='ru'?ru:en}`;
    }
  }
  return `${sign}${symbol}${Math.round(absVal).toLocaleString(localeFor(lang))}`;
}

// ============================================================================
// 7. INTERACTIVE SVG CHART COMPONENTS (PLOTLY-GRADE B2B PRECISION)
// ============================================================================

/**
 * Interactive Loss Exceedance Curve (LEC) with crosshair inspection, VaR markers,
 * Risk Appetite threshold line, and optional Residual Risk overlay.
 */
function LossExceedanceChart({
  baselineLec,
  residualLec = null,
  ale,
  var95,
  riskAppetite,
  currency,
  logScale = false,
  lang = 'en'
}) {
  const [hoverIdx, setHoverIdx] = useState<any>(null);
  const chartId = React.useId();
  const svgRef = useRef<any>(null);

  const width = 820;
  const height = 340;
  const pad = { top: 24, right: 32, bottom: 44, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxLoss = useMemo(() => {
    if (!baselineLec || baselineLec.length === 0) return 5_000_000;
    return Math.max(
      baselineLec[baselineLec.length - 1].loss,
      var95 * 1.2,
      riskAppetite > Number.MAX_VALUE / 1.15 ? Number.MAX_VALUE : riskAppetite * 1.15,
      100_000
    );
  }, [baselineLec, var95, riskAppetite]);

  const minLogLoss = 10_000;

  const xToPx = useCallback(
    (lossVal) => {
      if (logScale) {
        const clamped = Math.max(minLogLoss, Math.min(maxLoss, lossVal));
        const ratio =
          (Math.log10(clamped) - Math.log10(minLogLoss)) /
          (Math.log10(maxLoss) - Math.log10(minLogLoss) || 1);
        return pad.left + ratio * plotW;
      }
      const ratio = Math.max(0, Math.min(1, lossVal / (maxLoss || 1)));
      return pad.left + ratio * plotW;
    },
    [logScale, maxLoss, plotW, pad.left]
  );

  const yToPx = useCallback(
    (probVal) => {
      const clamped = Math.max(0, Math.min(100, probVal));
      return pad.top + plotH - (clamped / 100) * plotH;
    },
    [plotH, pad.top]
  );

  const buildPath = (points) => {
    if (!points || points.length === 0) return '';
    return points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xToPx(pt.loss).toFixed(1)} ${yToPx(pt.prob).toFixed(1)}`)
      .join(' ');
  };

  const buildAreaPath = (points) => {
    if (!points || points.length === 0) return '';
    const line = buildPath(points);
    const lastX = xToPx(points[points.length - 1].loss).toFixed(1);
    const firstX = xToPx(points[0].loss).toFixed(1);
    const baseY = (pad.top + plotH).toFixed(1);
    return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current || !baselineLec || baselineLec.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < pad.left || relX > width - pad.right) {
      setHoverIdx(null);
      return;
    }
    // Find closest point in baselineLec by X coordinate
    let bestIdx = 0;
    let bestDist = Infinity;
    baselineLec.forEach((pt, idx) => {
      const px = xToPx(pt.loss);
      const dist = Math.abs(px - relX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    setHoverIdx(bestIdx);
  };

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTicks = useMemo(() => {
    if (logScale) {
      const ticks = [10_000, 50_000, 100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000, 25_000_000];
      return ticks.filter((t) => t >= minLogLoss && t <= maxLoss);
    }
    return [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((r) => r * maxLoss);
  }, [logScale, maxLoss]);

  const hoveredPoint = hoverIdx !== null && baselineLec[hoverIdx] ? baselineLec[hoverIdx] : null;
  const hoveredResidual =
    hoveredPoint && residualLec ? (() => {
      const x = hoveredPoint.loss;
      const upper = residualLec.findIndex(p => p.loss >= x);
      if (upper < 0) return null;
      if (upper === 0) return {loss:x,prob:residualLec[0].prob};
      const a=residualLec[upper-1], b=residualLec[upper];
      return {loss:x,prob:a.prob+(b.prob-a.prob)*(x-a.loss)/(b.loss-a.loss)};
    })() : null;

  const aleX = xToPx(ale);
  const var95X = xToPx(var95);
  const appetiteX = xToPx(riskAppetite);

  return (
    <div className="relative select-none">
      <p id={`${chartId}-help`} className="sr-only">{lang === 'ru' ? 'Стрелки влево и вправо выбирают точки кривой; Home и End переходят к краям.' : 'Use left and right arrows to inspect curve points; Home and End jump to the ends.'}</p>
      <svg
        ref={svgRef}
        role="img" tabIndex={0} aria-label={lang === 'ru' ? 'Кривая превышения потерь' : 'Loss exceedance curve'} aria-describedby={`${chartId}-help`}
        onFocus={() => {if (baselineLec?.length) setHoverIdx(0);}}
        onBlur={() => setHoverIdx(null)}
        onKeyDown={event => {
          if (!baselineLec?.length || !['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Escape') setHoverIdx(null);
          else setHoverIdx(event.key === 'Home' ? 0 : event.key === 'End' ? baselineLec.length-1 : Math.max(0,Math.min(baselineLec.length-1,(hoverIdx ?? 0)+(event.key === 'ArrowRight' ? 1 : -1))));
        }}
        viewBox={`0 0 ${width} ${height}`}
        className="report-lec-svg w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="lecBaselineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lecResidualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid Lines */}
        {yTicks.map((tick) => {
          const y = yToPx(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                className="lec-grid-line"
                stroke="#1E293B"
                strokeDasharray={tick === 0 ? undefined : '3 3'}
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Vertical Grid Lines */}
        {xTicks.map((tick, i) => {
          const x = xToPx(tick);
          return (
            <g key={`x-${i}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={pad.top + plotH}
                className="lec-grid-line"
                stroke="#1E293B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 14}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {formatMoney(tick, currency, true, lang)}
              </text>
            </g>
          );
        })}

        {/* Area & Curve: Baseline LEC */}
        <path d={buildAreaPath(baselineLec)} fill="url(#lecBaselineGrad)" />
        <path
          d={buildPath(baselineLec)}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2.25"
          strokeLinecap="round"
        />

        {/* Area & Curve: Residual LEC (if provided) */}
        {residualLec && (
          <>
            <path d={buildAreaPath(residualLec)} fill="url(#lecResidualGrad)" />
            <path
              d={buildPath(residualLec)}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.25"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Reference Marker: ALE */}
        {aleX >= pad.left && aleX <= width - pad.right && (
          <g>
            <line
              x1={aleX}
              y1={pad.top}
              x2={aleX}
              y2={pad.top + plotH}
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <rect
              x={aleX - 36}
              y={pad.top + 6}
              width="72"
              height="16"
              rx="2"
              fill="#0F1623"
              stroke="#38BDF8"
              strokeWidth="0.8"
            />
            <text
              x={aleX}
              y={pad.top + 17}
              textAnchor="middle"
              className="fill-sky-400 text-[9px] font-mono font-semibold"
            >
              {lang==='ru'?'Средний ущерб (ALE)':'ALE Mean'}
            </text>
          </g>
        )}

        {/* Reference Marker: 95% Cyber VaR */}
        {var95X >= pad.left && var95X <= width - pad.right && (
          <g>
            <line
              x1={var95X}
              y1={pad.top}
              x2={var95X}
              y2={pad.top + plotH}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <rect
              x={var95X - 42}
              y={pad.top + 28}
              width="84"
              height="16"
              rx="2"
              fill="#0F1623"
              stroke="#F59E0B"
              strokeWidth="0.8"
            />
            <text
              x={var95X}
              y={pad.top + 39}
              textAnchor="middle"
              className="fill-amber-400 text-[9px] font-mono font-semibold"
            >
              VaR 95% (5%)
            </text>
          </g>
        )}

        {/* Reference Marker: Board Risk Appetite */}
        {appetiteX >= pad.left && appetiteX <= width - pad.right && (
          <g>
            <line
              x1={appetiteX}
              y1={pad.top}
              x2={appetiteX}
              y2={pad.top + plotH}
              stroke="#EF4444"
              strokeWidth="1.2"
              strokeDasharray="2 3"
            />
            <rect
              x={appetiteX - 46}
              y={pad.top + 50}
              width="92"
              height="16"
              rx="2"
              fill="#0F1623"
              stroke="#EF4444"
              strokeWidth="0.8"
            />
            <text
              x={appetiteX}
              y={pad.top + 61}
              textAnchor="middle"
              className="fill-red-400 text-[9px] font-mono font-semibold"
            >
              {lang==='ru'?'Порог риска':'Risk Appetite'}
            </text>
          </g>
        )}

        {/* Interactive Crosshair & Inspection Point */}
        {hoveredPoint && (
          <g>
            <line
              x1={xToPx(hoveredPoint.loss)}
              y1={pad.top}
              x2={xToPx(hoveredPoint.loss)}
              y2={pad.top + plotH}
              stroke="#94A3B8"
              strokeWidth="1"
            />
            <line
              x1={pad.left}
              y1={yToPx(hoveredPoint.prob)}
              x2={width - pad.right}
              y2={yToPx(hoveredPoint.prob)}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={xToPx(hoveredPoint.loss)}
              cy={yToPx(hoveredPoint.prob)}
              r="4.5"
              fill="#3B82F6"
              stroke="#090D16"
              strokeWidth="2"
            />
            {hoveredResidual && (
              <circle
                cx={xToPx(hoveredResidual.loss)}
                cy={yToPx(hoveredResidual.prob)}
                r="4.5"
                fill="#10B981"
                stroke="#090D16"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Floating Plotly-Style Telemetry Tooltip */}
      {hoveredPoint && (
        <div data-chart-readout="lec" role="status" aria-live="polite" className="absolute top-3 right-4 bg-[#090D16]/95 border border-slate-700 px-3 py-2 rounded text-xs font-mono shadow-xl pointer-events-none space-y-1">
          <div className="text-slate-400 border-b border-slate-800 pb-1">
            {lang === 'ru' ? 'Порог ущерба (X)' : 'Loss Threshold (X)'}:{' '}
            <span className="text-slate-100 font-semibold">
              {formatMoney(hoveredPoint.loss, currency, false, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-400">
              {lang === 'ru' ? 'P(Ущерб > X) Базовый:' : 'P(Loss > X) Baseline:'}
            </span>
            <span className="text-slate-100 font-semibold">{fraction(hoveredPoint.prob,lang,2)}%</span>
          </div>
          {hoveredResidual && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-emerald-400">
                {lang === 'ru' ? 'P(Ущерб > X) Остаточный:' : 'P(Loss > X) Residual:'}
              </span>
              <span className="text-emerald-300 font-semibold">
                {fraction(hoveredResidual.prob,lang,2)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Heavy-Tail Loss Density Histogram with KDE-style smooth envelope
 * and 95% Cyber VaR tail shading.
 */
function HeavyTailHistogramChart({ bins, ale, var95, currency, lang = 'en' }) {
  const [hoverBin, setHoverBin] = useState<any>(null);
  const chartId = React.useId();

  const width = 820;
  const height = 340;
  const pad = { top: 24, right: 28, bottom: 44, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxDensity = useMemo(() => {
    if (!bins || bins.length === 0) return 15;
    return Math.max(...bins.map((b) => b.densityPct), 2) * 1.15;
  }, [bins]);

  const maxX = useMemo(() => {
    if (!bins || bins.length === 0) return 5_000_000;
    return bins[bins.length - 1].binEnd;
  }, [bins]);

  const xToPx = (val) => pad.left + Math.max(0, Math.min(1, val / (maxX || 1))) * plotW;
  const yToPx = (pct) => pad.top + plotH - Math.max(0, Math.min(1, pct / (maxDensity || 1))) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((r) => +(r * maxDensity).toFixed(1));
  const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((r) => r * maxX);

  const barW = Math.max(2, plotW / (bins.length || 1) - 2);

  return (
    <div className="relative select-none">
      <p id={`${chartId}-help`} className="sr-only">{lang === 'ru' ? 'Стрелки влево и вправо выбирают интервалы; Home и End переходят к краям.' : 'Use left and right arrows to inspect bins; Home and End jump to the ends.'}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible"
        role="img" tabIndex={0} aria-label={lang === 'ru' ? 'Гистограмма годовых потерь' : 'Annual loss histogram'} aria-describedby={`${chartId}-help`}
        onFocus={() => {if (bins?.length) setHoverBin(0);}} onBlur={() => setHoverBin(null)}
        onKeyDown={event => {
          if (!bins?.length || !['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Escape') setHoverBin(null);
          else setHoverBin(event.key === 'Home' ? 0 : event.key === 'End' ? bins.length-1 : Math.max(0,Math.min(bins.length-1,(hoverBin ?? 0)+(event.key === 'ArrowRight' ? 1 : -1))));
        }}>
        {/* Horizontal Grid */}
        {yTicks.map((t, idx) => {
          const y = yToPx(t);
          return (
            <g key={idx}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#1E293B"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {t}%
              </text>
            </g>
          );
        })}

        {/* X Axis Ticks */}
        {xTicks.map((t, idx) => {
          const x = xToPx(t);
          return (
            <g key={idx}>
              <text
                x={x}
                y={height - 14}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {formatMoney(t, currency, true, lang)}
              </text>
            </g>
          );
        })}

        {/* Histogram Bars */}
        {bins.map((b, idx) => {
          const x = xToPx(b.binStart) + 1;
          const y = yToPx(b.densityPct);
          const h = Math.max(0, pad.top + plotH - y);
          const isTail = b.binMid >= var95;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={isTail ? '#EF4444' : '#3B82F6'}
              fillOpacity={hoverBin === idx ? 0.95 : isTail ? 0.72 : 0.55}
              stroke={isTail ? '#F87171' : '#60A5FA'}
              strokeWidth="0.6"
              className="transition-opacity duration-75 cursor-pointer"
              onMouseEnter={() => setHoverBin(idx)}
              onMouseLeave={() => setHoverBin(null)}
            />
          );
        })}

        {/* ALE Vertical Line */}
        {ale <= maxX && (
          <g>
            <line
              x1={xToPx(ale)}
              y1={pad.top}
              x2={xToPx(ale)}
              y2={pad.top + plotH}
              stroke="#38BDF8"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <text
              x={xToPx(ale) + 5}
              y={pad.top + 14}
              className="fill-sky-400 text-[9px] font-mono font-semibold"
            >
              ALE
            </text>
          </g>
        )}

        {/* VaR 95% Cutoff Line */}
        {var95 <= maxX && (
          <g>
            <line
              x1={xToPx(var95)}
              y1={pad.top}
              x2={xToPx(var95)}
              y2={pad.top + plotH}
              stroke="#F59E0B"
              strokeWidth="1.6"
            />
            <text
              x={xToPx(var95) + 6}
              y={pad.top + 28}
              className="fill-amber-400 text-[9px] font-mono font-semibold"
            >
              {lang==='ru'?'Область хвоста за VaR 95% →':'95% Cyber VaR Tail Zone →'}
            </text>
          </g>
        )}
      </svg>

      {hoverBin !== null && bins[hoverBin] && (
        <div data-chart-readout="histogram" role="status" aria-live="polite" className="absolute top-3 right-4 bg-[#090D16]/95 border border-slate-700 px-3 py-2 rounded text-xs font-mono shadow-xl pointer-events-none space-y-1">
          <div className="text-slate-400">
            {lang === 'ru' ? 'Диапазон потерь:' : 'Loss Interval:'}{' '}
            <span className="text-slate-100">
              {formatMoney(bins[hoverBin].binStart, currency, true, lang)} –{' '}
              {formatMoney(bins[hoverBin].binEnd, currency, true, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">
              {lang === 'ru' ? 'Доля интервала / Годы:' : 'Bin share / Years:'}
            </span>
            <span className={bins[hoverBin].isTail ? 'text-red-400 font-semibold' : 'text-blue-400 font-semibold'}>
              {fraction(bins[hoverBin].densityPct,lang,2)}% ({bins[hoverBin].count})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Analytical Mini-Distribution Curve Preview for Input Cards
 */
function MiniDistributionCurve({ minVal, modeVal, maxVal, type = 'pert', color = '#3B82F6' }) {
  const points = useMemo(() => {
    const w = 240;
    const h = 44;
    const steps = 40;
    const span = Math.max(1e-6, maxVal - minVal);
    const modeRatio = Math.max(0.05, Math.min(0.95, (modeVal - minVal) / span));

    const raw = [];
    let maxY = 0;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      let y = 0;
      if (type === 'pert') {
        const a = 1 + 4 * modeRatio;
        const b = 1 + 4 * (1 - modeRatio);
        const clampedX = Math.max(0.001, Math.min(0.999, x));
        y = Math.pow(clampedX, a - 1) * Math.pow(1 - clampedX, b - 1);
      } else {
        // Skewed heavy-tail lognormal approximation
        const shifted = Math.max(0.02, x * 2.6);
        const sigma = 0.65;
        const mu = Math.log(Math.max(0.12, modeRatio * 1.3)) + sigma * sigma;
        y = (1 / (shifted * sigma)) * Math.exp(-Math.pow(Math.log(shifted) - mu, 2) / (2 * sigma * sigma));
      }
      if (y > maxY) maxY = y;
      raw.push({ x: x * w, y });
    }

    return raw.map((pt) => ({
      x: pt.x,
      y: h - 4 - (pt.y / (maxY || 1)) * (h - 10)
    }));
  }, [minVal, modeVal, maxVal, type]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox="0 0 240 44" className="w-full h-11 overflow-visible">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" />
      <line x1="0" y1="40" x2="240" y2="40" stroke="#1E293B" strokeWidth="1" />
    </svg>
  );
}

// ============================================================================
// 8. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Global UI & Context States
  const [lang, setLang] = useState(initialLanguage);
  const formatCurrency=(value,unit='USD',compact=false)=>formatMoney(value,unit,compact,lang);
  useEffect(() => { document.documentElement.lang = lang; persistLanguage(lang); }, [lang]);
  const [paperFormat,setPaperFormat] = useState('A4');
  const [activeTab, setActiveTab] = useState('simulation');
  const [selectedAsset, setSelectedAsset] = useState('payment_gw');
  const [selectedThreat, setSelectedThreat] = useState('ransomware');
  const [currency, setCurrency] = useState('USD');
  const [iterations, setIterations] = useState(50000);
  const [seed, setSeed] = useState(42001);
  const [secMaterialityThreshold, setSecMaterialityThreshold] = useState(2500000);
  const [logScaleLec, setLogScaleLec] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulationSource, setSimulationSource] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(true);
  const [simulationError, setSimulationError] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const executionLock = useRef(false);
  useEffect(() => { if (!isComputing) executionLock.current = false; }, [isComputing]);

  // Open FAIR Input Parameters
  const [fairParams, setFairParams] = useState(() =>
    getPresetForContext('payment_gw', 'ransomware')
  );
  const [fairParamDrafts, setFairParamDrafts] = useState<Record<string, any>>({});

  // NIST Controls State
  const [controls, setControls] = useState(() => getControlsForThreat('ransomware'));

  // Architecture Code Tab Selector & Copy Feedback
  const [archSection, setArchSection] = useState('pythonEngine');
  const [copiedKey, setCopiedKey] = useState<any>(null);

  const t = I18N[lang];
  const defaultFairParams = getPresetForContext(selectedAsset, selectedThreat);
  const isCustomDataModified = Object.keys(defaultFairParams).some(
    (key) => fairParams[key] !== defaultFairParams[key]
  );

  // Handle Asset or Threat change -> Load calibrated Open FAIR preset
  const handleContextChange = (newAsset, newThreat) => {
    setSelectedAsset(newAsset);
    setSelectedThreat(newThreat);
    setFairParams(getPresetForContext(newAsset, newThreat));
    setFairParamDrafts({});
    if (newThreat !== selectedThreat) {
      setControls(getControlsForThreat(newThreat));
    }
  };

  const activeControlsList = useMemo(
    () => controls.filter((control) => control.enabled),
    [controls]
  );
  const currentKey = JSON.stringify({fairParams, controls:activeControlsList, iterations, seed, secMaterialityThreshold, selectedAsset, selectedThreat, currency});
  const hasInvalidFairDraft = Object.values(fairParamDrafts).some(value => String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0);
  const resultsReady = !isEditing && !isComputing && !simulationError && !hasInvalidFairDraft && simulationResult?.requestKey === currentKey && Boolean(simulationResult?.baseline && simulationResult?.residual && simulationResult?.governance);
  const baselineResults = simulationResult?.baseline;
  const residualResults = simulationResult?.residual;
  const totalControlCost = simulationResult?.governance.annualControlSpend;
  const rosiMetrics = simulationResult?.governance;

  const searchEntries = useMemo(() => buildSearchIndex({
    t, otherT: I18N[lang === 'en' ? 'ru' : 'en'], lang, fairParams,
    catalog: Object.fromEntries(Object.keys(t.threats).map(key => [key, getControlsForThreat(key)])),
    selectedThreat, hasResults: Boolean(simulationResult), resultsReady,
    percentiles: baselineResults?.percentileTable.map(row=>row.percentile) || []
  }), [t, lang, fairParams, selectedThreat, simulationResult, resultsReady]);

  const normalizeTriplet = (minValue, modeValue, maxValue) => {
    const min = Number.isFinite(minValue) ? Math.max(0, minValue) : 0;
    const requestedMax = Number.isFinite(maxValue) ? Math.max(0, maxValue) : min;
    const max = Math.max(min, requestedMax);
    const mode = Number.isFinite(modeValue) ? modeValue : min;
    return { min, mode: Math.min(max, Math.max(min, mode)), max };
  };
  const tripletsNeedNormalization = ['lef', 'plm', 'slm'].some((name) => {
    const normalized = normalizeTriplet(
      fairParams[`${name}Min`],
      fairParams[`${name}Mode`],
      fairParams[`${name}Max`]
    );
    return (
      normalized.min !== fairParams[`${name}Min`] ||
      normalized.mode !== fairParams[`${name}Mode`] ||
      normalized.max !== fairParams[`${name}Max`]
    );
  });

  useEffect(() => {
    const controller = new AbortController();
    let computationTimeout: ReturnType<typeof window.setTimeout> | undefined;
    setIsComputing(true);
    setSimulationError(null);
    const debounce = window.setTimeout(async () => {
      computationTimeout = window.setTimeout(() => {
        if (controller.signal.aborted) return;
        controller.abort();
        setSimulationError(lang === 'ru'
          ? 'Расчёт не завершился за 30 секунд. Проверьте соединение и повторите попытку.'
          : 'Calculation did not finish within 30 seconds. Check the connection and retry.');
        setIsComputing(false);
      }, 30000);
      setIsComputing(true);
      setSimulationError(null);
      setSimulationSource(null);

      const lef = normalizeTriplet(fairParams.lefMin, fairParams.lefMode, fairParams.lefMax);
      const plm = normalizeTriplet(fairParams.plmMin, fairParams.plmMode, fairParams.plmMax);
      const slm = normalizeTriplet(fairParams.slmMin, fairParams.slmMode, fairParams.slmMax);
      const requestPayload = {
        lef_min: lef.min,
        lef_mode: lef.mode,
        lef_max: lef.max,
        lef_gamma: fairParams.lefGamma,
        plm_min: plm.min,
        plm_mode: plm.mode,
        plm_max: plm.max,
        plm_gamma: fairParams.plmGamma,
        slef_prob: fairParams.slefProb,
        slm_min: slm.min,
        slm_mode: slm.mode,
        slm_max: slm.max,
        sec_materiality_threshold: Number.isFinite(secMaterialityThreshold)
          ? Math.max(0, secMaterialityThreshold)
          : 2500000,
        risk_appetite: fairParams.riskAppetite,
        iterations,
        random_seed: seed,
        controls: activeControlsList.map((control) => ({
          id: control.id,
          annual_cost: control.annualCost,
          lef_reduction: control.lefReduction,
          plm_reduction: control.plmReduction,
          slm_reduction: control.slmReduction,
          enabled: true
        }))
      };

      const executeBrowserSimulation = async () => {
          try {
            const localParams = {
              ...fairParams,
              lefMin: lef.min,
              lefMode: lef.mode,
              lefMax: lef.max,
              plmMin: plm.min,
              plmMode: plm.mode,
              plmMax: plm.max,
              slmMin: slm.min,
              slmMode: slm.mode,
              slmMax: slm.max
            };
            const controlMultipliers = activeControlsList.reduce(
              (multipliers, control) => ({
                lef: multipliers.lef * (1 - control.lefReduction),
                plm: multipliers.plm * (1 - control.plmReduction),
                slm: multipliers.slm * (1 - control.slmReduction)
              }),
              { lef: 1, plm: 1, slm: 1 }
            );
            const residualParams = {
              ...localParams,
              lefMin: localParams.lefMin * controlMultipliers.lef,
              lefMode: localParams.lefMode * controlMultipliers.lef,
              lefMax: localParams.lefMax * controlMultipliers.lef,
              plmMin: localParams.plmMin * controlMultipliers.plm,
              plmMode: localParams.plmMode * controlMultipliers.plm,
              plmMax: localParams.plmMax * controlMultipliers.plm,
              slmMin: localParams.slmMin * controlMultipliers.slm,
              slmMode: localParams.slmMode * controlMultipliers.slm,
              slmMax: localParams.slmMax * controlMultipliers.slm
            };
            const threshold = Number.isFinite(secMaterialityThreshold)
              ? Math.max(0, secMaterialityThreshold)
              : 2500000;
            const {baseline,residual} = await runInWorker({localParams,residualParams,iterations,seed,threshold},controller.signal);
            const annualControlSpend = activeControlsList.reduce(
              (total, control) => total + control.annualCost,
              0
            );
            const preventedAle = Math.max(0, baseline.ale - residual.ale);
            const netBenefit = preventedAle - annualControlSpend;

            if (controller.signal.aborted) return;
        setSimulationResult({
          requestKey: currentKey, snapshot: structuredClone({...requestPayload,context:{asset:selectedAsset,threat:selectedThreat,currency}}), metadata: {timestamp:new Date().toISOString(),environment:{userAgent:navigator.userAgent},engine:"browser-mulberry32",engine_version:"3.0.0",software_version:"3.0.0",model:"shifted-lognormal-mode-p95-v1",code_revision:import.meta.env.VITE_CODE_REVISION || null},
              runId: crypto.randomUUID(),
              baseline,
              residual,
              governance: {
                annualControlSpend,
                preventedAle,
                netBenefit,
                rosiPct: annualControlSpend > 0
                  ? (netBenefit / annualControlSpend) * 100
                  : 0,
                secMaterialityExceedProb: baseline.secMaterialityExceedProb
              }
            });
            setSimulationSource('local');
          } catch (fallbackError: any) {
            if (controller.signal.aborted) return;
            setSimulationError(
              `Local simulation failed: ${fallbackError.message || 'Unknown calculation error.'}`
            );
          }
      };

      try {
        if (browserOnlyDeployment) {
          await executeBrowserSimulation();
          return;
        }
        let response;
        try {
          response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
          });
        } catch (error: any) {
          if (error.name === 'AbortError') throw error;
          const networkError = new Error('Simulation API network request failed.');
          networkError.name = 'NetworkError';
          throw networkError;
        }

        if ([404,405,501,502,503].includes(response.status)) {
          const unavailable = new Error('API unavailable; using browser worker');
          unavailable.name = 'NetworkError'; throw unavailable;
        }
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Simulation API returned ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        validateSimulationResponse(data, requestPayload, lang);
        const parseScenario = (scenario, label) => {
          const requiredMetrics = [
            'iterations',
            'compute_time_ms',
            'ale',
            'cyber_var_95',
            'cyber_var_99',
            'tail_cvar_99',
            'zero_loss_prob_pct'
          ];
          if (
            !scenario ||
            requiredMetrics.some((key) => !Number.isFinite(scenario[key])) ||
            !Array.isArray(scenario.lec_curve) ||
            scenario.lec_curve.some(
              (point) => !Number.isFinite(point.loss) || !Number.isFinite(point.prob)
            ) ||
            !Array.isArray(scenario.histogram_bins) ||
            scenario.histogram_bins.length !== 40 ||
            scenario.histogram_bins.some(
              (bin) =>
                !Number.isFinite(bin.bin_start) ||
                !Number.isFinite(bin.bin_end) ||
                !Number.isFinite(bin.bin_mid) ||
                !Number.isFinite(bin.count) ||
                !Number.isFinite(bin.density_pct)
            ) ||
            !Array.isArray(scenario.percentiles) ||
            scenario.percentiles.some(
              (row) =>
                !Number.isFinite(row.percentile) ||
                !Number.isFinite(row.total) ||
                !Number.isFinite(row.primary) ||
                !Number.isFinite(row.secondary)
            )
          ) {
            throw new Error(`Simulation API returned an invalid ${label} result.`);
          }

          return {
            iterations: scenario.iterations,
            elapsedMs: scenario.compute_time_ms,
            ale: scenario.ale,
            var95: scenario.cyber_var_95,
            var99: scenario.cyber_var_99,
            cvar99: scenario.tail_cvar_99,
            zeroLossProb: scenario.zero_loss_prob_pct,
            lecPoints: scenario.lec_curve,
            histogramBins: scenario.histogram_bins.map((bin) => ({
              binStart: bin.bin_start,
              binEnd: bin.bin_end,
              binMid: bin.bin_mid,
              count: bin.count,
              densityPct: bin.density_pct,
              isTail: bin.bin_mid >= scenario.cyber_var_95
            })),
            percentileTable: scenario.percentiles.map((row) => ({
              ...row,
              exceedProb: row.exceed_prob
            }))
          };
        };

        const governance = data.governance;
        if (
          !governance ||
          !Number.isFinite(governance.annual_control_spend) ||
          !Number.isFinite(governance.prevented_annual_loss) ||
          !Number.isFinite(governance.net_benefit) ||
          !Number.isFinite(governance.rosi_percentage) ||
          !Number.isFinite(governance.sec_materiality_exceed_prob)
        ) {
          throw new Error('Simulation API returned invalid governance metrics.');
        }

        if (controller.signal.aborted) return;
        setSimulationResult({
          requestKey: currentKey, snapshot: structuredClone({...requestPayload,context:{asset:selectedAsset,threat:selectedThreat,currency}}), metadata: data.metadata,
          runId: crypto.randomUUID(),
          baseline: parseScenario(data.baseline, 'baseline'),
          residual: parseScenario(data.residual, 'residual'),
          governance: {
            annualControlSpend: governance.annual_control_spend,
            preventedAle: governance.prevented_annual_loss,
            netBenefit: governance.net_benefit,
            rosiPct: governance.rosi_percentage,
            secMaterialityExceedProb: governance.sec_materiality_exceed_prob
          }
        });
        setSimulationSource('api');
      } catch (error: any) {
        if (controller.signal.aborted) return;
        if (error.name === 'AbortError') {
          return;
        }

        if (error.name === 'NetworkError') {
          await executeBrowserSimulation();
        } else {
          let message = error.message || 'Unable to calculate risk with the Simulation API.';
          try {
            const details = JSON.parse(message.split(': ').slice(1).join(': '));
            if (details.detail) message = Array.isArray(details.detail)
              ? details.detail.map((item) => item.msg).join('; ')
              : details.detail;
          } catch {
            // Keep the original API or network error when it is not JSON.
          }
          setSimulationError(message);
        }
      } finally {
        window.clearTimeout(computationTimeout);
        if (!controller.signal.aborted) {
          setIsComputing(false);
        }
      }
    }, 375);

    return () => {
      window.clearTimeout(debounce);
      window.clearTimeout(computationTimeout);
      controller.abort();
    };
  }, [fairParams, activeControlsList, iterations, seed, retryCount, secMaterialityThreshold, selectedAsset, selectedThreat, currency]);

  // Update individual FAIR input field safely
  const updateFairParam = useCallback((key, rawValue) => {
    setFairParamDrafts((prev) => ({ ...prev, [key]: rawValue }));
    if (rawValue.trim() === '') return;
    const num = Number(rawValue);
    if (!Number.isFinite(num) || num < 0) return;
    setFairParams((prev) => ({
      ...prev,
      [key]: num
    }));
  }, []);
  const commitLefGamma = useCallback((v:number) => updateFairParam('lefGamma', String(v)), [updateFairParam]);
  const commitPlmGamma = useCallback((v:number) => updateFairParam('plmGamma', String(v)), [updateFairParam]);
  const commitSlefProb = useCallback((v:number) => updateFairParam('slefProb', String(v)), [updateFairParam]);

  const clearFairParamDraft = (key) => {
    setFairParamDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetToDefaults = () => {
    setSelectedAsset('payment_gw');
    setSelectedThreat('ransomware');
    setFairParams(getPresetForContext('payment_gw', 'ransomware'));
    setFairParamDrafts({});
    setControls(getControlsForThreat('ransomware'));
    setIterations(50000);
    setSeed(42001);
    setSecMaterialityThreshold(2500000);
    setSimulationError(null);
    setRetryCount((count) => count + 1);
  };

  // Toggle NIST Control
  const toggleControl = (id) => {
    setControls((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  // Explicit global reruns preserve the selected seed; retryCount is only a
  // request trigger and is deliberately absent from scientific input snapshots.
  const executeSimulation = () => {
    if (executionLock.current || isComputing || isEditing || hasInvalidFairDraft) return;
    executionLock.current = true;
    setActiveTab('simulation');
    setRetryCount((count) => count + 1);
  };

  // Copy code helper
  const handleCopyCode = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export JSON Audit Artifact
  const handleDownloadAuditJson = () => {
    if (isComputing || !resultsReady || !baselineResults || !residualResults || !rosiMetrics) return;
    const payload = exportConfirmedRun(simulationResult,currentKey,isComputing);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wayquant-audit-${selectedAsset}-${selectedThreat}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell min-h-screen bg-[#090D16] text-slate-100 flex flex-col lg:flex-row font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* ====================================================================
          LEFT SIDEBAR: GLOBAL CONTEXT, NAVIGATION & TELEMETRY
         ==================================================================== */}
      <aside className="w-full lg:w-72 xl:w-80 bg-[#0F1623] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between shrink-0 print:hidden">
        <div>
          {/* Brand Header & Language Switcher */}
          <div className="brand-header border-b border-slate-800">
            <div className="brand-topline">
              <div className="brand-lockup">
                <img className="brand-symbol" src={`${import.meta.env.BASE_URL}wayquant-mark-dark.svg`} alt="" width="26" height="46" />
                <div className="brand-identity">
                  <span className="brand-wordmark text-white">
                    {t.appTitle}
                  </span>
                  <span className="brand-version text-slate-400">
                    {t.version}
                  </span>
                </div>
              </div>

            {/* Equal language segments, with concentric inset radii. */}
            <div className="language-switcher" role="group" aria-label={lang === 'ru' ? 'Язык интерфейса' : 'Interface language'}>
              <button
                aria-pressed={lang === 'ru'}
                title="Русский"
                onClick={() => setLang('ru')}
              >
                RU
              </button>
              <button
                aria-pressed={lang === 'en'}
                title="English"
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
            </div>
            <p className="brand-descriptor text-slate-400">{t.appSubtitle}</p>
          </div>

          {/* Global Simulation Context Controls */}
          <div className="p-4 border-b border-slate-800 space-y-3.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              {t.sidebar.contextHeader}
            </div>

            {/* Target Asset Selector */}
            <div className="space-y-1">
              <label id="context-asset-label" htmlFor="context-asset" className="block text-xs text-slate-300 font-medium">
                {t.sidebar.assetLabel}
              </label>
              <ContextSelect
                id="context-asset"
                  value={selectedAsset}
                onChange={(e) => handleContextChange(e.target.value, selectedThreat)}
              >
                {Object.entries(t.assets).map(([key, label]) => (
                  <option key={key} value={key}>
                    {String(label)}
                  </option>
                ))}
              </ContextSelect>
            </div>

            {/* Threat Vector Selector */}
            <div className="space-y-1">
              <label id="context-threat-label" htmlFor="context-threat" className="block text-xs text-slate-300 font-medium">
                {t.sidebar.threatLabel}
              </label>
              <ContextSelect
                id="context-threat"
                  value={selectedThreat}
                onChange={(e) => handleContextChange(selectedAsset, e.target.value)}
              >
                {Object.entries(t.threats).map(([key, label]) => (
                  <option key={key} value={key}>
                    {String(label)}
                  </option>
                ))}
              </ContextSelect>
            </div>

            <ScenarioNotice lang={lang} />

            {/* Iterations, Seed & Currency Row */}
            <div className="context-fields grid gap-4 pt-1">
              <div>
                <label id="context-iterations-label" htmlFor="context-iterations" className="block text-[10px] text-slate-400 font-mono">
                  {t.sidebar.iterationsLabel}
                </label>
                <ContextSelect
                  id="context-iterations"
                  value={iterations}
                  onChange={(e) => setIterations(Number(e.target.value))}
                >
                  <option value={25000}>25,000</option>
                  <option value={50000}>50,000</option>
                  <option value={100000}>100,000</option>
                </ContextSelect>
              </div>
              <div>
                <label htmlFor="context-seed" className="block text-[10px] text-slate-400 font-mono">
                  {t.sidebar.seedLabel}
                </label>
                <input
                  id="context-seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.trim() === '' ? 1 : Number(e.target.value))}
                  className="mt-1 w-full bg-[#090D16] border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label id="context-currency-label" htmlFor="context-currency" className="block text-[10px] text-slate-400 font-mono">
                  {t.sidebar.currencyLabel}
                </label>
                <ContextSelect
                  id="context-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </ContextSelect>
              </div>
            </div>
            <p className="context-currency-note text-[10px] leading-relaxed text-slate-400">{lang === 'ru' ? 'Валюта обозначает единицы ввода; пересчёта по курсу нет. Seed: целое от 0 до 4294967295; пустое поле восстанавливается как 1.' : 'Currency labels input units; no FX conversion. Seed: integer 0–4294967295; blank input falls back to 1.'}</p>
          </div>

          {/* Navigation Menu */}
          <nav aria-label={t.sidebar.navHeader} className="sidebar-navigation p-3 space-y-1">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {t.sidebar.navHeader}
            </div>
            {[
              { id: 'input', label: t.sidebar.tabs.input, icon: Sliders },
              { id: 'simulation', label: t.sidebar.tabs.simulation, icon: BarChart2 },
              { id: 'controls', label: t.sidebar.tabs.controls, icon: Layers },
              { id: 'export', label: t.sidebar.tabs.export, icon: FileText },
              { id: 'architecture', label: t.sidebar.tabs.architecture, icon: Terminal }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-left leading-relaxed">{item.label}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isActive ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Engine Telemetry Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0B101B] space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{t.sidebar.engineStatus}</span>
            <span data-testid="compute-engine-status" role="status" aria-live="polite" className={`flex items-center gap-1.5 text-[10px] font-semibold ${isComputing ? 'text-amber-400' : simulationError ? 'text-red-300' : resultsReady ? 'text-emerald-400' : 'text-slate-300'}`}>
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${isComputing ? 'bg-amber-400' : simulationError ? 'bg-red-300' : resultsReady ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              {isComputing ? (lang === 'ru' ? 'Вычисление…' : 'Calculating…')
                : simulationError ? (lang === 'ru' ? 'Ошибка расчёта' : 'Calculation failed')
                : !resultsReady ? (simulationResult ? (lang === 'ru' ? 'Предыдущий расчёт' : 'Previous result') : (lang === 'ru' ? 'Нет результата' : 'No result'))
                : simulationSource === 'local' ? (lang === 'ru' ? 'Web Worker браузера' : 'Browser worker') : 'NumPy API'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
            <div>
              <div className="text-slate-500 text-[10px]">{t.sidebar.execTime}</div>
              <div className="text-slate-200 font-semibold">
                {baselineResults ? `${baselineResults.elapsedMs} ms` : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">{t.sidebar.confidenceLevel}</div>
              <div className="text-amber-400 font-semibold">95.0% VaR</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          MAIN WORKSPACE AREA
         ==================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Compact context stays outside the independently scrolling workspace. */}
        <header className="context-header print:hidden">
          <div className="context-bar">
            <div className="context-bar-fields">
            <div className="context-bar-item">
              <Server size={15} aria-hidden="true" className="context-bar-icon" />
              <div className="context-bar-copy">
              <span className="context-bar-label">{t.sidebar.assetLabel}</span>
              <span className="context-bar-value" title={t.assets[selectedAsset]}>{t.assets[selectedAsset]}</span>
              </div>
            </div>
            <div className="context-bar-item">
              <AlertTriangle size={15} aria-hidden="true" className="context-bar-icon" />
              <div className="context-bar-copy">
              <span className="context-bar-label">{t.sidebar.threatLabel}</span>
              <span className="context-bar-value" title={t.threats[selectedThreat]}>{t.threats[selectedThreat]}</span>
              </div>
            </div>
            </div>
            <div className="context-bar-search"><CommandPalette lang={lang} entries={searchEntries}
              onNavigate={entry=>navigateSearchResult(entry,{setActiveTab,setArchSection})} /></div>
            <div className="context-bar-metrics">
            {simulationResult && !resultsReady && <span className="context-result-status" role="status">{lang === 'ru' ? 'Предыдущий расчёт' : 'Previous result'}</span>}
            {simulationResult ? (<>
              <div className="context-bar-metric">
                <span className="context-bar-label">ALE</span>
                <span className="text-sky-400">{formatCurrency(baselineResults.ale, currency, true)}</span>
              </div>
              <div className="context-bar-metric">
                <span className="context-bar-label">VaR (95%)</span>
                <span className="text-amber-400">{formatCurrency(baselineResults.var95, currency, true)}</span>
              </div>
              <div data-search-target="residualVar" className="context-bar-metric">
                <span className="context-bar-label">{lang === 'ru' ? 'Остаточный VaR' : 'Residual VaR'}</span>
                <span className="text-emerald-400">{formatCurrency(residualResults.var95, currency, true)}</span>
              </div>
            </>) : (<div className="context-bar-pending">
            <span className="text-xs text-slate-400" role="status">
              {isComputing
                ? lang === 'ru' ? 'Ожидание расчета...' : 'Waiting for simulation...'
                : lang === 'ru' ? 'Результаты недоступны' : 'Results unavailable'}
            </span>
            </div>)}
            </div>
                <div className="context-bar-actions">
                  <button
                    aria-label={`${lang === 'ru' ? 'Сбросить профиль' : 'Reset baseline'} — ${t.inputTab.presetBtn}`}
                    title={t.inputTab.presetBtn}
                    onClick={() => {
                      setFairParams(getPresetForContext(selectedAsset, selectedThreat))
                      setFairParamDrafts({});
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#161F30] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Сбросить профиль' : 'Reset baseline'}</span>
                  </button>
                  <button
                    aria-label={`${lang === 'ru' ? 'Выполнить расчёт' : 'Execute simulation'} (${iterations.toLocaleString(localeFor(lang))} N)`}
                    title={`${lang === 'ru' ? 'Выполнить расчёт' : 'Execute simulation'} (${iterations.toLocaleString(localeFor(lang))} N)`}
                    onClick={executeSimulation}
                    disabled={isComputing || isEditing || hasInvalidFairDraft}
                    aria-busy={isComputing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-xs font-semibold text-white shadow transition-colors"
                  >
                    {isComputing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{lang === 'ru' ? 'Выполнить расчёт' : 'Execute simulation'}</span>
                    <span className="toolbar-iterations">({iterations.toLocaleString(localeFor(lang))} N)</span>
                  </button>

                </div>
          </div>
        </header>

        {/* Workspace Content Container */}
        <div className="workspace-scroll" tabIndex={0} role="region" aria-label={lang === 'ru' ? 'Рабочая область' : 'Workspace'}>
        <div className="workspace-content p-6 max-w-[1600px] w-full mx-auto space-y-6">
          <div className="h-6 flex items-center text-xs text-slate-400 print:hidden" role="status" aria-live="polite" data-testid="compute-status">
            {simulationError ? (lang === 'ru' ? 'Ошибка расчета' : 'Calculation failed') : isEditing ? (lang === 'ru' ? 'Изменение параметров…' : 'Editing parameters…') : isComputing ? t.simTab.recalculating : !resultsReady && simulationResult ? (lang === 'ru' ? 'Параметры изменены; экспорт ожидает расчет' : 'Parameters changed; export awaits calculation') : simulationSource === 'local' ? (browserOnlyDeployment ? (lang === 'ru' ? 'Расчёт выполнен в браузере.' : 'Simulation completed in your browser.') : t.sidebar.localFallback) : (lang === 'ru' ? 'Расчет актуален' : 'Results up to date')}
          </div>
          {simulationError && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm"
              role="alert"
            >
              <div>
                <div className="font-semibold text-red-300">
                  {lang === 'ru' ? 'Ошибка расчета' : 'Simulation error'}
                </div>
                <p className="mt-1 text-xs text-red-200/90">{displayError(simulationError,lang)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="rounded border border-red-300/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-400/10"
                >
                  {lang === 'ru' ? 'Повторить' : 'Retry'}
                </button>
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white"
                >
                  {lang === 'ru' ? 'Сбросить параметры по умолчанию' : 'Reset to defaults'}
                </button>
              </div>
            </div>
          )}
          {!simulationResult && activeTab !== 'input' && activeTab !== 'architecture' ? (
            <div className="rounded border border-slate-700 bg-[#0F1623] p-6 space-y-3">
              <h1 className="text-lg font-semibold text-white">
                {isComputing
                  ? lang === 'ru' ? 'Ожидание расчета' : 'Waiting for simulation'
                  : lang === 'ru' ? 'Результаты пока недоступны' : 'Results are unavailable'}
              </h1>
              <p className="text-sm text-slate-400">
                {lang === 'ru'
                  ? 'Параметры и навигация остаются доступными. Откройте вкладку параметров, чтобы изменить входные данные.'
                  : 'Parameter editing and navigation remain available. Open the inputs tab to adjust the request.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('input')}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                {lang === 'ru' ? 'Открыть параметры' : 'Open parameters'}
              </button>
            </div>
          ) : (
          <>
          {/* ================================================================
              TAB 1: OPEN FAIR INPUT PARAMETERS
             ================================================================ */}
          {activeTab === 'input' && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    {t.inputTab.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                    {t.inputTab.subtitle}
                  </p>
                </div>
                  <span className="inline-flex h-4 w-24 items-center text-[10px] text-slate-400 truncate" aria-hidden="true">{isComputing ? t.simTab.recalculating : simulationError ? (lang === 'ru' ? 'Ошибка' : 'Error') : (lang === 'ru' ? 'Готово' : 'Ready')}</span>
              </div>
              {hasInvalidFairDraft && <p data-testid="invalid-draft-notice" className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="alert">
                {lang === 'ru' ? 'Поле не содержит допустимого числа. Расчётные параметры не изменены; при выходе из поля восстановится последнее допустимое значение. Экспорт временно недоступен.' : 'This field has no valid number. Committed parameters are unchanged; leaving the field restores the last valid value. Export is temporarily unavailable.'}
              </p>}
              {tripletsNeedNormalization && (
                <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="status">
                  {lang === 'ru'
                    ? 'Перед расчетом диапазоны LEF, PLM и SLM будут нормализованы: Min ≤ Mode ≤ Max.'
                    : 'LEF, PLM, and SLM ranges will be normalized before calculation: Min ≤ Mode ≤ Max.'}
                </p>
              )}

              {/* Three-Column Open FAIR Calibration Grid */}
              <div className="calibration-grid grid grid-cols-1 2xl:grid-cols-3 gap-6">
                {/* 1. LOSS EVENT FREQUENCY (LEF) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        Poisson + Beta-PERT
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {t.inputTab.eventsPerYear}
                      </span>
                    </div>
                    <h2 id="lef-section" className="text-sm font-semibold text-white">
                      {t.inputTab.lefSection}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t.inputTab.lefDesc}
                    </p>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label htmlFor="fair-lefMin" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">LEF · {t.inputTab.minLabel}</span>
                          <span className="font-mono text-blue-400">{fairParams.lefMin}</span>
                        </label>
                        <input
                          id="fair-lefMin"
                          type="number"
                          step="0.05"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'lefMin') ? fairParamDrafts.lefMin : fairParams.lefMin}
                          onChange={(e) => updateFairParam('lefMin', e.target.value)}
                          onBlur={() => clearFairParamDraft('lefMin')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-lefMode" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">LEF · {t.inputTab.modeLabel}</span>
                          <span className="font-mono text-blue-400">{fairParams.lefMode}</span>
                        </label>
                        <input
                          id="fair-lefMode"
                          type="number"
                          step="0.05"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'lefMode') ? fairParamDrafts.lefMode : fairParams.lefMode}
                          onChange={(e) => updateFairParam('lefMode', e.target.value)}
                          onBlur={() => clearFairParamDraft('lefMode')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-lefMax" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">LEF · {t.inputTab.maxLabel}</span>
                          <span className="font-mono text-blue-400">{fairParams.lefMax}</span>
                        </label>
                        <input
                          id="fair-lefMax"
                          type="number"
                          step="0.1"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'lefMax') ? fairParamDrafts.lefMax : fairParams.lefMax}
                          onChange={(e) => updateFairParam('lefMax', e.target.value)}
                          onBlur={() => clearFairParamDraft('lefMax')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <ResponsiveSlider id="fair-lefGamma" label={`LEF · ${t.inputTab.gammaLabel}`} value={fairParams.lefGamma} min={1} max={8} step={0.5} percent={false} onCommit={commitLefGamma} onDraft={setIsEditing} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 mb-1">
                      {t.inputTab.densityPreview}
                    </div>
                    <MiniDistributionCurve
                      minVal={fairParams.lefMin}
                      modeVal={fairParams.lefMode}
                      maxVal={fairParams.lefMax}
                      type="pert"
                      color="#3B82F6"
                    />
                  </div>
                </div>

                {/* 2. PRIMARY LOSS MAGNITUDE (PLM) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Modified Beta-PERT
                      </span>
                      <span className="text-xs font-mono text-slate-400">{currency}</span>
                    </div>
                    <h2 id="plm-section" className="text-sm font-semibold text-white">
                      {t.inputTab.plmSection}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t.inputTab.plmDesc}
                    </p>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label htmlFor="fair-plmMin" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">PLM · {t.inputTab.minLabel}</span>
                          <span className="font-mono text-sky-400">
                            {formatCurrency(fairParams.plmMin, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-plmMin"
                          type="number"
                          step="10000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'plmMin') ? fairParamDrafts.plmMin : fairParams.plmMin}
                          onChange={(e) => updateFairParam('plmMin', e.target.value)}
                          onBlur={() => clearFairParamDraft('plmMin')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-plmMode" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">PLM · {t.inputTab.modeLabel}</span>
                          <span className="font-mono text-sky-400">
                            {formatCurrency(fairParams.plmMode, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-plmMode"
                          type="number"
                          step="25000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'plmMode') ? fairParamDrafts.plmMode : fairParams.plmMode}
                          onChange={(e) => updateFairParam('plmMode', e.target.value)}
                          onBlur={() => clearFairParamDraft('plmMode')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-plmMax" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">PLM · {t.inputTab.maxLabel}</span>
                          <span className="font-mono text-sky-400">
                            {formatCurrency(fairParams.plmMax, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-plmMax"
                          type="number"
                          step="50000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'plmMax') ? fairParamDrafts.plmMax : fairParams.plmMax}
                          onChange={(e) => updateFairParam('plmMax', e.target.value)}
                          onBlur={() => clearFairParamDraft('plmMax')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <ResponsiveSlider id="fair-plmGamma" label={`PLM · ${t.inputTab.gammaLabel}`} value={fairParams.plmGamma} min={1} max={8} step={0.5} percent={false} onCommit={commitPlmGamma} onDraft={setIsEditing} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 mb-1">
                      {t.inputTab.densityPreview}
                    </div>
                    <MiniDistributionCurve
                      minVal={fairParams.plmMin}
                      modeVal={fairParams.plmMode}
                      maxVal={fairParams.plmMax}
                      type="pert"
                      color="#38BDF8"
                    />
                  </div>
                </div>

                {/* 3. SECONDARY LOSS MAGNITUDE (SLM - LOGNORMAL HEAVY TAIL) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Lognormal Heavy-Tail
                      </span>
                      <span className="text-xs font-mono text-slate-400">{currency}</span>
                    </div>
                    <h2 id="slm-section" className="text-sm font-semibold text-white">
                      {t.inputTab.slmSection}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t.inputTab.slmDesc}<span className="block mt-1 text-slate-400">{scenarioNotes[lang].slm}</span>
                    </p>

                    <div className="space-y-3 pt-2">
                      <div>
                        <label htmlFor="fair-slmMin" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">SLM · {t.inputTab.minLabel}</span>
                          <span className="font-mono text-amber-400">
                            {formatCurrency(fairParams.slmMin, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-slmMin"
                          type="number"
                          step="25000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'slmMin') ? fairParamDrafts.slmMin : fairParams.slmMin}
                          onChange={(e) => updateFairParam('slmMin', e.target.value)}
                          onBlur={() => clearFairParamDraft('slmMin')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-slmMode" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">SLM · {t.inputTab.modeLabel}</span>
                          <span className="font-mono text-amber-400">
                            {formatCurrency(fairParams.slmMode, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-slmMode"
                          type="number"
                          step="50000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'slmMode') ? fairParamDrafts.slmMode : fairParams.slmMode}
                          onChange={(e) => updateFairParam('slmMode', e.target.value)}
                          onBlur={() => clearFairParamDraft('slmMode')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="fair-slmMax" className="calibration-label flex justify-between text-xs mb-1">
                          <span className="text-slate-300">SLM · {'P95 (not a maximum)'}</span>
                          <span className="font-mono text-amber-400">
                            {formatCurrency(fairParams.slmMax, currency)}
                          </span>
                        </label>
                        <input
                          id="fair-slmMax"
                          type="number"
                          step="100000"
                          min="0"
                          value={Object.prototype.hasOwnProperty.call(fairParamDrafts, 'slmMax') ? fairParamDrafts.slmMax : fairParams.slmMax}
                          onChange={(e) => updateFairParam('slmMax', e.target.value)}
                          onBlur={() => clearFairParamDraft('slmMax')}
                          className="w-full bg-[#090D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <ResponsiveSlider id="fair-slefProb" label={t.inputTab.slefProbLabel} value={fairParams.slefProb} min={0} max={1} step={0.05} percent={true} onCommit={commitSlefProb} onDraft={setIsEditing} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 mb-1">
                      {t.inputTab.densityPreview}
                    </div>
                    <MiniDistributionCurve
                      minVal={fairParams.slmMin}
                      modeVal={fairParams.slmMode}
                      maxVal={fairParams.slmMax}
                      type="lognormal"
                      color="#F59E0B"
                    />
                  </div>
                </div>
              </div>

              {/* Open FAIR Structural Summary Footer Card */}
              <section aria-labelledby="fair-decomposition-title" className="fair-decomposition bg-[#0F1623] border border-slate-800 rounded">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#161F30] border border-slate-700 text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 id="fair-decomposition-title" className="text-sm font-semibold text-white">
                      {t.inputTab.fairTaxonomy}
                    </h2>
                    <div className="fair-formula font-mono text-slate-300">
                      {lang==='ru'?'Риск = LEF (Пуассон) × [ PLM (Beta-PERT) + SLEF (Бернулли) × SLM (логнормальное) ]':'Risk = LEF (Poisson) × [ PLM (Beta-PERT) + SLEF (Bernoulli) × SLM (Lognormal) ]'}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{lang === 'ru' ? 'Выше — структурная мнемоника. Годовой ущерб: L = Σᵢ₌₁ᴺ (Pᵢ + BᵢSᵢ); Λ ~ PERT, N | Λ ~ Poisson(Λ), Bᵢ ~ Bernoulli(p).' : 'Structural mnemonic above. Annual loss: L = Σᵢ₌₁ᴺ (Pᵢ + BᵢSᵢ); Λ ~ PERT, N | Λ ~ Poisson(Λ), Bᵢ ~ Bernoulli(p).'}</p>
                  </div>
                </div>

                <div className="fair-decomposition-body">
                <section aria-labelledby="thresholds-title" className="fair-thresholds">
                  <h3 id="thresholds-title" className="section-eyebrow">{lang === 'ru' ? 'Редактируемые пороги риска' : 'Editable risk thresholds'}</h3>
                  <div className="fair-field-grid">
                  <div className="fair-field">
                    <label htmlFor="risk-appetite" className="field-label">
                      {t.simTab.riskToleranceLabel}
                    </label>
                    <input
                      id="risk-appetite"
                      aria-describedby="risk-appetite-formatted"
                      type="number"
                      step="100000"
                      value={fairParams.riskAppetite}
                      onChange={(e) => updateFairParam('riskAppetite', e.target.value)}
                      className="w-full bg-[#090D16] border border-slate-700 rounded px-3 text-sm font-mono text-slate-100"
                    />
                    <p id="risk-appetite-formatted" className="field-hint">{formatCurrency(fairParams.riskAppetite, currency)}</p>
                  </div>
                  <div className="fair-field">
                    <label htmlFor="scenario-loss-threshold" className="field-label">
                      {t.simTab.secMaterialityLabel}
                    </label>
                    <input
                      id="scenario-loss-threshold"
                      aria-describedby="scenario-loss-formatted"
                      type="number"
                      min="0"
                      step="100000"
                      value={secMaterialityThreshold}
                      onChange={(e) => setSecMaterialityThreshold(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#090D16] border border-slate-700 rounded px-3 text-sm font-mono text-slate-100"
                    />
                    <p id="scenario-loss-formatted" className="field-hint">{formatCurrency(secMaterialityThreshold, currency)}</p>
                  </div>
                  </div>
                </section>
                <section aria-labelledby="calculated-title" className="fair-results">
                  <h3 id="calculated-title" className="section-eyebrow">{lang === 'ru' ? 'Расчётные показатели' : 'Calculated baseline metrics'}</h3>
                  <dl className="fair-field-grid">
                  <div className="fair-result">
                    <dt className="field-label">
                      {t.simTab.kpiAle}
                    </dt>
                    <dd className="fair-result-value text-sky-400">
                      {baselineResults ? formatCurrency(baselineResults.ale, currency) : '—'}
                    </dd>
                  </div>
                  <div className="fair-result">
                    <dt className="field-label">
                      {t.simTab.kpiVar95}
                    </dt>
                    <dd className="fair-result-value text-amber-400">
                      {baselineResults ? formatCurrency(baselineResults.var95, currency) : '—'}
                    </dd>
                  </div>
                  </dl>
                </section>
                </div>
              </section>
            </div>
          )}

          {/* ================================================================
              TAB 2: SIMULATION DASHBOARD (MONTE CARLO & PLOTLY-STYLE CHARTS)
             ================================================================ */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              {/* Top Action Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    {t.simTab.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    {t.simTab.subtitle}
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-blue-300">
                  {lang==='ru'?'NIST CSF 2.0: Управление · Выявление · Защита · Обнаружение · Реагирование · Восстановление':'NIST CSF 2.0: Govern · Identify · Protect · Detect · Respond · Recover'}
                </span>
                <span className="rounded border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-violet-300">
                  {lang==='ru'?'EU DORA: ст. 11–13 — реагирование и восстановление; ст. 24–27 — испытания устойчивости':'EU DORA: Arts. 11–13 response & recovery; resilience testing Arts. 24–27'}
                </span>
                {!isCustomDataModified && (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-amber-300">
                    Illustrative synthetic baseline scenario; not empirically calibrated data.
                  </span>
                )}
              </div>

              {/* 4 Primary KPI Telemetry Cards */}
              <div className="metric-grid metric-grid-five grid gap-5">
                <div data-search-target="ale" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t.simTab.kpiAle}</span>
                    <DollarSign className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-sky-400">
                    {formatCurrency(baselineResults.ale, currency)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>{t.simTab.kpiAleSub}</span>
                    <span className="font-mono text-slate-300">
                      N = {baselineResults.iterations.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div data-search-target="var95" className="bg-[#0F1623] border border-amber-500/40 rounded p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-amber-300">
                    <span className="font-medium">{t.simTab.kpiVar95}</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                    {formatCurrency(baselineResults.var95, currency)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>{t.simTab.kpiVar95Sub}</span>
                    <span className="font-mono text-amber-300">P95</span>
                  </div>
                </div>

                <div data-search-target="cvar99" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t.simTab.kpiCvar99}</span>
                    <Activity className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-red-400">
                    {formatCurrency(baselineResults.cvar99, currency)}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>{t.simTab.kpiCvar99Sub}</span>
                    <span className="font-mono text-red-300">ES 99%</span>
                  </div>
                </div>

                <div data-search-target="zeroLoss" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t.simTab.kpiZeroProb}</span>
                    <Percent className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                    {fraction(baselineResults.zeroLossProb,lang,1)}%
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>{t.simTab.kpiZeroProbSub}</span>
                    <span className="font-mono text-slate-300">Poisson(0)</span>
                  </div>
                </div>
                <div data-search-target="thresholdExceedance" className="bg-[#0F1623] border border-amber-500/40 rounded p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-amber-300">
                    <span>{lang==='ru'?'Вероятность превышения сценарного порога':'Scenario threshold exceedance (not legal materiality)'}</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                    {fraction(rosiMetrics.secMaterialityExceedProb,lang,2)}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    P(Loss &gt; {formatCurrency(secMaterialityThreshold, currency)})
                  </div>
                </div>
              </div>

              {/* Server-returned metrics */}
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {/* Chart 1: Loss Exceedance Curve (LEC) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h2 id="search-lec" className="text-sm font-semibold text-white">
                        {t.simTab.lecTitle}
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.simTab.lecSubtitle}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer select-none bg-[#161F30] px-2.5 py-1 rounded border border-slate-700">
                      <input
                        type="checkbox"
                        checked={logScaleLec}
                        onChange={(e) => setLogScaleLec(e.target.checked)}
                        className="accent-blue-500"
                      />
                      {t.simTab.logScaleToggle}
                    </label>
                  </div>

                  <LossExceedanceChart
                    baselineLec={baselineResults.lecPoints}
                    ale={baselineResults.ale}
                    var95={baselineResults.var95}
                    riskAppetite={fairParams.riskAppetite}
                    currency={currency}
                    logScale={logScaleLec}
                    lang={lang}
                  />
                  {logScaleLec && <p className="text-xs leading-relaxed text-slate-400">{lang === 'ru' ? 'Логарифмический вид начинается с 10,000: меньшие потери показаны на левой границе. Для их анализа используйте линейную шкалу.' : 'The logarithmic view starts at 10,000: smaller losses share its left edge. Use the linear scale to inspect them.'}</p>}

                </div>

                <div className="bg-[#0F1623] border border-slate-800 rounded p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 id="search-histogram" className="text-sm font-semibold text-white">{t.simTab.histTitle}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.simTab.histSubtitle}</p>
                  </div>
                  <HeavyTailHistogramChart
                    bins={baselineResults.histogramBins}
                    ale={baselineResults.ale}
                    var95={baselineResults.var95}
                    currency={currency}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Metrics returned by the API */}
              <div id="search-percentiles" className="bg-[#0F1623] border border-slate-800 rounded overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    {lang === 'ru' ? 'Метрики симуляции из API' : 'Simulation metrics from API'}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    N = {iterations.toLocaleString(localeFor(lang))} | Seed: {seed}
                  </span>
                </div>
                <p className="px-5 py-3 text-xs leading-relaxed text-slate-400">{lang === 'ru' ? 'Маргинальные квантили компонентов не складываются в квантиль совокупных потерь. Квантили описывают распределение модели, а не доверительный интервал оценки.' : 'Marginal component quantiles do not add to the total loss quantile. These are model loss quantiles, not confidence intervals for estimates.'}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="bg-[#161F30] text-slate-300 border-b border-slate-800">
                        <th className="py-2.5 px-4">{t.simTab.percentileCol}</th>
                        <th className="py-2.5 px-4">{t.simTab.exceedProbCol}</th>
                        <th className="py-2.5 px-4">{t.simTab.totalLossCol}</th>
                        <th className="py-2.5 px-4">{t.simTab.primaryCol}</th>
                        <th className="py-2.5 px-4">{t.simTab.secondaryCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {baselineResults.percentileTable.map((row) => {
                        const isVar95 = row.percentile === 95;
                        return (
                          <tr
                            key={row.percentile}
                            data-search-percentile={row.percentile}
                            className={
                              isVar95
                                ? 'bg-amber-500/10 text-amber-300 font-semibold'
                                : 'hover:bg-slate-800/40 text-slate-200'
                            }
                          >
                            <td className="py-2.5 px-4">P{row.percentile}{isVar95 && ' (VaR)'}</td>
                            <td className="py-2.5 px-4 text-slate-400">{row.exceedProb}%</td>
                            <td className="py-2.5 px-4">{formatCurrency(row.total, currency)}</td>
                            <td className="py-2.5 px-4 text-sky-400">{formatCurrency(row.primary, currency)}</td>
                            <td className="py-2.5 px-4 text-amber-400">{formatCurrency(row.secondary, currency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: NIST CONTROLS & ROSI OPTIMIZATION (WHAT-IF ANALYSIS)
             ================================================================ */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-slate-800 pb-4">
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  {t.controlsTab.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                  {t.controlsTab.subtitle}
                </p>
              </div>

              {/* 4 ROSI Financial Telemetry Cards */}
              <div className="metric-grid grid gap-5">
                <div data-search-target="controlSpend" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{t.controlsTab.annualSecSpend}</span>
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    {formatCurrency(totalControlCost, currency)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    {t.controlsTab.activeControlsCount}: {activeControlsList.length} / {controls.length}
                  </div>
                </div>

                <div data-search-target="preventedLoss" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{t.controlsTab.preventedLoss}</span>
                    <TrendingDown className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-sky-400">
                    {formatCurrency(rosiMetrics.preventedAle, currency)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    {formatCurrency(baselineResults.ale, currency, true)} →{' '}
                    <span className="text-emerald-400">
                      {formatCurrency(residualResults.ale, currency, true)}
                    </span>
                  </div>
                </div>

                <div data-search-target="netBenefit" className="bg-[#0F1623] border border-slate-800 rounded p-4 space-y-1">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{t.controlsTab.netBenefit}</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      rosiMetrics.netBenefit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(rosiMetrics.netBenefit, currency)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    &Delta;ALE &minus; Control Spend
                  </div>
                </div>

                <div data-search-target="rosi" className="bg-[#0F1623] border border-emerald-500/40 rounded p-4 space-y-1">
                  <div className="text-xs text-emerald-300 flex items-center justify-between font-medium">
                    <span>{t.controlsTab.rosiMetric}</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums ${
                      rosiMetrics.rosiPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {rosiMetrics.rosiPct >= 0 ? '+' : ''}
                    {fraction(rosiMetrics.rosiPct,lang,1)}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 pt-1">
                    {t.controlsTab.residualVar}:{' '}
                    <span className="text-emerald-400">
                      {formatCurrency(residualResults.var95, currency, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Split Layout: Left Interactive NIST Toggles, Right Baseline vs Residual LEC */}
              <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
                {/* NIST Controls List (7 cols) */}
                <div className="2xl:col-span-7 space-y-3">
                  {controls.map((ctrl) => (
                    <div
                      key={ctrl.id}
                      data-search-control={ctrl.id}
                      onClick={() => toggleControl(ctrl.id)}
                      className={`p-4 rounded border transition-all cursor-pointer ${
                        ctrl.enabled
                          ? 'bg-[#131D31] border-blue-500/50 shadow-sm'
                          : 'bg-[#0F1623] border-slate-800 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                              {ctrl.code}
                            </span>
                            <span className="text-xs font-mono text-amber-400">
                              {t.controlsTab.costLabel}: {formatCurrency(ctrl.annualCost, currency)}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-white">
                            {ctrl.name[lang]}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {ctrl.desc[lang]}
                          </p>
                        </div>

                        {/* Strict B2B Toggle Switch */}
                        <button
                          type="button"
                          aria-label={`${ctrl.name[lang]}: ${lang === 'ru' ? 'включить / выключить' : 'enable / disable'}`}
                          aria-pressed={ctrl.enabled}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
                            ctrl.enabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              ctrl.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Impact Vector Pills */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400">{t.controlsTab.lefReduction}: </span>
                          <span className="text-emerald-400 font-semibold">
                            -{Math.round(ctrl.lefReduction * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">{t.controlsTab.plmReduction}: </span>
                          <span className="text-sky-400 font-semibold">
                            -{Math.round(ctrl.plmReduction * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">{t.controlsTab.slmReduction}: </span>
                          <span className="text-amber-400 font-semibold">
                            -{Math.round(ctrl.slmReduction * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: Baseline vs Residual LEC Chart & Delta Summary (5 cols) */}
                <div className="2xl:col-span-5 bg-[#0F1623] border border-slate-800 rounded p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="border-b border-slate-800 pb-3">
                      <h2 id="search-comparison" className="text-sm font-semibold text-white">
                        {t.controlsTab.comparisonChartTitle}
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.controlsTab.comparisonChartSub}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                        {t.controlsTab.baselineLabel}
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                        {t.controlsTab.residualLabel}
                      </span>
                    </div>

                    <LossExceedanceChart
                      baselineLec={baselineResults.lecPoints}
                      residualLec={residualResults.lecPoints}
                      ale={residualResults.ale}
                      var95={residualResults.var95}
                      riskAppetite={fairParams.riskAppetite}
                      currency={currency}
                      logScale={false}
                      lang={lang}
                    />
                  </div>

                  {/* Baseline vs Residual Comparison Table */}
                  <div className="border-t border-slate-800 pt-3 overflow-x-auto">
                    <table className="w-full text-xs font-mono tabular-nums">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-left">
                          <th className="pb-2">{lang==='ru'?'Показатель':'Metric'}</th>
                          <th className="pb-2">{t.controlsTab.baselineLabel}</th>
                          <th className="pb-2 text-emerald-400">{t.controlsTab.residualLabel}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        <tr>
                          <td className="py-2 text-slate-300">{lang==='ru'?'Ожидаемые годовые потери (ALE)':'Expected Loss (ALE)'}</td>
                          <td className="py-2">{formatCurrency(baselineResults.ale, currency)}</td>
                          <td className="py-2 text-emerald-400 font-semibold">
                            {formatCurrency(residualResults.ale, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-300">{lang==='ru'?'Кибер-VaR (95%)':'Cyber VaR (95%)'}</td>
                          <td className="py-2">{formatCurrency(baselineResults.var95, currency)}</td>
                          <td className="py-2 text-emerald-400 font-semibold">
                            {formatCurrency(residualResults.var95, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-300">{lang==='ru'?'Ожидаемый ущерб в хвосте (99%)':'Tail CVaR (99%)'}</td>
                          <td className="py-2">{formatCurrency(baselineResults.cvar99, currency)}</td>
                          <td className="py-2 text-emerald-400 font-semibold">
                            {formatCurrency(residualResults.cvar99, currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: EXECUTIVE REPORT (2-PAGE BOARD MEMORANDUM & PDF EXPORT)
             ================================================================ */}
          {activeTab === 'export' && resultsReady && (
            <div className="space-y-6 print:space-y-0">
              {/* Action Bar (Hidden when printing) */}
              <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
                <div>
                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    {t.exportTab.title}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    {t.exportTab.subtitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    data-search-target="report-json"
                    onClick={handleDownloadAuditJson}
                    disabled={!resultsReady || isComputing}
                    className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#161F30] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t.exportTab.exportJsonBtn}
                  </button>
                  <label className="text-xs text-slate-300" htmlFor="report-paper">{lang==='ru'?'Формат бумаги':'Paper size'}
                    <select id="report-paper" value={paperFormat} onChange={e=>setPaperFormat(e.target.value)} className="block mt-1 bg-[#161F30] border border-slate-600 rounded px-3 py-2"><option value="A4">A4</option><option value="Letter">US Letter</option></select>
                  </label>
                  <button
                    onClick={() => window.print()}
                    disabled={!resultsReady || isComputing}
                    className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {t.exportTab.printPdfBtn}
                  </button>
                </div>
              </div>

              {/* 2-PAGE EXECUTIVE REPORT CONTAINER */}
              <ExecutiveReport lang={lang} paper={paperFormat} run={simulationResult} asset={t.assets[selectedAsset]} threat={t.threats[selectedThreat]} controls={controls} riskAppetite={fairParams.riskAppetite} Chart={LossExceedanceChart}/>

            </div>
          )}

          {/* ================================================================
              TAB 5: SYSTEM ARCHITECTURE, DESIGN SYSTEM & PYTHON/DOCKER CODE
             ================================================================ */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h1 className="text-lg font-semibold text-white tracking-tight">
                  {t.archTab.title}
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-4xl">
                  {t.archTab.subtitle}
                </p>
              </div>

              {/* Sub-Navigation Pills for Code Artifacts */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'structure', label: t.archTab.sections.structure, icon: FolderTree },
                  { id: 'tailwind', label: t.archTab.sections.tailwind, icon: Sliders },
                  { id: 'pythonEngine', label: t.archTab.sections.pythonEngine, icon: Cpu },
                  { id: 'fastapi', label: t.archTab.sections.fastapi, icon: Server },
                  { id: 'docker', label: t.archTab.sections.docker, icon: Box }
                ].map((sec) => {
                  const Icon = sec.icon;
                  const active = archSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setArchSection(sec.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono transition-colors ${
                        active
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-[#0F1623] text-slate-300 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {sec.label}
                    </button>
                  );
                })}
              </div>

              {/* Code Viewer Card */}
              <div data-search-target="architecture-viewer" className="bg-[#0F1623] border border-slate-800 rounded overflow-hidden">
                <div className="px-5 py-3 bg-[#161F30] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span>{t.archTab.sections[archSection]}</span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopyCode(archSection, PRODUCTION_ARTIFACTS[archSection])
                    }
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#090D16] hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors"
                  >
                    {copiedKey === archSection ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">{t.archTab.copiedBtn}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.archTab.copyBtn}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-[#090D16]">
                  <code>{PRODUCTION_ARTIFACTS[archSection]}</code>
                </pre>
              </div>
            </div>
          )}
          </>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
