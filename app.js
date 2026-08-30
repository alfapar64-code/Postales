const canvas = document.getElementById('postalCanvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const shareBtn = document.getElementById('shareBtn');

let loadedImage = null;
let weatherData = { temp: '--', condition: 'despejado', emoji: '☀️', tempEmoji: '🌡️' };
let historyFact = "Tal día como hoy: Un día especial para saludar a la familia y amigos.";

// 1. Cargar imagen seleccionada o capturada
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        renderPostal();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// 2. Obtener saludo según la hora
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "¡Muy Buenos días!";
  if (hour >= 12 && hour < 19) return "¡Muy Buenas tardes!";
  return "¡Muy Buenas noches!";
}

// 3. Obtener fecha formateada
function getFormattedDate() {
  const now = new Date();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  return `Hoy es ${days[now.getDay()]} ${now.getDate()} de ${months[now.getMonth()]} Del ${now.getFullYear()}`;
}

// 4. Obtener clima en vivo de Buenos Aires (Open-Meteo API)
async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-34.6037&longitude=-58.3816&current_weather=true');
    const data = await res.json();
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;

    let condition = "despejado";
    let emoji = "☀️";
    let tempEmoji = "🌡️";

    if (temp >= 28) tempEmoji = "🔴🌡️"; // Caliente
    else if (temp <= 10) tempEmoji = "🥶❄️"; // Muy frío

    if (code >= 1 && code <= 3) { condition = "nublado"; emoji = "☁️"; }
    else if (code >= 51) { condition = "lloviendo"; emoji = "🌧️"; }

    weatherData = { temp, condition, emoji, tempEmoji };
  } catch (e) {
    console.log("Error al obtener clima:", e);
  }
}

// 5. Obtener efeméride histórica (Wikipedia API)
async function fetchHistory() {
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const res = await fetch(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`);
    const data = await res.json();

    if (data.events && data.events.length > 0) {
      // Buscar una noticia que contenga referencia a Argentina o Venezuela, o tomar la primera
      const filtered = data.events.find(e => e.text.includes("Argentina") || e.text.includes("Venezuela")) || data.events[0];
      historyFact = `💡 Tal día como hoy en ${filtered.year}: ${filtered.text}`;
    }
  } catch (e) {
    console.log("Error al obtener efeméride:", e);
  }
}

// 6. Procesar y renderizar el Canvas (1080x1920)
function renderPostal() {
  ctx.clearRect(0, 0, 1080, 1920);

  // A. Dibujar Fondo (Object-Fit: Cover en Canvas)
  if (loadedImage) {
    const scale = Math.max(1080 / loadedImage.width, 1920 / loadedImage.height);
    const x = (1080 - loadedImage.width * scale) / 2;
    const y = (1920 - loadedImage.height * scale) / 2;
    ctx.drawImage(loadedImage, x, y, loadedImage.width * scale, loadedImage.height * scale);
  } else {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 1080, 1920);
  }

  // B. Tarjeta Superior Translucida
  ctx.fillStyle = "rgba(40, 40, 40, 0.55)";
  roundRect(ctx, 40, 40, 1000, 430, 30, true);

  // Textos Tarjeta Superior
  ctx.textAlign = "center";
  
  // Saludo
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 62px sans-serif";
  ctx.fillText(`${getGreeting()} 👋`, 540, 120);

  // Ubicación
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "500 42px sans-serif";
  ctx.fillText("🇦🇷 Les saludo desde la hermosa 🇦🇷", 540, 200);
  ctx.fillText("ciudad de Buenos Aires", 540, 255);

  // Fecha (Ajustado el tamaño a 42px)
  ctx.fillStyle = "#E0E0E0";
  ctx.font = "500 42px sans-serif"; 
  ctx.fillText(getFormattedDate(), 540, 330);

  // Clima
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${weatherData.tempEmoji} Temperatura ${weatherData.temp}°C (${weatherData.condition}${weatherData.emoji})`, 540, 410);

  // C. Tarjeta Inferior Translucida (Efemérides)
  ctx.fillStyle = "rgba(40, 40, 40, 0.65)";
  roundRect(ctx, 40, 1500, 1000, 360, 30, true);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "left";
  wrapText(ctx, historyFact, 70, 1560, 940, 46);

  shareBtn.style.display = 'block';
}

// Función auxiliar para bordes redondeados
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

// Función auxiliar para ajustar texto largo en líneas
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
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// Botón de Compartir / Guardar
shareBtn.addEventListener('click', async () => {
  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'postal.png', { type: 'image/png' });
    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: 'Postal Diaria'
          // El texto fue eliminado para que envíe solo la imagen
        });
      } catch (err) {
        console.log("Compartido cancelado");
      }
    } else {
      const link = document.createElement('a');
      link.download = 'postal.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  });
});

// Inicializar APIs al cargar
window.onload = async () => {
  await fetchWeather();
  await fetchHistory();
  renderPostal();
};
