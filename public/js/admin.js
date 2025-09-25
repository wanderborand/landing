(function() {
	const API_BASE = (location.origin && location.origin !== 'null') ? location.origin : 'http://localhost:3000';
	const form = document.getElementById('postForm');
	const postsTableBody = document.querySelector('#postsTable tbody');
	const submitBtn = document.getElementById('submitBtn');
	const resetBtn = document.getElementById('resetBtn');
	const idInput = document.getElementById('postId');
	const statusEl = form?.querySelector('.form-status');
	const storageBadge = null;
	const syncBtn = null;

	const LS_KEY = 'mfs_posts';
	let storageMode = 'api'; // 'api' | 'local'

	function getLocalPosts() {
		try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
	}
	function saveLocalPosts(posts) {
		localStorage.setItem(LS_KEY, JSON.stringify(posts));
	}
	function nextLocalId(posts) {
		const max = posts.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0);
		return String(max + 1);
	}

	function fileToDataURL(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	function setError(id, msg) {
		const p = form.querySelector(`[data-error-for="${id}"]`);
		if (p) p.textContent = msg || '';
	}

	function clearErrors() {
		['image','title','description'].forEach(id => setError(id, ''));
		if (statusEl) statusEl.textContent = '';
	}

	async function fetchPosts() {
		try {
			const res = await fetch(`${API_BASE}/api/posts`);
			if (!res.ok) throw new Error(`Failed to load posts (${res.status})`);
			storageMode = 'api';
			return await res.json();
		} catch (err) {
			storageMode = 'local';
			return getLocalPosts();
		}
	}

	function renderPosts(posts) {
		postsTableBody.innerHTML = '';
		if (!posts.length) {
			postsTableBody.innerHTML = '<tr><td colspan="5">No posts yet.</td></tr>';
			return;
		}
		for (const p of posts) {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td><img class="preview" src="${p.imageUrl}" alt="${p.title}" /></td>
				<td>${escapeHtml(p.title)}</td>
				<td>${escapeHtml(p.description)}</td>
				<td><span class="badge">${new Date(p.createdAt || p.updatedAt || Date.now()).toLocaleString()}</span></td>
				<td>
					<div class="actions">
					<button class="btn" data-action="edit" data-id="${p.id}">${(window.i18n?.t('admin.table.edit') || 'Edit')}</button>
					<button class="btn" data-action="delete" data-id="${p.id}" style="background:transparent;color:#fca5a5;border:1px solid rgba(255,255,255,.18);">${(window.i18n?.t('admin.table.delete') || 'Delete')}</button>
					</div>
				</td>
			`;
			postsTableBody.appendChild(tr);
		}
	}

	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	async function load() {
		try {
			const posts = await fetchPosts();
			renderPosts(posts);
			if (statusEl) statusEl.textContent = '';
		} catch (e) {
			if (statusEl) statusEl.textContent = 'Error loading posts.';
		}
	}

	function resetForm() {
		form.reset();
		idInput.value = '';
		submitBtn.textContent = 'Create Post';
		clearErrors();
	}

	resetBtn?.addEventListener('click', (e) => {
		e.preventDefault();
		resetForm();
	});

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		clearErrors();
		const formData = new FormData(form);
		const isEdit = Boolean(idInput.value);
		try {
			let res;
			if (storageMode === 'api') {
				if (isEdit) {
					res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(idInput.value)}`, { method: 'PUT', body: formData });
				} else {
					if (!formData.get('image')) { setError('image', (window.i18n?.t('admin.table.needImage') || 'Please choose an image')); return; }
					res = await fetch(`${API_BASE}/api/posts`, { method: 'POST', body: formData });
				}
				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || (window.i18n?.t('admin.table.submitFail') || 'Request failed'));
				statusEl.textContent = isEdit ? (window.i18n?.t('admin.table.updated') || 'Post updated.') : (window.i18n?.t('admin.table.created') || 'Post created.');
				resetForm();
				await load();
			} else {
				// Local fallback create/update
				const title = formData.get('title')?.toString().trim();
				const description = formData.get('description')?.toString().trim();
				if (!title) { setError('title', (window.i18n?.t('admin.table.needTitle') || 'Please enter a title')); return; }
				if (!description) { setError('description', (window.i18n?.t('admin.table.needDesc') || 'Please enter a description')); return; }
				const posts = getLocalPosts();
				if (isEdit) {
					const id = String(idInput.value);
					const idx = posts.findIndex(p => String(p.id) === id);
					if (idx === -1) throw new Error('Post not found locally');
					let imageUrl = posts[idx].imageUrl;
					const file = formData.get('image');
					if (file && file.size) {
						imageUrl = await fileToDataURL(file);
					}
					posts[idx] = { ...posts[idx], title, description, imageUrl, updatedAt: new Date().toISOString() };
					saveLocalPosts(posts);
					statusEl.textContent = (window.i18n?.t('admin.table.localUpdated') || 'Post updated (local).');
				} else {
					const file = formData.get('image');
					if (!file || !file.size) { setError('image', (window.i18n?.t('admin.table.needImage') || 'Please choose an image')); return; }
					const imageUrl = await fileToDataURL(file);
					const post = { id: nextLocalId(posts), title, description, imageUrl, createdAt: new Date().toISOString() };
					posts.unshift(post);
					saveLocalPosts(posts);
					statusEl.textContent = (window.i18n?.t('admin.table.localCreated') || 'Post created (local).');
				}
				resetForm();
				await load();
			}
		} catch (err) {
			statusEl.textContent = err.message || (window.i18n?.t('admin.table.submitFail') || 'Failed to submit. Ensure the server is running.');
		}
	});

// removed sync button and inline control mode

	postsTableBody?.addEventListener('click', async (e) => {
		const btn = e.target.closest('button[data-action]');
		if (!btn) return;
		const id = btn.getAttribute('data-id');
		const action = btn.getAttribute('data-action');
		if (action === 'delete') {
			if (!confirm(window.i18n?.t('admin.table.confirmDelete') || 'Delete this post?')) return;
			if (storageMode === 'api') {
				const res = await fetch(`${API_BASE}/api/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
				if (res.ok) { await load(); }
				else {
					const data = await res.json().catch(() => ({}));
					statusEl.textContent = data?.error || (window.i18n?.t('admin.table.deleteFail') || 'Failed to delete.');
				}
			} else {
				const posts = getLocalPosts();
				const idx = posts.findIndex(p => String(p.id) === String(id));
				if (idx !== -1) { posts.splice(idx, 1); saveLocalPosts(posts); }
				await load();
			}
		} else if (action === 'edit') {
			// Prefill form
			try {
				const posts = await fetchPosts();
				const post = posts.find(p => String(p.id) === String(id));
				if (!post) return;
				idInput.value = post.id;
				document.getElementById('title').value = post.title;
				document.getElementById('description').value = post.description;
				submitBtn.textContent = (window.i18n?.t('admin.form.update') || 'Update Post');
				document.getElementById('image').value = '';
				statusEl.textContent = storageMode === 'local' ? (window.i18n?.t('admin.table.editingLocal') || 'Editing (local): choose a new image to replace.') : (window.i18n?.t('admin.table.editing') || 'Editing mode: choose a new image to replace.');
				window.location.hash = '#create';
			} catch {}
		}
	});

	load();
})();


