// ==UserScript==
// @name         Google Search Customizer
// @namespace    Google Search
// @version      1.3.1
// @description  Use US Google Search by default, Korean finance results, disable AI Mode, and hide the browser-managed SafeSearch notice safely
// @author       DumbGPT
// @match        https://*.google.com/*
// @match        https://*.google.co.kr/*
// @match        https://*.google.co.jp/*
// @match        https://*.google.co.uk/*
// @include      /^https?:\/\/(?:www\.)?google\.(?:[a-z]{2,3}|(?:com|co)\.[a-z]{2})(?::\d+)?(?:\/|$)/
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(() => {
    'use strict';

    const CONFIG = Object.freeze({
        defaultRegion: 'US',
        financeRegion: 'KR',
        uiLanguage: 'ko',
        aiModeUdm: '50',
        webUdm: '14' // AI 모드 우회 시 웹 전용(Web) 탭으로 이동할지 여부 ('14': 텍스트 웹 탭, '': 일반 통합 검색)
    });

    const GOOGLE_HOST_RE =
        /^(?:www\.)?google\.(?:[a-z]{2,3}|(?:com|co)\.[a-z]{2})$/i;

    const SEARCH_PATH = '/search';
    const PREFERENCES_PATHS = new Set(['/preferences', '/setprefs']);

    const CRYPTO_KEYWORDS_EN = [
        'bitcoin',
        'btc',
        'ethereum',
        'eth',
        'crypto',
        'cryptocurrency',
        'solana',
        'ripple',
        'xrp',
        'dogecoin',
        'tether',
        'usdt',
        'coinmarketcap'
    ];

    const CRYPTO_KEYWORDS_KO = [
        '비트코인',
        '이더리움',
        '가상화폐',
        '암호화폐',
        '코인시세',
        '코인가격',
        '알트코인',
        '업비트',
        '빗썸',
        '김프',
        '김치프리미엄',
        '코인마켓캡'
    ];

    const CURRENCY_CODES = new Set([
        'KRW', 'USD', 'JPY', 'EUR', 'GBP', 'CNY', 'RMB', 'AUD', 'CAD', 'CHF',
        'HKD', 'SGD', 'TWD', 'NZD', 'SEK', 'NOK', 'DKK', 'THB', 'VND', 'IDR',
        'MYR', 'PHP', 'INR', 'AED', 'SAR', 'MXN', 'BRL', 'ZAR', 'PLN', 'CZK',
        'HUF', 'TRY'
    ]);

    // 일반 IT/개발 또는 일상 단어와 충돌하는 통화 코드 (단독 매칭 제외 및 엄격 검증)
    const AMBIGUOUS_CURRENCY_CODES = new Set([
        'PHP', // PHP 프로그래밍 언어 vs 필리핀 페소
        'CAD', // CAD 설계/도면 프로그램 vs 캐나다 달러
        'TRY', // try-catch vs 터키 리라
        'ALL'  // 알바니아 레크
    ]);

    const CURRENCY_KEYWORDS_KO = [
        '원화',
        '달러',
        '미국달러',
        '엔화',
        '유로',
        '유로화',
        '위안',
        '위안화',
        '파운드',
        '홍콩달러',
        '싱가포르달러',
        '대만달러',
        '페소',
        '바트',
        '동환율',
        '환전수수료'
    ];

    const FX_KEYWORDS_EN = [
        'exchange rate',
        'exchange rates',
        'currency',
        'forex',
        'fx rate'
    ];

    const FX_KEYWORDS_KO = [
        '환율',
        '외환',
        '원달러',
        '원엔',
        '원유로',
        '달러원',
        '엔원',
        '환전'
    ];

    const MARKET_KEYWORDS_EN = [
        'stock price',
        'share price',
        'stock quote',
        'stocks',
        'nasdaq',
        's&p',
        's&p 500',
        's&p500',
        'sp500',
        'dow',
        'dow jones',
        'kospi',
        'kosdaq',
        'nikkei',
        'treasury yield',
        'fomc'
    ];

    const MARKET_KEYWORDS_KO = [
        '주가',
        '증시',
        '코스피',
        '코스닥',
        '나스닥',
        '다우존스',
        '미국증시',
        '미국주식',
        '미장',
        '국장',
        '국채금리',
        '기준금리',
        '목표주가',
        '배당금',
        '배당수익률'
    ];

    const COMMODITY_PATTERNS = [
        /\bgold\s+(?:price|spot|rate|futures)\b/i,
        /\bsilver\s+(?:price|spot|rate|futures)\b/i,
        /\b(?:gold|silver|crude oil|wti|brent)\s+market\b/i,
        /(?:금|은|원유)\s*(?:시세|가격)(?![가-힣])/u,
        /금값|은값|유가/u
    ];

    // 주식(stock) 단어가 포함되어 있으나 금융이 아닌 일반 용어/재고 제외 패턴
    const NON_FINANCE_STOCK_PATTERNS = [
        /\bstock\s+(?:photo|photos|image|images|video|videos|footage|vector|vectors|wallpaper|wallpapers|rom|firmware|android)\b/i,
        /\b(?:chicken|beef|vegetable|bone|fish|pork)\s+stock\b/i,
        /\b(?:in|out\s+of|back\s+in|check)\s+stock\b/i, // 상품 재고 확인
        /\brolling\s+stock\b/i // 철도 차량
    ];

    // CAD 소프트웨어/도면 제외 패턴
    const NON_FINANCE_CAD_PATTERNS = [
        /\bcad\s+(?:software|program|drawing|design|model|modeling|modelling|tutorial|course|file|files|block|blocks|viewer)\b/i,
        /\b(?:auto|free|librecad|fusion)\s*cad\b/i,
        /캐드\s*(?:프로그램|도면|설계|강좌|자격증)?/u
    ];

    // PHP 프로그래밍 언어 제외 패턴
    const NON_FINANCE_PHP_PATTERNS = [
        /\bphp\s*(?:\d|\b(?:array|function|class|code|script|version|laravel|composer|install|manual|tutorial|server|mysql|apache|nginx))\b/i
    ];

    // TRY-catch 프로그래밍 제외 패턴
    const NON_FINANCE_TRY_PATTERNS = [
        /\btry\s*(?:catch|finally|except|block|statement)\b/i
    ];

    const KOREAN_COIN_NON_FINANCE_RE =
        /코인\s*(?:세탁|노래방|락커|로커|게임|노래|세탁방|워시|티슈|초콜릿)/u;

    const KOREAN_COIN_FINANCE_RE =
        /(?:^|[\s()[\]{},./:+-])코인(?:$|[\s()[\]{},./:+-]|가격|시세|전망|차트|거래|시장|투자|급등)/u;

    // 한국 원화 및 엔화, 외화 금액 패턴 (단위 보강: 만, 억, 달러, 유로, 통화 기호 등)
    const MONEY_AMOUNT_PATTERNS = [
        /(?:^|\s)\d[\d,.]*\s*(?:만\s*|억\s*|조\s*)?원(?![가-힣])/u,
        /(?:^|\s)\d[\d,.]*\s*(?:만\s*|억\s*)?엔(?![가-힣])/u,
        /(?:^|\s)\d[\d,.]*\s*(?:만\s*|억\s*)?(?:달러|유로|파운드|위안)(?![가-힣])/u,
        /(?:^|\s)[$₩¥€£]\s*(?:[\d,.]+)(?:\s*(?:million|billion|trillion|만|억))?\b/i
    ];

    // 6자리 통화쌍 패턴 (예: USDKRW, JPYKRW, EURUSD 등)
    const CURRENCY_PAIR_RE =
        /\b([A-Z]{3})\s*(?:\/|-|\s*to\s*|\s*in\s*|\s*)\s*([A-Z]{3})\b/i;

    const AI_URL_ATTRIBUTES = [
        'href',
        'data-href',
        'data-url',
        'formaction'
    ];

    const AI_URL_SELECTOR =
        AI_URL_ATTRIBUTES
            .map((name) => `[${name}]`)
            .join(',');

    const SAFESEARCH_HELP_PATHS = [
        '/websearch/answer/9448272',
        '/websearch/answer/510'
    ];

    const SAFESEARCH_SIGNAL_RE =
        /(?:세이프서치|SafeSearch)/i;

    const SAFESEARCH_MANAGED_RE =
        /(?:변경\s*불가|안전\s*설정|적용된\s*안전|관리됨|관리되는|제어함|can(?:not|'t)\s+(?:be\s+)?changed|managed|locked\s+by|browser.*(?:safe|safety)|device.*(?:safe|safety)|network.*(?:safe|safety))/i;

    // 보호해야 하는 주요 레이아웃 및 검색 결과 컨테이너 (오탐 방지)
    const PROTECTED_CONTAINERS_SELECTOR = [
        'html',
        'body',
        'main',
        'header',
        'nav',
        '[role="navigation"]',
        '#search',
        '#rso',
        '#res',
        '#center_col',
        '#cnt',
        '#main',
        '.MjjYud',
        '.g',
        '[data-hveid]',
        'form[action*="/search"]',
        'textarea[name="q"]',
        'input[name="q"]'
    ].join(',');

    const hiddenAiUiState = new WeakMap();
    const hiddenSafeSearchNotices = new WeakSet();

    let observer = null;
    let isInternalHistoryUpdate = false;
    let preferencesHandled = false;

    // 0ms 즉시 세이프서치 차단 안내 배너를 숨기기 위한 CSS 주입 (검색 결과 .g / #rso 영역은 엄격 보호)
    function injectAntiSafeSearchNoticeStyle() {
        if (document.getElementById('anti-safesearch-notice-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'anti-safesearch-notice-style';
        style.textContent = `
            div:has(> a[href*="/websearch/answer/9448272"]):not(#rso *):not(#search *):not(.g *):not(.MjjYud *),
            div:has(> a[href*="/websearch/answer/510"]):not(#rso *):not(#search *):not(.g *):not(.MjjYud *),
            #topstuff div:has(a[href*="/websearch/answer/9448272"]),
            #topstuff div:has(a[href*="/websearch/answer/510"]),
            #taw div:has(a[href*="/websearch/answer/9448272"]),
            #taw div:has(a[href*="/websearch/answer/510"]) {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                min-height: 0 !important;
                overflow: hidden !important;
                pointer-events: none !important;
            }
        `;

        const target = document.head || document.documentElement;
        if (target) {
            target.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                (document.head || document.documentElement)?.appendChild(style);
            }, { once: true });
        }
    }

    function isGoogleHost(hostname = location.hostname) {
        return GOOGLE_HOST_RE.test(hostname);
    }

    function isSearchPath(pathname) {
        return pathname === SEARCH_PATH;
    }

    function isPreferencesPath(pathname) {
        return PREFERENCES_PATHS.has(pathname);
    }

    function isAiPath(pathname) {
        return pathname === '/ai' || pathname.startsWith('/ai/');
    }

    function hasAiModeUdm(url) {
        return url.searchParams.getAll('udm').includes(CONFIG.aiModeUdm);
    }

    function isAiModeUrl(url) {
        return (
            isGoogleHost(url.hostname) &&
            (isAiPath(url.pathname) || hasAiModeUdm(url))
        );
    }

    function getSearchQuery(url = new URL(location.href)) {
        return url.searchParams.get('q') || '';
    }

    function normalizeQuery(query) {
        return String(query || '')
            .normalize('NFKC')
            .replace(/["'`+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function hasEnglishTerm(query, term) {
        const escaped = escapeRegExp(term);
        return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(query);
    }

    function hasAnyEnglishTerm(query, terms) {
        return terms.some((term) => hasEnglishTerm(query, term));
    }

    function hasAnySubstring(query, terms) {
        return terms.some((term) => query.includes(term));
    }

    function getThreeLetterTokens(query) {
        const upper = query.toUpperCase();
        return Array.from(
            upper.matchAll(/(?:\b|^)([A-Z]{3})(?=\b|$)/g),
            (match) => match[1]
        );
    }

    function isCryptoQuery(query) {
        const normalized = normalizeQuery(query);
        if (!normalized) return false;

        if (
            hasAnyEnglishTerm(normalized, CRYPTO_KEYWORDS_EN) ||
            hasAnySubstring(normalized, CRYPTO_KEYWORDS_KO)
        ) {
            return true;
        }

        if (KOREAN_COIN_NON_FINANCE_RE.test(normalized)) {
            return false;
        }

        return KOREAN_COIN_FINANCE_RE.test(normalized);
    }

    function isCurrencyQuery(query) {
        const normalized = normalizeQuery(query);
        if (!normalized) return false;

        // CAD 소프트웨어 검색 예외 처리
        if (NON_FINANCE_CAD_PATTERNS.some((pat) => pat.test(normalized))) {
            return false;
        }

        // 통화쌍 검사 (예: USDKRW, USD/KRW, EURUSD)
        const pairMatch = normalized.match(CURRENCY_PAIR_RE);
        if (pairMatch) {
            const [, code1, code2] = pairMatch;
            const c1 = code1.toUpperCase();
            const c2 = code2.toUpperCase();
            if (CURRENCY_CODES.has(c1) && CURRENCY_CODES.has(c2)) {
                return true;
            }
        }

        // 단독 통화 코드 추출
        const currencyTokens = getThreeLetterTokens(normalized)
            .filter((token) => CURRENCY_CODES.has(token));

        if (currencyTokens.length > 0) {
            // 모호한 코드(PHP, CAD, TRY 등)만 있는 경우 추가 검증
            const onlyAmbiguous = currencyTokens.every((token) =>
                AMBIGUOUS_CURRENCY_CODES.has(token)
            );

            if (onlyAmbiguous) {
                // PHP 프로그래밍 언어인지 확인
                if (
                    currencyTokens.includes('PHP') &&
                    NON_FINANCE_PHP_PATTERNS.some((pat) => pat.test(normalized))
                ) {
                    return false;
                }

                // TRY 구문 프로그래밍인지 확인
                if (
                    currencyTokens.includes('TRY') &&
                    NON_FINANCE_TRY_PATTERNS.some((pat) => pat.test(normalized))
                ) {
                    return false;
                }

                // 환율 관련 문맥이 함께 있는 경우에만 통화로 인정
                const hasContext =
                    hasAnyEnglishTerm(normalized, FX_KEYWORDS_EN) ||
                    hasAnySubstring(normalized, FX_KEYWORDS_KO) ||
                    hasAnySubstring(normalized, CURRENCY_KEYWORDS_KO);

                if (!hasContext) {
                    return false;
                }
            }
            return true;
        }

        if (hasAnyEnglishTerm(normalized, FX_KEYWORDS_EN)) {
            return true;
        }

        if (hasAnySubstring(normalized, FX_KEYWORDS_KO)) {
            return true;
        }

        if (hasAnySubstring(normalized, CURRENCY_KEYWORDS_KO)) {
            return true;
        }

        return MONEY_AMOUNT_PATTERNS.some((pat) => pat.test(normalized));
    }

    function isStockQuery(query) {
        const normalized = normalizeQuery(query);
        if (!normalized) return false;

        if (NON_FINANCE_STOCK_PATTERNS.some((pattern) => pattern.test(normalized))) {
            return false;
        }

        return (
            hasAnySubstring(normalized, MARKET_KEYWORDS_KO) ||
            hasAnyEnglishTerm(normalized, MARKET_KEYWORDS_EN)
        );
    }

    function isCommodityQuery(query) {
        const normalized = normalizeQuery(query);
        if (!normalized) return false;

        return COMMODITY_PATTERNS.some((pattern) => pattern.test(normalized));
    }

    function isFinanceQuery(query) {
        return (
            isCryptoQuery(query) ||
            isCurrencyQuery(query) ||
            isStockQuery(query) ||
            isCommodityQuery(query)
        );
    }

    function getSearchRegion(query) {
        return isFinanceQuery(query)
            ? CONFIG.financeRegion
            : CONFIG.defaultRegion;
    }

    function setParam(url, name, value) {
        if (
            url.searchParams.get(name) === value &&
            url.searchParams.getAll(name).length === 1
        ) {
            return false;
        }

        url.searchParams.delete(name);
        url.searchParams.set(name, value);
        return true;
    }

    function deleteParam(url, name) {
        if (!url.searchParams.has(name)) {
            return false;
        }

        url.searchParams.delete(name);
        return true;
    }

    function removeKnownAiOnlyParams(url) {
        let changed = false;
        for (const name of ['aep', 'ntc', 'arv']) {
            changed = deleteParam(url, name) || changed;
        }
        return changed;
    }

    function applySearchPolicy(url) {
        if (!isSearchPath(url.pathname)) {
            return false;
        }

        let changed = false;
        const query = getSearchQuery(url);
        const region = getSearchRegion(query);

        changed = setParam(url, 'gl', region) || changed;
        changed = setParam(url, 'hl', CONFIG.uiLanguage) || changed;
        changed = setParam(url, 'safe', 'off') || changed;
        changed = setParam(url, 'pws', '0') || changed;

        return changed;
    }

    function convertAiModeUrl(inputUrl, preserveCurrentGoogleHost = false) {
        const url = new URL(inputUrl.href);
        let changed = false;

        if (preserveCurrentGoogleHost && isGoogleHost(location.hostname)) {
            if (url.protocol !== location.protocol) {
                url.protocol = location.protocol;
                changed = true;
            }
            if (url.host !== location.host) {
                url.host = location.host;
                changed = true;
            }
        }

        const wasAiPath = isAiPath(url.pathname);
        const wasAiUdm = hasAiModeUdm(url);

        if (!wasAiPath && !wasAiUdm) {
            return {
                url,
                changed: false,
                wasAiMode: false
            };
        }

        const query = getSearchQuery(url);

        if (wasAiPath) {
            url.pathname = query ? SEARCH_PATH : '/';
            changed = true;
        }

        if (wasAiUdm) {
            url.searchParams.delete('udm');
            if (CONFIG.webUdm) {
                url.searchParams.set('udm', CONFIG.webUdm);
            }
            changed = true;
        } else {
            changed = deleteParam(url, 'udm') || changed;
            if (CONFIG.webUdm && query && isSearchPath(url.pathname)) {
                url.searchParams.set('udm', CONFIG.webUdm);
                changed = true;
            }
        }

        changed = removeKnownAiOnlyParams(url) || changed;

        if (isSearchPath(url.pathname)) {
            changed = applySearchPolicy(url) || changed;
        }

        return {
            url,
            changed,
            wasAiMode: true
        };
    }

    function buildNormalizedUrl(inputUrl, preserveCurrentGoogleHost = false) {
        const original = inputUrl instanceof URL
            ? inputUrl
            : new URL(inputUrl, location.href);

        const url = new URL(original.href);

        if (!isGoogleHost(url.hostname)) {
            return {
                url,
                changed: false,
                wasAiMode: false
            };
        }

        if (isAiModeUrl(url)) {
            return convertAiModeUrl(url, preserveCurrentGoogleHost);
        }

        return {
            url,
            changed: applySearchPolicy(url),
            wasAiMode: false
        };
    }

    // 최초 로드 시 URL 정규화 (하드 리다이렉트 허용)
    function normalizeCurrentUrlInitial() {
        if (!isGoogleHost()) {
            return false;
        }

        const current = new URL(location.href);
        const { url, changed } = buildNormalizedUrl(current, false);

        if (!changed || url.href === current.href) {
            return false;
        }

        location.replace(url.href);
        return true;
    }

    // SPA 히스토리 변경 시 URL 정규화 (페이지 새로고침 없이 history.replaceState로 부드럽게 동기화)
    function syncUrlParametersSilently() {
        if (!isGoogleHost() || isInternalHistoryUpdate) {
            return;
        }

        const current = new URL(location.href);

        // AI 모드로 진입한 경우에는 강제 변환 리다이렉트
        if (isAiModeUrl(current)) {
            const { url, changed } = convertAiModeUrl(current, true);
            if (changed && url.href !== current.href) {
                location.replace(url.href);
            }
            return;
        }

        if (!isSearchPath(current.pathname)) {
            return;
        }

        const { url, changed } = buildNormalizedUrl(current, false);

        if (changed && url.href !== current.href) {
            try {
                isInternalHistoryUpdate = true;
                history.replaceState(history.state, '', url.href);
            } catch {
                // history 조작 불가 환경 무시
            } finally {
                isInternalHistoryUpdate = false;
            }
        }
    }

    function getElementUrl(element) {
        if (!(element instanceof Element)) {
            return null;
        }

        for (const attribute of AI_URL_ATTRIBUTES) {
            const raw = element.getAttribute(attribute);
            if (!raw) continue;

            try {
                return new URL(raw, location.href);
            } catch {
                return null;
            }
        }

        return null;
    }

    function getAiUiTarget(source) {
        return (
            source.closest('[role="tab"]') ||
            source.closest('button, [role="button"], a, area') ||
            source
        );
    }

    function hideAiUiTarget(target) {
        if (!(target instanceof HTMLElement) || hiddenAiUiState.has(target)) {
            return;
        }

        hiddenAiUiState.set(target, {
            display: target.style.getPropertyValue('display'),
            displayPriority: target.style.getPropertyPriority('display'),
            ariaHidden: target.getAttribute('aria-hidden')
        });

        target.style.setProperty('display', 'none', 'important');
        target.setAttribute('aria-hidden', 'true');
    }

    function restoreAiUiTarget(target) {
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const state = hiddenAiUiState.get(target);
        if (!state) return;

        if (state.display) {
            target.style.setProperty('display', state.display, state.displayPriority);
        } else {
            target.style.removeProperty('display');
        }

        if (state.ariaHidden === null) {
            target.removeAttribute('aria-hidden');
        } else {
            target.setAttribute('aria-hidden', state.ariaHidden);
        }

        hiddenAiUiState.delete(target);
    }

    function inspectAiUrlElement(element) {
        const url = getElementUrl(element);
        const target = getAiUiTarget(element);

        if (url && isAiModeUrl(url)) {
            hideAiUiTarget(target);
        } else {
            restoreAiUiTarget(target);
        }
    }

    function scanAiModeElements(root) {
        if (
            !(
                root instanceof Document ||
                root instanceof DocumentFragment ||
                root instanceof Element
            )
        ) {
            return;
        }

        if (root instanceof Element && root.matches(AI_URL_SELECTOR)) {
            inspectAiUrlElement(root);
        }

        for (const element of root.querySelectorAll(AI_URL_SELECTOR)) {
            inspectAiUrlElement(element);
        }
    }

    function normalizeVisibleText(value) {
        return String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function looksLikeManagedSafeSearchNotice(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        const text = normalizeVisibleText(element.textContent);
        if (!text || text.length > 400) {
            return false;
        }

        return (
            SAFESEARCH_SIGNAL_RE.test(text) &&
            SAFESEARCH_MANAGED_RE.test(text)
        );
    }

    function isSafeSearchHelpUrl(url) {
        if (url.hostname !== 'support.google.com') {
            return false;
        }

        return SAFESEARCH_HELP_PATHS.some((path) => url.pathname.includes(path));
    }

    function getSafeSearchHelpDestination(link) {
        if (!(link instanceof HTMLAnchorElement)) {
            return null;
        }

        let url;
        try {
            url = new URL(link.href, location.href);
        } catch {
            return null;
        }

        if (isSafeSearchHelpUrl(url)) {
            return url;
        }

        if (isGoogleHost(url.hostname) && url.pathname === '/url') {
            for (const name of ['url', 'q']) {
                const destination = url.searchParams.get(name);
                if (!destination) continue;

                try {
                    const resolved = new URL(destination, location.href);
                    if (isSafeSearchHelpUrl(resolved)) {
                        return resolved;
                    }
                } catch {
                    continue;
                }
            }
        }

        return null;
    }

    function isSafeSearchHelpLink(link) {
        return getSafeSearchHelpDestination(link) !== null;
    }

    function isSafeNoticeCandidate(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }

        if (
            element.matches(PROTECTED_CONTAINERS_SELECTOR) ||
            element.querySelector(PROTECTED_CONTAINERS_SELECTOR)
        ) {
            return false;
        }

        if (!looksLikeManagedSafeSearchNotice(element)) {
            return false;
        }

        if (element.querySelectorAll('a[href]').length > 3) {
            return false;
        }

        const rect = element.getBoundingClientRect();
        // 이미 렌더링된 요소 중 350px을 초과하는 대형 결과는 배너가 아님
        if (rect.height > 350) {
            return false;
        }

        return true;
    }

    function findSafeSearchNoticeContainer(start) {
        let element = start;
        let bestCandidate = null;

        for (let depth = 0; depth < 5 && element; depth += 1) {
            if (element.matches && element.matches(PROTECTED_CONTAINERS_SELECTOR)) {
                break;
            }

            if (isSafeNoticeCandidate(element)) {
                bestCandidate = element;
            } else if (bestCandidate) {
                break;
            }

            element = element.parentElement;
        }

        return bestCandidate;
    }

    function hideSafeSearchNoticeElement(element) {
        if (!(element instanceof HTMLElement) || hiddenSafeSearchNotices.has(element)) {
            return;
        }

        hiddenSafeSearchNotices.add(element);

        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('height', '0', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
        element.setAttribute('aria-hidden', 'true');
    }

    function inspectSafeSearchSignalElement(element) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const notice = findSafeSearchNoticeContainer(element);
        if (notice) {
            hideSafeSearchNoticeElement(notice);
        }
    }

    function inspectSafeSearchHelpLink(link) {
        if (!isSafeSearchHelpLink(link)) {
            return;
        }

        inspectSafeSearchSignalElement(link);
    }

    function scanSafeSearchManagedNotice(root) {
        if (
            !(
                root instanceof Document ||
                root instanceof DocumentFragment ||
                root instanceof Element
            )
        ) {
            return;
        }

        if (root instanceof HTMLAnchorElement) {
            inspectSafeSearchHelpLink(root);
        }

        for (const link of root.querySelectorAll('a[href]')) {
            if (isSafeSearchHelpLink(link)) {
                inspectSafeSearchHelpLink(link);
            }
        }

        const scanRoot = root instanceof Document
            ? (root.body || root.documentElement)
            : root;

        if (
            !(
                scanRoot instanceof Element ||
                scanRoot instanceof DocumentFragment
            )
        ) {
            return;
        }

        const walker = document.createTreeWalker(
            scanRoot,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const text = normalizeVisibleText(node.nodeValue);
                    if (
                        SAFESEARCH_SIGNAL_RE.test(text) &&
                        SAFESEARCH_MANAGED_RE.test(text)
                    ) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while ((node = walker.nextNode())) {
            if (node.parentElement) {
                inspectSafeSearchSignalElement(node.parentElement);
            }
        }
    }

    // 설정 페이지(/preferences)에서 미국 지역 설정 (중복 자동 제출 방지)
    function setPreferencesRegionToUs(select) {
        if (!(select instanceof HTMLSelectElement) || preferencesHandled) {
            return false;
        }

        const desired = ['US', 'countryUS'].find((value) =>
            Array.from(select.options).some((option) => option.value === value)
        );

        if (!desired || select.value === desired) {
            return false;
        }

        select.value = desired;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        preferencesHandled = true;

        const form = select.form;
        if (form instanceof HTMLFormElement) {
            setTimeout(() => {
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    const submit = form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submit instanceof HTMLElement) {
                        submit.click();
                    }
                }
            }, 500);
        }

        return true;
    }

    function processPreferencesRoot(root) {
        if (!isPreferencesPath(location.pathname) || preferencesHandled) {
            return;
        }

        if (
            !(
                root instanceof Document ||
                root instanceof DocumentFragment ||
                root instanceof Element
            )
        ) {
            return;
        }

        if (root instanceof Element) {
            if (root.matches('select[name="cr"], select[name="gl"]')) {
                setPreferencesRegionToUs(root);
                return;
            }
        }

        for (const element of root.querySelectorAll('select[name="cr"], select[name="gl"]')) {
            if (setPreferencesRegionToUs(element)) {
                break;
            }
        }
    }

    // 검색 폼 제출 시 필요한 파라미터를 미리 주입하여 2중 리다이렉트 지연 및 파라미터 중복 제거
    function handleSearchFormSubmit(event) {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        const action = form.getAttribute('action') || '';
        if (!action.includes('/search') && form.action && !form.action.includes('/search')) {
            return;
        }

        const qInput = form.querySelector('input[name="q"], textarea[name="q"]');
        const query = qInput ? normalizeQuery(qInput.value) : '';
        const region = getSearchRegion(query);

        const paramsToEnsure = {
            gl: region,
            hl: CONFIG.uiLanguage,
            safe: 'off',
            pws: '0'
        };

        for (const [key, value] of Object.entries(paramsToEnsure)) {
            const inputs = Array.from(form.querySelectorAll(`input[name="${key}"]`));
            if (inputs.length === 0) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            } else {
                inputs[0].value = value;
                // 중복된 hidden input은 모두 비활성화 및 제거하여 쿼리 오염 방지
                for (let i = 1; i < inputs.length; i += 1) {
                    inputs[i].disabled = true;
                    inputs[i].remove();
                }
            }
        }
    }

    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                if (mutation.target instanceof Element) {
                    inspectAiUrlElement(mutation.target);
                }
                continue;
            }

            if (mutation.type === 'characterData') {
                if (mutation.target.parentElement) {
                    const text = mutation.target.parentElement.textContent || '';
                    if (SAFESEARCH_SIGNAL_RE.test(text)) {
                        inspectSafeSearchSignalElement(mutation.target.parentElement);
                    }
                }
                continue;
            }

            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.parentElement) {
                        const text = node.parentElement.textContent || '';
                        if (SAFESEARCH_SIGNAL_RE.test(text)) {
                            inspectSafeSearchSignalElement(node.parentElement);
                        }
                    }
                    continue;
                }

                if (
                    !(
                        node instanceof Element ||
                        node instanceof DocumentFragment
                    )
                ) {
                    continue;
                }

                scanAiModeElements(node);

                // 세이프서치 관련 텍스트나 링크가 있을 때만 정밀 스캔 수행 (무한 스크롤 성능 낭비 차단)
                const textContent = node.textContent || '';
                if (SAFESEARCH_SIGNAL_RE.test(textContent) || node.querySelector('a[href*="/websearch/answer/"]')) {
                    scanSafeSearchManagedNotice(node);
                }

                processPreferencesRoot(node);
            }
        }
    }

    function startObserver() {
        if (observer || !document.documentElement) {
            return;
        }

        observer = new MutationObserver(handleMutations);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: AI_URL_ATTRIBUTES
        });
    }

    function handleAiModeClick(event) {
        if (event.defaultPrevented || !(event.target instanceof Element)) {
            return;
        }

        const source = event.target.closest(AI_URL_SELECTOR);
        if (!source) {
            return;
        }

        const targetUrl = getElementUrl(source);
        if (!targetUrl || !isAiModeUrl(targetUrl)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const { url } = buildNormalizedUrl(targetUrl, true);
        location.assign(url.href);
    }

    function patchHistory() {
        for (const method of ['pushState', 'replaceState']) {
            const original = history[method];
            if (typeof original !== 'function') {
                continue;
            }

            history[method] = function (...args) {
                const result = original.apply(this, args);

                if (!isInternalHistoryUpdate) {
                    queueMicrotask(() => {
                        syncUrlParametersSilently();
                        scanAiModeElements(document);
                        scanSafeSearchManagedNotice(document);
                    });
                }

                return result;
            };
        }
    }

    function initializeDomHandling() {
        injectAntiSafeSearchNoticeStyle();
        scanAiModeElements(document);
        scanSafeSearchManagedNotice(document);
        processPreferencesRoot(document);
        startObserver();
    }

    function init() {
        if (!isGoogleHost()) {
            return;
        }

        // 세이프서치 차단 스타일은 최우선 주입 (깜빡임 방지)
        injectAntiSafeSearchNoticeStyle();

        // 첫 진입 시 하드 리다이렉트가 발생하면 즉시 종료
        if (normalizeCurrentUrlInitial()) {
            return;
        }

        patchHistory();

        // AI 탭 클릭 가로채기
        document.addEventListener('click', handleAiModeClick, true);

        // 검색 폼 제출 시 파라미터 사전 주입 (2중 리다이렉트 지연 방지)
        document.addEventListener('submit', handleSearchFormSubmit, true);

        // 뒤로가기/앞으로가기 및 해시 변경 시 파라미터 동기화
        window.addEventListener('popstate', () => {
            syncUrlParametersSilently();
            scanAiModeElements(document);
            scanSafeSearchManagedNotice(document);
        }, false);

        window.addEventListener('pageshow', () => {
            syncUrlParametersSilently();
            scanAiModeElements(document);
            scanSafeSearchManagedNotice(document);
        }, false);

        if (document.documentElement) {
            startObserver();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDomHandling, {
                once: true
            });
        } else {
            initializeDomHandling();
        }
    }

    init();
})();

