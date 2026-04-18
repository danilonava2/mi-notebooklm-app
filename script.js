// script.js - Versión Corregida (Evita Maximum Call Stack + PDFs grandes)

let manifest = {};
let currentFilePath = "";
let currentTitle = "";
let userGeminiKey = localStorage.getItem('userGeminiKey') || "";

const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function loadManifest() {
  try {
    const res = await fetch('manifest.json');
    manifest = await res.json();
    buildSidebar();
  } catch (e) {
    console.error("Error cargando manifest.json", e);
    document.getElementById("chapters-list").innerHTML = `<p class="text-red-400 p-4">Error cargando los módulos</p>`;
  }
}

function buildSidebar() {
  const container = document.getElementById("chapters-list");
  container.innerHTML = "";

  Object.keys(manifest.chapters).forEach(key => {
    const ch = manifest.chapters[key];

    const chapterDiv = document.createElement("div");
    chapterDiv.className = "mb-4";

    chapterDiv.innerHTML = `
      <button class="w-full text-left px-5 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center justify-between font-medium text-base"
              onclick="toggleChapter(this)">
        <span>📘 ${ch.name}</span>
        <i class="fas fa-chevron-down transition-transform duration-300"></i>
      </button>
      <div class="accordion-content hidden mt-2 ml-4 space-y-1 border-l border-gray-700 pl-4">
      </div>
    `;

    const topicsContainer = chapterDiv.querySelector(".accordion-content");

    Object.keys(ch.topics).forEach(fileName => {
      const displayName = ch.topics[fileName];
      const btn = document.createElement("button");
      btn.className = "w-full text-left px-5 py-3 hover:bg-gray-800 rounded-xl flex items-center gap-3 text-sm transition-all";
      btn.innerHTML = `<i class="fas fa-file-pdf text-red-400"></i> <span class="truncate">${displayName}</span>`;
      btn.onclick = () => loadFile(key, fileName, displayName);
      topicsContainer.appendChild(btn);
    });

    container.appendChild(chapterDiv);
  });
}

function toggleChapter(button) {
  const content = button.nextElementSibling;
  document.querySelectorAll('.accordion-content').forEach(item => {
    if (item !== content) item.classList.add('hidden');
  });
  content.classList.toggle('hidden');
  const icon = button.querySelector('i');
  icon.classList.toggle('rotate-180');
}

async function loadFile(chapterKey, fileName, displayName) {
  currentFilePath = `data/${chapterKey}/${fileName}`;
  currentTitle = displayName;
  document.getElementById("current-title").textContent = displayName;
  
  const viewer = document.getElementById("viewer");
  const buttons = document.getElementById("action-buttons");

  viewer.innerHTML = `
    <iframe 
      src="${currentFilePath}" 
      class="w-full h-full rounded-2xl shadow-2xl border border-gray-700 bg-white"
      allowfullscreen>
    </iframe>`;

  buttons.classList.remove("hidden");
  buttons.innerHTML = `
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-medium shadow-lg">
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
    <div class="grid grid-cols-2 gap-4">
      <button onclick="generateWithGemini('resumen')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
        <i class="fas fa-file-alt text-4xl text-blue-400 mb-3"></i><br>
        <span class="font-semibold">Resumen Profesional</span>
      </button>
      <button onclick="generateWithGemini('cuestionario')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
        <i class="fas fa-question-circle text-4xl text-amber-400 mb-3"></i><br>
        <span class="font-semibold">Cuestionario</span>
      </button>
      <button onclick="generateWithGemini('mapa')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
        <i class="fas fa-sitemap text-4xl text-emerald-400 mb-3"></i><br>
        <span class="font-semibold">Mapa Mental</span>
      </button>
      <button onclick="generateWithGemini('audio')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
        <i class="fas fa-volume-up text-4xl text-violet-400 mb-3"></i><br>
        <span class="font-semibold">Resumen en Audio</span>
      </button>
    </div>`;
}

// ==================== API KEY ====================

function showApiKeyModal() {
  const existing = document.getElementById('apikey-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'apikey-modal';
  modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4";
  modal.innerHTML = `
    <div class="bg-gray-900 p-8 rounded-3xl max-w-md w-full">
      <h2 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <i class="fas fa-key text-violet-400"></i> Tu API Key de Gemini
      </h2>
      <p class="text-gray-400 mb-6 text-sm">
        Crea tu clave gratis en: 
        <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-violet-400 underline">Google AI Studio</a>
      </p>
      
      <input id="apikey-input" type="password" value="${userGeminiKey}" 
             class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500 mb-6"
             placeholder="AIzaSy...">
      
      <div class="flex gap-3">
        <button onclick="saveApiKey()" class="flex-1 bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl font-medium">Guardar Key</button>
        <button onclick="document.getElementById('apikey-modal').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-medium">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function saveApiKey() {
  const input = document.getElementById('apikey-input');
  const key = input.value.trim();
  if (key.length < 30) {
    alert("Por favor ingresa una API Key válida");
    return;
  }
  userGeminiKey = key;
  localStorage.setItem('userGeminiKey', userGeminiKey);
  alert("✅ API Key guardada correctamente.");
  document.getElementById('apikey-modal').remove();
}

// ==================== FUNCIÓN PRINCIPAL CORREGIDA ====================

async function generateWithGemini(type) {
  if (!userGeminiKey) {
    alert("Primero configura tu API Key de Gemini (botón 'Mi API Key')");
    showApiKeyModal();
    return;
  }

  if (!currentFilePath) {
    alert("Selecciona primero un PDF");
    return;
  }

  closeModal();

  const viewer = document.getElementById("viewer");
  const originalHTML = viewer.innerHTML;

  viewer.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-950 rounded-3xl">
      <i class="fas fa-spinner fa-spin text-6xl mb-6 text-violet-400"></i>
      <p class="text-xl">Extrayendo texto del PDF...</p>
      <p class="text-sm mt-2">Esto puede tardar según el tamaño del documento</p>
    </div>`;

  try {
    // Extraemos solo el texto (más seguro y ligero)
    const pdfText = await extractPDFText(currentFilePath);

    if (pdfText.length < 50) {
      throw new Error("No se pudo extraer suficiente texto del PDF.");
    }

    const prompt = getPrompt(type, currentTitle) + "\n\nDocumento:\n" + pdfText;

    const model = "gemini-1.5-flash";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const resultText = data.candidates[0].content.parts[0].text;
      showResultInViewer(type, resultText);
    } else {
      throw new Error("Respuesta inválida de Gemini");
    }

  } catch (error) {
    console.error(error);
    alert("Error al procesar con Gemini:\n" + error.message + "\n\nPrueba con un PDF más pequeño o verifica tu API Key.");
    viewer.innerHTML = originalHTML;
  }
}

// Extrae texto del PDF (versión robusta)
async function extractPDFText(url) {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    return fullText.trim();
  } catch (e) {
    console.error("Error extrayendo texto:", e);
    return "Error al extraer texto del PDF.";
  }
}

function getPrompt(type, title) {
  switch(type) {
    case 'resumen': 
      return `Eres un experto en dolor crónico. Haz un resumen profesional y estructurado del documento titulado "${title}". Usa Markdown.`;
    case 'cuestionario': 
      return `Crea un cuestionario de 8-10 preguntas (mezcla opción múltiple y desarrollo) basado en "${title}". Incluye respuestas al final.`;
    case 'mapa': 
      return `Genera un mapa mental claro en Markdown del documento "${title}". Usa emojis y jerarquía.`;
    case 'audio': 
      return `Escribe un guion natural para audio/podcast del documento "${title}". Debe sonar conversacional.`;
    default: 
      return `Resume claramente el documento titulado "${title}".`;
  }
}

function showResultInViewer(type, content) {
  const viewer = document.getElementById("viewer");
  let emoji = "🧠", titleText = "Resultado IA";

  switch(type) {
    case 'resumen': emoji = "📝"; titleText = "Resumen Profesional"; break;
    case 'cuestionario': emoji = "❓"; titleText = "Cuestionario"; break;
    case 'mapa': emoji = "🧠"; titleText = "Mapa Mental"; break;
    case 'audio': emoji = "🎙️"; titleText = "Guion para Audio"; break;
  }

  viewer.innerHTML = `
    <div class="max-w-4xl mx-auto my-8 bg-gray-900 rounded-3xl p-8 prose prose-invert">
      <div class="flex items-center gap-4 mb-8 border-b border-gray-700 pb-6">
        <span class="text-5xl">${emoji}</span>
        <h2 class="text-3xl font-bold m-0">${titleText}</h2>
      </div>
      <div class="text-gray-200 leading-relaxed whitespace-pre-wrap">${content}</div>
      <div class="mt-12 flex gap-4">
        <button onclick="window.location.reload()" class="flex-1 bg-gray-800 hover:bg-gray-700 py-4 rounded-2xl font-medium">← Volver al PDF</button>
        <button onclick="copyResult()" class="flex-1 bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl font-medium">📋 Copiar</button>
      </div>
    </div>`;
}

function copyResult() {
  const text = document.querySelector('.prose')?.innerText || "";
  navigator.clipboard.writeText(text).then(() => alert("✅ Copiado al portapapeles"));
}

// Iniciar
loadManifest();
