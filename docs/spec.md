# Техническая спецификация HireSeeker Assist

**Версия:** 1.0.4  
**Платформа:** Google Chrome / Chromium (Manifest V3)  
**Технологический стек:** TypeScript 5.x, React 19.x, Zustand 5.x, Vite 6.x, Vitest  

---

## 1. Общие сведения и назначение системы

**HireSeeker Assist** — расширение браузера (Manifest V3), реализующее сквозную интеграцию с агрегатором вакансий `hireseeker.ru`. Расширение обеспечивает прозрачную синхронизацию с официальным REST API сервиса, локальное хранение и полнотекстовую фильтрацию вакансий в оперативной памяти, а также семантический скоринг и фильтрацию вакансий по критериям пользователя через потоковые LLM-вызовы (Streaming Function Calling).

---

## 2. Архитектура и компоненты системы

Система состоит из трёх основных изолированных уровней исполнения, взаимодействующих через асинхронные каналы передачи сообщений (Chrome Runtime RPC):

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                           Chrome Browser                                           │
│                                                                                                    │
│  ┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────┐  │
│  │       Side Panel (React 19 + Zustand)        │        │             Target Tab               │  │
│  │                                              │        │          (hireseeker.ru)             │  │
│  │  - SearchTab: полнотекстовый фильтр и список │        │                                      │  │
│  │  - AiFilterTab: скоринг, пресеты, результаты │        │  - Page Storage Sync:                │  │
│  │  - LogTab: журнал событий реального времени  │        │    чтение hs_v2_last_search_body     │  │
│  │  - SettingsTab: комбобокс моделей, ключи     │        │  - In-Page AI Badges:                │  │
│  │  - Header: статус активности вкладки         │        │    наложение плашек на карточки      │  │
│  └──────────────────────┬───────────────────────┘        └──────────────────▲───────────────────┘  │
│                         │ RPC (chrome.runtime.Port / onMessage)             │ chrome.tabs          │
│                         ▼                                                   │ sendMessage          │
│  ┌──────────────────────────────────────────────────────────────────────────┴────────────────────┐  │
│  │                               MV3 Service Worker (background.ts)                              │  │
│  │                                                                                               │  │
│  │  ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │        Coordinator        │  │       State Manager       │  │       Tabs Tracker        │  │  │
│  │  │ - Фоновая выгрузка /page  │  │ - Вакансии (Map)          │  │ - Авто-открытие вкладки   │  │  │
│  │  │ - Пул LLM-воркеров        │  │ - Токен сессии поиска     │  │ - Фокусировка вкладки     │  │  │
│  │  │ - Потоковый сборщик       │  │ - Кэш параметров фильтра  │  │ - Отслеживание URL        │  │  │
│  │  └─────────────┬─────────────┘  └───────────────────────────┘  └───────────────────────────┘  │  │
│  │                │                                                                              │  │
│  │  ┌─────────────┴───────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                              Core Engine (src/core/)                                    │  │  │
│  │  │  ├── API Client & Universal Catalog (api.ts)                                            │  │  │
│  │  │  ├── Streaming Function Calling Engine (llm.ts & ai-filter.ts)                          │  │  │
│  │  │  ├── Local Tokenizing Search & Layout Converter (search.ts & text.ts)                   │  │  │
│  │  │  └── Prompts & Function Calling Schema (ai-prompts.ts)                                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┬────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                                  ▼
                                       ┌─────────────────────┐
                                       │   LLM API Server    │
                                       │  (OpenCode / OpenAI │
                                       │   OpenRouter / etc) │
                                       └─────────────────────┘
```

---

## 3. Сквозная интеграция с API `hireseeker.ru`

### 3.1. Уровни синхронизации данных:
1. **Background API Client (`executeSearch` & `fetchAllPagesForSearch`):**
   - Напрямую взаимодействует с REST API `hireseeker.ru` (`POST /api/v1/search` и `GET /api/v1/search/{token}/page`).
   - Формирует тело поискового запроса на основе URL активной вкладки и сохранённых параметров страницы.
   - Выгружает полный пул вакансий в фоновом режиме по кнопке обновления.
2. **Page Storage Synchronizer:**
   - Считывает `localStorage['hs_v2_last_search_body']` и `localStorage['hs_last_selection']`.
   - Синхронизирует текущую выборку пользователя без вмешательства во внутренний JS-контекст сайта.
3. **Universal Catalog Resolver (`resolveProfessionCodes`):**
   - Содержит эталонную карту всех 16 групп специальностей `hireseeker.ru`:
     - `backend`: `python_backend`, `jvm_backend`, `go_backend`, `nodejs_backend`, `dotnet_backend`, `php_backend`, `cpp_backend`, `other_backend`
     - `frontend`: `react_frontend`, `vue_frontend`, `angular_frontend`, `other_frontend`
     - `mobile_development`: `ios_mobile`, `android_mobile`, `flutter_mobile`, `react_native_mobile`, `kmp_mobile`
     - `qa_testing` / `qa`: `qa_manual`, `qa_automation`
     - `system_engineering` / `devops`: `embedded_iot`, `cybersecurity`, `devops`, `architecture`, `sysadmin`, `network_engineer`, `dba`
     - `analytics`: `business_analytics`, `system_analytics`, `data_analytics`, `bi_developer`, `analyst_1c`, `analyst_sap`
     - `ml_ai`: `data_science_ml`, `data_engineer`, `ai_engineer`, `mlops_engineer`, `ai_workflow_specialist`
     - `design`: `product_design`, `graphic_design`, `motion_design`, `3d_designer`, `ui_ux_designer`, `design_lead`
     - `engineering_management`: `tech_lead`, `cto`, `chief_data_officer`
     - `web_development`: `wordpress_developer`, `landing_developer`
     - `erp_development`: `lowcode_developer`, `developer_1c`, `sap_developer`
     - `game_development`: `game_producer`, `game_design`, `level_design`, `game_graphics`, `unity_developer`, `unreal_developer`, `game_server_developer`
     - `product_project`: `chief_product_officer`, `product_management`, `technical_product_management`, `project_management`, `scrum_master`
     - `marketing_creative`: `pr_communications`, `product_marketing`, `smm`, `digital_marketing`, `content_marketing`, `performance_marketing`, `community_manager`, `brand_manager`, `creative_director`, `event_manager`, `chief_marketing_officer`
     - `hr`: `recruiting`, `hrbp_hrd_pp`, `hr_generalist`, `compensation_benefits`
     - `vibe_coding`: `vibe_coding`
4. **Параметры пагинации и фильтрации:**
   - Поддерживает маппинг параметров URL:
     - `sched` / `schedule_filter`
     - `sb` / `salary_buckets`
     - `nosal` / `include_without_salary`
     - `cty` / `country_filter`
     - `sources` / `source_filter`
     - `cities` / `city_ids`
     - `pd` / `period_days`
     - `en` / `include_english`
     - `bumped` / `hide_auto_bumped`

---

## 4. Спецификация Streaming LLM Function Calling

### 4.1. Схема вызова функции (`AI_FILTER_TOOL_DEF`):
```json
{
  "type": "function",
  "function": {
    "name": "submit_vacancy_evaluations",
    "description": "Отправляет структурированный результат оценки и фильтрации списка вакансий по критериям пользователя.",
    "parameters": {
      "type": "object",
      "properties": {
        "results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "description": "ID вакансии" },
              "match": { "type": "boolean", "description": "Соблюдены ли ВСЕ обязательные условия" },
              "score": { "type": "integer", "minimum": 0, "maximum": 100, "description": "Балл релевантности" },
              "reason": { "type": "string", "description": "Краткая емкая выжимка (10-18 слов)" }
            },
            "required": ["id", "match", "score", "reason"]
          }
        }
      },
      "required": ["results"]
    }
  }
}
```

### 4.2. Потоковый конвейер (`sendAiStreamingToolCall`):
- Запрос отправляется с заголовками `Accept: text/event-stream, application/json` и телом `stream: true`.
- Чтение осуществляется через интерфейс `ReadableStreamDefaultReader` с декодированием в `TextDecoder('utf-8')`.
- Фрагменты `delta.tool_calls[0].function.arguments` конкатенируются по мере прихода SSE-событий `data: {...}`.
- По завершении стрима (`[DONE]`) аргументы десериализуются из JSON и валидируются функцией `validateBatchResults`.

---

## 5. Модули Side Panel и пользовательский интерфейс

### 5.1. Header:
- Лаконичный индикатор состояния: `• Сайт активен` (зеленый) / `Ожидание вкладки` (серый).
- Автоматическая фокусировка или создание вкладки `hireseeker.ru` при открытии панели.

### 5.2. SearchTab:
- Однострочная компактная строка действий с полнотекстовым поиском и кнопкой мгновенного обновления (`🔄`).
- Панель потока статистики: `Найдено 195 → Отфильтровано 81 → Показано 114`.
- Мгновенный рендеринг всех вакансий без смещающихся баннеров и скрытых панелей.
- Чёткие скроллбары толщиной 7px с высоким контрастом при наведении.

### 5.3. AiFilterTab:
- Текстовое поле критериев / резюме с поддержкой сохранения и выбора шаблонов (пресетов).
- Кнопка запуска / остановки анализа со встроенным счётчиком обработанных пачек.
- Отображение отсортированных по релевантности карточек с AI-оценкой (`AI: 95%`) и текстовым обоснованием.

### 5.4. SettingsTab:
- Выбор провайдера из предустановленных пресетов (OpenCode Zen, OpenAI, OpenRouter, DeepSeek, Groq, Mistral, Ollama, vLLM, Custom).
- Поле API-ключа с иконкой-глазиком (`👁️` / `👁️‍🗨️`).
- Единый комбобокс для модели с выпадающим списком по нажатию на стрелку (`▼`) и авто-загрузкой с эндпоинта `/models`.
- Компактная проверка связи со статусом в одну строку рядом с кнопкой.
- Настройки параллелизма (1–5 потоков) и размера пачки (5–50 шт.).

---

## 6. Тестирование и гарантии качества

Набор автоматических тестов (Vitest) покрывает 100% критических путей выполнения:

| Тестовый модуль | Количество тестов | Проверяемая функциональность |
|---|---|---|
| `tests/core/api.test.ts` | 13 | Каталог 16 категорий, парсер параметров URL, `executeSearch`, `fetchSearchPage` |
| `tests/core/ai-filter.test.ts` | 9 | Пакетный скоринг, потоковый вызов функций, reasoning fallback, валидация баллов |
| `tests/core/llm.test.ts` | 8 | SSE-стриминг чанков tool_calls, ReadableStream отмена, тест соединения, получение моделей |
| `tests/core/models.test.ts` | 7 | Пресеты провайдеров, валидация DTO, кэширование моделей |
| `tests/core/search.test.ts` | 5 | Полнотекстовый поиск, опечатки раскладки, парсер зарплат (k/M/руб), скоринг |
| `tests/core/vacancy.test.ts` | 6 | Нормализация DTO вакансий, слияние сущностей, форматирование зарплат |
| `tests/core/text.test.ts` | 6 | Очистка HTML, безопасный highlight без порчи сущностей, извлечение JSON |
| `tests/core/settings.test.ts` | 5 | Загрузка и сохранение настроек, ограничение числовых параметров |
| `tests/core/version.test.ts` | 2 | Версионирование расширения |
| `tests/background/state.test.ts` | 1 | Инициализация и сброс состояния воркера |
| `tests/background/log.test.ts` | 4 | Буфер логов, ротация, отправка в порт боковой панели |
| `tests/background/tabs.test.ts` | 4 | Отслеживание вкладки hireseeker.ru, авто-фокус и создание |
| `tests/panel/useVacanciesStore.test.ts` | 3 | Реактивный стейт вакансий, пословная фильтрация |
| `tests/panel/useAiFilterStore.test.ts` | 3 | Реактивный стейт ИИ-фильтрации, CRUD шаблонов |
| `tests/panel/extension.test.ts` | 3 | RPC-клиент между Side Panel и Service Worker |
| **ИТОГО** | **79 тестов** | **Все тесты пройдены успешно** |

---

## 7. Безопасность и разрешения (Manifest V3)

- `host_permissions: ["<all_urls>"]` — обеспечивает возможность подключения к любым настроенным пользователем LLM-эндпоинтам без блокировки политикой CORS.
- `permissions: ["storage", "sidePanel", "tabs", "scripting", "alarms", "clipboardWrite"]` — минимально необходимый набор системных разрешений Chrome API.
- Локальная обработка: ключи API и история скоринга не покидают браузер пользователя и не передаются на сторонние промежуточные серверы.
