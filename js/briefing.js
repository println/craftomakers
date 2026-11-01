import { SUGGEST, SECTIONS, PARTS } from "./briefing-data.js";
import { buildOffer, answerId } from "./oferta.js";

const KEY = "craftomakers-briefing-v3";
const SEND = { id: "enviar", title: "Resultado" };
// "Outro" e "Outra" abrem, logo depois, uma pergunta para a pessoa dizer qual.
const OTHER = ["Outro", "Outra"];
SECTIONS.forEach((s) => {
  s.qs = s.qs.flatMap((q) => {
    const opt = q.opts?.find((o) => OTHER.includes(o));
    const out = [q];
    if (opt) out.push({ id: `${q.id}_outro`, parent: q.id, t: q.other || `${opt === "Outra" ? "Qual outra" : "Qual outro"}?`, type: "text", ex: "Escreva aqui",
      when: (d) => [].concat(d[q.id]).includes(opt) && (!q.when || q.when(d)) });
    // Cada dúvida marcada abre "o que você responde?": vira a resposta do FAQ do site.
    if (q.answers) q.opts.filter((o) => !OTHER.includes(o)).forEach((o) => out.push({
      id: answerId(q.id, o), parent: q.id, optional: true, t: `Quando perguntam “${o}”, o que você responde?`, type: "textarea", ex: "Do jeito que você responde no WhatsApp",
      when: (d) => [].concat(d[q.id]).includes(o) && (!q.when || q.when(d)),
    }));
    return out;
  });
});
const QUESTIONS = SECTIONS.flatMap((s) => s.qs);

const form = document.getElementById("form");
const steps = document.getElementById("steps");
const prev = document.getElementById("prev");
const next = document.getElementById("next");
const count = document.getElementById("count");
const fill = document.getElementById("fill");
const msg = document.getElementById("msg");
const enter = document.getElementById("enter");
const need = document.getElementById("need");
const nextText = document.getElementById("next-text");
const dots = document.getElementById("dots");
const deck = document.getElementById("deck");
const phases = document.getElementById("phases");
const phaseName = document.getElementById("phase-name");
const menu = document.getElementById("menu");
const menuList = document.getElementById("menu-list");

const state = { step: 0, q: 0, slide: 0 };
const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// As respostas do momento, para as perguntas que dependem de outra (when).
let answers = {};
const visible = (q) => !q.when || q.when(answers);
const isOpt = (q) => (typeof q.optional === "function" ? q.optional(answers) : Boolean(q.optional));

function control(q) {
  const ph = q.ex ? ` placeholder="${esc(q.ex)}"` : "";
  if (q.type === "textarea") {
    return `<textarea class="input textarea${q.big ? " textarea-big" : ""}" id="${q.id}" name="${q.id}"${ph}></textarea>`;
  }
  if (q.type === "radio" || q.type === "check") {
    const kind = q.type === "radio" ? "radio" : "checkbox";
    return `<div class="choice-list">${q.opts.map((o, i) => `<label class="choice"><input class="choice-input" type="${kind}" name="${q.id}" value="${esc(o)}"><span class="choice-text"><span class="choice-key" aria-hidden="true">${KEYS[i]}</span>${esc(o)}</span></label>`).join("")}</div>`;
  }
  if (q.type === "pairs") {
    return `<div class="pair-list" id="${q.id}"></div>
      <button class="pill pair-add" type="button" data-pair-add="${q.id}"><svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg>${esc(q.add)}</button>`;
  }
  if (q.type === "palette") {
    return `<div class="swatch-board"><div class="swatch-list" id="${q.id}"></div>
      <button class="swatch-add" type="button" data-add="${q.id}"><svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg>Adicionar cor</button></div>
      <div class="choice-list"><label class="choice"><input class="choice-input" type="checkbox" name="${q.id}_suggest"><span class="choice-text"><span class="choice-key" aria-hidden="true">A</span>${SUGGEST}</span></label></div>`;
  }
  // A caixa ao lado do campo (alt) tem a mesma cara das opções: letra e pílula.
  const alt = q.alt ? `<div class="choice-list"><label class="choice"><input class="choice-input" type="checkbox" name="${q.id}_alt"><span class="choice-text"><span class="choice-key" aria-hidden="true">A</span>${esc(q.alt)}</span></label></div>` : "";
  const field = `<input class="input" type="${q.type === "url" ? "text" : q.type}" id="${q.id}" name="${q.id}"${q.max ? ` maxlength="${q.max}"` : ""}${ph}`;
  const chips = q.multi ? `<div class="bf-chips" id="${q.id}-chips"></div>` : "";
  if (q.list) return `${chips}<div class="bf-combo">${field} role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${q.id}-list"><ul class="bf-options" id="${q.id}-list" role="listbox" hidden></ul></div>${alt}`;
  return `${field}>${alt}`;
}

function question(q) {
  const group = ["radio", "check", "palette"].includes(q.type);
  const title = group
    ? `<p class="bf-question-title" id="${q.id}-t"><span class="bf-question-num"></span>${esc(q.t)}</p>`
    : `<label class="bf-question-title" for="${q.id}"><span class="bf-question-num"></span>${esc(q.t)}</label>`;
  const attrs = group ? ` role="group" aria-labelledby="${q.id}-t"` : "";
  // O "?" ao lado da pergunta abre os passos de ajuda, embaixo do título.
  const head = q.help
    ? `<div class="bf-question-head">${title}<button class="bf-help" type="button" data-help="${q.id}" aria-expanded="false" aria-controls="${q.id}-help" aria-label="Como fazer">?</button></div>
      <ol class="bf-help-box" id="${q.id}-help" hidden>${q.help.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>`
    : title;
  return `<div class="bf-question" data-q="${q.id}"${attrs}>${head}${control(q)}</div>`;
}

const partOf = (id) => PARTS.findIndex((p) => p.ids.includes(id));

function renderForm() {
  form.innerHTML = SECTIONS.map((s) => `
    <section class="bf-panel" id="${s.id}" hidden>
      <p class="bf-part-tag">Fase ${partOf(s.id) + 1}/${PARTS.length} · ${esc(PARTS[partOf(s.id)].title)}</p>
      <h2 class="display display-sm">${esc(s.title)}</h2>
      ${s.hint ? `<p class="bf-panel-hint">${esc(s.hint)}</p>` : ""}
      ${s.qs.map(question).join("")}
    </section>`).join("") + PARTS.slice(0, -1).map((p, i) => `
    <section class="bf-panel" id="pausa-${i + 1}" hidden>
      <p class="bf-part-tag">Fase ${i + 1}/${PARTS.length}</p>
      <h2 class="display display-sm">${esc(p.title)}: pronto</h2>
      <div class="bf-send">
        <p class="bf-panel-hint">Fica salvo neste navegador. Pode parar aqui e continuar depois.</p>
        <div class="bf-send-actions">
          <button class="pill pill-dark" type="button" data-action="forward">Continuar: ${esc(PARTS[i + 1].title)}<svg class="icon" aria-hidden="true"><use href="#icon-next"/></svg></button>
          <button class="pill" type="button" data-action="phases"><svg class="icon" aria-hidden="true"><use href="#icon-up"/></svg>Ver as fases</button>
        </div>
      </div>
    </section>`).join("") + `
    <section class="bf-panel" id="${SEND.id}" hidden>
      <h2 class="display display-sm">Resultado</h2>
      <div class="bf-send">
        <p class="bf-panel-hint" id="summary"></p>
        <div class="bf-send-actions">
          <button class="pill pill-dark" type="button" data-action="pdf"><svg class="icon" aria-hidden="true"><use href="#icon-download"/></svg>Baixar PDF</button>
        </div>
        <div class="bf-review" id="review"></div>
      </div>
    </section>`;

}

// Sugestões enquanto digita (as cidades do IBGE), numa lista no estilo do formulário. O arquivo só
// é baixado quando a pessoa chega no campo; ela pode digitar o que quiser.
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function loadLists() {
  QUESTIONS.filter((q) => q.list).forEach((q) => {
    const input = document.getElementById(q.id);
    const box = document.getElementById(`${q.id}-list`);
    let items = [];
    let shown = [];
    let active = -1;

    const close = () => { box.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
    const paint = () => {
      box.innerHTML = shown.map((v, i) => `<li class="bf-option${i === active ? " is-active" : ""}" id="${q.id}-opt-${i}" role="option" aria-selected="${i === active}">${esc(v)}</li>`).join("");
      if (active >= 0) { input.setAttribute("aria-activedescendant", `${q.id}-opt-${active}`); box.children[active].scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    };
    const pick = (v) => {
      if (q.multi) { addChip(q.id, v); input.value = ""; } else input.value = v;
      close();
      save();
    };
    const suggest = () => {
      const typed = fold(input.value.trim());
      if (!typed) return close();
      const starts = items.filter((v) => v.key.startsWith(typed));
      const inside = items.filter((v) => !v.key.startsWith(typed) && v.key.includes(typed));
      shown = [...starts, ...inside].slice(0, 5).map((v) => v.value);
      active = -1;
      if (!shown.length || (shown.length === 1 && shown[0] === input.value)) return close();
      paint();
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };

    input.addEventListener("focus", async () => {
      if (items.length) return;
      try { items = (await (await fetch(q.list)).json()).map((value) => ({ value, key: fold(value) })); } catch (e) {}
      if (document.activeElement === input) suggest();
    });
    input.addEventListener("input", suggest);
    input.addEventListener("blur", close);
    // Setas andam pela lista, Enter escolhe (sem passar de pergunta), Esc fecha.
    input.addEventListener("keydown", (e) => {
      // Várias respostas: Enter com texto e sem sugestão escolhida vira etiqueta, sem passar de pergunta.
      if (q.multi && e.key === "Enter" && input.value.trim() && (box.hidden || active < 0)) {
        e.preventDefault();
        e.stopPropagation();
        pick(input.value.trim());
        return;
      }
      if (box.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = shown.length;
        active = e.key === "ArrowDown" ? (active + 1) % n : (active - 1 + n) % n;
        paint();
      } else if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        e.stopPropagation();
        pick(shown[active]);
      } else if (e.key === "Escape") close();
    });
    box.addEventListener("pointerdown", (e) => {
      const li = e.target.closest(".bf-option");
      if (!li) return;
      e.preventDefault();
      pick(li.textContent);
    });
  });
}

// Etiqueta de uma resposta (as cidades): o X tira.
function addChip(id, value) {
  const box = document.getElementById(`${id}-chips`);
  if ([...box.children].some((c) => c.dataset.value === value)) return;
  const chip = document.createElement("span");
  chip.className = "bf-chip";
  chip.dataset.value = value;
  chip.innerHTML = `${esc(value)}<button type="button" aria-label="Tirar ${esc(value)}"><svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg></button>`;
  chip.querySelector("button").addEventListener("click", () => { chip.remove(); save(); });
  box.append(chip);
}

// Pares de campos (nome e link de cada parceiro): uma linha por item, com o X para tirar.
function addPair(list, q, item = {}) {
  const row = document.createElement("div");
  row.className = "pair";
  const first = q.choices
    ? `<select class="input pair-a" aria-label="${esc(q.fields[0])}">${q.choices.map((c) => `<option${c === (item.nome || q.choices[0]) ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>`
    : `<input class="input pair-a" type="text" placeholder="${esc(q.fields[0])}" aria-label="${esc(q.fields[0])}" value="${esc(item.nome || "")}">`;
  row.innerHTML = `${first}
    <input class="input pair-b" type="text" placeholder="${esc(q.fields[1])}" aria-label="${esc(q.fields[1])}" value="${esc(item.link || "")}">
    <button class="swatch-remove pair-remove" type="button" aria-label="Tirar"><svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg></button>
    ${q.rules ? `<p class="pair-error" hidden></p>` : ""}`;
  row.querySelector(".pair-remove").addEventListener("click", () => { row.remove(); if (!list.children.length) addPair(list, q); save(); });
  if (q.rules) {
    const link = row.querySelector(".pair-b");
    // Ao sair do campo, o @perfil vira o link e o erro aparece; enquanto digita, o erro só some.
    link.addEventListener("change", () => { link.value = fixLink(q, row.querySelector(".pair-a").value, link.value.trim()); showLink(q, row); save(); });
    link.addEventListener("input", () => { if (linkOk(q, row)) showLink(q, row); });
    row.querySelector(".pair-a").addEventListener("change", () => showLink(q, row));
  }
  list.append(row);
  return row.querySelector(".pair-a");
}

// Link de rede: aceita o link do site da rede, com ou sem https, ou só o @perfil.
function fixLink(q, rede, v) {
  const handle = v.match(/^@([\w.]+)$|^(\w+)$/);
  const rule = q.rules[rede];
  if (handle) return rule?.handle ? rule.handle.replace("{}", handle[1] || handle[2]) : v;
  return !v || /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function linkOk(q, row) {
  const v = row.querySelector(".pair-b").value.trim();
  if (!v) return true;
  let host;
  try { host = new URL(v).hostname.replace(/^www\./, ""); } catch { return false; }
  const hosts = q.rules[row.querySelector(".pair-a").value]?.hosts;
  return hosts ? hosts.some((h) => host === h || host.endsWith(`.${h}`)) : host.includes(".");
}

function showLink(q, row) {
  const rede = row.querySelector(".pair-a").value;
  const ok = linkOk(q, row);
  row.classList.toggle("is-invalid", !ok);
  const error = row.querySelector(".pair-error");
  error.hidden = ok;
  const rule = q.rules[rede];
  error.textContent = !rule ? "Cole o link completo da página" : rule.handle ? `Cole o link do seu perfil no ${rede} ou escreva o @` : `Cole o link do seu perfil no ${rede}`;
  return ok;
}

// Algum link de rede que não é do site dela; com show, mostra o erro em cada linha.
function badLinks(q, show = false) {
  if (!q?.rules) return false;
  const rows = [...document.getElementById(q.id).children];
  return rows.map((row) => (show ? !showLink(q, row) : !linkOk(q, row))).some(Boolean);
}

function renderPairs() {
  QUESTIONS.filter((q) => q.type === "pairs").forEach((q) => {
    const list = document.getElementById(q.id);
    addPair(list, q);
    form.querySelector(`[data-pair-add="${q.id}"]`).addEventListener("click", () => {
      const used = [...list.querySelectorAll(".pair-a")].map((el) => el.value);
      const next = q.choices?.find((c) => !used.includes(c));
      const el = addPair(list, q, next ? { nome: next } : {});
      (q.choices ? el.parentElement.querySelector(".pair-b") : el).focus();
    });
  });
}

function renderPalettes() {
  QUESTIONS.filter((q) => q.type === "palette").forEach((q) => {
    const list = document.getElementById(q.id);
    // Adicionar uma cor cria o cartão e já abre a caixa de cores: a cor se escolhe, não se digita.
    form.querySelector(`[data-add="${q.id}"]`).addEventListener("click", () => openColors(addSwatch(list)));
  });
}

// As cores como no kit de marca do Canva: uma bolinha por cor, com o papel e o código embaixo, e
// uma bolinha "+" no fim. Tocar numa bolinha abre o seletor. O papel vem da ordem: a primeira é a
// primária, a segunda a secundária, e assim por diante. A cor conta assim que a pessoa escolhe uma.
const ROLES = ["Primária", "Secundária", "Destaque"];
const roleOf = (i) => ROLES[i] || "Apoio";

function addSwatch(list, color = { hex: "#888888", role: "" }) {
  const row = document.createElement("div");
  row.className = "swatch";
  const use = color.role.includes(": ") ? color.role.split(/: (.*)/s)[1] : "";
  if (use) row.dataset.use = use;
  row.innerHTML = `<button class="swatch-tile" type="button" style="--c: ${esc(color.hex)}" aria-label="Escolher a cor"><span class="swatch-hint" aria-hidden="true">Escolher</span></button>
    <span class="swatch-label"></span>
    <span class="swatch-hex">${esc(color.hex.toUpperCase())}</span>
    <span class="swatch-use">${esc(use)}</span>
    <button class="swatch-remove" type="button" aria-label="Remover cor"><svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg></button>`;
  const tile = row.querySelector(".swatch-tile");
  const hex = row.querySelector(".swatch-hex");
  if (color.role) row.dataset.set = "1";
  row.paint = (value) => { tile.style.setProperty("--c", value); hex.textContent = value.toUpperCase(); row.dataset.set = "1"; save(); };
  tile.addEventListener("click", () => openColors(row));
  row.querySelector(".swatch-remove").addEventListener("click", () => { row.remove(); labelSwatches(list); save(); });
  list.append(row);
  labelSwatches(list);
  return row;
}

// Cores prontas no seletor, para quem não tem o código da marca.
const PRESETS = [
  "#111111", "#4A4A4A", "#FFFFFF", "#F3F0E8", "#E8D9B5", "#8B5A2B", "#D7263D", "#FF5A1F",
  "#FFD23F", "#1FA855", "#0F766E", "#3FA9F5", "#1D4ED8", "#7C3AED", "#EC4899", "#5B3A29",
];

// Escolher a cor num modal: no centro da tela no computador e em tela cheia no celular, com o
// código sempre no mesmo lugar. Um seletor só (Pickr, em js/vendor) serve para todas as cores.
const colorModal = document.getElementById("color-modal");
let colorPickr = null;
let colorRow = null;
let colorValue = "#888888";
const hexOf = (c) => c.toHEXA().toString().slice(0, 7);

function openColors(row) {
  colorRow = row;
  colorValue = row.dataset.set ? row.querySelector(".swatch-hex").textContent : "#FF5A1F";
  document.getElementById("color-modal-role").textContent = row.querySelector(".swatch-label").textContent;
  document.getElementById("color-modal-use").value = row.dataset.use || "";
  colorModal.hidden = false;
  if (!colorPickr) {
    colorPickr = window.Pickr.create({
      el: "#color-picker",
      theme: "nano",
      inline: true,
      showAlways: true,
      default: colorValue,
      comparison: false,
      lockOpacity: true,
      defaultRepresentation: "HEX",
      swatches: PRESETS,
      components: { preview: true, hue: true, interaction: { hex: true, input: true, save: true } },
      i18n: { "btn:save": "Usar esta cor", "aria:btn:save": "Usar esta cor", "aria:input": "Código da cor", "aria:palette": "Quadro de cor", "aria:hue": "Barra de tons" },
    });
    colorPickr.on("change", (c) => { colorValue = hexOf(c); });
    colorPickr.on("swatchselect", (c) => { colorValue = hexOf(c); });
    colorPickr.on("save", (c) => { if (c) colorValue = hexOf(c); useColor(); });
  } else colorPickr.setColor(colorValue, true);
}

function useColor() {
  if (!colorRow) return;
  const use = document.getElementById("color-modal-use").value.trim();
  if (use) colorRow.dataset.use = use;
  else delete colorRow.dataset.use;
  colorRow.querySelector(".swatch-use").textContent = use;
  colorRow.paint(colorValue);
  closeColors(false);
}

// Fechar sem escolher: a cor nova que ainda não tinha cor sai.
function closeColors(cancel = true) {
  if (colorModal.hidden) return;
  colorModal.hidden = true;
  if (cancel && colorRow && !colorRow.dataset.set) {
    const list = colorRow.parentElement;
    colorRow.remove();
    labelSwatches(list);
    save();
  }
  colorRow?.querySelector(".swatch-tile")?.focus({ preventScroll: true });
  colorRow = null;
}

colorModal.addEventListener("click", (e) => { if (e.target === colorModal || e.target.closest("[data-color-close]")) closeColors(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !colorModal.hidden) closeColors(); });

function labelSwatches(list) {
  [...list.children].forEach((row, i) => { row.querySelector(".swatch-label").textContent = roleOf(i); });
}

function answer(q) {
  if (q.type === "check") return [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map((i) => i.value);
  if (q.type === "radio") return form.querySelector(`input[name="${q.id}"]:checked`)?.value || "";
  if (q.type === "pairs") {
    return [...document.getElementById(q.id).children]
      .map((row) => ({ nome: row.querySelector(".pair-a").value.trim(), link: row.querySelector(".pair-b").value.trim() }))
      .filter((p) => (q.choices ? p.link : p.nome));
  }
  if (q.type === "palette") {
    const colors = [...document.getElementById(q.id).children]
      .map((row, i) => {
        const use = row.dataset.use;
        return row.dataset.set && { hex: row.querySelector(".swatch-hex").textContent.trim().toUpperCase(), role: use ? `${roleOf(i)}: ${use}` : roleOf(i) };
      })
      .filter(Boolean);
    return { colors, suggest: form.elements[`${q.id}_suggest`].checked };
  }
  if (q.alt && form.elements[`${q.id}_alt`].checked) return q.alt;
  if (q.multi) return [...document.querySelectorAll(`#${q.id}-chips .bf-chip`)].map((c) => c.dataset.value);
  return form.elements[q.id].value.trim();
}

const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : v && typeof v === "object" ? v.colors.length === 0 && !v.suggest : !v);

function collect() {
  answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, answer(q)]));
  return answers;
}

// O caminho: as famílias de cada parte, uma pausa no fim de cada parte e o Resultado. As famílias sem
// pergunta visível somem.
function path() {
  return [...PARTS.flatMap((p, i) => [
    ...SECTIONS.filter((s) => p.ids.includes(s.id) && s.qs.some(visible)),
    ...(i < PARTS.length - 1 ? [{ id: `pausa-${i + 1}`, pause: true }] : []),
  ]), SEND];
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, data: collect() })); } catch (e) {}
  update();
}

function restore() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  if (!saved) return;
  state.step = saved.step || 0;
  state.q = saved.q || 0;
  state.slide = saved.slide || 0;
  const data = saved.data || {};
  QUESTIONS.forEach((q) => {
    const v = q.id === "redes" && data.redes === undefined && data.instagram ? [{ nome: "Instagram", link: data.instagram }] : data[q.id];
    if (v === undefined) return;
    if (q.type === "check") form.querySelectorAll(`input[name="${q.id}"]`).forEach((i) => { i.checked = v.includes(i.value); });
    else if (q.type === "radio") form.querySelectorAll(`input[name="${q.id}"]`).forEach((i) => { i.checked = i.value === v; });
    else if (q.type === "pairs") {
      const list = document.getElementById(q.id);
      const items = typeof v === "string" ? v.split(/\n+/).filter(Boolean).map((nome) => ({ nome })) : v;
      if (items.length) { list.replaceChildren(); items.forEach((p) => addPair(list, q, p)); }
    } else if (q.type === "palette") {
      const list = document.getElementById(q.id);
      if (v.colors.length) { list.replaceChildren(); v.colors.forEach((c) => addSwatch(list, c)); }
      form.elements[`${q.id}_suggest`].checked = v.suggest;
    } else if (q.alt && v === q.alt) form.elements[`${q.id}_alt`].checked = true;
    else if (q.multi) [].concat(v).filter(Boolean).forEach((c) => addChip(q.id, c));
    else form.elements[q.id].value = v;
  });
}

function update() {
  const data = collect();
  // Opções que vêm de outra pergunta (from): só as marcadas lá; as letras seguem as que ficaram.
  QUESTIONS.filter((q) => q.from).forEach((q) => {
    let k = 0;
    form.querySelectorAll(`input[name="${q.id}"]`).forEach((i) => {
      const off = !data[q.from].includes(i.value);
      i.closest(".choice").hidden = off;
      if (off) i.checked = false;
      else i.closest(".choice").querySelector(".choice-key").textContent = KEYS[k++];
    });
  });
  const shown = QUESTIONS.filter(visible);
  const done = shown.filter((q) => !isEmpty(data[q.id])).length;
  count.innerHTML = `${done} de ${shown.length}<span class="bf-download-text"> respondidas</span>`;
  fill.style.width = `${shown.length ? (done / shown.length) * 100 : 0}%`;

  const p = path();
  state.step = Math.min(state.step, p.length - 1);
  // Se uma resposta for apagada estando no Resultado, volta para a primeira pergunta que falta.
  if (p[state.step] === SEND && !complete()) {
    state.step = p.findIndex((x) => x.qs?.filter(visible).some((q) => !isOpt(q) && isEmpty(data[q.id])));
    state.q = p[state.step].qs.filter(visible).findIndex((q) => !isOpt(q) && isEmpty(data[q.id]));
  }
  // A lista do lado mostra só as famílias da fase aberta (e o Resultado, na última).
  const sec = p[state.step];
  const at = sec.pause ? Number(sec.id.split("-")[1]) - 1 : sec.qs ? partOf(sec.id) : PARTS.length - 1;
  // A lista do lado e o menu do celular mostram só os grupos da fase aberta.
  const inPhase = (s) => (s.qs ? partOf(s.id) === at : at === PARTS.length - 1);
  steps.innerHTML = stepList(p, data, inPhase);
  if (!menu.hidden) menuList.innerHTML = stepList(p, data, inPhase);

  form.querySelectorAll(".bf-panel").forEach((el) => { el.hidden = el.id !== p[state.step].id; });
  // No celular a lista das famílias corre de lado: a família aberta fica à vista.
  const open = steps.querySelector('[aria-current="step"]');
  const bar = steps.parentElement;
  if (open && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = open.offsetLeft - (bar.clientWidth - open.offsetWidth) / 2;

  // As três fases na primeira tela: quantas já respondidas e ✓ quando a fase está completa.
  deck.dataset.slide = state.slide;
  document.getElementById("intro").inert = state.slide === 1;
  document.getElementById("quiz").inert = state.slide === 0;
  const colors = ["card-ink", "card-orange", "card-yellow"];
  phases.innerHTML = PARTS.map((part, i) => {
    const pqs = SECTIONS.filter((s) => part.ids.includes(s.id)).flatMap((s) => s.qs).filter(visible);
    const ok = pqs.filter((q) => !isEmpty(data[q.id])).length;
    const pct = pqs.length ? Math.round((ok / pqs.length) * 100) : 0;
    // Só a borda até a fase ficar pronta; a cor aparece ao passar o mouse e fica de vez quando pronta.
    // O anel fecha conforme as respostas, como o envio de uma foto no WhatsApp.
    const inner = `<span class="bf-level-num">0${i + 1}</span><span class="bf-level-name">${esc(part.title)}</span><span>${esc(part.text)}</span>
      <span class="bf-ring" aria-hidden="true"><svg viewBox="0 0 44 44"><circle class="bf-ring-track" cx="22" cy="22" r="19"/>${pct ? `<circle class="bf-ring-fill" cx="22" cy="22" r="19" pathLength="100" stroke-dasharray="${pct} 100"/>` : ""}</svg><span>${pct}%</span></span>`;
    return `<button class="card bf-level-card ${colors[i]}${pct === 100 ? " is-done" : ""}" type="button" data-phase="${i}" aria-label="${esc(part.title)}, ${pct}% pronta">
      <span class="bf-card-in">${inner}</span></button>`;
  }).join("");
  phaseName.textContent = PARTS[at].title;
  // Acima do título: a fase e, no celular, a posição da família dentro dela (Fase 1/3 · Seu negócio 2/4).
  PARTS.forEach((part, i) => {
    const fams = p.filter((x) => x.qs && part.ids.includes(x.id));
    fams.forEach((x, k) => {
      form.querySelector(`#${x.id} .bf-part-tag`).innerHTML = `Fase ${i + 1}/${PARTS.length} · ${esc(part.title)} <button class="bf-part-pos" type="button" data-action="menu" aria-label="Grupo ${k + 1} de ${fams.length}: escolher outro grupo">${k + 1}/${fams.length}</button>`;
    });
  });
  // O Resultado só abre com tudo respondido (as perguntas opcionais podem ficar em branco).
  document.querySelector('[data-action="result"]').disabled = !complete();
  // "Limpar respostas" só aparece quando já tem alguma resposta.
  document.querySelector('[data-action="reset"]').hidden = !QUESTIONS.some((q) => !isEmpty(data[q.id]));
  // Uma pergunta por vez, numerada na ordem em que aparece.
  const qs = current().filter(visible);
  state.q = Math.max(0, Math.min(state.q, qs.length - 1));
  // A pergunta que abre a partir de outra leva o número dela com ponto (27 → 27.1, 27.2).
  const num = {};
  let n = 0;
  let k = 0;
  shown.forEach((q) => { num[q.id] = q.parent ? `${n}.${++k}` : `${++n}`; if (!q.parent) k = 0; });
  shown.forEach((q) => { form.querySelector(`[data-q="${q.id}"] .bf-question-num`).textContent = `${num[q.id]} →`; });
  form.querySelectorAll(".bf-question").forEach((el) => el.classList.toggle("is-current", el.dataset.q === qs[state.q]?.id));
  // Um marcador por pergunta da parte: ✓ quando respondida; clicar leva até ela.
  dots.innerHTML = qs.map((q, i) => {
    const ok = !isEmpty(data[q.id]);
    const cur = i === state.q ? ' aria-current="step"' : "";
    return `<li><button class="bf-dot${ok ? " is-done" : ""}" type="button" data-q-index="${i}"${cur} aria-label="Pergunta ${num[q.id]}${ok ? ", respondida" : ""}">${ok ? "✓" : num[q.id]}</button></li>`;
  }).join("");
  prev.disabled = state.step === 0 && state.q === 0;
  // Sem resposta não avança; a pergunta que pode ficar em branco troca "Próxima" por "Pular".
  const cur = qs[state.q];
  next.classList.toggle("is-blocked", blocked());
  nextText.textContent = cur && isOpt(cur) && isEmpty(data[cur.id]) ? "Pular" : "Próxima";
  // Opcional (inclusive a que depende de outra resposta): número cinza e texto mais claro.
  QUESTIONS.forEach((q) => form.querySelector(`[data-q="${q.id}"]`).classList.toggle("is-optional", isOpt(q)));
  if (!blocked()) need.textContent = "";
  next.hidden = state.step === p.length - 1;
  enter.hidden = next.hidden;

  if (p[state.step] === SEND) review(data, num);
  document.getElementById("summary").textContent = done === shown.length
    ? `Você respondeu as ${shown.length} perguntas. Baixe o PDF e envie para a gente.`
    : `Você respondeu ${done} de ${shown.length}. O que ficou em branco a gente conversa depois.`;

  // A caixa que responde no lugar do texto (alt) trava o campo enquanto está marcada.
  QUESTIONS.filter((q) => q.alt).forEach((q) => {
    form.elements[q.id].disabled = form.elements[`${q.id}_alt`].checked;
  });

  // "Marque até 3": as outras opções travam quando o limite chega.
  QUESTIONS.filter((q) => q.type === "check" && q.max).forEach((q) => {
    const full = data[q.id].length >= q.max;
    form.querySelectorAll(`input[name="${q.id}"]`).forEach((i) => { i.disabled = full && !i.checked; });
  });
}

// No Resultado, todas as respostas por fase e família; clicar numa leva de volta para a pergunta.
function review(data, num) {
  const show = (q) => {
    const v = data[q.id];
    if (isEmpty(v)) return `<span class="bf-review-empty">Em branco</span>`;
    if (q.type === "pairs") return v.map((p) => esc(p.link ? `${p.nome} (${p.link})` : p.nome)).join("<br>");
    if (q.type === "palette") {
      const colors = v.colors.map((c) => `<span class="bf-review-color"><span style="background: ${esc(c.hex)}"></span>${esc(c.hex)} · ${esc(c.role)}</span>`);
      return [...colors, v.suggest ? esc(SUGGEST) : ""].filter(Boolean).join("");
    }
    return esc(Array.isArray(v) ? v.join(", ") : v).replace(/\n/g, "<br>");
  };
  // Em cima, o rascunho da oferta montado com as respostas; embaixo, todas as respostas.
  const offer = buildOffer(data);
  const offerHtml = `<section class="bf-offer">
      <p class="bf-part-tag">Rascunho da sua oferta</p>
      ${offer.h1 ? `<div class="bf-offer-hero"><span class="bf-offer-kicker">Marca</span><p class="bf-offer-h1">${esc(offer.h1)}</p>${offer.h2 ? `${data.slogan?.trim() ? `<span class="bf-offer-kicker">Slogan</span>` : ""}<p class="bf-offer-h2">${esc(offer.h2)}</p>` : ""}${offer.call ? `<span class="bf-offer-kicker">Chamada</span><p class="bf-offer-h2">${esc(offer.call)}</p>` : ""}</div>` : ""}
      ${offer.blocks.map((b) => `<div class="bf-offer-block"><h4>${esc(b.title)}</h4><ul>${b.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul></div>`).join("")}
      ${offer.missing.length ? `<div class="bf-offer-block bf-offer-missing"><h4>O que falta</h4><ul>${offer.missing.map((it) => `<li>${esc(it)}</li>`).join("")}</ul></div>` : ""}
      <p class="bf-offer-note">Montado só com as suas respostas. A equipe Craftomakers ajusta com você.</p>
    </section>`;
  document.getElementById("review").innerHTML = offerHtml + PARTS.map((part, i) => `
    <section class="bf-review-phase">
      <h3 class="bf-part-tag">Fase ${i + 1} · ${esc(part.title)}</h3>
      ${SECTIONS.filter((s) => part.ids.includes(s.id) && s.qs.some(visible)).map((s) => `
        <h4 class="bf-review-family">${esc(s.title)}</h4>
        <dl>${s.qs.filter(visible).map((q) => `
          <div class="bf-review-item" data-goto="${q.id}" role="button" tabindex="0">
            <dt><span class="bf-question-num">${num[q.id]}</span>${esc(q.t)}</dt><dd>${show(q)}</dd>
          </div>`).join("")}</dl>`).join("")}
    </section>`).join("");
}

function current() {
  return path()[state.step].qs || [];
}

function go(step, q = 0) {
  // Chegar ao Resultado sem ter respondido tudo leva à primeira pergunta que falta, em qualquer fase.
  if (path()[step] === SEND && !complete()) {
    const p = path();
    step = p.findIndex((s) => s.qs?.filter(visible).some((x) => !isOpt(x) && isEmpty(answers[x.id])));
    q = p[step].qs.filter(visible).findIndex((x) => !isOpt(x) && isEmpty(answers[x.id]));
  }
  const gap = firstGap(step);
  if (gap && (step > gap[0] || (step === gap[0] && q > gap[1]))) [step, q] = gap;
  state.step = step;
  state.q = q;
  save();
  form.scrollTop = 0;
  focusCurrent();
}

// A lista das famílias (a do lado, no computador, e o menu de tela cheia, no celular): o nome da
// fase em cima de cada grupo, a marca de pronta (✓) e quantas perguntas já têm resposta.
function stepList(p, data, show) {
  return p.map((s, i) => {
    if (s.pause || !show(s)) return "";
    const head = s.qs && p.findIndex((x) => x.qs && partOf(x.id) === partOf(s.id)) === i
      ? `<li class="bf-part">Fase ${partOf(s.id) + 1} · ${esc(PARTS[partOf(s.id)].title)}</li>` : "";
    const qs = s.qs ? s.qs.filter(visible) : [];
    const ok = qs.filter((q) => !isEmpty(data[q.id])).length;
    const current = i === state.step ? ' aria-current="step"' : "";
    const label = s.qs ? `<span class="bf-step-count">${ok}/${qs.length}</span>` : "";
    // Marca de estado: vazia até a família ficar pronta; pronta ganha cor e ✓.
    const state_ = s.qs && ok === qs.length ? " is-done" : "";
    const mark = s.qs ? `<span class="bf-step-mark" aria-hidden="true">${ok === qs.length ? "✓" : ""}</span>` : "";
    const status = state_ ? ", pronta" : "";
    const locked = s === SEND && !complete() ? " disabled" : "";
    return `${head}<li><button class="bf-step${state_}" type="button" data-step="${i}"${current}${locked} aria-label="${esc(s.title)}${status}"><span class="bf-step-name">${mark}${esc(s.title)}</span>${label}</button></li>`;
  }).join("");
}

// Todas as perguntas visíveis que precisam de resposta já têm.
const complete = () => QUESTIONS.filter(visible).every((q) => (isOpt(q) || !isEmpty(answers[q.id])) && !badLinks(q));

// A pergunta atual precisa de resposta e ainda não tem, ou tem um link que não serve.
function blocked() {
  const q = current().filter(visible)[state.q];
  return Boolean(q && ((!isOpt(q) && isEmpty(answers[q.id])) || badLinks(q)));
}

// Dentro da fase, não dá para pular para depois da primeira pergunta sem resposta.
function firstGap(step) {
  const p = path();
  const phase = (s) => (s.pause ? Number(s.id.split("-")[1]) - 1 : s.qs ? PARTS.findIndex((x) => x.ids.includes(s.id)) : PARTS.length - 1);
  for (let i = 0; i < p.length; i++) {
    if (phase(p[i]) !== phase(p[step])) continue;
    const qs = (p[i].qs || []).filter(visible);
    const j = qs.findIndex((q) => (!isOpt(q) && isEmpty(answers[q.id])) || badLinks(q));
    if (j >= 0) return [i, j];
  }
  return null;
}

function forward() {
  if (blocked()) {
    need.textContent = badLinks(current().filter(visible)[state.q], true) ? "Confira o link para continuar" : "Responda para continuar";
    next.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 300 });
    return;
  }
  const total = current().filter(visible).length;
  if (state.q < total - 1) go(state.step, state.q + 1);
  else if (state.step < path().length - 1) go(state.step + 1, 0);
}

function back() {
  if (state.q > 0) return go(state.step, state.q - 1);
  if (state.step === 0) return;
  const qs = (path()[state.step - 1].qs || []).filter(visible);
  go(state.step - 1, Math.max(0, qs.length - 1));
}

// Apagar tudo pede um segundo clique no mesmo botão, sem caixa de confirmação do navegador.
let resetTimer;
function reset(button) {
  if (!button.dataset.armed) {
    button.dataset.armed = "1";
    button.querySelector("span").textContent = "Clique de novo para limpar";
    resetTimer = setTimeout(() => { delete button.dataset.armed; button.querySelector("span").textContent = "Limpar respostas"; }, 4000);
    return;
  }
  clearTimeout(resetTimer);
  try { localStorage.removeItem(KEY); } catch (e) {}
  location.reload();
}

// Troca de slide: escolher uma fase desce para as perguntas dela; o botão da fase sobe de volta.
function slide(n) {
  state.slide = n;
  save();
  if (n === 1) setTimeout(focusCurrent, 600);
}

// No computador, o campo da pergunta já vem com o cursor; no celular, não abre o teclado sozinho.
function focusCurrent() {
  if (!matchMedia("(pointer: fine)").matches) return;
  const field = form.querySelector(".bf-question.is-current")?.querySelector("input:not([type=radio]):not([type=checkbox]):not([type=color]), textarea");
  // Sem campo de texto, o cursor sai do campo da pergunta anterior, para as letras das opções funcionarem.
  if (field) field.focus({ preventScroll: true });
  else if (form.contains(document.activeElement)) document.activeElement.blur();
}

// PDF para o cliente: a marca no topo e todas as respostas por fase e família. O jsPDF e a fonte
// da marca só são baixados quando a pessoa pede o PDF.
const slugOf = (name) => (name || "site").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.jspdf) return resolve();
    const s = Object.assign(document.createElement("script"), { src, onload: resolve, onerror: reject });
    document.head.append(s);
  });
}

async function fontBase64(url) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const PDF_MARK = "craftomakers-briefing:";
const toBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const fromBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

// Abrir um PDF baixado daqui: lê o JSON guardado nele e volta com as respostas para editar.
async function openPdf(file) {
  const text = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const found = text.match(new RegExp(`${PDF_MARK}([A-Za-z0-9+/=]+)`));
  if (!found) { alert("Este PDF não tem respostas do briefing da Craftomakers."); return; }
  const { data } = JSON.parse(fromBase64(found[1]));
  try { localStorage.setItem(KEY, JSON.stringify({ step: 0, q: 0, slide: 0, data })); } catch (e) {}
  location.reload();
}

async function downloadPdf() {
  msg.textContent = "gerando o PDF…";
  await loadScript("js/vendor/jspdf.umd.min.js");
  const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("ArchivoBlack.ttf", await fontBase64("fonts/ArchivoBlack-Regular.ttf"));
  doc.addFont("ArchivoBlack.ttf", "ArchivoBlack", "normal");

  const data = collect();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const INK = "#111111", ORANGE = "#FF5A1F", PAPER = "#F3F0E8", SOFT = "#555555";
  const qW = 190;
  const aX = M + qW + 16;
  const aW = W - M - aX;
  const clean = (t) => String(t).replace(/→/g, ">");
  let y = 0;

  const header = () => {
    doc.setFillColor(INK).rect(0, 0, W, 64, "F");
    doc.setFont("ArchivoBlack", "normal").setFontSize(16);
    let x = M;
    for (const [part, color] of [["CRAFTO", "#FFFFFF"], ["M", ORANGE], ["AKERS", "#FFFFFF"]]) {
      doc.setTextColor(color).text(part, x, 40);
      x += doc.getTextWidth(part);
    }
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor("#FFFFFF").text("BRIEFING", W - M, 40, { align: "right" });
    y = 96;
  };
  const room = (h) => { if (y + h > H - 56) { doc.addPage(); header(); } };

  // Capa: o nome do negócio em destaque, o slogan e a data. O nome aparece uma vez só. Depois vem o
  // rascunho da oferta.
  const offer = buildOffer(data);
  const textW = W - 2 * M;
  header();
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(SOFT).text("MARCA", M, y);
  y += 30;
  doc.setFont("ArchivoBlack", "normal").setFontSize(28).setTextColor(INK);
  const title = doc.splitTextToSize((offer.h1 || data.nome || "Seu negócio").toUpperCase(), textW);
  doc.text(title, M, y, { lineHeightFactor: 1.1 });
  y += (title.length - 1) * 31 + 16;
  doc.setFillColor(ORANGE).rect(M, y - 4, 64, 6, "F");
  y += 26;
  if (offer.h2) {
    // "Slogan" só quando é o slogan mesmo; sem ele, a frase vem da promessa e fica sem rótulo.
    if (data.slogan && offer.h2 === data.slogan.trim().replace(/[.!;,\s]+$/, "")) {
      doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(SOFT).text("SLOGAN", M, y);
      y += 16;
    }
    doc.setFont("helvetica", "normal").setFontSize(14).setTextColor(INK);
    const h2 = doc.splitTextToSize(clean(offer.h2), textW);
    doc.text(h2, M, y, { lineHeightFactor: 1.3 });
    y += h2.length * 18 + 4;
  }
  if (offer.call) {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(SOFT).text("CHAMADA", M, y);
    y += 16;
    doc.setFont("helvetica", "normal").setFontSize(14).setTextColor(INK);
    const call = doc.splitTextToSize(clean(offer.call), textW);
    doc.text(call, M, y, { lineHeightFactor: 1.3 });
    y += call.length * 18 + 4;
  }
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(SOFT)
    .text(`Briefing respondido em ${new Date().toLocaleDateString("pt-BR")}`, M, y + 6);
  y += 40;

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(ORANGE).text("RASCUNHO DA SUA OFERTA", M, y);
  y += 22;
  const offerBlock = (title, items, color) => {
    doc.setFont("helvetica", "normal").setFontSize(11);
    const lines = items.map((it) => doc.splitTextToSize(clean(it), textW - 14));
    room(28 + lines.reduce((sum, l) => sum + l.length * 15 + 4, 0));
    doc.setFont("ArchivoBlack", "normal").setFontSize(12).setTextColor(color).text(title.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(color).setLineWidth(1.2).line(M, y, W - M, y);
    y += 18;
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(INK);
    lines.forEach((l) => {
      doc.setFillColor(color).circle(M + 3, y - 4, 2, "F");
      doc.text(l, M + 14, y, { lineHeightFactor: 1.35 });
      y += l.length * 15 + 4;
    });
    y += 14;
  };
  offer.blocks.forEach((b) => offerBlock(b.title, b.items, INK));
  if (offer.missing.length) offerBlock("O que falta", offer.missing, ORANGE);
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(SOFT)
    .text("Montado só com as suas respostas. A equipe Craftomakers ajusta com você.", M, y);
  // As respostas seguem logo depois, sem pular página; só quebram quando não cabem.
  y += 40;
  room(120);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(ORANGE).text("RESPOSTAS DO BRIEFING", M, y);
  y += 26;

  const shown = QUESTIONS.filter(visible);
  const num = {};
  let n = 0;
  let k = 0;
  shown.forEach((q) => { num[q.id] = q.parent ? `${n}.${++k}` : `${++n}`; if (!q.parent) k = 0; });

  PARTS.forEach((part, i) => {
    room(80);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(ORANGE)
      .text(`FASE ${i + 1} · ${part.title.toUpperCase()}`, M, y);
    y += 22;
    SECTIONS.filter((s) => part.ids.includes(s.id) && s.qs.some(visible)).forEach((s) => {
      room(60);
      doc.setFont("ArchivoBlack", "normal").setFontSize(13).setTextColor(INK).text(s.title.toUpperCase(), M, y);
      y += 8;
      doc.setDrawColor(INK).setLineWidth(1.5).line(M, y, W - M, y);
      y += 16;
      s.qs.filter(visible).forEach((q) => {
        const v = data[q.id];
        doc.setFont("helvetica", "normal").setFontSize(9);
        const qLines = doc.splitTextToSize(clean(q.t), qW - 22);
        let aLines;
        let swatches = [];
        doc.setFont("helvetica", "bold").setFontSize(10);
        if (isEmpty(v)) aLines = ["Em branco"];
        else if (q.type === "pairs") aLines = v.flatMap((p) => doc.splitTextToSize(clean(p.link ? `${p.nome} (${p.link})` : p.nome), aW));
        else if (q.type === "palette") {
          swatches = v.colors;
          aLines = [...v.colors.map((c) => `${c.hex} · ${c.role}`), ...(v.suggest ? [SUGGEST] : [])];
        } else aLines = doc.splitTextToSize(clean(Array.isArray(v) ? v.join(", ") : v), aW - (swatches.length ? 18 : 0));
        const h = Math.max(qLines.length * 11, aLines.length * 13) + 12;
        room(h);
        doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(ORANGE).text(num[q.id], M, y);
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(SOFT).text(qLines, M + 22, y, { lineHeightFactor: 1.2 });
        doc.setFont("helvetica", isEmpty(v) ? "italic" : "bold").setFontSize(10).setTextColor(isEmpty(v) ? SOFT : INK);
        aLines.forEach((line, k) => {
          const c = swatches[k];
          if (c) {
            doc.setFillColor(c.hex).setDrawColor(INK).setLineWidth(0.5).rect(aX, y + k * 13 - 8, 10, 10, "FD");
            doc.text(line, aX + 16, y + k * 13);
          } else doc.text(line, aX, y + k * 13);
        });
        y += h - 6;
        doc.setDrawColor("#D9D5CC").setLineWidth(0.5).line(M, y - 6, W - M, y - 6);
        y += 6;
      });
      y += 14;
    });
    y += 8;
  });

  // Rodapé com a marca e o número da página.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(SOFT);
    doc.text("Craftomakers", M, H - 28);
    doc.text(`${p} de ${pages}`, W - M, H - 28, { align: "right" });
  }

  // As respostas vão dentro do PDF, em JSON, para o cliente abrir de novo no briefing e editar.
  doc.setProperties({ title: `Briefing ${data.nome || ""}`.trim(), author: "Craftomakers", keywords: `${PDF_MARK}${toBase64(JSON.stringify({ key: KEY, data }))}` });
  doc.save(`briefing-${slugOf(data.nome)}.pdf`);
  msg.textContent = "PDF baixado";
}

renderForm();
renderPalettes();
renderPairs();
loadLists();
restore();
update();
focusCurrent();

form.addEventListener("input", save);
form.addEventListener("change", save);
phases.addEventListener("click", (e) => {
  const b = e.target.closest("[data-phase]");
  if (!b) return;
  const ids = PARTS[Number(b.dataset.phase)].ids;
  state.step = path().findIndex((s) => ids.includes(s.id));
  state.q = 0;
  slide(1);
});
form.addEventListener("click", (e) => {
  const item = e.target.closest("[data-goto]");
  if (!item) return;
  const p = path();
  const step = p.findIndex((s) => s.qs?.some((q) => q.id === item.dataset.goto));
  state.step = step;
  state.q = p[step].qs.filter(visible).findIndex((q) => q.id === item.dataset.goto);
  save();
  form.scrollTop = 0;
  focusCurrent();
});
form.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-goto]")) { e.stopPropagation(); e.target.click(); } });
document.getElementById("open-pdf").addEventListener("change", (e) => { if (e.target.files[0]) openPdf(e.target.files[0]); });
// O Editar é um label (abre a escolha do arquivo); pelo teclado, Enter ou espaço também abrem.
document.querySelector(".bf-tool[tabindex]").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.getElementById("open-pdf").click(); }
});
// Rolar o mouse troca de slide, como no site principal: para baixo na primeira tela entra nas
// perguntas, onde a pessoa estava; para cima no topo das perguntas volta para a primeira tela. Um
// gesto de rolagem conta uma vez só.
let wheelUntil = 0;
function wheelOnce(e) {
  e.preventDefault();
  const now = Date.now();
  const fresh = now > wheelUntil;
  wheelUntil = now + 500;
  return fresh;
}
document.getElementById("intro").addEventListener("wheel", (e) => {
  if (state.slide !== 0 || e.deltaY <= 0 || !wheelOnce(e)) return;
  enterQuiz();
}, { passive: false });
// Entrar nas perguntas rolando: volta para onde a pessoa estava; sem nenhuma resposta, a pergunta 1.
function enterQuiz() {
  if (!QUESTIONS.some((q) => !isEmpty(answers[q.id]))) { state.step = 0; state.q = 0; }
  slide(1);
}
document.querySelector("#quiz .bf-top").addEventListener("wheel", (e) => {
  if (state.slide !== 1 || e.deltaY >= 0 || !wheelOnce(e)) return;
  slide(0);
}, { passive: false });

// No celular, o mesmo com o dedo: arrastar para cima na primeira tela entra nas perguntas, e
// arrastar para baixo na barra do topo das perguntas volta. Só conta um arrasto vertical claro.
function swipe(el, wanted, run) {
  let y0 = null;
  let x0 = 0;
  el.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0;
    const dx = e.changedTouches[0].clientX - x0;
    y0 = null;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && Math.sign(dy) === wanted) run();
  }, { passive: true });
}
swipe(document.getElementById("intro"), -1, () => {
  const hero = document.querySelector(".bf-intro .bf-hero");
  if (state.slide === 0 && hero.scrollTop + hero.clientHeight >= hero.scrollHeight - 1) enterQuiz();
});
swipe(document.querySelector("#quiz .bf-top"), 1, () => { if (state.slide === 1) slide(0); });
form.addEventListener("click", (e) => {
  const b = e.target.closest("[data-help]");
  if (!b) return;
  const box = document.getElementById(`${b.dataset.help}-help`);
  box.hidden = !box.hidden;
  b.setAttribute("aria-expanded", String(!box.hidden));
});
dots.addEventListener("click", (e) => { const b = e.target.closest("[data-q-index]"); if (b) go(state.step, Number(b.dataset.qIndex)); });
steps.addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b) go(Number(b.dataset.step)); });
menuList.addEventListener("click", (e) => {
  const b = e.target.closest("[data-step]");
  if (!b || b.disabled) return;
  menu.hidden = true;
  go(Number(b.dataset.step));
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) menu.hidden = true; });
prev.addEventListener("click", back);
next.addEventListener("click", forward);
document.addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "pdf") downloadPdf().catch(() => { msg.textContent = "não deu para gerar o PDF"; });
  if (action === "forward") forward();
  if (action === "phases") slide(0);
  // No celular, o 1/4 abre o menu de tela cheia com todos os grupos.
  if (action === "menu") { menu.hidden = false; update(); menu.querySelector('[aria-current="step"]')?.focus(); }
  if (action === "menu-close") menu.hidden = true;
  // O botão do topo leva ao Resultado: todas as respostas e o Baixar PDF.
  if (action === "result") { state.step = path().length - 1; state.q = 0; state.slide = 1; save(); form.scrollTop = 0; }
  if (action === "reset") reset(e.target.closest("[data-action]"));
});

// Uma escolha única marcada desmarca com um segundo clique.
form.addEventListener("pointerdown", (e) => {
  const input = e.target.closest(".choice")?.querySelector('input[type="radio"]');
  if (input) input.dataset.was = input.checked ? "1" : "";
});
form.addEventListener("click", (e) => {
  const input = e.target.closest('input[type="radio"]');
  if (input && input.dataset.was === "1") { input.checked = false; input.dataset.was = ""; save(); }
});

// Teclado, como num formulário de conversa: Enter passa para a próxima (Ctrl+Enter na caixa de
// texto grande, onde o Enter pula linha) e a letra de cada opção marca a opção.
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (state.slide === 0 || !menu.hidden || !colorModal.hidden) return;
  if (e.key === "Enter") {
    if (t.closest("button, a")) return;
    if (t.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    forward();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  if (t.matches("input:not([type=radio]):not([type=checkbox]), textarea")) return;
  const i = KEYS.indexOf(e.key.toUpperCase());
  const input = [...form.querySelectorAll(".bf-question.is-current .choice-input")].filter((el) => !el.closest(".choice").hidden)[i];
  if (!input || input.disabled) return;
  if (input.type === "radio" && input.checked) input.checked = false;
  else input.checked = !input.checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  if (input.type === "radio" && input.checked) autoAdvance();
});

// Escolha única marcada: passa sozinho para a próxima, depois de mostrar a marcação.
let timer;
function autoAdvance() {
  clearTimeout(timer);
  const id = form.querySelector(".bf-question.is-current")?.dataset.q;
  timer = setTimeout(() => {
    if (form.querySelector(".bf-question.is-current")?.dataset.q === id) forward();
  }, 450);
}

form.addEventListener("change", (e) => {
  if (e.isTrusted && e.target.type === "radio" && e.target.checked && e.target.closest(".is-current")) autoAdvance();
});
