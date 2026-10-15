# Google Search Customizer

A lightweight, robust userscript that optimizes your Google Search experience:
- **Default US Search Region (`gl=US`)**: Get comprehensive, global search results without local geo-bias.
- **Intelligent Korean Finance Routing (`gl=KR`)**: Automatically detects currency exchange rates, stocks, crypto, and commodities to deliver fast, relevant Korean domestic financial widgets and quotes.
- **Bypass AI Mode / AI Overview (`udm=50`)**: Strips forced AI-generated tabs and redirects to clean, direct web search results (`udm=14`).
- **Zero-Latency SafeSearch Banner Removal**: Instantly eliminates annoying "SafeSearch is managed by your browser/network" warning notices using pure CSS `:has()` pseudo-classes with zero layout shift (CLS) or visual flicker.
- **Flicker-Free SPA Integration**: Fully compatible with Google's dynamic Single Page Application (SPA) navigation—no infinite reload loops, input interruptions, or focus drops while typing.

---

## Features

### 1. Smart Regional Routing
- **Default**: Queries are routed with `gl=US` (United States region) and `hl=ko` (Korean UI language), preventing unwanted country-level filtering while keeping the interface comfortable.
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

### 4. Seamless SPA (Single-Page Application) Experience
- Hooks into Google's client-side history navigation (`pushState` / `replaceState`) without causing full-page reloads (`location.replace`).
- Automatically enriches query parameters (`gl`, `hl`, `safe=off`, `pws=0`) directly inside search forms upon submission, eliminating double-loading delays.

---

## Installation

### Prerequisites
Install any popular userscript manager extension in your browser:
- [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
- [Violentmonkey](https://violentmonkey.github.io/)

### Install Script
1. Click the raw script link or copy the contents of [`Google_Search.user.js`](./Google_Search.user.js).
2. Open your userscript manager dashboard and create a new script.
3. Paste the code and save (`Ctrl+S`).
4. Navigate to [Google Search](https://www.google.com) and enjoy customized results!

---

## URL Parameters Handled

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `gl` | `US` or `KR` | Enforces United States results by default, switching to Korea for financial queries. |
| `hl` | `ko` | Sets the interface language to Korean. |
| `safe` | `off` | Disables SafeSearch filtering. |
| `pws` | `0` | Disables personalized search history bias. |
| `udm` | `14` | Redirects AI Overview / AI Mode to clean web results when triggered. |

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
