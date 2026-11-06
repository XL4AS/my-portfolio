const REPO_NAME = 'my-portfolio';

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
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('gh-username');
    const tokenInput = document.getElementById('gh-token');
    const status = document.getElementById('status-msg');
    const btn = document.getElementById('btn-submit');

    if (!usernameInput || !tokenInput) return;

    const username = usernameInput.value.trim();
    const token = tokenInput.value.trim();

    if (!username || !token) {
      alert('Masukkan Username dan Token GitHub terlebih dahulu!');
      return;
    }

    btn.disabled = true;
    status.textContent = 'Memproses...';

    try {
      const judul = document.getElementById('judul').value;
      const kategori = document.getElementById('kategori').value;
      const deskripsi = document.getElementById('deskripsi').value;
      const link = document.getElementById('link').value;
      const fileInput = document.getElementById('file-input').files[0];

      let filePath = '';

      // 1. Upload file lampiran (jika ada) ke folder uploads/ di GitHub
      if (fileInput) {
        status.textContent = 'Mengunggah file ke GitHub...';
        const base64File = await fileToBase64(fileInput);
        const cleanFileName = fileInput.name.replace(/\s+/g, '_');
        const fileName = `${Date.now()}_${cleanFileName}`;
        filePath = `uploads/${fileName}`;

        const uploadRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/${filePath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Upload file ${fileName}`,
            content: base64File
          })
        });

        if (!uploadRes.ok) {
          throw new Error('Gagal mengunggah file ke GitHub. Periksa kembali token Anda.');
        }
      }

      // 2. Ambil file data.json terkini untuk mendapatkan SHA
      status.textContent = 'Membaca data.json...';
      const getJsonRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
        headers: { 'Authorization': `token ${token}` }
      });

      let currentData = [];
      let fileSha = null;

      if (getJsonRes.ok) {
        const jsonMetaData = await getJsonRes.json();
        fileSha = jsonMetaData.sha;
        // Decode data.json dari Base64
        const decodedString = decodeURIComponent(escape(atob(jsonMetaData.content)));
        currentData = JSON.parse(decodedString);
      }

      // 3. Tambahkan proyek baru ke array data
      const newProject = {
        id: Date.now(),
        judul,
        kategori,
        deskripsi,
        link,
        file_path: filePath
      };
      currentData.push(newProject);

      // 4. Update data.json di GitHub
      status.textContent = 'Memperbarui data.json...';
      const jsonString = JSON.stringify(currentData, null, 2);
      const updatedContentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

      const updatePayload = {
        message: `Tambah proyek: ${judul}`,
        content: updatedContentBase64
      };

      if (fileSha) {
        updatePayload.sha = fileSha;
      }

      const updateRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (updateRes.ok) {
        status.textContent = 'Proyek berhasil disimpan ke repository!';
        form.reset();
      } else {
        const errJson = await updateRes.json();
        throw new Error(errJson.message || 'Gagal memperbarui data.json');
      }

    } catch (err) {
      console.error(err);
      status.textContent = 'Terjadi kesalahan: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });
});
