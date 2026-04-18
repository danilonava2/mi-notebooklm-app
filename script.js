// script.js - Versión Final Mejorada

let manifest = {};
let currentFilePath = "";
let currentTitle = "";
let currentPdfText = "";
let userGeminiKey = localStorage.getItem('userGeminiKey') || "";
let questionHistory = [];

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
      <div class="accordion-content hidden mt-2 ml-4 space-y-1 border-l border-gray-700 pl-4"></div>
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
  button.querySelector('i').classList.toggle('rotate-180');
}

async function loadFile(chapterKey, fileName, displayName) {
  currentFilePath = `data/${chapterKey}/${fileName}`;
  currentTitle = displayName;
  document.getElementById("current-title").textContent = displayName;
  
  const viewer = document.getElementById("viewer");
  const buttons = document.getElementById("action-buttons");

  viewer.innerHTML = `
    <iframe src="${currentFilePath}" class="w-full h-full rounded-2xl shadow-2xl border border-gray-700 bg-white" allowfullscreen></iframe>`;

  buttons.classList.remove("hidden");
  buttons.innerHTML = `
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-medium shadow-lg">
      <i class="fas fa-brain"></i> <span>Herramientas IA</span>
    </button>`;
}

// ==================== MODAL HERRAMIENTAS IA (solo cuando hay PDF seleccionado) ====================
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
        <span class="font-semibold">Podcast NotebookLM</span>
      </button>
    </div>`;
}

// ==================== BOTÓN GLOBAL: Preguntar a Todos los PDFs ====================
function openGlobalQuestionMode() {
  startQuestionMode(true);
}

// ==================== MODO PREGUNTAS ====================
let isGlobalSearch = false;

async function startQuestionMode(global = false) {
  isGlobalSearch = global;
  closeModal();

  const viewer = document.getElementById("viewer");

  if (!global && !currentFilePath) {
    alert("Selecciona primero un documento para preguntar sobre él.");
    return;
  }

  if (!global && (!currentPdfText || currentPdfText.length < 100)) {
    viewer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400"><i class="fas fa-spinner fa-spin text-6xl"></i><p class="mt-4">Cargando texto del documento...</p></div>`;
    currentPdfText = await extractPDFText(currentFilePath);
  }

  viewer.innerHTML = `
    <div class="max-w-4xl mx-auto my-8 bg-gray-900 rounded-3xl p-8">
      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <span class="text-4xl">${global ? '🌐' : '❓'}</span>
          <div>
            <h2 class="text-3xl font-bold">${global ? 'Preguntar a Todo el Máster' : 'Preguntar al Documento'}</h2>
            <p class="text-gray-400">${global ? 'Busca información en todos los PDFs del curso' : currentTitle}</p>
          </div>
        </div>
        <button onclick="returnToLastPDF()" class="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center gap-2">
          <i class="fas fa-arrow-left"></i> Volver al PDF
        </button>
      </div>

      <textarea id="user-question" rows="3" 
        class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500"
        placeholder="Escribe tu pregunta aquí..."></textarea>

      <div class="flex gap-3 mt-4">
        <button onclick="sendQuestion()" class="flex-1 bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl font-medium">Enviar Pregunta</button>
        <button onclick="newQuestion()" class="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-medium">Nueva Pregunta</button>
      </div>

      <div id="history" class="mt-10 space-y-8"></div>
    </div>`;
  
  renderHistory();
}

function returnToLastPDF() {
  if (currentFilePath) {
    document.getElementById("viewer").innerHTML = `
      <iframe src="${currentFilePath}" class="w-full h-full rounded-2xl shadow-2xl border border-gray-700 bg-white" allowfullscreen></iframe>`;
  }
}

function newQuestion() {
  const textarea = document.getElementById("user-question");
  if (textarea) textarea.value = "";
}

async function sendQuestion() {
  const question = document.getElementById("user-question").value.trim();
  if (!question) return alert("Escribe una pregunta");

  const historyDiv = document.getElementById("history");
  const loadingId = Date.now();

  historyDiv.innerHTML = `<div id="loading-${loadingId}" class="bg-gray-800 p-6 rounded-2xl flex items-center gap-3"><i class="fas fa-spinner fa-spin text-violet-400"></i> Procesando tu pregunta...</div>` + historyDiv.innerHTML;

  try {
    let prompt = `Eres un experto en dolor crónico. Responde con precisión y cita las fuentes cuando sea posible.\n\nPregunta: ${question}\n\n`;

    if (isGlobalSearch) {
      prompt += "Busca la información más relevante en todo el material del Máster en Dolor.\n\n";
    } else {
      prompt += `Documento actual: ${currentTitle}\n\nContenido:\n${currentPdfText}`;
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta";

    questionHistory.unshift({
      question: question,
      answer: answer,
      source: isGlobalSearch ? "Todos los documentos del Máster" : currentTitle,
      timestamp: new Date().toLocaleTimeString()
    });

    renderHistory();

  } catch (err) {
    console.error(err);
    alert("Error al procesar la pregunta");
  }
}

function renderHistory() {
  const container = document.getElementById("history");
  if (!container) return;

  let html = "";
  questionHistory.forEach(item => {
    html += `
      <div class="bg-gray-800 rounded-2xl p-6">
        <div class="flex justify-between text-sm mb-2">
          <strong>Pregunta:</strong> 
          <span class="text-gray-400">${item.timestamp}</span>
        </div>
        <p class="text-gray-300 mb-3">${item.question}</p>
        <div class="text-emerald-400 text-sm mb-2">Fuente: ${item.source}</div>
        <div class="text-gray-200 leading-relaxed whitespace-pre-wrap">${item.answer}</div>
      </div>`;
  });

  container.innerHTML = html || `<p class="text-gray-500 text-center py-10">No hay preguntas aún. Escribe una arriba.</p>`;
}

// ==================== HERRAMIENTAS IA NORMALES ====================
async function generateWithGemini(type) {
  if (!userGeminiKey) {
    alert("Configura tu API Key primero");
    showApiKeyModal();
    return;
  }
  if (!currentFilePath) return alert("Selecciona un documento");

  closeModal();
  const viewer = document.getElementById("viewer");
  const original = viewer.innerHTML;

  viewer.innerHTML = `<div class="flex flex-col items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-6xl text-violet-400"></i><p class="mt-4">Procesando...</p></div>`;

  try {
    if (!currentPdfText) currentPdfText = await extractPDFText(currentFilePath);

    const prompt = getImprovedPrompt(type, currentTitle) + "\n\nTexto del documento:\n" + currentPdfText;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin contenido";

    showResultInViewer(type, result);
  } catch (e) {
    alert("Error: " + e.message);
    viewer.innerHTML = original;
  }
}

function getImprovedPrompt(type, title) {
  switch(type) {
    case 'resumen': return `Haz un resumen profesional y estructurado del documento "${title}". Usa Markdown con encabezados y viñetas.`;
    case 'cuestionario': return `Crea un cuestionario de 8-10 preguntas sobre "${title}". Mezcla opción múltiple y desarrollo corto. Incluye respuestas al final.`;
    case 'mapa': return `Crea un mapa mental claro y jerárquico en Markdown del documento "${title}". Usa emojis y estructura con #, ## y -.`;
    case 'audio': return `Genera un guion de podcast estilo NotebookLM con dos hosts (Alex y Sofía) sobre el documento "${title}". Usa formato de diálogo natural y conversacional.`;
    default: return `Resume el documento "${title}".`;
  }
}

async function extractPDFText(url) {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n\n";
    }
    return text.trim();
  } catch (e) {
    return "Error al extraer texto.";
  }
}

function showResultInViewer(type, content) {
  let emoji = "📝", titleText = "Resultado";
  switch(type) {
    case 'resumen': emoji = "📝"; titleText = "Resumen Profesional"; break;
    case 'cuestionario': emoji = "❓"; titleText = "Cuestionario"; break;
    case 'mapa': emoji = "🧠"; titleText = "Mapa Mental"; break;
    case 'audio': emoji = "🎙️"; titleText = "Guion Podcast"; break;
  }

  document.getElementById("viewer").innerHTML = `
    <div class="max-w-4xl mx-auto my-8 bg-gray-900 rounded-3xl p-8 prose prose-invert">
      <div class="flex items-center gap-4 mb-6">
        <span class="text-5xl">${emoji}</span>
        <h2 class="text-3xl font-bold">${titleText}</h2>
      </div>
      <div class="text-gray-200 whitespace-pre-wrap">${content}</div>
      <div class="mt-10 flex gap-4">
        <button onclick="returnToLastPDF()" class="flex-1 bg-gray-800 hover:bg-gray-700 py-4 rounded-2xl">← Volver al PDF</button>
        <button onclick="copyResult()" class="flex-1 bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl">📋 Copiar</button>
      </div>
    </div>`;
}

function copyResult() {
  const text = document.querySelector('.prose')?.innerText || "";
  navigator.clipboard.writeText(text).then(() => alert("✅ Copiado"));
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
      <h2 class="text-2xl font-bold mb-4 flex items-center gap-3"><i class="fas fa-key text-violet-400"></i> Tu API Key de Gemini</h2>
      <input id="apikey-input" type="password" value="${userGeminiKey}" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 mb-6" placeholder="AIzaSy...">
      <div class="flex gap-3">
        <button onclick="saveApiKey()" class="flex-1 bg-violet-600 py-4 rounded-2xl font-medium">Guardar Key</button>
        <button onclick="document.getElementById('apikey-modal').remove()" class="flex-1 bg-gray-700 py-4 rounded-2xl font-medium">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function saveApiKey() {
  const key = document.getElementById('apikey-input').value.trim();
  if (key.length < 30) return alert("Ingresa una API Key válida");
  userGeminiKey = key;
  localStorage.setItem('userGeminiKey', key);
  alert("✅ API Key guardada correctamente");
  document.getElementById('apikey-modal').remove();
}

// Iniciar la aplicación
loadManifest();
// Iniciar
loadManifest();
