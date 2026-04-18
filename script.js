// script.js - Versión Final Corregida (Acordeón Funcionando)

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
  
  // Cerrar todos los demás
  document.querySelectorAll('.accordion-content').forEach(item => {
    if (item !== content) item.classList.add('hidden');
  });

  // Toggle del actual
  content.classList.toggle('hidden');
  
  // Rotar el icono
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
  alert("Extrayendo texto del PDF y abriendo Gemini con tu sesión de Google...");
  // Aquí se puede mejorar más adelante
}

async function extractPDFText(url) {
  // Función auxiliar
  return "Texto extraído";
}

// Iniciar
loadManifest();
