const REPO_NAME = 'my-portfolio';
let cachedProjects = []; // Menyimpan data proyek yang sedang dibuka

// Fungsi konversi File ke Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('add-project-form');
  const btnRefresh = document.getElementById('btn-refresh-list');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');

  // Load daftar proyek saat tombol Refresh diklik
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadProjectsTable);
  }

  // Batalkan Mode Edit
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      resetFormState();
    });
  }

  // Submit Form (Bisa Tambah Baru atau Update Edit)
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('gh-username').value.trim();
      const token = document.getElementById('gh-token').value.trim();
      const status = document.getElementById('status-msg');
      const btn = document.getElementById('btn-submit');
      const editId = document.getElementById('edit-project-id').value;

      if (!username || !token) {
        alert('Konfigurasi username atau token GitHub tidak ditemukan di HTML!');
        return;
      }

      btn.disabled = true;
      status.textContent = 'Memproses ke GitHub...';

      try {
        const judul = document.getElementById('judul').value;
        const kategori = document.getElementById('kategori').value;
        const deskripsi = document.getElementById('deskripsi').value;
        const link = document.getElementById('link').value;
        const fileInput = document.getElementById('file-input').files[0];

        // 1. Ambil data.json terkini dari repo
        const jsonRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!jsonRes.ok) throw new Error('Gagal mengambil data.json dari GitHub.');
        const jsonMetaData = await jsonRes.json();
        const currentSha = jsonMetaData.sha;

        // Decode base64 UTF-8 secara aman
        const binaryString = atob(jsonMetaData.content.replace(/\s/g, ''));
        const bytes = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
        const decodedString = new TextDecoder().decode(bytes);
        let projects = JSON.parse(decodedString);

        let filePath = '';
        if (editId) {
          const existing = projects.find(p => p.id == editId);
          if (existing) filePath = existing.file_path || '';
        }

        // 2. Upload file jika ada file baru yang dipilih
        if (fileInput) {
          status.textContent = 'Mengunggah lampiran file...';
          const base64File = await fileToBase64(fileInput);
          const cleanFileName = fileInput.name.replace(/\s+/g, '_');
          const fileName = `${Date.now()}_${cleanFileName}`;
          filePath = `uploads/${fileName}`;

          await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: `Upload ${fileName}`,
              content: base64File
            })
          });
        }

        // 3. Tambah Baru vs Update Data
        if (editId) {
          projects = projects.map(p => {
            if (p.id == editId) {
              return { ...p, judul, kategori, deskripsi, link, file_path: filePath };
            }
            return p;
          });
          status.textContent = 'Memperbarui data proyek...';
        } else {
          const newProj = {
            id: Date.now(),
            judul,
            kategori,
            deskripsi,
            link,
            file_path: filePath
          };
          projects.push(newProj);
          status.textContent = 'Menambahkan proyek baru...';
        }

        // 4. Update data.json di GitHub
        const jsonString = JSON.stringify(projects, null, 2);
        const updatedContentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

        const updateRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: editId ? `Edit proyek: ${judul}` : `Tambah proyek: ${judul}`,
            content: updatedContentBase64,
            sha: currentSha
          })
        });

        if (updateRes.ok) {
          status.textContent = editId ? 'Proyek berhasil diperbarui!' : 'Proyek berhasil ditambahkan!';
          resetFormState();
          loadProjectsTable();
        } else {
          throw new Error('Gagal memperbarui data.json di GitHub');
        }

      } catch (err) {
        console.error(err);
        status.textContent = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }
});

// Fungsi Memuat Tabel Proyek
async function loadProjectsTable() {
  const username = document.getElementById('gh-username')?.value.trim() || 'XL4S';
  const token = document.getElementById('gh-token')?.value.trim() || '';
  const tbody = document.getElementById('project-table-body');

  tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-indigo-400">Memuat data dari GitHub...</td></tr>`;

  try {
    const res = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json?t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Gagal mengambil data.json (Status: ${res.status})`);
    
    const jsonMetaData = await res.json();
    
    const binaryString = atob(jsonMetaData.content.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    const decodedString = new TextDecoder().decode(bytes);
    
    cachedProjects = JSON.parse(decodedString);

    if (!Array.isArray(cachedProjects) || cachedProjects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-500">Belum ada proyek tersimpan.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    cachedProjects.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-800 hover:bg-darkbg/50';
      tr.innerHTML = `
        <td class="py-3 px-4 font-semibold text-white">${p.judul || 'Tanpa Judul'}</td>
        <td class="py-3 px-4"><span class="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded">${(p.kategori || 'umum').toUpperCase()}</span></td>
        <td class="py-3 px-4 text-center space-x-2">
          <button onclick="startEditProject(${p.id})" class="text-xs bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1 rounded-lg transition border border-indigo-500/30">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="deleteProject(${p.id})" class="text-xs bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1 rounded-lg transition border border-red-500/30">
            <i class="fa-solid fa-trash"></i> Hapus
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-red-400">Gagal memuat: ${err.message}</td></tr>`;
  }
}

// Fungsi Menyiapkan Mode Edit
function startEditProject(id) {
  const p = cachedProjects.find(item => item.id == id);
  if (!p) return;

  document.getElementById('edit-project-id').value = p.id;
  document.getElementById('judul').value = p.judul;
  document.getElementById('kategori').value = p.kategori;
  document.getElementById('deskripsi').value = p.deskripsi;
  document.getElementById('link').value = p.link || '';

  document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-400"></i> Edit Proyek: ${p.judul}`;
  document.getElementById('btn-submit-text').textContent = 'Perbarui Proyek';
  document.getElementById('btn-cancel-edit').classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fungsi Hapus Proyek
async function deleteProject(id) {
  const p = cachedProjects.find(item => item.id == id);
  if (!p) return;

  if (!confirm(`Apakah Anda yakin ingin menghapus proyek "${p.judul}"?`)) return;

  const username = document.getElementById('gh-username')?.value.trim() || 'XL4S';
  const token = document.getElementById('gh-token')?.value.trim() || '';
  const status = document.getElementById('status-msg');

  status.textContent = 'Menghapus proyek dari GitHub...';

  try {
    const jsonRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const jsonMetaData = await jsonRes.json();
    
    const binaryString = atob(jsonMetaData.content.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    const decodedString = new TextDecoder().decode(bytes);
    let projects = JSON.parse(decodedString);

    projects = projects.filter(item => item.id != id);

    const jsonString = JSON.stringify(projects, null, 2);
    const updatedContentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    const updateRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Hapus proyek: ${p.judul}`,
        content: updatedContentBase64,
        sha: jsonMetaData.sha
      })
    });

    if (updateRes.ok) {
      status.textContent = 'Proyek berhasil dihapus!';
      loadProjectsTable();
    } else {
      throw new Error('Gagal memperbarui data.json');
    }

  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

// Reset Form ke Mode Tambah Baru
function resetFormState() {
  document.getElementById('add-project-form').reset();
  document.getElementById('edit-project-id').value = '';
  document.getElementById('form-title').innerHTML = `<i class="fa-solid fa-folder-plus text-indigo-400"></i> Tambah Proyek Baru`;
  document.getElementById('btn-submit-text').textContent = 'Simpan ke Repository';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
}