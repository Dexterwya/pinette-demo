/* Pinette demo: live catalog from the Shopify store (products.json allows cross-origin reads) */
const STORE = "https://www.pinettelb.com";
const COLS = [
  ["phone-cases", "iPhone"], ["ipad-covers", "iPad"], ["macbook-covers", "MacBook"],
  ["airpods", "AirPods"], ["watch-straps", "Watch straps"], ["stick-it", "Stick-it"], ["accessories", "Accessories"]
];
const COL_NAME = Object.fromEntries(COLS);
const BLURB = {
  "phone-cases": "A printed case cut for your exact iPhone, so buttons and camera line up perfectly.",
  "ipad-covers": "A trifold iPad cover with a built-in pen holder and a transparent back that lets your iPad's colour show through.",
  "macbook-covers": "A hard-shell MacBook cover in a print you'll love. Pick your exact model below.",
  "airpods": "A printed AirPods case that matches your phone case and iPad cover.",
  "watch-straps": "An Apple Watch strap that goes with everything you wear.",
  "stick-it": "Stick it on your phone, laptop or bottle and make it yours.",
  "accessories": "Cute little extras to finish your look.",
  "other": "Cute little extras to finish your look."
};
const imgUrl = (src, w) => src + (src.includes("?") ? "&" : "?") + "width=" + w;
const money = n => "$" + Number(n).toFixed(2);
const hashN = (s, mod) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % mod; };

async function loadCatalog() {
  try { const c = sessionStorage.getItem("pin_cat_v2"); if (c) return JSON.parse(c); } catch (e) {}
  const j = u => fetch(u).then(r => r.json()).catch(() => ({ products: [] }));
  const [all, ...lists] = await Promise.all([
    j(STORE + "/products.json?limit=250"),
    ...COLS.map(([h]) => j(`${STORE}/collections/${h}/products.json?limit=250`))
  ]);
  const colOf = {}, rank = {};
  lists.forEach((l, i) => l.products.forEach((p, k) => {
    if (!colOf[p.handle]) { colOf[p.handle] = COLS[i][0]; rank[p.handle] = k; }
  }));
  const newest = [...all.products].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map(p => p.handle);
  const data = all.products.filter(p => p.images.length).map(p => {
    const v = p.variants.map(x => ({ id: x.id, n: [x.option1, x.option2].filter(Boolean).join(" / "), a: x.available, p: +x.price, cp: +(x.compare_at_price || 0) }));
    const price = Math.min(...v.map(x => x.p));
    const cmp = Math.max(...v.map(x => x.cp));
    const availRatio = v.filter(x => x.a).length / v.length;
    return {
      h: p.handle, t: p.title.trim(), c: colOf[p.handle] || "other", r: rank[p.handle] ?? 99,
      o: p.options[0]?.name || "Option", p: price, cp: cmp > price ? cmp : 0,
      i: p.images.map(x => x.src), v,
      isNew: newest.includes(p.handle), low: availRatio > 0 && availRatio < 0.45, soldOut: availRatio === 0,
      reviews: 18 + hashN(p.handle, 290), rating: (4.6 + hashN(p.handle + "r", 4) / 10).toFixed(1)
    };
  });
  try { sessionStorage.setItem("pin_cat_v2", JSON.stringify(data)); } catch (e) {}
  return data;
}

function badgeFor(x) {
  if (x.soldOut) return ["", "Sold out"];
  if (x.r <= 1) return ["hot", "Bestseller"];
  if (x.isNew) return ["", "New"];
  if (x.low) return ["low", "Almost gone"];
  return null;
}

function productCard(x) {
  const save = x.cp ? `<s>${money(x.cp)}</s><span class="save">Save ${Math.round((1 - x.p / x.cp) * 100)}%</span>` : "";
  const b = badgeFor(x);
  const url = `product.html?p=${encodeURIComponent(x.h)}`;
  return `<article class="card">
   <div class="mwrap">
    <a class="media" href="${url}" aria-label="${x.t}">
     ${b ? `<span class="badge ${b[0]}">${b[1]}</span>` : ""}
     <img loading="lazy" src="${imgUrl(x.i[0], 500)}" srcset="${imgUrl(x.i[0], 360)} 360w, ${imgUrl(x.i[0], 600)} 600w" sizes="(max-width:1000px) 50vw, 25vw" width="500" height="500" alt="${x.t}">
     ${x.i[1] ? `<img class="alt" loading="lazy" src="${imgUrl(x.i[1], 500)}" width="500" height="500" alt="">` : ""}
    </a>
    ${x.soldOut ? "" : `<button class="quick" data-qh="${x.h}" aria-label="Quick add ${x.t}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="14" rx="2.5"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/><path d="M12 11v6M9 14h6"/></svg><span>Quick add</span></button>`}
   </div>
   <div class="meta">
    <div class="rv"><span class="stars" aria-hidden="true">★★★★★</span>${x.reviews} reviews</div>
    <h3><a href="${url}">${x.t}</a></h3>
    <div class="price">${x.v.length > 1 && x.v.some(v => v.p !== x.p) ? "From " : ""}${money(x.p)}${save}</div>
   </div></article>`;
}

/* quick add: pick the exact model before adding */
let QA = null, QV = null;
function qaEnsure() {
  if (document.getElementById("qa")) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="qa-scrim" data-qa-close></div>
  <div class="qa" id="qa" role="dialog" aria-modal="true" aria-labelledby="qaTitle" aria-hidden="true">
    <button class="icon-btn qa-x" aria-label="Close" data-qa-close><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg></button>
    <div class="qa-top"><img id="qaImg" src="" width="96" height="96" alt=""><div><div class="rv"><span class="stars" aria-hidden="true">★★★★★</span><span id="qaRv"></span></div><h3 id="qaTitle"></h3><div class="price" id="qaPrice"></div></div></div>
    <div class="qa-lab" id="qaLab"></div>
    <div class="models" id="qaOpts"></div>
    <button class="btn btn-primary qa-add" id="qaAdd">Add to bag</button>
    <a class="qa-more" id="qaMore" href="#">View full details</a>
  </div>`);
  document.querySelectorAll("[data-qa-close]").forEach(e => e.addEventListener("click", qaClose));
  document.addEventListener("keydown", e => { if (e.key === "Escape") qaClose(); });
  document.getElementById("qaOpts").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    QV = QA.v.find(v => String(v.id) === b.dataset.vid); qaDraw();
  });
  document.getElementById("qaAdd").addEventListener("click", () => {
    if (!QV) { document.getElementById("qaLab").classList.add("err"); return; }
    window.add({ n: QA.t, p: QV.p, src: QA.i[0], v: QV.n }, 1, true);
    qaClose(); window.openCart && window.openCart();
  });
}
function qaDraw() {
  const $q = id => document.getElementById(id);
  $q("qaOpts").innerHTML = QA.v.map(v => `<button aria-pressed="${QV && v.id === QV.id}" ${v.a ? "" : "disabled title='Sold out'"} data-vid="${v.id}">${v.n.replace(/^iPhone /, "")}</button>`).join("");
  $q("qaPrice").innerHTML = money(QV ? QV.p : QA.p) + (QA.cp ? ` <s>${money(QA.cp)}</s>` : "");
  $q("qaAdd").textContent = QV ? `Add to bag · ${money(QV.p)}` : `Choose your ${QA.o.toLowerCase()}`;
  $q("qaAdd").classList.toggle("is-wait", !QV);
  $q("qaLab").classList.remove("err");
}
function openQuick(x) {
  const avail = x.v.filter(v => v.a);
  if (x.v.length === 1 || avail.length === 1 && x.v.length === 1) { window.add({ n: x.t, p: avail[0].p, src: x.i[0], v: avail[0].n }); return; }
  qaEnsure(); QA = x; QV = null;
  const $q = id => document.getElementById(id);
  $q("qaImg").src = imgUrl(x.i[0], 200); $q("qaTitle").textContent = x.t; $q("qaRv").textContent = ` ${x.reviews} reviews`;
  $q("qaLab").textContent = "Choose your " + x.o.toLowerCase(); $q("qaMore").href = `product.html?p=${encodeURIComponent(x.h)}`;
  qaDraw();
  document.body.classList.add("qa-open"); $q("qa").setAttribute("aria-hidden", "false");
}
function qaClose() { document.body.classList.remove("qa-open"); const q = document.getElementById("qa"); if (q) q.setAttribute("aria-hidden", "true"); }
