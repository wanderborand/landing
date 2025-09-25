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
		for (const p of posts) {
			const fig = document.createElement('figure');
			fig.className = 'card';
			fig.innerHTML = `
				<img src="${p.imageUrl}" alt="${escapeHtml(p.title)}" data-full="${p.imageUrl}">
				<figcaption>${escapeHtml(p.description)}</figcaption>
			`;
			frag.appendChild(fig);
		}
		grid.innerHTML = '';
		grid.appendChild(frag);

		// Lightbox setup
		const lightbox = document.getElementById('lightbox');
		const imgEl = document.getElementById('lightboxImage');
		const capEl = document.getElementById('lightboxCaption');
		function openLightbox(src, caption) {
			imgEl.src = src;
			capEl.textContent = caption || '';
			lightbox.setAttribute('aria-hidden', 'false');
		}
		function closeLightbox() {
			lightbox.setAttribute('aria-hidden', 'true');
			imgEl.src = '';
			capEl.textContent = '';
		}
		lightbox?.addEventListener('click', (e) => {
			if (e.target.hasAttribute('data-close')) closeLightbox();
		});
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') closeLightbox();
		});
		document.getElementById('worksGrid')?.addEventListener('click', (e) => {
			const img = e.target.closest('img');
			if (!img) return;
			const src = img.getAttribute('data-full') || img.src;
			const caption = img.nextElementSibling?.textContent || '';
			openLightbox(src, caption);
		});

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


