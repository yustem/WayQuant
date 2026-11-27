// Illustrative CSF 2.0 category associations, not normative subcategory mappings.
// Reference: https://doi.org/10.6028/NIST.CSWP.29
export interface ThreatControl {
  id: string;
  nist: string;
  name: { en: string; ru: string };
  desc: { en: string; ru: string };
  cost: number;
  lef: number;
  plm: number;
  slm: number;
}

export const THREAT_CONTROLS_MAP: Record<string, ThreatControl[]> = {
  ransomware: [
    { id: 'edr', nist: 'NIST DE.CM', name: { en: 'EDR/XDR Telemetry & Behavioral Host Isolation', ru: 'Телеметрия EDR/XDR и поведенческая изоляция хостов' }, desc: { en: 'Automated lateral movement and encryption kill-chain disruption.', ru: 'Автоматическое блокирование латерального перемещения и шифрования.' }, cost: 145000, lef: -38, plm: -25, slm: -15 },
    { id: 'worm', nist: 'NIST PR.DS / RC.RP', name: { en: 'Immutable Air-Gapped WORM Backups', ru: 'Неизменяемые изолированные резервные копии (Air-Gapped WORM)' }, desc: { en: 'Guaranteed critical DB recovery without ransom payment; RTO < 6 hrs.', ru: 'Восстановление критических БД без уплаты выкупа; сокращение RTO.' }, cost: 110000, lef: -5, plm: -52, slm: -30 },
    { id: 'mfa', nist: 'NIST PR.AA / PR.IR', name: { en: 'Zero-Trust Microsegmentation & Hardware FIDO2 MFA', ru: 'Микросегментация Zero-Trust и аппаратный MFA (FIDO2)' }, desc: { en: 'Blast radius containment across segmented network enclaves.', ru: 'Локализация радиуса поражения (Blast Radius) внутри сетевых анклавов.' }, cost: 185000, lef: -42, plm: -20, slm: -20 },
    { id: 'dlp', nist: 'NIST PR.DS', name: { en: 'Database Field Tokenization & Egress DLP', ru: 'Криптографическая защита полей БД (Tokenization) и Egress DLP' }, desc: { en: 'Mitigates secondary breach penalties (GDPR/PCI) via zero data readability.', ru: 'Снижает штрафы (GDPR/PCI-DSS) и вторичный ущерб при утечке.' }, cost: 130000, lef: -12, plm: -10, slm: -48 }
  ],
  apt: [
    { id: 'apt_dlp', nist: 'NIST PR.DS', name: { en: 'Network Traffic DLP & Strict Egress Filtering', ru: 'DLP-система сетевого анализа и жесткая фильтрация Egress' }, desc: { en: 'Blocks exfiltration channels, C2 beacons, and covert tunnels.', ru: 'Блокировка передачи скрытых дампов и туннелирования вовне.' }, cost: 140000, lef: -25, plm: -15, slm: -50 },
    { id: 'apt_ueba', nist: 'NIST DE.AE', name: { en: 'User & Entity Behavior Analytics (UEBA / NDR)', ru: 'Поведенческий анализ пользователей и сущностей (UEBA/NDR)' }, desc: { en: 'Machine-learning anomaly detection for lateral movement and credential abuse.', ru: 'Выявление аномальной сетевой активности и скрытых каналов C2.' }, cost: 160000, lef: -35, plm: -20, slm: -25 },
    { id: 'apt_pam', nist: 'NIST PR.AA', name: { en: 'Privileged Access Management (Ephemeral JIT Access)', ru: 'Контроль привилегированного доступа (PAM с JIT-правами)' }, desc: { en: 'Eliminates standing privileges and isolates administrative jump-boxes.', ru: 'Изоляция админских сессий и запрет постоянных прав суперпользователя.' }, cost: 175000, lef: -40, plm: -30, slm: -20 },
    { id: 'apt_crypto', nist: 'NIST PR.DS', name: { en: 'End-to-End Cryptography (mTLS & Cloud KMS)', ru: 'Сквозное шифрование данных в покое и транзите (mTLS + KMS)' }, desc: { en: 'Guarantees wire-level confidentiality across microservices.', ru: 'Защита от перехвата данных на внутренних шинах сообщений.' }, cost: 120000, lef: -10, plm: -15, slm: -45 }
  ],
  ddos: [
    { id: 'ddos_cloud', nist: 'NIST PR.IR', name: { en: 'Cloud-Based Anycast Scrubbing Network (Cloudflare/AWS Shield)', ru: 'Облачная эшелонированная очистка трафика (BGP Anycast / Cloudflare)' }, desc: { en: 'Absorbs multi-terabit volumetric L3/L4 DDoS floods at the edge.', ru: 'Подавление объемных атак L3/L4 емкостью свыше 2 Тбит/с.' }, cost: 180000, lef: -60, plm: -45, slm: -20 },
    { id: 'ddos_waf', nist: 'NIST DE.CM', name: { en: 'L7 API Gateway WAF & Behavioral Rate Limiting', ru: 'L7 WAF с машинным обучением и поведенческим Rate Limiting' }, desc: { en: 'Throttles HTTP-flood attacks and mitigates malicious bot traffic.', ru: 'Защита API-эндпоинтов и шлюзов от HTTP-flood и ботнетов.' }, cost: 115000, lef: -45, plm: -30, slm: -15 },
    { id: 'ddos_dns', nist: 'NIST PR.IR', name: { en: 'Geo-Redundant Anycast DNS Architecture', ru: 'Географическое резервирование и Anycast DNS' }, desc: { en: 'Resilient name resolution mitigating authoritative DNS outage risks.', ru: 'Отказоустойчивость разрешения имен при атаках на DNS.' }, cost: 95000, lef: -20, plm: -40, slm: -25 },
    { id: 'ddos_cdn', nist: 'NIST PR.IR', name: { en: 'Elastic Auto-Scaling Infrastructure & Edge Caching', ru: 'Автоматическое масштабирование и распределение нагрузки (CDN/LB)' }, desc: { en: 'Dynamic compute elasticity to absorb sudden traffic spikes.', ru: 'Эластичное перераспределение нагрузки при всплесках трафика.' }, cost: 130000, lef: -25, plm: -35, slm: -10 }
  ],
  supply_chain: [
    { id: 'sc_sig', nist: 'NIST PR.PS', name: { en: 'Artifact Cryptographic Signing (Cosign / Sigstore)', ru: 'Криптографическая подпись артефактов и релизов (Cosign/Sigstore)' }, desc: { en: 'Prevents deployment of unverified container images into production.', ru: 'Запрет деплоя неподписанных образов контейнеров в прод.' }, cost: 95000, lef: -45, plm: -25, slm: -20 },
    { id: 'sc_sast', nist: 'NIST PR.PS', name: { en: 'Automated SAST/DAST & IaC Security Validation', ru: 'Статический анализ SAST/DAST и валидация IaC-манифестов' }, desc: { en: 'Blocks vulnerable pipeline definitions and hardcoded secrets on commit.', ru: 'Автоматический аудит кода пайплайна на этапе Pull Request.' }, cost: 135000, lef: -35, plm: -15, slm: -15 },
    { id: 'sc_tprm', nist: 'NIST GV.SC', name: { en: 'Third-Party Risk Management (TPRM / Vendor Audit)', ru: 'Управление рисками сторонних поставщиков (TPRM-аудит)' }, desc: { en: 'Enforces continuous security posture verification for external vendors.', ru: 'Контроль соответствия требованиям безопасности подрядчиков и SaaS.' }, cost: 85000, lef: -30, plm: -20, slm: -30 },
    { id: 'sc_runners', nist: 'NIST PR.IR', name: { en: 'Ephemeral Isolated CI/CD Build Runners', ru: 'Изолированные эфемерные сборочные раннеры (Isolated Runners)' }, desc: { en: 'Restricts build environments to prevent host sandbox breakout.', ru: 'Защита базового хоста сборки от компрометации сборочным скриптом.' }, cost: 110000, lef: -40, plm: -30, slm: -10 }
  ],
  phishing_bec: [
    { id: 'bec_fido', nist: 'NIST PR.AA', name: { en: 'Hardware FIDO2 / WebAuthn Security Keys', ru: 'Аппаратные FIDO2/WebAuthn-ключи аутентификации' }, desc: { en: 'Full cryptographic defense against Adversary-in-the-Middle (AiTM) phishing.', ru: 'Полная защита от перехвата сессий (Anti-AiTM-фишинг).' }, cost: 80000, lef: -55, plm: -20, slm: -15 },
    { id: 'bec_email', nist: 'NIST DE.CM', name: { en: 'AI Email Ingestion Filter & Strict DMARC Enforcement', ru: 'ИИ-анализ почтовых заголовков и DMARC/DKIM Enforcement' }, desc: { en: 'NLP anomaly detection for BEC wire-fraud attempts and domain spoofing.', ru: 'Детекция подмены доменов и NLP-анализ манипуляций в письмах.' }, cost: 105000, lef: -50, plm: -15, slm: -10 },
    { id: 'bec_policy', nist: 'NIST PR.AA', name: { en: 'Dual-Control Wire Transfer Verification (Four-Eyes)', ru: 'Регламент верификации платежей («Правило четырех глаз»)' }, desc: { en: 'Mandatory out-of-band verification for capital transfers above threshold.', ru: 'Обязательное вторичное подтверждение транзакций вне основного канала.' }, cost: 45000, lef: -15, plm: -60, slm: -35 },
    { id: 'bec_train', nist: 'NIST PR.AT', name: { en: 'Targeted Executive Phishing & Deepfake Simulations', ru: 'Симуляции целевых Deepfake/AI-атак для руководства' }, desc: { en: 'Specialized training for C-suite to counter advanced social engineering.', ru: 'Практические учения C-Level по выявлению социальной инженерии.' }, cost: 60000, lef: -30, plm: -10, slm: -10 }
  ],
  zero_day: [
    { id: 'zd_waf', nist: 'NIST PR.IR', name: { en: 'Edge Virtual Patching & Deep SSL Inspection', ru: 'Виртуальный патчинг и глубокая инспекция SSL на граничном WAF' }, desc: { en: 'Heuristic and signature filtering of 0-day exploits prior to vendor patches.', ru: 'Сигнатурный и эвристический перехват эксплойтов до выхода патча вендора.' }, cost: 160000, lef: -40, plm: -25, slm: -15 },
    { id: 'zd_ztna', nist: 'NIST PR.IR', name: { en: 'Zero Trust Network Access (ZTNA / Dark Perimeter)', ru: 'Замена VPN на ZTNA с сокрытием периметра (Dark Cloud)' }, desc: { en: 'Cloaks services from public port scans; enforces continuous device attestation.', ru: 'Сервисы недоступны для внешнего сканирования портов.' }, cost: 190000, lef: -50, plm: -30, slm: -20 },
    { id: 'zd_dmz', nist: 'NIST PR.IR', name: { en: 'Edge DMZ Isolation & Egress Kill-Switch', ru: 'Изоляция граничного сегмента (DMZ Microsegmentation)' }, desc: { en: 'Prevents pivot into internal core networks upon gateway compromise.', ru: 'Предотвращение выхода во внутреннюю сеть при пробитии шлюза.' }, cost: 125000, lef: -15, plm: -45, slm: -30 },
    { id: 'zd_boot', nist: 'NIST PR.PS', name: { en: 'Firmware Integrity Monitoring & TPM Remote Attestation', ru: 'Контроль целостности прошивок (Secure Boot / TPM)' }, desc: { en: 'Hardware validation preventing persistent firmware rootkits and implants.', ru: 'Аппаратная защита от закрепления имплантов в энергонезависимой памяти.' }, cost: 90000, lef: -35, plm: -20, slm: -10 }
  ],
  insider: [
    { id: 'ins_jit', nist: 'NIST PR.AA', name: { en: 'Just-In-Time (JIT) Ephemeral Access & Least Privilege', ru: 'Принцип наименьших привилегий и система JIT (Just-In-Time Access)' }, desc: { en: 'Time-bound elevation of administrative privileges with automatic revocation.', ru: 'Выдача прав строго под задачу на ограниченное время с автоотзывом.' }, cost: 140000, lef: -45, plm: -35, slm: -25 },
    { id: 'ins_audit', nist: 'NIST PR.PS', name: { en: 'Immutable SIEM Audit Logging (Air-Gapped WORM)', ru: 'Неизменяемый внешний аудит действий (WORM SIEM Logs)' }, desc: { en: 'Tamper-proof administrative logs preventing evidence destruction.', ru: 'Администратор не может удалить следы своих действий из логов.' }, cost: 115000, lef: -20, plm: -30, slm: -40 },
    { id: 'ins_rec', nist: 'NIST DE.CM', name: { en: 'PAM Session Recording & Destructive Command Interceptor', ru: 'Запись терминальных сессий с анализом опасных команд' }, desc: { en: 'Real-time session termination upon unauthorized privilege escalation attempt.', ru: 'Мгновенный разрыв сессии при попытке деструктивных действий.' }, cost: 130000, lef: -35, plm: -40, slm: -20 },
    { id: 'ins_fim', nist: 'NIST DE.CM', name: { en: 'File Integrity Monitoring (FIM) & DB Activity Auditing', ru: 'Контроль целостности системных файлов и БД (FIM/DAM)' }, desc: { en: 'Alerts on unauthorized modification of production binaries and tables.', ru: 'Оповещение об изменении конфигурационных файлов ядра системы.' }, cost: 95000, lef: -25, plm: -35, slm: -15 }
  ],
  cicd_poisoning: [
    { id: 'cicd_sbom', nist: 'NIST ID.RA', name: { en: 'Dynamic SBOM Generation & Software Composition Analysis', ru: 'Анализ зависимостей (SCA) и генерация динамического SBOM' }, desc: { en: 'Blocks open-source dependencies with known CVEs and malicious signatures.', ru: 'Блокировка библиотек с известными уязвимостями и подозрительным кодом.' }, cost: 120000, lef: -45, plm: -20, slm: -20 },
    { id: 'cicd_proxy', nist: 'NIST PR.PS', name: { en: 'Internal Artifact Proxy with Quarantine Gate (Artifactory)', ru: 'Приватный кэширующий репозиторий пакетов (Artifactory/Nexus)' }, desc: { en: 'Prevents direct public registry downloads; isolates untrusted packages.', ru: 'Запрет прямой загрузки пакетов из интернета в процесс сборки.' }, cost: 95000, lef: -50, plm: -15, slm: -10 },
    { id: 'cicd_sand', nist: 'NIST ID.RA', name: { en: 'Pre-Release Dynamic Package Sandboxing', ru: 'Песочница предрелизного тестирования сторонних пакетов' }, desc: { en: 'Executes third-party dependencies in isolated test environments.', ru: 'Динамический запуск внешних модулей в изолированной среде.' }, cost: 110000, lef: -40, plm: -25, slm: -15 },
    { id: 'cicd_opa', nist: 'NIST GV.PO', name: { en: 'Policy-as-Code Enforcement (Open Policy Agent / OPA)', ru: 'Политики безопасности как код (Open Policy Agent / OPA)' }, desc: { en: 'Blocks deployment of misconfigured containers and excessive capabilities.', ru: 'Автоматический запрет опасных параметров сборки и прав доступа.' }, cost: 85000, lef: -30, plm: -20, slm: -10 }
  ]
};
