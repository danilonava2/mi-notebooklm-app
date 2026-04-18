// script.js - Versión con "Preguntar al Documento" (estilo RAG simple)

let manifest = {};
let currentFilePath = "";
let currentTitle = "";
let userGeminiKey = localStorage.getItem('userGeminiKey') || "";
let currentPdfText = "";   // ← Guardamos el texto del PDF actual para preguntas

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
    <iframe src="${currentFilePath}" class="w-full h-full rounded-2xl shadow-2xl border border-gray-700 bg-white" allowfullscreen></iframe>`;

  buttons.classList.remove("hidden");
  buttons.innerHTML = `
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3 rounded-2xl flex items-center gap-2 font-medium shadow-lg">
      <i class="fas fa-brain"></i> <span>Herramientas IA</span>
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
        <span class="font-semibold">Podcast (NotebookLM)</span>
      </button>
      <button onclick="startQuestionMode()" class="col-span-2 bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left border border-violet-500/30">
        <i class="fas fa-question text-4xl text-violet-400 mb-3"></i><br>
        <span class="font-semibold">Preguntar al Documento</span>
        <p class="text-xs text-gray-400 mt-1">Haz preguntas específicas sobre el contenido</p>
      </button>
    </div>`;
}

// ==================== NUEVA FUNCIÓN: Preguntar al Documento ====================

async function startQuestionMode() {
  if (!currentFilePath) {
    alert("Primero selecciona un PDF");
    return;
  }

  closeModal();

  // Extraemos el texto una sola vez si no lo tenemos
  if (!currentPdfText || currentPdfText.length < 100) {
    const viewer = document.getElementById("viewer");
    viewer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-gray-400">
        <i class="fas fa-spinner fa-spin text-6xl mb-6 text-violet-400"></i>
        <p class="text-xl">Cargando texto del documento...</p>
      </div>`;
    currentPdfText = await extractPDFText(currentFilePath);
  }

  const viewer = document.getElementById("viewer");
  viewer.innerHTML = `
    <div class="max-w-4xl mx-auto my-8 bg-gray-900 rounded-3xl p-8">
      <div class="flex items-center gap-4 mb-8">
        <span class="text-4xl">❓</span>
        <h2 class="text-3xl font-bold">Preguntar al Documento</h2>
      </div>
      
      <div class="mb-6">
        <textarea id="user-question" rows="3" 
          class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500 resize-y"
          placeholder="Ejemplo: ¿Cuáles son los principales tipos de dolor neuropático? ¿Qué recomienda el documento para el manejo del dolor crónico?"></textarea>
      </div>

      <button onclick="sendQuestion()" 
              class="w-full bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl font-medium flex items-center justify-center gap-2">
        <i class="fas fa-paper-plane"></i>
        Enviar Pregunta
      </button>

      <div id="answer-area" class="mt-8 hidden">
        <h3 class="font-semibold mb-3 text-violet-400">Respuesta:</h3>
        <div id="answer-content" class="bg-gray-950 p-6 rounded-2xl text-gray-200 leading-relaxed whitespace-pre-wrap"></div>
      </div>

      <div class="mt-8">
        <button onclick="window.location.reload()" 
                class="text-gray-400 hover:text-white flex items-center gap-2">
          ← Volver al PDF
        </button>
      </div>
    </div>`;
}

async function sendQuestion() {
  const questionInput = document.getElementById("user-question");
  const question = questionInput.value.trim();
  if (!question) return alert("Escribe una pregunta");

  const answerArea = document.getElementById("answer-area");
  const answerContent = document.getElementById("answer-content");

  answerArea.classList.remove("hidden");
  answerContent.innerHTML = `<i class="fas fa-spinner fa-spin text-violet-400"></i> Procesando tu pregunta...`;

  try {
    const prompt = `Eres un asistente experto en dolor crónico. 
Responde la siguiente pregunta basándote ÚNICAMENTE en el contenido del documento titulado "${currentTitle}".

Pregunta del usuario: ${question}

Reglas importantes:
- Si la información está en el documento, responde de forma clara y precisa.
- Si no encuentras la información, di honestamente que no está en el documento.
- Cuando cites información, indica de qué sección o parte del texto proviene (ejemplo: "Según la sección de Fisiopatología...", "En el apartado de Tratamiento...").
- Sé profesional y usa lenguaje médico adecuado.

Texto completo del documento:
${currentPdfText}`;

    const model = "gemini-2.5-flash";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo obtener respuesta.";

    answerContent.innerHTML = resultText.replace(/\n/g, '<br>');

  } catch (error) {
    console.error(error);
    answerContent.innerHTML = `<span class="text-red-400">Error al procesar la pregunta: ${error.message}</span>`;
  }
}

// ==================== Funciones existentes (resumen, mapa, podcast, etc.) ====================

async function generateWithGemini(type) {
  if (!userGeminiKey) {
    alert("Primero configura tu API Key");
    showApiKeyModal();
    return;
  }
  if (!currentFilePath) return alert("Selecciona primero un PDF");

  closeModal();

  const viewer = document.getElementById("viewer");
  const originalHTML = viewer.innerHTML;

  viewer.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-950 rounded-3xl">
      <i class="fas fa-spinner fa-spin text-6xl mb-6 text-violet-400"></i>
      <p class="text-xl">Procesando con Gemini...</p>
    </div>`;

  try {
    if (!currentPdfText || currentPdfText.length < 100) {
      currentPdfText = await extractPDFText(currentFilePath);
    }

    const prompt = getImprovedPrompt(type, currentTitle) + "\n\n---\n\nTEXTO DEL DOCUMENTO:\n" + currentPdfText;

    const model = "gemini-2.5-flash";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userGeminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se generó contenido";

    showResultInViewer(type, resultText);

  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
    viewer.innerHTML = originalHTML;
  }
}

function getImprovedPrompt(type, title) {
  switch(type) {
    case 'resumen':
      return `Eres un experto en dolor crónico. Haz un resumen profesional, claro y bien estructurado del documento titulado "${title}". Usa Markdown con encabezados y viñetas.`;
    case 'cuestionario':
      return `Crea un cuestionario educativo de 8-10 preguntas basado en "${title}". Mezcla opción múltiple y desarrollo. Incluye respuestas al final.`;
    case 'mapa':
      return `Crea un mapa mental claro y jerárquico en Markdown del documento "${title}". Usa emojis y estructura con #, ## y -.`;
    case 'audio':
      return `Genera un guion de podcast estilo NotebookLM con dos hosts (Alex y Sofía) sobre el documento "${title}". Usa formato de diálogo claro y natural.`;
    default:
      return `Resume el documento "${title}".`;
  }
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
    return fullText.trim();
  } catch (e) {
    return "Error al extraer texto del PDF.";
  }
}

function showResultInViewer(type, content) {
  const viewer = document.getElementById("viewer");
  let emoji = "🧠", titleText = "Resultado IA";

  switch(type) {
    case 'resumen': emoji = "📝"; titleText = "Resumen Profesional"; break;
    case 'cuestionario': emoji = "❓"; titleText = "Cuestionario"; break;
    case 'mapa': emoji = "🧠"; titleText = "Mapa Mental"; break;
    case 'audio': emoji = "🎙️"; titleText = "Guion Podcast (NotebookLM)"; break;
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
      <h2 class="text-2xl font-bold mb-2 flex items-center gap-3">
        <i class="fas fa-key text-violet-400"></i> Tu API Key de Gemini
      </h2>
      <p class="text-gray-400 mb-6 text-sm">Crea tu clave en: <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-violet-400 underline">Google AI Studio</a></p>
      <input id="apikey-input" type="password" value="${userGeminiKey}" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500 mb-6" placeholder="AIzaSy...">
      <div class="flex gap-3">
        <button onclick="saveApiKey()" class="flex-1 bg-violet-600 hover:bg-violet-700 py-4 rounded-2xl font-medium">Guardar Key</button>
        <button onclick="document.getElementById('apikey-modal').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl font-medium">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function saveApiKey() {
  const key = document.getElementById('apikey-input').value.trim();
  if (key.length < 30) return alert("Ingresa una API Key válida");
  userGeminiKey = key;
  localStorage.setItem('userGeminiKey', userGeminiKey);
  alert("✅ API Key guardada correctamente");
  document.getElementById('apikey-modal').remove();
}

// Iniciar
loadManifest();
