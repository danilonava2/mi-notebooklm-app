// script.js - Versión Completa y Mejorada
let manifest = {};
let currentFilePath = "";
let currentText = "";
let geminiApiKey = localStorage.getItem("geminiApiKey") || "";

const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function loadManifest() {
  try {
    const res = await fetch('manifest.json');
    manifest = await res.json();
    buildSidebar();
  } catch (e) {
    console.error("Error cargando manifest", e);
  }
}

function buildSidebar() {
  const container = document.getElementById("chapters-list");
  container.innerHTML = "";

  Object.keys(manifest.chapters).forEach(key => {
    const ch = manifest.chapters[key];
    let html = `
      <div class="mb-6">
        <div class="px-4 py-2 text-emerald-400 font-medium flex items-center gap-2 border-l-4 border-emerald-500">
          📘 ${ch.name}
        </div>
        <div class="ml-4 space-y-1">`;

    Object.keys(ch.topics).forEach(file => {
      const name = ch.topics[file];
      html += `
        <button onclick="loadFile('${key}', '${file}', '${name}')" 
                class="w-full text-left px-5 py-2.5 hover:bg-gray-800 rounded-xl flex items-center gap-3 text-sm transition-all">
          <i class="fas fa-file-pdf text-red-400"></i> 
          <span class="truncate">${name}</span>
        </button>`;
    });

    html += `</div></div>`;
    container.innerHTML += html;
  });
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
    <!-- Botón IA destacado -->
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-5 py-3 rounded-2xl text-sm flex items-center gap-2 font-medium shadow-lg transition-all">
      <i class="fas fa-brain"></i> 
      <span>IA</span>
    </button>

    <!-- Botones NotebookLM compactos con iconos -->
    <button onclick="openNotebookLM('audio')" 
            class="bg-violet-600 hover:bg-violet-700 w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md transition-all active:scale-95"
            title="Audio Overview - NotebookLM">
      <i class="fas fa-headphones"></i>
    </button>
    
    <button onclick="openNotebookLM('presentation')" 
            class="bg-amber-600 hover:bg-amber-700 w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md transition-all active:scale-95"
            title="Crear Presentación - NotebookLM">
      <i class="fas fa-file-powerpoint"></i>
    </button>
    
    <button onclick="openNotebookLM('study')" 
            class="bg-emerald-600 hover:bg-emerald-700 w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md transition-all active:scale-95"
            title="Study Guide - NotebookLM">
      <i class="fas fa-graduation-cap"></i>
    </button>
    
    <button onclick="openNotebookLM('chat')" 
            class="bg-blue-600 hover:bg-blue-700 w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md transition-all active:scale-95"
            title="Chat con el documento - NotebookLM">
      <i class="fas fa-comments"></i>
    </button>
  `;
}

function openIAModal() {
  if (!geminiApiKey) {
    geminiApiKey = prompt("🔑 Ingresa tu clave de Gemini API (gratis en https://ai.google.dev)\n\nSe guardará solo en tu navegador:");
    if (geminiApiKey) localStorage.setItem("geminiApiKey", geminiApiKey);
    else return;
  }

  document.getElementById("ia-modal").classList.remove("hidden");
  extractAndShowIAOptions();
}

function closeModal() {
  document.getElementById("ia-modal").classList.add("hidden");
}

async function extractAndShowIAOptions() {
  const content = document.getElementById("ia-content");
  content.innerHTML = `
    <div class="text-center py-12">
      <div class="animate-spin mx-auto h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      <p class="mt-4 text-purple-400">Extrayendo texto del PDF...</p>
    </div>`;

  try {
    currentText = await extractPDFText(currentFilePath);
    
    content.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <button onclick="generateWithAI('resumen')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
          <i class="fas fa-file-alt text-4xl text-blue-400 mb-4"></i><br>
          <span class="font-semibold block">Resumen Profesional</span>
        </button>
        <button onclick="generateWithAI('cuestionario')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
          <i class="fas fa-question-circle text-4xl text-amber-400 mb-4"></i><br>
          <span class="font-semibold block">Cuestionario</span>
        </button>
        <button onclick="generateWithAI('mapa')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
          <i class="fas fa-sitemap text-4xl text-emerald-400 mb-4"></i><br>
          <span class="font-semibold block">Mapa Mental</span>
        </button>
        <button onclick="generateWithAI('audio')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left transition-all">
          <i class="fas fa-volume-up text-4xl text-violet-400 mb-4"></i><br>
          <span class="font-semibold block">Resumen en Audio</span>
        </button>
        <button onclick="generateWithAI('infografia')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl text-left col-span-2 transition-all">
          <i class="fas fa-chart-bar text-4xl text-pink-400 mb-4"></i><br>
          <span class="font-semibold block">Infografía Visual</span>
        </button>
      </div>`;
  } catch (e) {
    content.innerHTML = `<p class="text-red-400 text-center">Error al extraer el texto del PDF.</p>`;
  }
}

async function extractPDFText(url) {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(" ") + "\n\n";
  }
  return fullText.substring(0, 30000);
}

async function generateWithAI(type) {
  const content = document.getElementById("ia-content");
  content.innerHTML = `
    <div class="text-center py-20">
      <div class="animate-spin mx-auto h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      <p class="mt-6 text-purple-400">Generando con Gemini IA...</p>
    </div>`;

  let prompt = "";
  switch(type) {
    case "resumen": prompt = "Resume de forma clara, profesional y estructurada (máximo 500 palabras) este texto médico:"; break;
    case "cuestionario": prompt = "Crea un cuestionario de 10 preguntas con 4 opciones cada una y la respuesta correcta marcada. Tema: dolor."; break;
    case "mapa": prompt = "Genera solo código Mermaid (mindmap) claro y completo sobre el contenido principal:"; break;
    case "audio": prompt = "Crea un resumen corto, fluido y natural (máximo 300 palabras) ideal para leer en voz alta:"; break;
    case "infografia": prompt = "Describe una infografía profesional y genera un diagrama Mermaid (flowchart o mindmap):"; break;
  }

  prompt += `\n\n${currentText}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    let result = data.candidates[0].content.parts[0].text;

    if (type === "mapa" || type === "infografia") {
      content.innerHTML = `<div class="bg-gray-950 p-8 rounded-2xl overflow-auto"><pre class="mermaid">${result}</pre></div>`;
      mermaid.run();
    } else if (type === "audio") {
      content.innerHTML = `
        <div class="prose prose-invert">${result}</div>
        <button onclick="speak('${result.replace(/'/g, "\\'")}')" 
                class="mt-6 bg-violet-600 hover:bg-violet-700 px-8 py-4 rounded-2xl text-lg font-medium">
          ▶️ Escuchar Resumen en Audio
        </button>`;
    } else {
      content.innerHTML = `<div class="prose prose-invert max-h-[65vh] overflow-auto p-4">${result}</div>`;
    }
  } catch (e) {
    content.innerHTML = `<p class="text-red-400">Error al conectar con Gemini. Verifica tu API Key.</p>`;
  }
}

window.speak = function(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 1.0;
  speechSynthesis.speak(utterance);
};

function openNotebookLM(type) {
  const fileName = currentFilePath.split('/').pop();
  alert(`📄 Abriendo NotebookLM\nArchivo: ${fileName}\nHerramienta: ${type.toUpperCase()}`);
  window.open("https://notebooklm.google.com/", "_blank");
}

// Iniciar la aplicación
loadManifest();
