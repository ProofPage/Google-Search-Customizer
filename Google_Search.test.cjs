const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, 'Google_Search.user.js'), 'utf8');
const initialUrl = 'https://www.google.com/search?q=javascript&gl=US&hl=ko&safe=off&pws=0';

function createBrowser(options = {}) {
    let current = new URL(options.url || initialUrl);
    const requests = [];
    const listeners = new Map();
    const ageGateAnchors = options.ageGateHref
        ? [{ href: options.ageGateHref, getAttribute: (name) => (name === 'href' ? options.ageGateHref : null) }]
        : [];
    const results = Array.from({ length: options.resultCount ?? 1 }, () => ({}));

    class Document {
        readyState = options.readyState || 'complete';
        documentElement = null;
        body = null;

        getElementById() {
            return {};
        }

        querySelector(selector) {
            if (selector.includes('ageverification') && ageGateAnchors.length > 0) {
                return ageGateAnchors[0];
            }
            if ((selector === '#topstuff' || selector === '#center_col' || selector === '#main') && options.ageGateText) {
                return { textContent: options.ageGateText };
            }
            if ((selector.includes('#rso') || selector.includes('.g') || selector.includes('#islrg')) && results.length > 0) {
                return results[0];
            }
            return null;
        }

        querySelectorAll(selector) {
            if (selector === 'a[href]') {
                return ageGateAnchors;
            }
            return [];
        }

        addEventListener(name, listener) {
            listeners.set(name, listener);
        }
    }

    const location = {
        get href() { return current.href; },
        set href(value) { current = new URL(value, current); },
        get hostname() { return current.hostname; },
        get pathname() { return current.pathname; },
        get protocol() { return current.protocol; },
        get host() { return current.host; },
        replace(value) {
            requests.push(value);
            current = new URL(value, current);
        }
    };
    const history = {
        state: null,
        pushState(state, unused, url) {
            this.state = state;
            current = new URL(url, current);
        },
        replaceState(state, unused, url) {
            this.state = state;
            current = new URL(url, current);
        }
    };

    runInNewContext(source, {
        URL,
        location,
        history,
        queueMicrotask,
        Document,
        DocumentFragment: class {},
        Element: class {},
        HTMLAnchorElement: class {},
        document: new Document(),
        window: {
            addEventListener(name, listener) {
                listeners.set(name, listener);
            }
        }
    }, { timeout: 1000, filename: 'Google_Search.user.js' });

    return { location, history, requests, listeners };
}

test('SPA navigation requests results with the selected region instead of only changing the address', async () => {
    const transitions = [
        {
            event: 'pushState',
            path: '/search?q=javascript&gl=KR&hl=ko&safe=off&pws=0',
            expected: initialUrl
        },
        {
            event: 'replaceState',
            path: '/search?q=USD+KRW&gl=US&hl=ko&safe=off&pws=0',
            expected: 'https://www.google.com/search?q=USD+KRW&gl=KR&hl=ko&safe=off&pws=0'
        },
        {
            event: 'popstate',
            path: '/search?q=javascript&gl=KR&hl=ko&safe=off&pws=0',
            expected: initialUrl
        },
        {
            event: 'pageshow',
            path: '/search?q=javascript&gl=KR&hl=ko&safe=off&pws=0',
            expected: initialUrl
        }
    ];

    for (const { event, path, expected } of transitions) {
        const browser = createBrowser();
        assert.deepEqual(browser.requests, [], 'a normalized initial URL needs no new request');

        const navigate = () => {
            if (event === 'pushState' || event === 'replaceState') {
                browser.history[event](null, '', path);
            } else {
                browser.location.href = path;
                browser.listeners.get(event)();
            }
        };

        navigate();
        await new Promise(queueMicrotask);
        assert.equal(browser.requests.length, 1, `${event} must request the corrected region`);
        assert.deepEqual(
            Object.fromEntries(new URL(browser.requests[0]).searchParams),
            Object.fromEntries(new URL(expected).searchParams)
        );
        assert.equal(browser.location.href, browser.requests[0]);

        browser.listeners.get('pageshow')();
        await new Promise(queueMicrotask);
        assert.equal(browser.requests.length, 1, 'the corrected URL must not reload again');
    }
});

test('spaced title hyphens are normalized so minus operators do not exclude results, and age-gated empty pages reroute to DuckDuckGo', () => {
    const browser = createBrowser();

    browser.location.href = 'https://www.google.com/search?q=Midoriko+Kobayashi+-+Obsession+4+-+3D+Adult+Comic';
    browser.listeners.get('popstate')();
    assert.equal(browser.requests.length, 1);

    const normalizedUrl = new URL(browser.requests[0]);
    assert.equal(
        normalizedUrl.searchParams.get('q'),
        'Midoriko Kobayashi Obsession 4 3D Adult Comic'
    );
    assert.equal(normalizedUrl.searchParams.get('gl'), 'US');
    assert.equal(normalizedUrl.searchParams.get('safe'), 'off');

    const blockedBrowser = createBrowser({
        url: 'https://www.google.com/search?q=Midoriko+Kobayashi+Obsession+4+3D+Adult+Comic&gl=US&hl=ko&safe=off&pws=0',
        ageGateHref: 'https://accounts.google.com/ServiceLogin?continue=https://ageverification.google.co.kr/ageverification',
        resultCount: 0
    });

    assert.deepEqual(blockedBrowser.requests, [
        'https://duckduckgo.com/?q=Midoriko+Kobayashi+Obsession+4&kp=-2&kl=us-en&ia=web'
    ]);

    const blockedImagesBrowser = createBrowser({
        url: 'https://www.google.com/search?q=Midoriko+Kobayashi+Obsession+4+3D+Adult+Comic&udm=2&gl=US&hl=ko&safe=off&pws=0',
        ageGateText: '청소년에게 유해한 결과는 제외되었습니다. 만 19세 이상의 사용자는 성인인증을 통해 모든 결과를 볼 수 있습니다.',
        resultCount: 0
    });

    assert.deepEqual(blockedImagesBrowser.requests, [
        'https://duckduckgo.com/?q=Midoriko+Kobayashi+Obsession+4&kp=-2&kl=us-en&ia=images&iax=images'
    ]);
});
