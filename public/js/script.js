(function() {
	const API_BASE = (location.origin && location.origin !== 'null') ? location.origin : 'http://localhost:3000';
	const navToggle = document.querySelector('.nav-toggle');
	const nav = document.querySelector('.site-nav');
	if (navToggle && nav) {
		navToggle.addEventListener('click', () => {
			const isOpen = nav.classList.toggle('open');
			navToggle.setAttribute('aria-expanded', String(isOpen));
		});
		nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
			nav.classList.remove('open');
			navToggle.setAttribute('aria-expanded', 'false');
		}));
	}

	// Smooth scroll for in-page anchors
	document.querySelectorAll('a[href^="#"]').forEach(link => {
		link.addEventListener('click', (e) => {
			const targetId = link.getAttribute('href');
			if (!targetId || targetId === '#' || targetId.length <= 1) return;
			const el = document.querySelector(targetId);
			if (el) {
				e.preventDefault();
				el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		});
	});

	// Slider logic
	const slider = document.querySelector('.slider');
	if (slider) {
		const slides = Array.from(slider.querySelectorAll('.slide'));
		const prevBtn = slider.querySelector('.control.prev');
		const nextBtn = slider.querySelector('.control.next');
		const dotsContainer = slider.querySelector('.dots');
		let index = slides.findIndex(s => s.classList.contains('is-active'));
		if (index < 0) index = 0;
		let timerId = null;
		const interval = parseInt(slider.dataset.interval || '5000', 10);
		const autoplay = slider.dataset.autoplay === 'true';

		function go(to) {
			const total = slides.length;
			index = (to + total) % total;
			slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
			updateDots();
		}

		function next() { go(index + 1); }
		function prev() { go(index - 1); }

		function startAutoplay() {
			if (!autoplay) return;
			stopAutoplay();
			timerId = setInterval(next, interval);
		}
		function stopAutoplay() {
			if (timerId) clearInterval(timerId);
			timerId = null;
		}

		function updateDots() {
			if (!dotsContainer) return;
			Array.from(dotsContainer.children).forEach((d, i) => {
				d.setAttribute('aria-selected', String(i === index));
			});
		}

		// Build dots
		if (dotsContainer) {
			dotsContainer.innerHTML = '';
			slides.forEach((_, i) => {
				const b = document.createElement('button');
				b.setAttribute('role', 'tab');
				b.setAttribute('aria-label', `Go to slide ${i + 1}`);
				b.addEventListener('click', () => go(i));
				dotsContainer.appendChild(b);
			});
		}

		prevBtn?.addEventListener('click', prev);
		nextBtn?.addEventListener('click', next);

		slider.addEventListener('mouseenter', stopAutoplay);
		slider.addEventListener('mouseleave', startAutoplay);

		updateDots();
		startAutoplay();

		// Touch swipe support for mobile
		let touchStartX = 0;
		let touchStartY = 0;
		let touchStartTime = 0;
		const THRESHOLD_X = 40; // min horizontal movement in px
		const LIMIT_Y = 60;     // max vertical drift in px
		const TIME_LIMIT = 600; // max gesture time in ms

		slider.addEventListener('touchstart', (e) => {
			const t = e.changedTouches && e.changedTouches[0];
			if (!t) return;
			touchStartX = t.clientX;
			touchStartY = t.clientY;
			touchStartTime = Date.now();
		}, { passive: true });

		slider.addEventListener('touchend', (e) => {
			const t = e.changedTouches && e.changedTouches[0];
			if (!t) return;
			const dx = t.clientX - touchStartX;
			const dy = Math.abs(t.clientY - touchStartY);
			const dt = Date.now() - touchStartTime;
			if (dt <= TIME_LIMIT && Math.abs(dx) >= THRESHOLD_X && dy <= LIMIT_Y) {
				if (dx < 0) next(); else prev();
			}
		}, { passive: true });
	}

	// Footer year
	const yearEl = document.getElementById('year');
	if (yearEl) yearEl.textContent = String(new Date().getFullYear());

	// Contact form removed: no email submission from site

	// Dynamic Works from API + Lightbox
	(async function initWorks() {
		const grid = document.getElementById('worksGrid');
		if (!grid) return;
		const emptyEl = document.getElementById('worksEmpty');

		async function getPosts() {
			try {
				const res = await fetch(`${API_BASE}/api/posts`);
				if (!res.ok) throw new Error('api down');
				return await res.json();
			} catch {
				try {
					return JSON.parse(localStorage.getItem('mfs_posts') || '[]');
				} catch { return []; }
			}
		}

		const posts = await getPosts();
		if (!posts.length) {
			grid.innerHTML = '';
			grid.dataset.empty = '';
			if (emptyEl) emptyEl.style.display = 'block';
			return;
		}
		if (emptyEl) emptyEl.style.display = 'none';
        const frag = document.createDocumentFragment();
        const lang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
		for (const p of posts) {
			const fig = document.createElement('figure');
			fig.className = 'card';
			fig.innerHTML = `
				<img src="${p.imageUrl}" alt="${escapeHtml(selectLang(p.title, lang))}" data-full="${p.imageUrl}" data-caption="${escapeHtml(selectLang(p.description, lang))}">
				<figcaption>${escapeHtml(selectLang(p.description, lang))}</figcaption>
			`;
			frag.appendChild(fig);
        }

		grid.innerHTML = '';
		grid.appendChild(frag);

		// Add "More photos" button below the grid
		const driveUrl = 'https://drive.google.com/drive/folders/your-folder-id-here';
		let moreBtn = document.getElementById('morePhotosBtn');
		if (!moreBtn) {
			moreBtn = document.createElement('div');
			moreBtn.id = 'morePhotosBtn';
			moreBtn.className = 'more-photos-section';
			grid.parentElement.appendChild(moreBtn);
		}
		const currentLang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
		const morePhotosText = (window.i18n?.t && window.i18n.t('works.morePhotos')) || 'More photos';
		moreBtn.innerHTML = `<a class="a more-photos-a" href="${driveUrl}" target="_blank" rel="noopener">${morePhotosText}</a>`;

		// Re-render on language change
		window.addEventListener('i18n:languageChanged', () => {
			// Force re-render captions/alt using current cached posts
			const currentLang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
			Array.from(grid.querySelectorAll('figure.card:not(.more-card)')).forEach((fig, idx) => {
				const p = posts[idx];
				if (!p) return;
				const img = fig.querySelector('img');
				const cap = fig.querySelector('figcaption');
				if (img) img.alt = escapeHtml(selectLang(p.title, currentLang));
				if (cap) cap.textContent = selectLang(p.description, currentLang);
			});
			
			// Update "More photos" button text
			const moreBtn = document.getElementById('morePhotosBtn');
			if (moreBtn) {
				const morePhotosText = (window.i18n?.t && window.i18n.t('works.morePhotos')) || 'More photos';
				const link = moreBtn.querySelector('a');
				if (link) link.textContent = morePhotosText;
			}
		});

		// Lightbox setup
		const lightbox = document.getElementById('lightbox');
		const imgEl = document.getElementById('lightboxImage');
		const capEl = document.getElementById('lightboxCaption');
		const lbPrev = document.querySelector('.lightbox-prev');
		const lbNext = document.querySelector('.lightbox-next');
		let galleryItems = [];
		let galleryIndex = -1;

		function renderMorePhotosPanel() {
			// Видаляємо попередню панель (якщо є)
			const existing = lightbox.querySelector('.lightbox-panel');
			if (existing) existing.remove();
		
			// Сховати стандартне фото та підпис
			imgEl.style.display = 'none';
			capEl.style.display = 'none';
			capEl.innerHTML = '';
		
			// Створюємо панель та додаємо її в .lightbox-dialog (щоб покрити весь діалог)
			const panel = document.createElement('div');
			panel.className = 'lightbox-panel';
			
			// Get localized text
			const currentLang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
			const title = (window.i18n?.t && window.i18n.t('works.morePhotos')) || 'More photos';
			const desc = (window.i18n?.t && window.i18n.t('works.morePhotosDesc')) || 'Open the full gallery on Google Drive.';
			const btnText = (window.i18n?.t && window.i18n.t('works.morePhotosBtn')) || 'Open';
			
			panel.innerHTML = `
				<h4>${title}</h4>
				<p>${desc}</p>
				<a class="btn" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/your-folder-id-here">${btnText}</a>
			`;
			const dialog = lightbox.querySelector('.lightbox-dialog');
			dialog.appendChild(panel);
		}

		function openLightbox(src, caption, index = -1) {
			// При відкритті звичайного фото — видаляємо панель (якщо була) і показуємо img+caption
			const existing = lightbox.querySelector('.lightbox-panel');
			if (src === '__more__') {
				renderMorePhotosPanel();
			} else {
				if (existing) existing.remove();
				imgEl.style.display = '';
				capEl.style.display = '';
				imgEl.src = src;
				capEl.textContent = caption || '';
			}
			galleryIndex = index;
			lightbox.setAttribute('aria-hidden', 'false');
		}
		function closeLightbox() {
			lightbox.setAttribute('aria-hidden', 'true');
			// Очистити і повернути стан до початкового
			imgEl.src = '';
			imgEl.style.display = '';
			capEl.textContent = '';
			capEl.style.display = '';
			const panel = lightbox.querySelector('.lightbox-panel');
			if (panel) panel.remove();
		}
		lightbox?.addEventListener('click', (e) => {
			if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) closeLightbox();
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') closeLightbox();
			if (lightbox.getAttribute('aria-hidden') === 'false') {
				if (e.key === 'ArrowLeft') showAt(galleryIndex - 1);
				if (e.key === 'ArrowRight') showAt(galleryIndex + 1);
			}
		});
			document.getElementById('worksGrid')?.addEventListener('click', (e) => {
			const img = e.target.closest('img');
			if (!img) return;
			const fig = img.closest('figure');
			// Build gallery list on first open
			if (!galleryItems.length) {
				const figures = Array.from(document.querySelectorAll('#worksGrid figure.card'));
				galleryItems = figures.map((f) => {
					const im = f.querySelector('img');
					const src = im?.getAttribute('data-full') || im?.src || '';
					const caption = (f.querySelector('figcaption')?.textContent || im?.getAttribute('data-caption') || im?.alt || '').trim();
					return { src, caption };
				});
				// Add "More photos" item to the end of gallery
				const currentLang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
				const morePhotosCaption = (window.i18n?.t && window.i18n.t('works.morePhotos')) || 'More photos';
				galleryItems.push({ src: '__more__', caption: morePhotosCaption, isMore: true });
			}
			const src = img.getAttribute('data-full') || img.src;
			const caption = (fig?.querySelector('figcaption')?.textContent || img.getAttribute('data-caption') || img.alt || '').trim();
			const index = Array.from(document.querySelectorAll('#worksGrid figure.card')).indexOf(fig);
			openLightbox(src, caption, index);
		});

		function showAt(i) {
			if (!galleryItems.length) return;
			const total = galleryItems.length;
			galleryIndex = (i + total) % total;
			const item = galleryItems[galleryIndex];
			if (item.isMore) {
				const currentLang = (window.i18n?.getLanguage && window.i18n.getLanguage()) || 'en';
				const morePhotosCaption = (window.i18n?.t && window.i18n.t('works.morePhotos')) || 'More photos';
				openLightbox('__more__', morePhotosCaption, galleryIndex);
			} else {
				openLightbox(item.src, item.caption, galleryIndex);
			}
		}

		lbPrev?.addEventListener('click', () => showAt(galleryIndex - 1));
		lbNext?.addEventListener('click', () => showAt(galleryIndex + 1));

        function selectLang(value, lang) {
            if (value && typeof value === 'object' && (value.en || value.uk)) {
                return value[lang] || value.en || value.uk || '';
            }
            return value ?? '';
        }

        function escapeHtml(str) {
			return String(str)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');
		}
	})();
})();


