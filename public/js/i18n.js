(function() {
	const SUPPORTED = ['en', 'uk'];
	const STORAGE_KEY = 'lang';
	let currentLang = null;
	let cache = {};

	// Embedded fallback locales to ensure switching works without network
	const EMBEDDED_LOCALES = {
		en: {"meta":{"title":"MetalFrame Studio","adminTitle":"Admin Panel · MetalFrame Studio"},"nav":{"about":"About","works":"Our Works","contact":"Contact"},"hero":{"h1":"Precision Metal Frame Structures","p":"Engineered for strength, designed for impact.","h2_1":"From Concept to Completion","p_1":"Turn-key solutions for commercial and residential builds.","h2_2":"Built to Last","p_2":"Certified materials and high-precision fabrication."},"about":{"title":"About","text":"MetalFrame Studio specializes in the design and fabrication of metal frame structures. Our team blends architectural vision with engineering rigor to deliver elegant, durable builds—from bespoke interiors to large-scale installations."},"works":{"title":"Our Works","empty":"No works yet. Add posts via the admin panel."},"contact":{"title":"Contact Us","form":{"nameLabel":"Your Name","namePh":"John Doe","emailLabel":"Email","emailPh":"john@domain.com","messageLabel":"Message","messagePh":"Tell us about your project","send":"Send","queued":"Thanks! Your message has been queued.","errors":{"name":"Please enter your name","email":"Please enter your email","emailValid":"Please enter a valid email","message":"Please enter a message"}},"contacts":"Contacts"},"footer":{"rights":"All rights reserved.","legal":"All rights reserved. Copyright reserved."},"admin":{"title":"Admin Panel","note":"Use this page to create, edit, and delete posts. Share this URL only with authorized users.","form":{"createEdit":"Create / Edit Post","create":"Create Post","update":"Update Post","reset":"Reset","image":"Image","title":"Title","desc":"Description","created":"Created","actions":"Actions"},"table":{"all":"All Posts","edit":"Edit","delete":"Delete","confirmDelete":"Delete this post?","deleteFail":"Failed to delete.","updated":"Post updated.","created":"Post created.","localUpdated":"Post updated (local).","localCreated":"Post created (local).","loadError":"Error loading posts.","submitFail":"Failed to submit. Ensure the server is running.","editing":"Editing mode: choose a new image to replace.","editingLocal":"Editing (local): choose a new image to replace.","needImage":"Please choose an image","needTitle":"Please enter a title","needDesc":"Please enter a description"}}},
		uk: {"meta":{"title":"MetalFrame Studio","adminTitle":"Адмін-панель · MetalFrame Studio"},"nav":{"about":"Про нас","works":"Наші роботи","contact":"Контакти"},"hero":{"h1":"Точні металеві каркасні конструкції","p":"Спроєктовано для міцності, створено для враження.","h2_1":"Від ідеї до втілення","p_1":"Повний цикл для комерційних і житлових об'єктів.","h2_2":"Створено на роки","p_2":"Сертифіковані матеріали та високоточне виготовлення."},"about":{"title":"Про нас","text":"MetalFrame Studio спеціалізується на проєктуванні та виробництві металевих каркасних конструкцій. Ми поєднуємо архітектурне бачення з інженерною точністю, щоб створювати естетичні й довговічні рішення — від інтер'єрів до масштабних інсталяцій."},"works":{"title":"Наші роботи","empty":"Поки немає робіт. Додайте пости в адмін-панелі."},"contact":{"title":"Зв'яжіться з нами","form":{"nameLabel":"Ваше ім'я","namePh":"Іван Петренко","emailLabel":"Email","emailPh":"ivan@domain.com","messageLabel":"Повідомлення","messagePh":"Розкажіть про ваш проєкт","send":"Надіслати","queued":"Дякуємо! Ваше повідомлення поставлено в чергу.","errors":{"name":"Вкажіть ваше ім'я","email":"Вкажіть ваш email","emailValid":"Вкажіть коректний email","message":"Вкажіть повідомлення"}},"contacts":"Контакти"},"footer":{"rights":"Всі права захищено.","legal":"Всі права захищено. Права на копіювання захищено."},"admin":{"title":"Адмін-панель","note":"Використовуйте цю сторінку для створення, редагування та видалення постів. Діліться посиланням лише з авторизованими користувачами.","form":{"createEdit":"Створити / Редагувати пост","create":"Створити пост","update":"Оновити пост","reset":"Скинути","image":"Зображення","title":"Заголовок","desc":"Опис","created":"Створено","actions":"Дії"},"table":{"all":"Усі пости","edit":"Редагувати","delete":"Видалити","confirmDelete":"Видалити цей пост?","deleteFail":"Не вдалося видалити.","updated":"Пост оновлено.","created":"Пост створено.","localUpdated":"Пост оновлено (локально).","localCreated":"Пост створено (локально).","loadError":"Помилка завантаження постів.","submitFail":"Не вдалося надіслати. Переконайтеся, що сервер запущено.","editing":"Режим редагування: виберіть нове зображення для заміни.","editingLocal":"Редагування (локально): виберіть нове зображення для заміни.","needImage":"Виберіть зображення","needTitle":"Вкажіть заголовок","needDesc":"Вкажіть опис"}}}
	};

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
		// Use relative path so it works under subpaths (no leading slash)
		const candidates = [
			`locales/${lang}.json`,
			`./locales/${lang}.json`,
			`/locales/${lang}.json`
		];
		for (const url of candidates) {
			try {
				const res = await fetch(url, { cache: 'no-store' });
				if (res.ok) {
					const json = await res.json();
					cache[lang] = json;
					return json;
				}
				console.warn('[i18n] Locale fetch not ok:', url, res.status);
			} catch (err) {
				console.warn('[i18n] Locale fetch failed for', url, err);
			}
		}
		// Fallback to embedded
		if (EMBEDDED_LOCALES[lang]) {
			console.info('[i18n] Using embedded locale for', lang);
			cache[lang] = EMBEDDED_LOCALES[lang];
			return EMBEDDED_LOCALES[lang];
		}
		throw new Error('Failed to load locale ' + lang);
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
		try {
			const dict = await loadLocale(lang);
			translateDocument(dict);
		} catch (err) {
			console.error('[i18n] setLanguage failed for', lang, err);
			return;
		}
	// Update segmented switcher state
	document.querySelectorAll('.lang-switch .lang-pill').forEach(b => {
		const isActive = b.getAttribute('data-lang') === lang;
		b.classList.toggle('is-active', isActive);
		b.setAttribute('aria-selected', String(isActive));
	});
	// Update <html lang="...">
	document.documentElement.setAttribute('lang', lang);
		// Notify listeners that language changed
		try {
			window.dispatchEvent(new CustomEvent('i18n:languageChanged', { detail: { lang } }));
		} catch {}
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
        switcher.addEventListener('click', async (e) => {
            const btn = e.target.closest('.lang-pill');
            if (!btn) return;
            await setLanguage(btn.getAttribute('data-lang'));
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

    window.i18n = { setLanguage, t, getLanguage: () => currentLang };

	(async function init() {
		ensureSwitcher();
		await setLanguage(detectInitialLang());
	})();
})();


