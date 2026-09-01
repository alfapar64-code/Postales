const canvas = document.getElementById('postalCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('liveVideo');

const imageInput = document.getElementById('imageInput');
const startCameraBtn = document.getElementById('startCameraBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const shareBtn = document.getElementById('shareBtn');
const mainControls = document.getElementById('mainControls');
const cameraControls = document.getElementById('cameraControls');
const quoteInput = document.getElementById('quoteInput');
const newQuoteBtn = document.getElementById('newQuoteBtn');

// Variables para el Zoom
const zoomContainer = document.getElementById('zoomContainer');
const zoomSlider = document.getElementById('zoomSlider');
let videoTrack = null;

let loadedImage = null;
let stream = null;
let currentFacingMode = 'user';
let weatherData = { temp: '--', condition: 'despejado', emoji: '☀️', tempEmoji: '🌡️' };
let dailyQuote = "¡Que tengas un día maravilloso lleno de alegrías!";

// URL del Google Sheet en CSV
const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/10DY4i2eMxgOBo_QLtf32jSKH2BHqXHilW98GIbobw5E/export?format=csv";

let quotes = [
  "💡 Cada nuevo día es una página en blanco en el diario de tu vida. ¡Escribe una gran historia hoy!"
];

// Cargar frases de Google Sheets
async function fetchQuotesFromSheet() {
  try {
    const response = await fetch(sheetCsvUrl);
    const data = await response.text();
    const parsedQuotes = data.split('\n').map(q => q.trim()).filter(q => q !== "");
    
    if (parsedQuotes.length > 0) {
      quotes = parsedQuotes.map(q => {
        let cleanQuote = q;
        if (cleanQuote.startsWith('"') && cleanQuote.endsWith('"')) {
           cleanQuote = cleanQuote.slice(1, -1);
        }
        return cleanQuote.startsWith("💡") || cleanQuote.startsWith("🎈") ? cleanQuote : `💡 ${cleanQuote}`;
      });
    }
  } catch (error) {
    console.log("Error al cargar las frases del Sheet", error);
  }
}

// Seleccionar frase al azar y ponerla en el cuadro de texto
function getRandomQuote() {
  if (quotes.length > 0) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    dailyQuote = quotes[randomIndex];
    quoteInput.value = dailyQuote;
  }
}

// Escuchar cambios en el cuadro de texto (Para mensajes personalizados)
quoteInput.addEventListener('input', (e) => {
  dailyQuote = e.target.value;
  renderPostal(video.style.display === 'block'); 
});

// Botón para cambiar frase
newQuoteBtn.addEventListener('click', () => {
  getRandomQuote();
  renderPostal(video.style.display === 'block'); 
});

// Cargar imagen de Galería
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        renderPostal(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Iniciar Cámara
startCameraBtn.addEventListener('click', async () => {
  await openCamera(currentFacingMode);
});

switchCameraBtn.addEventListener('click', async () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  await openCamera(currentFacingMode);
});

async function openCamera(facingMode) {
  if (stream) stream.getTracks().forEach(track => track.stop());
  try {
    // Pedimos acceso a la cámara y soporte para zoom
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: facingMode, zoom: true } 
    });
    
    video.srcObject = stream;
    video.style.display = 'block';
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';

    mainControls.style.display = 'none';
    cameraControls.style.display = 'flex';
    shareBtn.style.display = 'none';
    
    loadedImage = null; 
    renderPostal(true); 

    // --- NUEVO: Configurar Zoom ---
    // Esperamos un momento para asegurarnos de que la cámara se inicializó por completo
    setTimeout(() => {
      [videoTrack] = stream.getVideoTracks();
      const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
      
      // Si la cámara del dispositivo reporta que tiene la capacidad de hacer zoom
      if (capabilities.zoom) {
        zoomSlider.min = capabilities.zoom.min;
        zoomSlider.max = capabilities.zoom.max;
        zoomSlider.step = capabilities.zoom.step;
        zoomSlider.value = videoTrack.getSettings().zoom || capabilities.zoom.min;
        zoomContainer.style.display = 'flex';
      } else {
        zoomContainer.style.display = 'none'; // Se oculta si el teléfono/navegador no lo soporta
      }
    }, 500);

  } catch (err) {
    alert("Error al abrir la cámara.");
  }
}

// --- NUEVO: Evento para mover el slider de Zoom ---
zoomSlider.addEventListener('input', async (e) => {
  if (videoTrack) {
    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: e.target.value }]
      });
    } catch (err) {
      console.log("Error al aplicar zoom", err);
    }
  }
});

// Capturar
captureBtn.addEventListener('click', () => {
  const scale = Math.max(1080 / video.videoWidth, 1920 / video.videoHeight);
  const x = (1080 - video.videoWidth * scale) / 2;
  const y = (1920 - video.videoHeight * scale) / 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1080;
  tempCanvas.height = 1920;
  const tCtx = tempCanvas.getContext('2d');
  
  if (currentFacingMode === 'user') {
    tCtx.translate(1080, 0);
    tCtx.scale(-1, 1);
  }
  
  tCtx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);

  const img = new Image();
  img.onload = () => {
    loadedImage = img;
    stopCamera();
    renderPostal(false);
  };
  img.src = tempCanvas.toDataURL('image/jpeg');
});

function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  video.style.display = 'none';
  cameraControls.style.display = 'none';
  zoomContainer.style.display = 'none'; // Ocultamos el zoom
  mainControls.style.display = 'flex';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "¡Muy Buenos días!";
  if (hour >= 12 && hour < 19) return "¡Muy Buenas tardes!";
  return "¡Muy Buenas noches!";
}

function getFormattedDate() {
  const now = new Date();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `Hoy es ${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]} Del ${now.getFullYear()}`;
}

async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.6037&longitude=-58.3816&current_weather=true');
    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;
    let condition = "despejado"; let emoji = "☀️"; let tempEmoji = "🌡️";
    if (temp >= 28) tempEmoji = "🔴🌡️"; else if (temp <= 10) tempEmoji = "🥶❄️";
    if (code >= 1 && code <= 3) { condition = "nublado"; emoji = "☁️"; }
    else if (code >= 51) { condition = "lloviendo"; emoji = "🌧️"; }
    weatherData = { temp, condition, emoji, tempEmoji };
  } catch (e) {}
}

// Renderizado principal
function renderPostal(isTransparent = false) {
  ctx.clearRect(0, 0, 1080, 1920);

  if (loadedImage) {
    const scale = Math.max(1080 / loadedImage.width, 1920 / loadedImage.height);
    const x = (1080 - loadedImage.width * scale) / 2;
    const y = (1920 - loadedImage.height * scale) / 2;
    ctx.drawImage(loadedImage, x, y, loadedImage.width * scale, loadedImage.height * scale);
  } else if (!isTransparent) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 1080, 1920);
  }

  // A. Tarjeta Superior Translucida
  ctx.fillStyle = "rgba(40, 40, 40, 0.55)";
  roundRect(ctx, 40, 40, 1000, 430, 30, true);

  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 62px sans-serif";
  ctx.fillText(`${getGreeting()} 👋`, 540, 120);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "500 42px sans-serif";
  ctx.fillText("🇦🇷 Les saludo desde la hermosa 🇦🇷", 540, 200);
  ctx.fillText("ciudad de Buenos Aires", 540, 255);

  ctx.fillStyle = "#E0E0E0";
  ctx.font = "500 42px sans-serif"; 
  ctx.fillText(getFormattedDate(), 540, 330);

  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${weatherData.tempEmoji} Temperatura ${weatherData.temp}°C (${weatherData.condition}${weatherData.emoji})`, 540, 410);

  // B. Tarjeta Inferior Translucida (Adaptable y editable)
  ctx.font = "bold 42px sans-serif";
  const maxWidth = 920; 
  const lineHeight = 54; 
  const padding = 45; 
  const marginBot = 60; 

  function getLines(text, maxWidth) {
    if(!text) return [];
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  const lines = getLines(dailyQuote, maxWidth);
  const boxHeight = (lines.length * lineHeight) + (padding * 2) - 10;
  const boxY = 1920 - boxHeight - marginBot; 

  if (dailyQuote.trim() !== "") {
    ctx.fillStyle = "rgba(40, 40, 40, 0.65)";
    roundRect(ctx, 40, boxY, 1000, boxHeight, 30, true);

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    let textY = boxY + padding + 40; 
    for(let i=0; i<lines.length; i++) {
      ctx.fillText(lines[i], 75, textY);
      textY += lineHeight;
    }
  }

  if(loadedImage) shareBtn.style.display = 'block';
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
}

shareBtn.addEventListener('click', async () => {
  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'postal.png', { type: 'image/png' });
    if (navigator.share) {
      try { await navigator.share({ files: [file], title: 'Postal Diaria' }); } catch (err) {}
    } else {
      const link = document.createElement('a');
      link.download = 'postal.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  });
});

window.onload = async () => {
  await fetchWeather();
  await fetchQuotesFromSheet();
  getRandomQuote();
  renderPostal(false);
};
