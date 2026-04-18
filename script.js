// script.js - IA Dentro de la App (Recomendado)

let manifest = {};
let currentFilePath = "";
let currentText = "";
let geminiApiKey = localStorage.getItem("geminiApiKey") || "";

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
    let html = `<div class="mb-6"><div class="px-4 py-2 text-emerald-400 font-medium flex items-center gap-2 border-l-4 border-emerald-500">${ch.name}</div><div class="ml-4 space-y-1">`;
    
    Object.keys(ch.topics).forEach(file => {
      const name = ch.topics[file];
      html += `<button onclick="loadFile('${key}', '${file}', '${name}')" class="w-full text-left px-5 py-3 hover:bg-gray-800 rounded-xl flex items-center gap-3 text-sm"><i class="fas fa-file-pdf text-red-400"></i> <span class="truncate">${name}</span></button>`;
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

  viewer.innerHTML = `<iframe src="${currentFilePath}" class="w-full h-full rounded-2xl shadow-2xl border border-gray-700" allowfullscreen></iframe>`;

  buttons.classList.remove("hidden");
  buttons.innerHTML = `
    <button onclick="openIAModal()" 
            class="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3 rounded-2xl text-base flex items-center gap-3 font-medium shadow-lg">
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
    <div class="grid grid-cols-1 gap-4">
      <div onclick="useFastIA()" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl cursor-pointer border border-purple-500/50">
        <h3 class="text-lg font-bold text-purple-400">🚀 IA Rápida (Dentro de la App)</h3>
        <p class="text-sm text-gray-400">Más rápida • Todo dentro de esta ventana</p>
      </div>
      <div onclick="useFreeIA()" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl cursor-pointer">
        <h3 class="text-lg font-bold">🌐 IA Gratis sin Key</h3>
        <p class="text-sm text-gray-400">Abre Gemini en nueva pestaña</p>
      </div>
    </div>`;
}

async function useFastIA() {
  if (!geminiApiKey) {
    geminiApiKey = prompt("🔑 Ingresa tu Gemini API Key\n(Gratis en: https://ai.google.dev)\n\nSe guardará solo en tu navegador:");
    if (geminiApiKey) localStorage.setItem("geminiApiKey", geminiApiKey);
    else return;
  }
  closeModal();
  await generateInsideApp();
}

function useFreeIA() {
  closeModal();
  alert("Abriendo Gemini Gratis...");
  const prompt = "Analiza y resume este documento médico sobre dolor";
  window.open(`https://gemini.google.com/app?prompt=${encodeURIComponent(prompt)}`, "_blank");
}

async function generateInsideApp() {
  const content = document.getElementById("ia-content");
  document.getElementById("ia-modal").classList.remove("hidden");

  content.innerHTML = `
    <div class="text-center py-16">
      <div class="animate-spin mx-auto h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      <p class="mt-6 text-purple-400">Extrayendo texto del PDF...</p>
    </div>`;

  currentText = await extractPDFText(currentFilePath);

  content.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <button onclick="generateContent('resumen')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl">📝 Resumen Profesional</button>
      <button onclick="generateContent('cuestionario')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl">❓ Cuestionario</button>
      <button onclick="generateContent('mapa')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl">🧠 Mapa Mental</button>
      <button onclick="generateContent('audio')" class="bg-gray-800 hover:bg-gray-700 p-6 rounded-2xl">🔊 Resumen en Audio</button>
    </div>`;
}

async function generateContent(type) {
  const content = document.getElementById("ia-content");
  content.innerHTML = `<div class="text-center py-20"><div class="animate-spin mx-auto h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div><p class="mt-6">Generando con IA...</p></div>`;

  let prompt = "";
  switch(type) {
    case "resumen": prompt = "Resume de forma clara, profesional y estructurada este texto médico:"; break;
    case "cuestionario": prompt = "Crea 10 preguntas tipo test con 4 opciones y respuesta correcta:"; break;
    case "mapa": prompt = "Genera código Mermaid de un mapa mental completo:"; break;
    case "audio": prompt = "Crea un resumen corto y natural para leer en voz alta:"; break;
  }

  const fullPrompt = prompt + "\n\n" + currentText.substring(0, 28000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    const data = await response.json();
    let result = data.candidates[0].content.parts[0].text;

    if (type === "mapa") {
      content.innerHTML = `<div class="bg-gray-950 p-6 rounded-2xl"><pre class="mermaid">${result}</pre></div>`;
      mermaid.run();
    } else if (type === "audio") {
      content.innerHTML = `
        <div class="prose prose-invert p-4">${result}</div>
        <button onclick="speak('${result.replace(/'/g, "\\'")}')" class="mt-4 bg-violet-600 px-6 py-3 rounded-2xl">▶️ Escuchar en Audio</button>`;
    } else {
      content.innerHTML = `<div class="prose prose-invert max-h-[65vh] overflow-auto p-4">${result}</div>`;
    }
  } catch (e) {
    content.innerHTML = `<p class="text-red-400 p-6">Error. Verifica que tu API Key sea correcta.</p>`;
  }
}

window.speak = function(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  speechSynthesis.speak(utterance);
};

async function extractPDFText(url) {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(" ") + "\n\n";
  }
  return fullText;
}

// Iniciar
loadManifest();
