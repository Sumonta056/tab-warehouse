(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const SETTINGS = [
    {
      name: 'Appearance',
      img: 'settings-appearance.png',
      text: 'Make it yours.',
      items: [
        'Your name: the sidebar says "Alex\'s Warehouse"',
        'Text size for the sidebar, the page and the Board, 80–140%',
        'Accent color: 7 presets or any custom color',
        'Sidebar background: a solid color or a blurred, darkened copy of your Home photo',
      ],
    },
    {
      name: 'Home page',
      img: 'settings-home.png',
      text: 'Everything about Home, with a live preview.',
      items: [
        'Add, remove and drag your Home links',
        'Upload a background; set opacity, darkness, blur and color',
        'Clock size, 24-hour, seconds and date',
        'Icon size, icons per row, space above tiles, open in a new tab',
      ],
    },
    {
      name: 'Bookmarks',
      img: 'settings-bookmarks.png',
      text: 'Choose what the sidebar shows.',
      items: ['Root folder: its subfolders become the sidebar', 'Turn site favicons on or off', 'Reset the sidebar order'],
    },
    {
      name: 'Environments',
      img: 'settings-environments.png',
      text: 'Teach the extension your PROD, TEST, STAGE and LOCAL hosts.',
      items: [
        'Labels: "if the address contains … show …", first match wins',
        'Same site in each version: one row of hosts per site',
        'Try it: type a link and see which label matches and why',
        'Copy both lists as text, paste them on another machine',
      ],
    },
    {
      name: 'Backup',
      img: 'settings-backup.png',
      text: 'Your data, in open formats.',
      items: [
        'Export JSON with links, sections, sidebar order, categories and preferences',
        "Export HTML in Chrome's bookmark format",
        'Import merges and skips URLs you already have',
      ],
    },
  ];

  const tabs = $('.set-tabs');
  const img = $('#setImg');
  const txt = $('#setTxt');
  const showSetting = (i, focus) => {
    const s = SETTINGS[i];
    $$('button', tabs).forEach((b, j) => {
      b.setAttribute('aria-selected', String(i === j));
      b.tabIndex = i === j ? 0 : -1;
      if (i === j && focus) b.focus();
    });
    img.src = `screenshots/${s.img}`;
    img.alt = `Settings, ${s.name} tab`;
    const ul = document.createElement('ul');
    for (const it of s.items) ul.append(Object.assign(document.createElement('li'), { textContent: it }));
    txt.replaceChildren(
      Object.assign(document.createElement('h3'), { textContent: s.name }),
      Object.assign(document.createElement('p'), { textContent: s.text }),
      ul,
    );
  };
  SETTINGS.forEach((s, i) => {
    const b = Object.assign(document.createElement('button'), { textContent: s.name });
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => showSetting(i));
    tabs.append(b);
  });
  tabs.addEventListener('keydown', (e) => {
    const cur = $$('button', tabs).findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') showSetting((cur + 1) % SETTINGS.length, true);
    if (e.key === 'ArrowLeft') showSetting((cur + SETTINGS.length - 1) % SETTINGS.length, true);
  });
  showSetting(0);

  const newtab = $('#demoNewtab');
  const popupLayer = $('#demoPopup');
  const popup = $('#demoPopupFrame');
  const open = $('#demoOpen');
  const title = $('#demoTitle');
  const showDemo = (src) => {
    const isPopup = src.includes('popup');
    $$('.demo-bar [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.src === src)));
    title.textContent = isPopup ? 'Save to Tab Warehouse' : 'New tab';
    open.href = src;
    popupLayer.hidden = !isPopup;
    if (isPopup) popup.src = src;
    else popup.removeAttribute('src');
  };
  $$('.demo-bar [role=tab]').forEach((b) => b.addEventListener('click', () => showDemo(b.dataset.src)));
  window.__twDemoClosePopup = () => showDemo('demo/newtab.html');
  popupLayer.addEventListener('click', (e) => {
    if (e.target === popupLayer) showDemo('demo/newtab.html');
  });
  $('#demoReset').addEventListener('click', () => {
    delete window.__twDemo;
    showDemo('demo/newtab.html');
    newtab.contentWindow.location.reload();
  });
  $$('[data-demo]').forEach((a) =>
    a.addEventListener('click', () => {
      const board = a.dataset.demo === 'board';
      showDemo(board ? 'demo/newtab.html' : `demo/${a.dataset.demo}.html`);
      if (board) newtab.contentDocument?.getElementById('boardBtn')?.click();
    }),
  );

  const REPO = 'Sumonta056/tab-warehouse';
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => {
      const zip = (rel.assets || []).find((x) => x.name.endsWith('.zip'));
      const version = rel.tag_name.replace(/^v/, '');
      const date = new Date(rel.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      $('#dlBtn').href = zip ? zip.browser_download_url : `https://github.com/${REPO}/archive/refs/tags/${rel.tag_name}.zip`;
      $('#dlLabel').textContent = `Download v${version}`;
      $('#dlMeta').textContent = `Version ${version} · ${date}${zip ? ` · ${Math.max(1, Math.round(zip.size / 1024))} KB` : ''}`;
      $$('.file.zip').forEach((el) => (el.textContent = zip ? zip.name : `tab-warehouse-${version}.zip`));
    })
    .catch(() => {});

  const copyBtn = $('#copyUrl');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      copyBtn.textContent = 'Copied';
    } catch {
      copyBtn.textContent = 'Select and copy';
    }
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1600);
  });

  const zoom = $('#zoom');
  const zoomImg = $('img', zoom);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('img[data-zoom]');
    if (!t) return;
    zoomImg.src = t.currentSrc || t.src;
    zoomImg.alt = t.alt;
    zoom.showModal();
  });
  zoom.addEventListener('click', () => zoom.close());

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    $$('.feature, .tut > li, .dl-card, .panel, .rules').forEach((el) => {
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
