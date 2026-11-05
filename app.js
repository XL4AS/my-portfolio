let allProjects = [];

async function loadProjects() {
  try {
    const res = await fetch('data.json?t=' + new Date().getTime()); // Hindari cache browser
    allProjects = await res.json();
    renderProjects(allProjects);
  } catch (err) {
    console.error('Gagal memuat data proyek:', err);
  }
}

function renderProjects(projects) {
  const container = document.getElementById('project-list');
  container.innerHTML = '';

  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';

    let filePreview = '';
    if (p.kategori === '3d' && p.file_path) {
      filePreview = `<model-viewer src="${p.file_path}" camera-controls auto-rotate style="width:100%; height:200px;"></model-viewer>`;
    } else if (p.file_path) {
      filePreview = `<img src="${p.file_path}" alt="${p.judul}" style="width:100%; height:auto;">`;
    }

    card.innerHTML = `
      ${filePreview}
      <h3>${p.judul}</h3>
      <p><strong>Kategori:</strong> ${p.kategori.toUpperCase()}</p>
      <p>${p.deskripsi}</p>
      ${p.link ? `<a href="${p.link}" target="_blank">Lihat Proyek</a>` : ''}
    `;

    container.appendChild(card);
  });
}

function filterCategory(cat) {
  if (cat === 'all') {
    renderProjects(allProjects);
  } else {
    const filtered = allProjects.filter(p => p.kategori === cat);
    renderProjects(filtered);
  }
}

document.addEventListener('DOMContentLoaded', loadProjects);
