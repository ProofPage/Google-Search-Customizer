# Google Search Customizer

A lightweight, robust userscript that optimizes your Google Search experience:
- **Default US Search Region (`gl=US`)**: Request US-ranked search results. This does not change your IP address or Google's detected location.
- **Intelligent Korean Finance Routing (`gl=KR`)**: Automatically detects currency exchange rates, stocks, crypto, and commodities to deliver fast, relevant Korean domestic financial widgets and quotes.
- **Bypass AI Mode (`udm=50`)**: Redirects AI Mode to direct web search results (`udm=14`). AI Overviews in ordinary search are not removed.
- **Zero-Latency SafeSearch Banner Removal**: Instantly eliminates annoying "SafeSearch is managed by your browser/network" warning notices using pure CSS `:has()` pseudo-classes with zero layout shift (CLS) or visual flicker.
- **SPA Search Policy Enforcement**: Reissues a search when Google's dynamic navigation omits the requested settings, rather than changing only the address bar.
- **Title Hyphen Sanitization & Age-Gate Fallback**: Strips spaced title separators (` - `) so search engines do not treat them as exclusion operators (`-term`), and automatically reroutes to DuckDuckGo (`kp=-2`, US English) when Korean IP age verification blocks all Google results.

---

## Features

### 1. Smart Regional Routing
- **Default**: Queries request `gl=US` (United States region) and `hl=ko` (Korean UI language). Regional legal restrictions and account requirements still apply.
- **Finance Automatic Switch**: When searching for financial queries, the script seamlessly routes to `gl=KR` so you instantly see domestic exchange rates (e.g., KRW/USD, KRW/JPY), Korean stock indices (KOSPI, KOSDAQ), and local crypto prices.

#### Intelligent Query Detection
- **Cryptocurrency**: Bitcoin, Ethereum, Solana, XRP, Altcoins, Upbit, Bithumb, etc.
- **Currencies & Forex**:
  - Currency pairs (`USDKRW`, `JPYKRW`, `EURUSD`, `USD to KRW`, etc.)
  - ISO codes (`KRW`, `USD`, `EUR`, `JPY`, etc.)
  - Amounts with currency denominations (`100만원`, `50000원`, `100달러`, `$500`, `1000엔`)
  - *Context-aware filtering*: Code queries like `PHP array` or `AutoCAD design` are strictly excluded to avoid false positives.
- **Stock Markets**: S&P 500, Nasdaq, Dow Jones, KOSPI, KOSDAQ, treasury yields, and stock prices.
  - *False-positive protection*: Everyday terms such as `in stock`, `out of stock`, and `stock photo` are preserved under normal US search.
- **Commodities**: Gold, Silver, Crude Oil (WTI, Brent) spot/futures prices.

### 2. Disable Google AI Mode (`udm=50` & `/ai`)
- Automatically strips forced Google AI Mode tabs and redirects them to clean standard web search results (`udm=14`).
- Prevents accidental navigation to bloated AI search pages while leaving other media tabs (Images `udm=2`, Videos `udm=7`, News `udm=12`) untouched.

### 3. Safe & Instant SafeSearch Notice Removal
- Browser- or network-managed SafeSearch banners ("Your browser is managing SafeSearch settings") are hidden **immediately at `document-start`** via CSS rules leveraging `:has()`.
- No visual flashing (FOUC) and no DOM performance penalties compared to legacy text-scanning observers.
- Protected selectors ensure actual search results and main containers are never accidentally hidden.
- Hiding a notice does not disable a filter, unlock managed settings, or satisfy age verification. `safe=off` is a request, not a guarantee; Google can enforce account, network, or regional restrictions.

### 4. SPA (Single-Page Application) Navigation
- Checks Google's client-side history navigation (`pushState` / `replaceState`), back/forward navigation, and page restoration.
- When search settings differ from the policy, `location.replace` requests results with the corrected settings. Already-correct URLs do not reload.
- Automatically enriches query parameters (`gl`, `hl`, `safe=off`, `pws=0`) directly inside search forms upon submission, eliminating double-loading delays.

---

## Installation

1. Install a userscript manager extension in your browser:
   - [Violentmonkey](https://violentmonkey.github.io/) (Recommended)
   - [Tampermonkey](https://www.tampermonkey.net/)
2. Open the userscript installation URL:
   - Click to install [`Google_Search.user.js`](https://raw.githubusercontent.com/ProofPage/Google-Search-Customizer/main/Google_Search.user.js).
3. Confirm the installation prompt in your userscript manager.
4. Navigate to [Google Search](https://www.google.com) and enjoy customized results!

For Tampermonkey 5.3+ in Chrome-based browsers, enable **Allow User Scripts** in the extension settings (Chrome 138+) or enable **Developer Mode**. See the [official permission instructions](https://www.tampermonkey.net/faq.php?q=Q209).

If Google asks for age verification, use Google's official account verification flow. This userscript does not bypass verification or managed SafeSearch restrictions. See [Google's SafeSearch troubleshooting](https://support.google.com/websearch/answer/9448272).

---

## URL Parameters Handled

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `gl` | `US` or `KR` | Enforces United States results by default, switching to Korea for financial queries. |
| `hl` | `ko` | Sets the interface language to Korean. |
| `safe` | `off` | Requests SafeSearch off; enforced restrictions can override this request. |
| `pws` | `0` | Disables personalized search history bias. |
| `udm` | `14` | Redirects AI Mode to web results when triggered. |

---

## Supported Domains

- `https://*.google.com/*`
- `https://*.google.co.kr/*`
- `https://*.google.co.jp/*`
- `https://*.google.co.uk/*`
- All international Google TLDs matching `/^https?:\/\/(?:www\.)?google\.(?:[a-z]{2,3}|(?:com|co)\.[a-z]{2})/`

---

## License

This project is licensed under the [MIT License](./LICENSE).

## Tests

With Node.js 22 or later:

```sh
node --test Google_Search.test.cjs
```
