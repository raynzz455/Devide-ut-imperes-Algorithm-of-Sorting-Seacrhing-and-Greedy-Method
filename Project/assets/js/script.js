document.addEventListener("DOMContentLoaded", () => {

  /*DOM REFERENCES */

  const toc = document.getElementById("toc-content");
  const tocTitle = document.getElementById("toc-title");
  const headings = Array.from(document.querySelectorAll("h1, h2, h3")).slice(1);

  let tocOpened = false;

  /* INITIAL STATE */

  toc.classList.add("hidden");

  tocTitle.addEventListener("click", () => {
    tocOpened = !tocOpened;
    toc.classList.toggle("hidden");
    tocTitle.classList.toggle("active", tocOpened);
  });

  /* BUILD TOC */

  headings.forEach((h, i) => {
    if (!h.id) h.id = `heading_${i}`;

    const item = document.createElement("div");
    item.textContent = h.textContent;
    item.dataset.target = h.id;
    item.title = "double click → go";
    item.dataset.expanded = "false";

    if (h.tagName === "H1") item.className = "toc-h1";
    if (h.tagName === "H2") item.className = "toc-h2 collapsed";
    if (h.tagName === "H3") item.className = "toc-h3 collapsed";

    toc.appendChild(item);
  });

  /* EVENTS */

  toc.addEventListener("click", e => {
    if (!tocOpened) return;

    const el = e.target;
    if (!el.dataset.target) return;

    if (el.classList.contains("toc-h1")) handleH1(el);
    if (el.classList.contains("toc-h2")) handleH2(el);
  });

  toc.addEventListener("dblclick", e => {
    const id = e.target.dataset.target;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  });

  /* H1 CONTROLLER */

  async function handleH1(h1) {
    const h2s = getH2s(h1);
    const descendants = collect(h2s);
    const anyOpen = descendants.some(el => el.dataset.expanded === "true");

    if (anyOpen) {
      await Promise.all(descendants.map(collapse));
      h1.dataset.expanded = "false";
    } else {
      await Promise.all(h2s.map(expand));
      await Promise.all(h2s.flatMap(h2 => getH3s(h2)).map(expand));
      h1.dataset.expanded = "true";
    }
  }

  /*  H2 CONTROLLER */

  async function handleH2(h2) {
    if (hasClosedParent(h2, "toc-h1")) return;

    const h3s = getH3s(h2);
    const anyOpen = h3s.some(el => el.dataset.expanded === "true");

    if (anyOpen) {
      await Promise.all(h3s.map(collapse));
    } else {
      await expand(h2);
      await Promise.all(h3s.map(expand));
    }
  }

  /* ANIMATION CORE */

  function collapse(el) {
    return new Promise(resolve => {
      if (el.dataset.expanded === "false") return resolve();

      el.style.maxHeight = el.scrollHeight + "px";
      el.offsetHeight;

      el.style.transition = "max-height .22s ease, opacity .18s ease";
      el.style.maxHeight = "0";
      el.style.opacity = "0";

      el.addEventListener("transitionend", () => {
        el.classList.add("collapsed");
        el.style.maxHeight = "";
        el.style.opacity = "";
        el.style.transition = "";
        el.dataset.expanded = "false";
        resolve();
      }, { once: true });
    });
  }

  function expand(el) {
    return new Promise(resolve => {
      if (el.dataset.expanded === "true") return resolve();

      el.classList.remove("collapsed");
      el.style.maxHeight = "0";
      el.style.opacity = "0";
      el.offsetHeight;

      el.style.transition = "max-height .22s ease, opacity .18s ease";
      el.style.maxHeight = el.scrollHeight + "px";
      el.style.opacity = "1";

      el.addEventListener("transitionend", () => {
        el.style.maxHeight = "";
        el.style.opacity = "";
        el.style.transition = "";
        el.dataset.expanded = "true";
        resolve();
      }, { once: true });
    });
  }

  /* HELPERS */

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

  function getH2s(h1) {
    const r = [];
    let el = h1.nextElementSibling;
    while (el && !el.classList.contains("toc-h1")) {
      if (el.classList.contains("toc-h2")) r.push(el);
      el = el.nextElementSibling;
    }
    return r;
  }

  function getH3s(h2) {
    const r = [];
    let el = h2.nextElementSibling;
    while (el && !el.classList.contains("toc-h2") && !el.classList.contains("toc-h1")) {
      if (el.classList.contains("toc-h3")) r.push(el);
      el = el.nextElementSibling;
    }
    return r;
  }

  function collect(h2s) {
    return h2s.flatMap(h2 => [h2, ...getH3s(h2)]);
  }

});
