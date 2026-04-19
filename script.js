// script.js - Versión Corregida (Mejor búsqueda en Todo el Máster)

let manifest = {};
let currentFilePath = "";
let currentTitle = "";
let currentPdfText = "";
let userGeminiKey = localStorage.getItem('userGeminiKey') || "";
let questionHistory = [];
let allDocumentsText = "";

const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function loadManifest() {
  try {
    const res = await fetch('manifest.json');
    manifest = await res.json();
    buildSidebar();
    createGlobalButton();
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

function createGlobalButton() {
  const header = document.querySelector('.p-4.border-b');
  if (!header) return;
  const globalBtn = document.createElement('button');
  globalBtn.className = "bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-medium ml-4 shadow-lg";
  globalBtn.innerHTML = `<i class="fas fa-globe"></i> Preguntar a Todo el Máster`;
  globalBtn.onclick = () => startQuestionMode(true);
  header.appendChild(globalBtn);
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
        <span class="font-semibold">Podcast NotebookLM</span>
      </button>
      <button onclick="startQuestionMode(false)" class="col-span-2 bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500 p-6 rounded-2xl text-left">
        <i class="fas fa-question text-4xl text-violet-400 mb-3"></i><br>
        <span class="font-semibold">Preguntar a este Documento</span>
      </button>
    </div>`;
}

// ==================== MODO PREGUNTAS ====================
let isGlobalSearch = false;

async function startQuestionMode(global = false) {
  isGlobalSearch = global;
  closeModal();

  const viewer = document.getElementById("viewer");
  viewer.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-400">
      <i class="fas fa-spinner fa-spin text-6xl mb-6"></i>
      <p class="text-xl">${global ? 'Cargando todos los documentos del Máster...' : 'Cargando documento...'}</p>
    </div>`;

  try {
    if (global) {
      allDocumentsText = await loadAllDocumentsText();
    } else if (!currentPdfText || currentPdfText.length < 100) {
      currentPdfText = await extractPDFText(currentFilePath);
    }
    renderQuestionInterface(global);
  } catch (e) {
    alert("Error al cargar los documentos: " + e.message);
  }
}

async function loadAllDocumentsText() {
  let combined = "MATERIAL DEL MÁSTER EN DOLOR:\n\n";
  let count = 0;

  for (const chapterKey of Object.keys(manifest.chapters)) {
    const chapter = manifest.chapters[chapterKey];
    for (const fileName of Object.keys(chapter.topics)) {
      const path = `data/${chapterKey}/${fileName}`;
      const text = await extractPDFText(path);
      if (text && text.length > 50) {
        count++;
        combined += `=== DOCUMENTO ${count}: ${chapter.topics[fileName]} ===\n${text}\n\n`;
        // Limitamos el total para no superar límites de Gemini
        if (combined.length > 35000) break;
      }
    }
    if (combined.length > 35000) break;
  }
  return combined;
}

function renderQuestionInterface(global) {
  const viewer = document.getElementById("viewer");
  viewer.innerHTML = `
    <div class="max-w-4xl mx-auto my-8 bg-gray-900 rounded-3xl p-8">
      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <span class="text-4xl">${global ? '🌐' : '❓'}</span>
          <div>
            <h2 class="text-3xl font-bold">${global ? 'Preguntar a Todo el Máster' : 'Preguntar al Documento'}</h2>
            <p class="text-gray-400">${global ? 'Buscando en todos los PDFs del curso' : currentTitle}</p>
          </div>
        </div>
        <button onclick="returnToLastPDF()" class="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center gap-2">
          <i class="fas fa-arrow-left"></i> Volver
        </button>
      </div>

      <textarea id="user-question" rows="3" 
        class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500" 
        placeholder="Ejemplo: Clasificación del dolor neuropático"></textarea>

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
    document.getElementById("viewer").innerHTML = `<iframe src="${currentFilePath}" class="w-full h-full rounded-2xl shadow-2xl border border-gray-700 bg-white" allowfullscreen></iframe>`;
  }
}

function newQuestion() {
  document.getElementById("user-question").value = "";
}

async function sendQuestion() {
  const question = document.getElementById("user-question").value.trim();
  if (!question) return alert("Escribe una pregunta");

  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = `<div class="bg-gray-800 p-6 rounded-2xl flex items-center gap-3"><i class="fas fa-spinner fa-spin text-violet-400"></i> Procesando con Gemini...</div>` + historyDiv.innerHTML;

  try {
    let context = isGlobalSearch ? allDocumentsText : currentPdfText;
    let source = isGlobalSearch ? "Todos los documentos del Máster" : currentTitle;

    // Prompt mejorado y más directo
    const prompt = `Eres un experto en dolor crónico. Responde **únicamente** con la información que encuentres en el contexto del Máster en Dolor.

Pregunta: ${question}

Contexto completo del material:
${context}

Responde de forma clara y profesional. Si la información está en el contexto, cita de qué documento proviene. Si no la encuentras, di exactamente: "No encontré esa información en el material del Máster en Dolor."`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (!res.ok) throw new Error("Error en la API de Gemini");

    const data = await res.json();
    let answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se recibió respuesta.";

    // Si Gemini dice que no encontró, intentamos un segundo intento con prompt más fuerte
    if (answer.includes("No encontré esa información") && isGlobalSearch) {
      answer = "No encontré información específica sobre '" + question + "' en los documentos cargados del Máster. ¿Puedes reformular la pregunta o ser más específico?";
    }

    questionHistory.unshift({
      question: question,
      answer: answer,
      source: source,
      timestamp: new Date().toLocaleTimeString()
    });

    renderHistory();

  } catch (err) {
    console.error(err);
    alert("Error al procesar la pregunta:\n" + err.message);
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

  container.innerHTML = html || `<p class="text-gray-500 text-center py-10">Aún no hay preguntas.</p>`;
}

// ==================== OTRAS FUNCIONES ====================
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

    const prompt = getImprovedPrompt(type, currentTitle) + "\n\nTexto completo del documento:\n" + currentPdfText;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se generó contenido";

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
    case 'mapa': return `Crea un mapa mental claro y jerárquico en Markdown del documento "${title}". Usa emojis.`;
    case 'audio': return `Genera un guion de podcast estilo NotebookLM con dos hosts (Alex y Sofía) sobre "${title}". Usa formato de diálogo natural.`;
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
    console.error("Error en PDF:", url);
    return "";
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

// Iniciar
loadManifest();
