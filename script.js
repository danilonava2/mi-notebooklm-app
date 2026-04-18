// script.js

let manifest = {};
let currentFilePath = "";

// Cargar el manifest.json
async function loadManifest() {
  try {
    const response = await fetch('manifest.json');
    manifest = await response.json();
    buildSidebar();
  } catch (error) {
    console.error("Error cargando manifest.json:", error);
    document.getElementById("chapters-list").innerHTML = `
      <p class="text-red-400 p-4">Error: No se pudo cargar el manifest.json</p>
    `;
  }
}

// Construir el sidebar con capítulos y temas
function buildSidebar() {
  const container = document.getElementById("chapters-list");
  container.innerHTML = "";

  Object.keys(manifest.chapters).forEach(chapKey => {
    const chapter = manifest.chapters[chapKey];

    const chapterDiv = document.createElement("div");
    chapterDiv.className = "mb-6";

    chapterDiv.innerHTML = `
      <div class="px-4 py-2 text-emerald-400 font-medium flex items-center gap-2 border-l-4 border-emerald-500 bg-gray-800/50">
        <i class="fas fa-book"></i>
        ${chapter.name}
      </div>
    `;

    const topicsContainer = document.createElement("div");
    topicsContainer.className = "ml-4 mt-1";

    Object.keys(chapter.topics).forEach(fileName => {
      const displayName = chapter.topics[fileName];

      const btn = document.createElement("button");
      btn.className = `w-full text-left px-5 py-2.5 hover:bg-gray-800 rounded-lg flex items-center gap-3 text-sm transition-colors
                       ${fileName.endsWith('.pdf') ? 'text-blue-300' : 'text-violet-300'}`;
      
      const icon = fileName.endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-alt';
      
      btn.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="truncate">${displayName}</span>
      `;

      btn.onclick = () => loadFile(chapKey, fileName, displayName);
      topicsContainer.appendChild(btn);
    });

    chapterDiv.appendChild(topicsContainer);
    container.appendChild(chapterDiv);
  });
}

// Cargar el archivo en el visor
async function loadFile(chapterKey, fileName, displayName) {
  currentFilePath = `data/${chapterKey}/${fileName}`;
  
  document.getElementById("current-title").textContent = displayName;
  const viewer = document.getElementById("viewer");
  const buttonsContainer = document.getElementById("notebooklm-buttons");

  // Mostrar visor
  if (fileName.endsWith('.pdf')) {
    viewer.innerHTML = `
      <iframe 
        src="${currentFilePath}" 
        class="w-full h-full rounded-xl shadow-2xl border border-gray-700"
        allowfullscreen>
      </iframe>
    `;
  } else if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
    try {
      const res = await fetch(currentFilePath);
      const text = await res.text();
      viewer.innerHTML = `
        <div class="prose prose-invert max-w-none bg-gray-900 p-8 rounded-xl">
          <pre class="whitespace-pre-wrap text-gray-300">${text}</pre>
        </div>
      `;
    } catch (e) {
      viewer.innerHTML = `<p class="text-red-400">No se pudo cargar el archivo.</p>`;
    }
  } else {
    viewer.innerHTML = `
      <div class="text-center mt-20">
        <p class="text-gray-400">Vista previa no disponible para este tipo de archivo.</p>
        <a href="${currentFilePath}" target="_blank" 
           class="inline-block mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg">
          Abrir archivo directamente
        </a>
      </div>
    `;
  }

  // Mostrar botones de NotebookLM
  buttonsContainer.classList.remove("hidden");
  buttonsContainer.innerHTML = `
    <button onclick="openNotebookLM('audio')" 
            class="bg-violet-600 hover:bg-violet-700 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95">
      <i class="fas fa-headphones"></i> Audio Overview
    </button>
    <button onclick="openNotebookLM('presentation')" 
            class="bg-amber-600 hover:bg-amber-700 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95">
      <i class="fas fa-file-powerpoint"></i> Presentación
    </button>
    <button onclick="openNotebookLM('study')" 
            class="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95">
      <i class="fas fa-graduation-cap"></i> Study Guide
    </button>
    <button onclick="openNotebookLM('chat')" 
            class="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all active:scale-95">
      <i class="fas fa-comments"></i> Chat
    </button>
  `;
}

// Función para abrir NotebookLM
function openNotebookLM(type) {
  const fullUrl = window.location.origin + "/" + currentFilePath;
  
  let message = `📄 Archivo seleccionado:\n${currentFilePath}\n\n`;

  switch(type) {
    case 'audio':
      message += "Se abrirá NotebookLM para crear **Audio Overview**";
      break;
    case 'presentation':
      message += "Se abrirá NotebookLM para crear **Presentación**";
      break;
    case 'study':
      message += "Se abrirá NotebookLM para crear **Study Guide**";
      break;
    case 'chat':
      message += "Se abrirá NotebookLM para **chatear** con el documento";
      break;
  }

  alert(message + "\n\nNota: Por ahora NotebookLM se abre en una pestaña nueva (Google no permite embeberlo fácilmente).");

  // Abrir NotebookLM
  window.open("https://notebooklm.google.com/", "_blank");
}

// Iniciar la aplicación
loadManifest();