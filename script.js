// script.js - Versión Completa y Corregida (Acordeón Funcionando)

let manifest = {};
let currentFilePath = "";
let currentText = "";

const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

async function loadManifest() {
  try {
    const res = await fetch('manifest.json');
    manifest = await res.json();
    buildSidebar();
  } catch (e) {
    console.error("Error cargando manifest.json", e);
  }
}

function buildSidebar() {
  const container = document.getElementById("chapters-list");
  container.innerHTML = "";

  Object.keys(manifest.chapters).forEach(key => {
    const ch = manifest.chapters[key];
    
    const chapterDiv = document.createElement("div");
    chapterDiv.className = "mb-3";

    chapterDiv.innerHTML = `
      <button onclick="toggleChapter(this)" 
              class="w-full text-left px-5 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl flex items-center justify-between font-medium">
        <span class="flex items-center gap-2 text-base">
          📘 ${ch.name}
        </span>
        <i class="fas fa-chevron-down transition-transform duration-300"></i>
      </button>
      <div class="accordion-content hidden ml-4 mt-2 space-y-1 border-l border-gray-700 pl-4">
      </div>
    `;

    // Agregar temas
    const topicsContainer = chapterDiv.querySelector(".accordion-content");
    
    Object.keys(ch.topics).forEach(fileName => {
      const displayName = ch.topics[fileName];
      
      const topicBtn = document.createElement("button");
      topicBtn.className = "w-full text-left px-5 py-3 hover:bg-gray-800 rounded-xl flex items-center gap-3 text-sm transition-all active:bg-gray-700";
      topicBtn.innerHTML = `
        <i class="fas fa-file-pdf text-red-400"></i>
        <span class="truncate">${displayName}</span>
      `;
      topicBtn.onclick = () => loadFile(key, fileName, displayName);
      topicsContainer.appendChild(topicBtn);
    });

    container.appendChild(chapterDiv);
  });
}

function toggleChapter(button) {
  const content = button.nextElementSibling;
  
  // Cerrar todos los demás
  document.querySelectorAll('.accordion-content').forEach(item => {
    if (item !== content) {
      item.classList.add('hidden');
      const otherBtn = item.previousElementSibling;
      const otherIcon = otherBtn.querySelector('i');
      if (otherIcon) otherIcon.classList.remove('rotate-180');
    }
  });

  // Toggle actual
  content.classList.toggle('hidden');
  const icon = button.querySelector('i');
  icon.classList.toggle('rotate-180');
}

async function loadFile(chapterKey, fileName, displayName) {
  currentFilePath = `data/${chapterKey}/${fileName}`;
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

async function generateWithGemini(type) {
  closeModal();
  
  const viewer = document.getElementById("viewer");
  const original = viewer.innerHTML;
  
  viewer.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full py-20 text-center">
      <div class="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      <p class="mt-6 text-purple-400">Extrayendo texto del PDF...</p>
    </div>`;

  currentText = await extractPDFText(currentFilePath);

  let prompt = "";
  switch(type) {
    case "resumen": prompt = "Resume de forma clara, profesional y bien estructurada este documento médico sobre dolor:"; break;
    case "cuestionario": prompt = "Crea 10 preguntas de opción múltiple con 4 opciones y la respuesta correcta:"; break;
    case "mapa": prompt = "Genera un mapa mental completo y claro sobre el contenido:"; break;
    case "audio": prompt = "Crea un resumen corto y natural para leer en voz alta:"; break;
  }

  const fullPrompt = prompt + "\n\n" + currentText.substring(0, 28000);
  
  const geminiUrl = `https://gemini.google.com/app?prompt=${encodeURIComponent(fullPrompt)}`;
  window.open(geminiUrl, "_blank");

  viewer.innerHTML = original;
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
    console.error(e);
    return "Error al extraer texto del PDF.";
  }
}

// Iniciar la aplicación
loadManifest();
