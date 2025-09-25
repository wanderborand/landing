(function() {
	const SUPPORTED = ['en', 'uk'];
	const STORAGE_KEY = 'lang';
	let currentLang = null;
	let cache = {};

	function detectInitialLang() {
		const urlLang = new URLSearchParams(location.search).get('lang');
		if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && SUPPORTED.includes(stored)) return stored;
		const nav = (navigator.language || 'en').slice(0,2);
		return SUPPORTED.includes(nav) ? nav : 'en';
	}

	async function loadLocale(lang) {
		if (cache[lang]) return cache[lang];
		const res = await fetch(`/locales/${lang}.json`);
		if (!res.ok) throw new Error('Failed to load locale ' + lang);
		const json = await res.json();
		cache[lang] = json;
		return json;
	}

	function get(obj, path) {
		return path.split('.').reduce((o, k) => (o && k in o) ? o[k] : undefined, obj);
	}

	function applyText(el, val) {
		const attr = el.getAttribute('data-i18n-attr');
		if (attr) {
			// support comma-separated attributes using same value
			attr.split(',').map(s => s.trim()).forEach(name => {
				if (name) el.setAttribute(name, String(val ?? ''));
			});
		} else {
			el.textContent = String(val ?? '');
		}
	}

	function translateDocument(dict) {
		document.querySelectorAll('[data-i18n]').forEach(el => {
			const key = el.getAttribute('data-i18n');
			const val = get(dict, key);
			if (val == null) return;
			applyText(el, val);
		});
	}

async function setLanguage(lang) {
		if (!SUPPORTED.includes(lang)) return;
		currentLang = lang;
		localStorage.setItem(STORAGE_KEY, lang);
	const dict = await loadLocale(lang);
	translateDocument(dict);
	// Update segmented switcher state
	document.querySelectorAll('.lang-switch .lang-pill').forEach(b => {
		const isActive = b.getAttribute('data-lang') === lang;
		b.classList.toggle('is-active', isActive);
		b.setAttribute('aria-selected', String(isActive));
	});
	// Update <html lang="...">
	document.documentElement.setAttribute('lang', lang);
	}

function ensureSwitcher() {
    const header = document.querySelector('.site-header .header-inner');
    if (!header) return;
    let switcher = header.querySelector('.lang-switch');
    if (!switcher) {
        switcher = document.createElement('div');
        switcher.className = 'lang-switch';
        switcher.setAttribute('role', 'tablist');
        switcher.setAttribute('aria-label', 'Language');
        switcher.innerHTML = `
            <button class="lang-pill is-active" role="tab" aria-selected="true" data-lang="en">EN</button>
            <button class="lang-pill" role="tab" aria-selected="false" data-lang="uk">UK</button>
        `;
        header.appendChild(switcher);
        switcher.addEventListener('click', (e) => {
            const btn = e.target.closest('.lang-pill');
            if (!btn) return;
            setLanguage(btn.getAttribute('data-lang'));
        });
        switcher.addEventListener('keydown', (e) => {
            const pills = Array.from(switcher.querySelectorAll('.lang-pill'));
            const idx = pills.findIndex(p => p.classList.contains('is-active'));
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                const next = pills[(idx + dir + pills.length) % pills.length];
                next.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                const focused = document.activeElement.closest('.lang-pill');
                if (focused) setLanguage(focused.getAttribute('data-lang'));
            }
        });
    }
}

    function t(key, fallback = '') {
        const dict = cache[currentLang] || {};
        const val = get(dict, key);
        return (val == null) ? fallback : String(val);
    }

    window.i18n = { setLanguage, t };

	(async function init() {
		ensureSwitcher();
		await setLanguage(detectInitialLang());
	})();
})();


