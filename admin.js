const REPO_NAME = 'my-portfolio';

// Konversi File ke Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

document.getElementById('add-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('gh-username').value.trim();
  const token = document.getElementById('gh-token').value.trim();
  const status = document.getElementById('status-msg');
  const btn = document.getElementById('btn-submit');

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
      const fileName = `${Date.now()}_${fileInput.name.replace(/\s+/g, '_')}`; filePath = `uploads/${fileName}`;

      await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/${filePath}`, { method: 'PUT', headers: { 'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload file ${fileName}`,
          content: base64File
        })
      });
    }

    // 2. Ambil file data.json terkini untuk mendapatkan SHA dan Konten lama
    status.textContent = 'Membaca data.json...';
    const getJsonRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, {
      headers: { 'Authorization': `token ${token}` } }); const jsonMetaData = await getJsonRes.json();  // Decode data.json dari Base64 const currentData = JSON.parse(atob(jsonMetaData.content));  // 3. Tambahkan proyek baru const newProject = { id: Date.now(), judul, kategori, deskripsi, link, file_path: filePath }; currentData.push(newProject);  // 4. Update data.json di GitHub status.textContent = 'Memperbarui data.json...'; const updatedContentBase64 = btoa(JSON.stringify(currentData, null, 2));  const updateRes = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}/contents/data.json`, { method: 'PUT', headers: { 'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Tambah proyek: ${judul}`,
        content: updatedContentBase64,
        sha: jsonMetaData.sha
      })
    });

    if (updateRes.ok) {
      status.textContent = 'Proyek berhasil ditambahkan!';
      document.getElementById('add-project-form').reset();
    } else {
      throw new Error('Gagal update data.json');
    }

  } catch (err) {
    console.error(err);
    status.textContent = 'Terjadi kesalahan: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});
