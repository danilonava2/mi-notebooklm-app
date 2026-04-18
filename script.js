// script.js - Versión FINAL sin API Key (usa sesión de Google)

let manifest = {};
let currentFilePath = "";
let currentText = "";

const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function loadManifest() {
  const res = await fetch('manifest.json');
  manifest = await res.json();
  buildSidebar();
}

function buildSidebar() {
  const container = document.getElementById("chapters-list");
  container.innerHTML = "";

  Object.keys(manifest.chapters).forEach(key => {
    const ch = manifest.chapters[key];
    
    const chapterHTML = `
      <div class="mb-2">
        <button onclick="toggleChapter(this)" 
                class="w-full text-left px-5 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-between font-medium">
          <span>📘 ${ch.name}</span>
          <i class="fas fa-chevron-down transition-transform"></i>
        </button>
        <div class="accordion-content ml-4 mt-1 space-y-1 hidden">
    `;

    let topicsHTML = "";
    Object.keys(ch.topics).forEach(file => {
      const name = ch.topics[file];
      topicsHTML += `
        <button onclick="loadFile('${key}', '${file}', '${name}')" 
                class="w-full text-left px-5 py-3 hover:bg-gray-800 rounded-xl flex items-center gap-3 text-sm">
          <i class="fas fa-file-pdf text-red-400"></i> 
          <span class="truncate">${name}</span>
        </button>`;
    });

    container.innerHTML += chapterHTML + topicsHTML + `</div></div>`;
  });
}

function toggleChapter(btn) {
  const content = btn.nextElementSibling;
  content.classList.toggle('hidden');
  const icon = btn.querySelector('i');
  icon.classList.toggle('rotate-180');
}

async function loadFile(chapterKey, fileName, displayName) {
  currentFilePath = `data/${chapterKey}/${fileName}`;
  document.getElementById("current-title").textContent = displayName;
  
  const viewer = document.getElementById("viewer");
  const buttons = document.getElementById("action-buttons");

  viewer.innerHTML = `
    <iframe src="${currentFilePath}" 
            class="w-full h-full rounded-2xl shadow-2xl border border-gray-700"
            allowfullscreen></iframe>`;

  buttons.classList.remove("hidden");
  buttons.innerHTML = `
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-medium">
      <i class="fas fa-brain"></i> 
      <span>Herramientas IA</span>
    </button>`;
}

function openIAModal() {
  document.getElementById("ia-modal").classList.remove("hidden");
  showIAOptions();
}

function closeModal() {
  document.getElementById("ia-modal").classList.add("hidden");
}

function showIAOptions() {
  const content = document.getElementById("ia-content");
  content.innerHTML = `
    <div class="text-center mb-6">
      <p class="text-purple-400">Usando tu sesión de Google ya iniciada</p>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <button onclick="generateWithGemini('resumen')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left">
        <i class="fas fa-file-alt text-4xl text-blue-400 mb-3"></i><br>
        <span class="font-semibold">Resumen Profesional</span>
      </button>
      <button onclick="generateWithGemini('cuestionario')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left">
        <i class="fas fa-question-circle text-4xl text-amber-400 mb-3"></i><br>
        <span class="font-semibold">Cuestionario</span>
      </button>
      <button onclick="generateWithGemini('mapa')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left">
        <i class="fas fa-sitemap text-4xl text-emerald-400 mb-3"></i><br>
        <span class="font-semibold">Mapa Mental</span>
      </button>
      <button onclick="generateWithGemini('audio')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left">
        <i class="fas fa-volume-up text-4xl text-violet-400 mb-3"></i><br>
        <span class="font-semibold">Resumen en Audio</span>
      </button>
    </div>`;
}

async function generateWithGemini(type) {
  closeModal();
  
  const loadingHTML = `
    <div class="flex flex-col items-center justify-center h-full py-20 text-center">
      <div class="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      <p class="mt-6 text-purple-400">Extrayendo texto del PDF...</p>
    </div>`;
  
  const viewer = document.getElementById("viewer");
  const originalHTML = viewer.innerHTML;
  viewer.innerHTML = loadingHTML;

  currentText = await extractPDFText(currentFilePath);

  let prompt = "";
  switch(type) {
    case "resumen": prompt = "Resume de forma clara, profesional y bien estructurada este documento médico sobre dolor:"; break;
    case "cuestionario": prompt = "Crea 10 preguntas tipo test con 4 opciones y la respuesta correcta:"; break;
    case "mapa": prompt = "Crea un mapa mental detallado y organizado sobre el contenido:"; break;
    case "audio": prompt = "Crea un resumen corto, natural y fluido para leer en voz alta:"; break;
  }

  const fullPrompt = prompt + "\n\n" + currentText.substring(0, 28000);

  // Abre Gemini con la sesión del usuario ya iniciada
  const geminiUrl = `https://gemini.google.com/app?prompt=${encodeURIComponent(fullPrompt)}`;
  window.open(geminiUrl, "_blank");

  // Restaurar visor
  viewer.innerHTML = originalHTML;
}

async function extractPDFText(url) {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(" ") + "\n\n";
    }
    return fullText;
  } catch (e) {
    return "No se pudo extraer el texto completo del PDF.";
  }
}

// Iniciar
loadManifest();
