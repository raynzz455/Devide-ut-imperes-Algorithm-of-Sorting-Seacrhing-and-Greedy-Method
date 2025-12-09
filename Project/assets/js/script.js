// Inisialisasi ketika seluruh DOM siap
document.addEventListener("DOMContentLoaded", () => {

  // --------------------------------------------------
  // 1. REFERENSI DOM & STATE AWAL
  // --------------------------------------------------

  // Kontainer isi TOC
  const toc = document.getElementById("toc-content");
  // Tombol/judul TOC yang bisa diklik
  const tocTitle = document.getElementById("toc-title");
  // Ambil semua heading h1, h2, h3 (kecuali heading pertama, biasanya title utama dokumen)
  const headings = Array.from(document.querySelectorAll("h1, h2, h3")).slice(1);

  // Menyimpan status apakah TOC sedang dibuka atau tidak
  let tocOpened = false;

  // Sembunyikan TOC saat awal
  toc.classList.add("hidden");

  // Klik pada judul TOC: toggle tampil/sembunyi TOC
  tocTitle.addEventListener("click", () => {
    tocOpened = !tocOpened;
    toc.classList.toggle("hidden");
    tocTitle.classList.toggle("active", tocOpened);
  });


  // --------------------------------------------------
  // 2. MEMBANGUN TOC SECARA DINAMIS DARI HEADING
  // --------------------------------------------------

  headings.forEach((h, i) => {
    // Jika heading belum punya id, buat id unik
    if (!h.id) h.id = `heading_${i}`;

    // Buat item TOC sebagai <div>
    const item = document.createElement("div");
    item.textContent = h.textContent;     // teks sama dengan teks heading
    item.dataset.target = h.id;           // simpan id heading target untuk scroll
    item.title = "double click → go";     // tooltip
    item.dataset.expanded = "false";      // state awal: tertutup

    // Tentukan kelas berdasarkan level heading
    if (h.tagName === "H1") item.className = "toc-h1";
    if (h.tagName === "H2") item.className = "toc-h2 collapsed";
    if (h.tagName === "H3") item.className = "toc-h3 collapsed";

    // Masukkan item ke dalam kontainer TOC
    toc.appendChild(item);
  });


  // --------------------------------------------------
  // 3. EVENT HANDLER TOC (CLICK & DOUBLE CLICK)
  // --------------------------------------------------

  // Klik di dalam TOC: buka/tutup kelompok H1/H2
  toc.addEventListener("click", e => {
    if (!tocOpened) return;                 // jika TOC tertutup, abaikan
    const el = e.target;
    if (!el.dataset.target) return;         // hanya respons untuk item yang punya target

    if (el.classList.contains("toc-h1")) handleH1(el);
    if (el.classList.contains("toc-h2")) handleH2(el);
  });

  // Double click pada item TOC: scroll ke heading terkait
  toc.addEventListener("dblclick", e => {
    const id = e.target.dataset.target;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  });


  // --------------------------------------------------
  // 4. LOGIKA KONTROL UNTUK H1 (BUKA/TUTUP SEMUA H2/H3 DI BAWAHNYA)
  // --------------------------------------------------

  async function handleH1(h1) {
    // Ambil semua H2 di bawah H1 ini (sampai H1 berikutnya)
    const h2s = getH2s(h1);
    // Ambil H2 dan semua H3 turunannya
    const descendants = collect(h2s);
    // Cek apakah ada yang sedang terbuka
    const anyOpen = descendants.some(el => el.dataset.expanded === "true");

    if (anyOpen) {
      // Jika ada yang terbuka → tutup semua H2 dan H3
      await Promise.all(descendants.map(collapse));
      h1.dataset.expanded = "false";
    } else {
      // Jika semua tertutup → buka semua H2 dan H3
      await Promise.all(h2s.map(expand));
      await Promise.all(h2s.flatMap(h2 => getH3s(h2)).map(expand));
      h1.dataset.expanded = "true";
    }
  }


  // --------------------------------------------------
  // 5. LOGIKA KONTROL UNTUK H2 (BUKA/TUTUP H3 DI BAWAHNYA)
  // --------------------------------------------------

  async function handleH2(h2) {
    // Jika H1 induk dalam keadaan tertutup, abaikan klik
    if (hasClosedParent(h2, "toc-h1")) return;

    const h3s = getH3s(h2);
    const anyOpen = h3s.some(el => el.dataset.expanded === "true");

    if (anyOpen) {
      // Kalau ada H3 yang terbuka → tutup semua H3
      await Promise.all(h3s.map(collapse));
    } else {
      // Kalau semua tertutup → buka H2 ini dan seluruh H3 di bawahnya
      await expand(h2);
      await Promise.all(h3s.map(expand));
    }
  }


  // --------------------------------------------------
  // 6. FUNGSI ANIMASI COLLAPSE / EXPAND ITEM TOC
  // --------------------------------------------------

  // Menutup item TOC dengan animasi (max-height & opacity)
  function collapse(el) {
    return new Promise(resolve => {
      if (el.dataset.expanded === "false") return resolve();

      // Set nilai awal sebelum animasi
      el.style.maxHeight = el.scrollHeight + "px";
      el.offsetHeight; // force reflow

      el.style.transition = "max-height .22s ease, opacity .18s ease";
      el.style.maxHeight = "0";
      el.style.opacity = "0";

      el.addEventListener("transitionend", () => {
        el.classList.add("collapsed");
        // Reset style inline
        el.style.maxHeight = "";
        el.style.opacity = "";
        el.style.transition = "";
        el.dataset.expanded = "false";
        resolve();
      }, { once: true });
    });
  }

  // Membuka item TOC dengan animasi
  function expand(el) {
    return new Promise(resolve => {
      if (el.dataset.expanded === "true") return resolve();

      el.classList.remove("collapsed");
      el.style.maxHeight = "0";
      el.style.opacity = "0";
      el.offsetHeight; // force reflow

      el.style.transition = "max-height .22s ease, opacity .18s ease";
      el.style.maxHeight = el.scrollHeight + "px";
      el.style.opacity = "1";

      el.addEventListener("transitionend", () => {
        // Reset style inline setelah animasi selesai
        el.style.maxHeight = "";
        el.style.opacity = "";
        el.style.transition = "";
        el.dataset.expanded = "true";
        resolve();
      }, { once: true });
    });
  }


  // --------------------------------------------------
  // 7. FUNGSI BANTU (HELPERS) UNTUK STRUKTUR TOC
  // --------------------------------------------------

  // Mengecek apakah elemen punya parent tertentu (cls) yang sedang tertutup
  function hasClosedParent(el, cls) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.classList.contains(cls)) {
        return prev.dataset.expanded !== "true";
      }
      prev = prev.previousElementSibling;
    }
    return false;
  }

  // Ambil semua H2 yang berada di bawah H1 tertentu, sampai bertemu H1 berikutnya
  function getH2s(h1) {
    const r = [];
    let el = h1.nextElementSibling;
    while (el && !el.classList.contains("toc-h1")) {
      if (el.classList.contains("toc-h2")) r.push(el);
      el = el.nextElementSibling;
    }
    return r;
  }

  // Ambil semua H3 yang berada di bawah H2 tertentu, sampai bertemu H2/H1 berikutnya
  function getH3s(h2) {
    const r = [];
    let el = h2.nextElementSibling;
    while (el &&
           !el.classList.contains("toc-h2") &&
           !el.classList.contains("toc-h1")) {
      if (el.classList.contains("toc-h3")) r.push(el);
      el = el.nextElementSibling;
    }
    return r;
  }

  // Mengumpulkan H2 dan seluruh H3 turunannya dalam satu array
  function collect(h2s) {
    return h2s.flatMap(h2 => [h2, ...getH3s(h2)]);
  }

});
```