const POSTER_W = 1080;
const POSTER_H = 1920;

const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const templateScreen = document.getElementById("templateScreen");
const editorScreen = document.getElementById("editorScreen");
const templateGrid = document.getElementById("templateGrid");
const brandMark = document.getElementById("brandMark");
const templateTitle = document.getElementById("templateTitle");
const templateSubtitle = document.getElementById("templateSubtitle");
const changeTemplateBtn = document.getElementById("changeTemplateBtn");
const photoInput = document.getElementById("photoInput");
const nameInput = document.getElementById("nameInput");
const nameCount = document.getElementById("nameCount");
const dropZone = document.getElementById("dropZone");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const resetBtn = document.getElementById("resetBtn");
const themeToggle = document.getElementById("themeToggle");
const statusText = document.getElementById("statusText");
let downloadWorkerReady = Promise.resolve(false);

const fallbackTemplates = [
  {
    id: "salati",
    name: "جمعية صلاتي",
    subtitle: "العناية بالمساجد بربوع العين",
    mark: "صلاتي",
    mode: "image",
    logo: "assets/salati-logo.png?v=20260525",
    background: "assets/salati-eid-template.png?v=20260525",
    colors: { green: "#0F6B4B", gold: "#D4A73C", cream: "#F8F4EC" },
    photo: { x: 540, y: 680, r: 160 },
    nameBadge: { y: 860, h: 78, minW: 410, maxW: 780, padX: 60 },
    description: "القالب الرسمي الهادئ لجمعية صلاتي."
  },
  {
    id: "mosque-care",
    name: "ط¬ظ…ط¹ظٹط© ط§ظ„ط¹ظ†ط§ظٹط© ط¨ط§ظ„ظ…ط³ط§ط¬ط¯",
    subtitle: "ظ‚ط§ظ„ط¨ ظ…ط¤ط³ط³ظٹ ط£ط®ط¶ط± ظˆط°ظ‡ط¨ظٹ",
    mark: "ظ…ط³ط§ط¬ط¯",
    mode: "generated",
    variant: "arch",
    colors: { green: "#0F6B4B", gold: "#D4A73C", cream: "#F8F4EC" },
    photo: { x: 540, y: 610, r: 150 },
    nameBadge: { y: 805, h: 78, minW: 420, maxW: 800, padX: 60 },
    description: "طھطµظ…ظٹظ… ظ…ط±ظ† ظ„ظ„ط¬ظ…ط¹ظٹط§طھ ظˆط§ظ„ظ…ط¤ط³ط³ط§طھ."
  },
  {
    id: "community",
    name: "ظ…ط¤ط³ط³ط© ط§ظ„ظ…ط¬طھظ…ط¹",
    subtitle: "ظ‚ط§ظ„ط¨ ط¹طµط±ظٹ ظپط§ط®ط± ظ‚ط§ط¨ظ„ ظ„ظ„طھط®طµظٹطµ",
    mark: "ط®ظٹط±",
    mode: "generated",
    variant: "minimal",
    colors: { green: "#0B5D52", gold: "#D4A73C", cream: "#F8F4EC" },
    photo: { x: 540, y: 700, r: 145 },
    nameBadge: { y: 890, h: 74, minW: 410, maxW: 760, padX: 56 },
    description: "ظ‚ط§ظ„ط¨ ط¨ط³ظٹط· ظˆط±ط§ظ‚ظٹ ظ„ظ„ظ…ط¤ط³ط³ط§طھ."
  }
];

fallbackTemplates.splice(1);

const state = {
  templates: [],
  activeTemplate: null,
  images: new Map(),
  portrait: null,
  portraitUrl: "",
  focal: { x: 0.5, y: 0.42 },
  name: "",
  previewBlob: null,
  previewDataUrl: "",
  downloadUrls: [],
  previewTicket: 0
};

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

init();

async function init() {
  downloadWorkerReady = disableDownloadWorker();
  state.templates = await loadTemplates();
  state.templates = state.templates.slice(0, 1);
  renderTemplateCards();
  wireEvents();
  if (state.templates.length === 1) {
    changeTemplateBtn.classList.add("is-hidden");
    await selectTemplate(state.templates[0].id);
  }
}

async function disableDownloadWorker() {
  try {
    const hadController = !!navigator.serviceWorker?.controller;
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      await caches.delete("eid-adha-downloads-v1");
    }
    if (hadController && sessionStorage.getItem("eid-sw-cleared") !== "1") {
      sessionStorage.setItem("eid-sw-cleared", "1");
      location.reload();
    }
  } catch {
    return false;
  }
  return false;
}

async function loadTemplates() {
  try {
    const response = await fetch("templates.json", { cache: "no-store" });
    if (!response.ok) throw new Error("templates not found");
    const data = await response.json();
    return Array.isArray(data.templates) ? data.templates : fallbackTemplates;
  } catch {
    return fallbackTemplates;
  }
}

function renderTemplateCards() {
  templateGrid.innerHTML = "";
  state.templates.forEach((template) => {
    const card = document.createElement("article");
    card.className = "template-card";

    const thumb = document.createElement("img");
    thumb.className = "template-thumb";
    thumb.loading = "lazy";
    thumb.alt = `ظ…ط¹ط§ظٹظ†ط© ${template.name}`;

    makeTemplatePreview(template).then((src) => {
      thumb.src = src;
    });

    card.innerHTML = `
      <h3>${escapeHtml(template.name)}</h3>
      <p>${escapeHtml(template.description || template.subtitle || "")}</p>
      <button type="button">ط§ط®طھظٹط§ط± ط§ظ„ظ‚ط§ظ„ط¨</button>
    `;
    card.prepend(thumb);
    card.querySelector("button").addEventListener("click", () => selectTemplate(template.id));
    templateGrid.appendChild(card);
  });
}

function wireEvents() {
  changeTemplateBtn.addEventListener("click", () => {
    editorScreen.classList.add("is-hidden");
    templateScreen.classList.remove("is-hidden");
  });

  photoInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) handleImageFile(file);
  });

  nameInput.addEventListener("input", () => {
    state.name = normalizeName(nameInput.value);
    nameInput.value = state.name;
    updateNameCount();
    renderPoster();
  });

  downloadBtn?.addEventListener("click", downloadPoster);
  shareBtn.addEventListener("click", sharePoster);
  resetBtn.addEventListener("click", resetDesigner);
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeToggle.checked);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
    if (file) handleImageFile(file);
    else setStatus("ط§ط®طھط± ظ…ظ„ظپ طµظˆط±ط© طµط§ظ„ط­.", true);
  });
}

async function selectTemplate(id) {
  const template = state.templates.find((item) => item.id === id) || state.templates[0];
  state.activeTemplate = template;
  setBrandMark(template);
  templateTitle.textContent = template.name;
  templateSubtitle.textContent = template.subtitle || "ظ‚ط§ظ„ط¨ طھظ‡ظ†ط¦ط© ط¹ظٹط¯ ط§ظ„ط£ط¶ط­ظ‰";
  templateScreen.classList.add("is-hidden");
  editorScreen.classList.remove("is-hidden");
  await ensureTemplateAssets(template);
  renderPoster();
}

function setBrandMark(template) {
  brandMark.textContent = "";
  brandMark.classList.toggle("has-logo", Boolean(template.logo));

  if (template.logo) {
    const logo = document.createElement("img");
    logo.src = template.logo;
    logo.alt = "";
    logo.decoding = "async";
    brandMark.appendChild(logo);
    return;
  }

  brandMark.textContent = template.mark || "ط¹ظٹط¯";
}

async function ensureTemplateAssets(template) {
  if (template.mode !== "image" || !template.background || state.images.has(template.background)) return;
  const image = new Image();
  image.decoding = "async";
  image.src = template.background;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  await image.decode?.().catch(() => undefined);
  state.images.set(template.background, image);
}

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 30);
}

function updateNameCount() {
  nameCount.textContent = `${state.name.length}/30`;
}

function setStatus(message, isError = false) {
  return;
}

function handleImageFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("ط§ط®طھط± ظ…ظ„ظپ طµظˆط±ط© طµط§ظ„ط­.", true);
    return;
  }

  if (state.portraitUrl) URL.revokeObjectURL(state.portraitUrl);
  const image = new Image();
  const url = URL.createObjectURL(file);
  state.portraitUrl = url;
  image.onload = async () => {
    state.portrait = image;
    state.focal = heuristicFocal(image);
    renderPoster();
    await refineFaceFocal(image);
    renderPoster();
    setStatus("طھظ… ط¶ط¨ط· ط§ظ„طµظˆط±ط© ط¯ط§ط®ظ„ ط§ظ„ط¥ط·ط§ط±.");
  };
  image.onerror = () => setStatus("طھط¹ط°ط± ظ‚ط±ط§ط،ط© ط§ظ„طµظˆط±ط©.", true);
  image.src = url;
}

function heuristicFocal(image) {
  if (image.height > image.width * 1.18) return { x: 0.5, y: 0.38 };
  if (image.width > image.height * 1.2) return { x: 0.5, y: 0.46 };
  return { x: 0.5, y: 0.42 };
}

async function refineFaceFocal(image) {
  if (!("FaceDetector" in window)) return;
  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const bitmap = await createImageBitmap(image);
    const [face] = await detector.detect(bitmap);
    bitmap.close?.();
    if (!face) return;
    const box = face.boundingBox;
    state.focal = {
      x: clamp((box.x + box.width / 2) / image.naturalWidth, 0.18, 0.82),
      y: clamp((box.y + box.height * 0.46) / image.naturalHeight, 0.18, 0.72)
    };
  } catch {
    state.focal = heuristicFocal(image);
  }
}

function renderPoster(targetCtx = ctx, scheduleExport = true) {
  const template = state.activeTemplate || state.templates[0] || fallbackTemplates[0];
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";
  targetCtx.clearRect(0, 0, POSTER_W, POSTER_H);

  drawTemplateBase(targetCtx, template);
  drawPortrait(targetCtx, template);
  if (state.name.trim()) drawNameBadge(targetCtx, template, state.name.trim());
  else drawNamePlaceholder(targetCtx, template);

  if (targetCtx === ctx && scheduleExport) schedulePreviewImage();
}

function drawTemplateBase(targetCtx, template) {
  if (template.mode === "image" && template.background && state.images.has(template.background)) {
    drawCoverImage(targetCtx, state.images.get(template.background), 0, 0, POSTER_W, POSTER_H);
    return;
  }

  const colors = template.colors;
  const background = targetCtx.createLinearGradient(0, 0, 0, POSTER_H);
  background.addColorStop(0, colors.cream);
  background.addColorStop(0.58, "#fffaf1");
  background.addColorStop(1, colors.green);
  targetCtx.fillStyle = background;
  targetCtx.fillRect(0, 0, POSTER_W, POSTER_H);

  drawPattern(targetCtx, colors);
  drawArch(targetCtx, colors, template.variant === "minimal" ? 0.72 : 0.9);
  drawInstitutionLogo(targetCtx, template);
  drawEidText(targetCtx, template);
  drawMosque(targetCtx, colors, template.variant);
  drawFooter(targetCtx, colors);
}

function drawPattern(targetCtx, colors) {
  targetCtx.save();
  targetCtx.globalAlpha = 0.08;
  targetCtx.strokeStyle = colors.gold;
  targetCtx.lineWidth = 2;
  for (let y = 70; y < 1760; y += 95) {
    for (let x = 60; x < 1040; x += 95) {
      targetCtx.beginPath();
      targetCtx.moveTo(x, y - 28);
      targetCtx.lineTo(x + 28, y);
      targetCtx.lineTo(x, y + 28);
      targetCtx.lineTo(x - 28, y);
      targetCtx.closePath();
      targetCtx.stroke();
    }
  }
  targetCtx.restore();
}

function drawArch(targetCtx, colors, opacity) {
  targetCtx.save();
  targetCtx.globalAlpha = opacity;
  targetCtx.strokeStyle = colors.gold;
  targetCtx.lineWidth = 4;
  targetCtx.beginPath();
  targetCtx.moveTo(92, 1660);
  targetCtx.lineTo(92, 720);
  targetCtx.bezierCurveTo(92, 470, 280, 255, 540, 120);
  targetCtx.bezierCurveTo(800, 255, 988, 470, 988, 720);
  targetCtx.lineTo(988, 1660);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawInstitutionLogo(targetCtx, template) {
  const colors = template.colors;
  targetCtx.save();
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.direction = "rtl";

  targetCtx.fillStyle = colors.green;
  roundRect(targetCtx, 390, 120, 300, 170, 26);
  targetCtx.fill();

  targetCtx.fillStyle = colors.gold;
  targetCtx.beginPath();
  targetCtx.arc(540, 100, 36, 0.35 * Math.PI, 1.65 * Math.PI);
  targetCtx.arc(560, 98, 30, 1.65 * Math.PI, 0.35 * Math.PI, true);
  targetCtx.fill();

  targetCtx.fillStyle = "#fff";
  targetCtx.font = "900 54px Cairo, Tajawal, Arial";
  targetCtx.fillText(template.mark || "ط¹ظٹط¯", 540, 194);
  targetCtx.fillStyle = colors.green;
  targetCtx.font = "800 42px Cairo, Tajawal, Arial";
  targetCtx.fillText(template.name, 540, 350);
  targetCtx.fillStyle = colors.gold;
  targetCtx.font = "700 25px Cairo, Tajawal, Arial";
  targetCtx.fillText(template.subtitle || "", 540, 392);
  targetCtx.restore();
}

function drawEidText(targetCtx, template) {
  const colors = template.colors;
  targetCtx.save();
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.direction = "rtl";

  const y = template.nameBadge.y + 240;
  targetCtx.fillStyle = colors.green;
  targetCtx.font = "900 120px Cairo, Tajawal, Arial";
  targetCtx.fillText("ط¹ظٹط¯", 540, y);
  targetCtx.fillStyle = colors.gold;
  targetCtx.font = "900 104px Cairo, Tajawal, Arial";
  targetCtx.fillText("ط£ط¶ط­ظ‰ ظ…ط¨ط§ط±ظƒ", 540, y + 120);

  targetCtx.fillStyle = colors.green;
  targetCtx.font = "700 34px Cairo, Tajawal, Arial";
  targetCtx.fillText("طھظ‚ط¨ظ„ ط§ظ„ظ„ظ‡ ط·ط§ط¹ط§طھظƒظ…", 540, y + 245);
  targetCtx.fillText("ظˆط£ط¹ط§ط¯ ط§ظ„ظ„ظ‡ ط¹ظ„ظٹظƒظ… ط§ظ„ط¹ظٹط¯ ط¨ط§ظ„ط®ظٹط± ظˆط§ظ„ظٹظ…ظ† ظˆط§ظ„ط¨ط±ظƒط§طھ", 540, y + 300);
  targetCtx.restore();
}

function drawMosque(targetCtx, colors, variant) {
  const baseY = 1515;
  targetCtx.save();
  targetCtx.fillStyle = variant === "minimal" ? "#f3deaf" : "#ead09a";
  targetCtx.strokeStyle = colors.gold;
  targetCtx.lineWidth = 4;

  roundRect(targetCtx, 220, baseY, 640, 210, 16);
  targetCtx.fill();
  targetCtx.stroke();

  for (let i = 0; i < 6; i += 1) {
    const x = 290 + i * 92;
    targetCtx.fillStyle = "#7e673f";
    roundRect(targetCtx, x, baseY + 72, 42, 70, 8);
    targetCtx.fill();
    targetCtx.fillStyle = colors.gold;
    targetCtx.beginPath();
    targetCtx.moveTo(x - 5, baseY + 72);
    targetCtx.lineTo(x + 21, baseY + 40);
    targetCtx.lineTo(x + 47, baseY + 72);
    targetCtx.fill();
  }

  drawMinaret(targetCtx, 135, 1270, colors);
  drawMinaret(targetCtx, 875, 1270, colors);

  targetCtx.fillStyle = "#fff";
  targetCtx.globalAlpha = 0.82;
  targetCtx.font = "800 32px Cairo, Tajawal, Arial";
  targetCtx.textAlign = "center";
  targetCtx.direction = "rtl";
  targetCtx.fillText("ط¬ط§ظ…ط¹ ط±ط¨ظˆط¹ ط§ظ„ط¹ظٹظ†", 540, baseY + 24);
  targetCtx.restore();
}

function drawMinaret(targetCtx, x, y, colors) {
  targetCtx.save();
  targetCtx.fillStyle = "#4a3d2d";
  roundRect(targetCtx, x, y, 70, 300, 16);
  targetCtx.fill();
  targetCtx.fillStyle = colors.gold;
  targetCtx.beginPath();
  targetCtx.arc(x + 35, y - 8, 46, Math.PI, 0);
  targetCtx.fill();
  targetCtx.fillStyle = "#f8f4ec";
  targetCtx.fillRect(x + 22, y + 42, 26, 54);
  targetCtx.fillRect(x + 22, y + 138, 26, 54);
  targetCtx.shadowColor = "rgba(255, 243, 190, 0.9)";
  targetCtx.shadowBlur = 22;
  targetCtx.fillStyle = "#fff3be";
  targetCtx.beginPath();
  targetCtx.arc(x + 35, y - 4, 21, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

function drawFooter(targetCtx, colors) {
  targetCtx.save();
  targetCtx.fillStyle = colors.green;
  targetCtx.fillRect(0, 1740, POSTER_W, 180);
  targetCtx.strokeStyle = colors.gold;
  targetCtx.lineWidth = 4;
  targetCtx.beginPath();
  targetCtx.moveTo(235, 1810);
  targetCtx.lineTo(430, 1810);
  targetCtx.moveTo(650, 1810);
  targetCtx.lineTo(845, 1810);
  targetCtx.stroke();
  targetCtx.fillStyle = "#fff";
  targetCtx.font = "800 44px Cairo, Tajawal, Arial";
  targetCtx.textAlign = "center";
  targetCtx.direction = "rtl";
  targetCtx.fillText("ظƒظ„ ط¹ط§ظ… ظˆط£ظ†طھظ… ط¨ط®ظٹط±", 540, 1812);
  targetCtx.restore();
}

function drawPortrait(targetCtx, template) {
  const photo = template.photo;
  if (!state.portrait) {
    if (template.mode === "generated") drawPortraitPlaceholder(targetCtx, template);
    return;
  }

  const d = photo.r * 2;
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(photo.x, photo.y, photo.r, 0, Math.PI * 2);
  targetCtx.clip();
  drawCoverImage(targetCtx, state.portrait, photo.x - photo.r, photo.y - photo.r, d, d, state.focal);
  targetCtx.restore();
  drawPortraitRing(targetCtx, template, photo);
}

function drawPortraitPlaceholder(targetCtx, template) {
  const photo = template.photo;
  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(photo.x, photo.y, photo.r, 0, Math.PI * 2);
  targetCtx.clip();
  const fill = targetCtx.createLinearGradient(photo.x, photo.y - photo.r, photo.x, photo.y + photo.r);
  fill.addColorStop(0, "#eef0f2");
  fill.addColorStop(1, "#cfd3d8");
  targetCtx.fillStyle = fill;
  targetCtx.fillRect(photo.x - photo.r, photo.y - photo.r, photo.r * 2, photo.r * 2);
  targetCtx.fillStyle = "#aeb4bd";
  targetCtx.beginPath();
  targetCtx.arc(photo.x, photo.y - 35, 60, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.beginPath();
  targetCtx.moveTo(photo.x - 112, photo.y + 132);
  targetCtx.quadraticCurveTo(photo.x, photo.y + 28, photo.x + 112, photo.y + 132);
  targetCtx.lineTo(photo.x + 112, photo.y + 170);
  targetCtx.lineTo(photo.x - 112, photo.y + 170);
  targetCtx.closePath();
  targetCtx.fill();
  targetCtx.restore();
  drawPortraitRing(targetCtx, template, photo);
}

function drawPortraitRing(targetCtx, template, photo) {
  const ring = targetCtx.createLinearGradient(photo.x - photo.r, photo.y - photo.r, photo.x + photo.r, photo.y + photo.r);
  ring.addColorStop(0, "#f3d77b");
  ring.addColorStop(0.25, "#9d7215");
  ring.addColorStop(0.52, "#fff3b0");
  ring.addColorStop(0.78, "#b88620");
  ring.addColorStop(1, "#f1d98a");

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.arc(photo.x, photo.y, photo.r + 10, 0, Math.PI * 2);
  targetCtx.strokeStyle = "#fffdf5";
  targetCtx.lineWidth = 8;
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(photo.x, photo.y, photo.r + 17, 0, Math.PI * 2);
  targetCtx.strokeStyle = ring;
  targetCtx.lineWidth = 11;
  targetCtx.stroke();
  targetCtx.restore();
}

function drawNameBadge(targetCtx, template, name) {
  const badge = template.nameBadge;
  const colors = template.colors;
  let fontSize = 52;
  targetCtx.save();
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.direction = "rtl";

  while (fontSize > 34) {
    targetCtx.font = `900 ${fontSize}px Cairo, Tajawal, Tahoma, Arial`;
    if (targetCtx.measureText(name).width <= badge.maxW - badge.padX * 2) break;
    fontSize -= 2;
  }

  const textW = targetCtx.measureText(name).width;
  const badgeW = clamp(textW + badge.padX * 2, badge.minW, badge.maxW);
  const x = (POSTER_W - badgeW) / 2;
  const y = badge.y;
  const gradient = targetCtx.createLinearGradient(x, y, x + badgeW, y + badge.h);
  gradient.addColorStop(0, colors.green);
  gradient.addColorStop(0.5, shadeColor(colors.green, -18));
  gradient.addColorStop(1, colors.green);

  drawFlourish(targetCtx, x - 18, y + badge.h / 2, -1, colors);
  drawFlourish(targetCtx, x + badgeW + 18, y + badge.h / 2, 1, colors);
  roundRect(targetCtx, x, y, badgeW, badge.h, 18);
  targetCtx.fillStyle = gradient;
  targetCtx.fill();
  targetCtx.shadowColor = "rgba(0, 0, 0, 0.18)";
  targetCtx.shadowBlur = 8;
  targetCtx.shadowOffsetY = 2;
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillText(name, POSTER_W / 2, y + badge.h / 2 + 1);
  targetCtx.restore();
}

function drawNamePlaceholder(targetCtx, template) {
  if (template.mode === "image") return;
  drawNameBadge(targetCtx, template, "ط§ظ„ط§ط³ظ… ظ‡ظ†ط§");
}

function drawFlourish(targetCtx, x, y, dir, colors) {
  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.scale(dir, 1);
  targetCtx.strokeStyle = colors.gold;
  targetCtx.fillStyle = "#f5cf68";
  targetCtx.lineWidth = 4;
  targetCtx.lineCap = "round";
  for (let i = 0; i < 3; i += 1) {
    targetCtx.beginPath();
    targetCtx.moveTo(0, 0);
    targetCtx.quadraticCurveTo(28 + i * 10, -26 + i * 18, 58 + i * 6, -8 + i * 6);
    targetCtx.stroke();
  }
  targetCtx.beginPath();
  targetCtx.arc(8, 0, 9, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

async function makeTemplatePreview(template) {
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 270;
  previewCanvas.height = 480;
  const previewCtx = previewCanvas.getContext("2d", { alpha: false });
  previewCtx.scale(0.25, 0.25);
  if (template.mode === "image") {
    await ensureTemplateAssets(template).catch(() => undefined);
  }
  drawTemplateBase(previewCtx, template);
  drawPortraitPlaceholder(previewCtx, template);
  drawNameBadge(previewCtx, template, "ط§ظ„ط§ط³ظ… ظ‡ظ†ط§");
  return previewCanvas.toDataURL("image/png");
}

function drawCoverImage(targetCtx, image, dx, dy, dw, dh, focal = { x: 0.5, y: 0.5 }) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = clamp(iw * focal.x - sw / 2, 0, iw - sw);
  const sy = clamp(ih * focal.y - sh / 2, 0, ih - sh);
  targetCtx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

async function buildExportCanvas() {
  const template = state.activeTemplate || state.templates[0] || fallbackTemplates[0];
  await ensureTemplateAssets(template);
  await document.fonts?.ready;
  await state.portrait?.decode?.().catch(() => undefined);
  renderPoster(ctx, false);
  return canvas;
}

function schedulePreviewImage() {
  const ticket = ++state.previewTicket;
  window.requestAnimationFrame(() => {
    updatePreviewImage(ticket).catch(() => setStatus("طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ظ…ط¹ط§ظٹظ†ط©.", true));
  });
}

async function updatePreviewImage(ticket = ++state.previewTicket) {
  const exportCanvas = await buildExportCanvas();
  const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png", 1));
  const dataUrl = exportCanvas.toDataURL("image/png");
  const checked = validateExportCanvas(exportCanvas, blob);
  if (ticket !== state.previewTicket) return false;
  if (!checked.ok) return false;
  state.previewBlob = blob;
  state.previewDataUrl = dataUrl;
  return true;
}

async function downloadPoster() {
  if (!hasRequiredInputs()) return;
  if (!(await prepareFinalImage())) return;

  const fileName = `${state.activeTemplate.id}-eid-adha-final-${Date.now()}.png`;
  const serverSaved = await saveViaServer(state.previewBlob, fileName);
  if (serverSaved && serverSaved.size >= 40000) {
    downloadServerFile(serverSaved.url, fileName);
    setStatus("تم تنزيل التصميم بنجاح");
    return;
  }

  downloadBlob(state.previewBlob, fileName);
  setStatus("تم تنزيل التصميم بنجاح");
}
function hasRequiredInputs() {
  if (!state.activeTemplate) {
    setStatus("ط§ط®طھط± ظ‚ط§ظ„ط¨ ط§ظ„ظ…ط¤ط³ط³ط© ط£ظˆظ„ط§ظ‹.", true);
    return false;
  }
  if (!state.portrait) {
    setStatus("ظٹط±ط¬ظ‰ ط±ظپط¹ ط§ظ„طµظˆط±ط© ط§ظ„ط´ط®طµظٹط© ط£ظˆظ„ط§ظ‹.", true);
    return false;
  }
  if (!state.name.trim()) {
    setStatus("ظٹط±ط¬ظ‰ ظƒطھط§ط¨ط© ط§ظ„ط§ط³ظ… ظ‚ط¨ظ„ ط§ظ„طھظ†ط²ظٹظ„.", true);
    return false;
  }
  return true;
}

async function prepareFinalImage() {
  const ready = await updatePreviewImage(++state.previewTicket);
  if (!ready || !state.previewBlob || !state.previewDataUrl) {
    setStatus("طھط¹ط°ط± طھط¬ظ‡ظٹط² ط§ظ„طھطµظ…ظٹظ…. ط­ط¯ط« ط§ظ„طµظپط­ط© ظˆط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰.", true);
    return false;
  }
  return true;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  state.downloadUrls.push(url);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.position = "fixed";
  link.style.inset = "auto auto 0 0";
  link.style.width = "1px";
  link.style.height = "1px";
  link.style.opacity = "0";
  link.textContent = "download";
  document.body.appendChild(link);
  window.setTimeout(() => link.click(), 0);
}

async function saveViaServer(blob, fileName) {
  try {
    const response = await fetch("save-poster", {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        "X-File-Name": fileName
      },
      body: blob
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.url ? data : null;
  } catch {
    return null;
  }
}

function downloadServerFile(url, fileName) {
  window.location.assign(url);
}

async function sharePoster() {
  if (!hasRequiredInputs()) return;
  if (!(await prepareFinalImage())) return;

  const title = "تهنئة عيد الأضحى";
  const text = "كل عام وأنتم بخير";
  const file = new File([state.previewBlob], "eid-adha-greeting.png", { type: "image/png" });

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
      setStatus("تم فتح خيارات المشاركة.");
      return;
    }

    if (navigator.share) {
      await navigator.share({ title, text, url: location.href });
      setStatus("تم فتح خيارات المشاركة.");
      return;
    }

    openShareFallback(text);
  } catch (error) {
    if (error.name !== "AbortError") openShareFallback(text);
  }
}

function openShareFallback(text) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${location.href}`)}`;
  window.open(whatsappUrl, "_blank", "noopener");
  setStatus("إذا لم تظهر خيارات المشاركة، تم فتح واتساب كبديل. يمكن تنزيل التصميم ثم إرساله.");
}

function resetDesigner() {
  nameInput.value = "";
  photoInput.value = "";
  state.name = "";
  state.portrait = null;
  state.previewBlob = null;
  state.previewDataUrl = "";
  state.downloadUrls.forEach((url) => URL.revokeObjectURL(url));
  state.downloadUrls = [];
  state.focal = { x: 0.5, y: 0.42 };
  if (state.portraitUrl) URL.revokeObjectURL(state.portraitUrl);
  state.portraitUrl = "";
  updateNameCount();
  renderPoster();
  setStatus("طھظ…طھ ط¥ط¹ط§ط¯ط© ط§ظ„طھط¹ظٹظٹظ†.");
}

function validateExportCanvas(exportCanvas, blob) {
  if (!exportCanvas || exportCanvas.width !== POSTER_W || exportCanvas.height !== POSTER_H) {
    return { ok: false };
  }
  if (!blob || blob.size < 40000) {
    return { ok: false };
  }

  const sampleCtx = exportCanvas.getContext("2d", { willReadFrequently: true });
  const points = [
    [540, 180],
    [540, 680],
    [540, 960],
    [220, 1500],
    [540, 1700],
    [860, 1500]
  ];
  let meaningfulPixels = 0;

  for (const [x, y] of points) {
    const pixel = sampleCtx.getImageData(x, y, 1, 1).data;
    const isWhite = pixel[0] > 245 && pixel[1] > 245 && pixel[2] > 245;
    const isTransparent = pixel[3] < 250;
    if (!isWhite && !isTransparent) meaningfulPixels += 1;
  }

  return { ok: meaningfulPixels >= 2, size: blob.size };
}

function roundRect(targetCtx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  targetCtx.beginPath();
  targetCtx.moveTo(x + radius, y);
  targetCtx.arcTo(x + w, y, x + w, y + h, radius);
  targetCtx.arcTo(x + w, y + h, x, y + h, radius);
  targetCtx.arcTo(x, y + h, x, y, radius);
  targetCtx.arcTo(x, y, x + w, y, radius);
  targetCtx.closePath();
}

function shadeColor(hex, amount) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = clamp((num >> 16) + amount, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((num & 0xff) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

updateNameCount();

