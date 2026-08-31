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

let loadedImage = null;
let stream = null;
let currentFacingMode = 'user'; // 'user' (selfie) o 'environment' (trasera)
let weatherData = { temp: '--', condition: 'despejado', emoji: '☀️', tempEmoji: '🌡️' };
let dailyQuote = "¡Que tengas un día maravilloso lleno de alegrías!";

// URL para descargar las frases desde tu Google Sheet en formato CSV
// IMPORTANTE: Asegúrate de haber publicado tu hoja en la web (Archivo > Compartir > Publicar en la web)
const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/10DY4i2eMxgOBo_QLtf32jSKH2BHqXHilW98GIbobw5E/export?format=csv";

// Lista interna de respaldo por si falla la conexión al Sheet
let quotes = [
  "💡 Cada nuevo día es una página en blanco en el diario de tu vida. ¡Escribe una gran historia hoy!",
  "💡 La actitud con la que comiences tu día determinará el éxito del mismo. ¡Mantén una mente positiva!",
  "💡 Un pequeño pensamiento positivo por la mañana puede cambiar todo tu día. ¡Sonríe!"
];

// Función para obtener las frases desde Google Sheets
async function fetchQuotesFromSheet() {
  try {
    const response = await fetch(sheetCsvUrl);
    const data = await response.text();
    
    // Separamos el texto por saltos de línea, quitamos espacios en blanco extra y filtramos líneas vacías
    const parsedQuotes = data.split('\n').map(q => q.trim()).filter(q => q !== "");
    
    if (parsedQuotes.length > 0) {
      // Agregamos el icono del bombillo a cada frase si no lo tiene
      quotes = parsedQuotes.map(q => {
        // Quitamos las comillas dobles si el CSV las agrega al inicio y al final
        let cleanQuote = q;
        if (cleanQuote.startsWith('"') && cleanQuote.endsWith('"')) {
           cleanQuote = cleanQuote.slice(1, -1);
        }
        return cleanQuote.startsWith("💡") ? cleanQuote : `💡 ${cleanQuote}`;
      });
    }
  } catch (error) {
    console.log("Error al cargar las frases del Sheet, usando las de respaldo:", error);
  }
}

// Función para seleccionar una frase al azar de la lista cargada
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  dailyQuote = quotes[randomIndex];
}

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

// Iniciar Cámara en Vivo
startCameraBtn.addEventListener('click', async () => {
  await openCamera(currentFacingMode);
});

// Cambiar cámara (Frontal/Trasera)
switchCameraBtn.addEventListener('click', async () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  await openCamera(currentFacingMode);
});

async function openCamera(facingMode) {
  if (stream) stream.getTracks().forEach(track => track.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
    video.srcObject = stream;
    video.style.display = 'block';
    
    // Si es cámara selfie, poner modo espejo
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';

    mainControls.style.display = 'none';
    cameraControls.style.display = 'flex';
    shareBtn.style.display = 'none';
    
    loadedImage = null; 
    getRandomQuote(); // Actualiza la frase al abrir la cámara
    renderPostal(true); // True indica fondo transparente para ver el video
  } catch (err) {
    alert("Error al abrir la cámara. Revisa los permisos.");
  }
}

// Capturar Foto
captureBtn.addEventListener('click', () => {
  const scale = Math.max(1080 / video.videoWidth, 1920 / video.videoHeight);
  const x = (1080 - video.videoWidth * scale) / 2;
  const y = (1920 - video.videoHeight * scale) / 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 1080;
  tempCanvas.height = 1920;
  const tCtx = tempCanvas.getContext('2d');
  
  // Aplicar efecto espejo a la foto final si es selfie
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
  mainControls.style.display = 'flex';
}

// Datos de tiempo y clima
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
  } catch (e) { console.log(e); }
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

  // Tarjeta Superior Translucida
  ctx.fillStyle = "rgba(40, 40, 40, 0.55)";
  roundRect(ctx, 40, 40, 1000, 430, 30, true);

  // Textos Tarjeta Superior
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

  // Tarjeta Inferior Translucida
  ctx.fillStyle = "rgba(40, 40, 40, 0.65)";
  roundRect(ctx, 40, 1500, 1000, 360, 30, true);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "left";
  // Llamamos a la variable dailyQuote para imprimir la frase elegida al azar
  wrapText(ctx, dailyQuote, 70, 1560, 940, 46);

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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else { line = testLine; }
  }
  ctx.fillText(line, x, y);
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
  await fetchQuotesFromSheet(); // Primero descargamos las frases de tu hoja
  getRandomQuote(); // Luego seleccionamos una al azar
  renderPostal(false);
};
