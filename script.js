const timeDisplay = document.getElementById("time-display");
const statusLabel = document.getElementById("status");
const dial = document.getElementById("dial");
const minutesInput = document.getElementById("minutes-input");
const secondsInput = document.getElementById("seconds-input");
const startPauseButton = document.getElementById("start-pause");
const resetButton = document.getElementById("reset");
const stopAlertButton = document.getElementById("stop-alert");
const customTimeForm = document.getElementById("custom-time-form");
const presetButtons = document.querySelectorAll(".preset");

let totalSeconds = 300;
let remainingSeconds = 300;
let timerId = null;
let targetTimestamp = null;
let audioContext = null;
let alertIntervalId = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTime(value) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function updateDial() {
  const ratio = totalSeconds === 0 ? 0 : remainingSeconds / totalSeconds;
  const degrees = Math.max(0, Math.min(360, ratio * 360));
  dial.style.setProperty(
    "--ring",
    `conic-gradient(
      from 180deg,
      var(--primary) 0deg,
      var(--accent) ${degrees}deg,
      rgba(201, 91, 42, 0.15) ${degrees}deg,
      rgba(201, 91, 42, 0.12) 360deg
    )`
  );
}

function syncInputs() {
  minutesInput.value = Math.floor(remainingSeconds / 60);
  secondsInput.value = remainingSeconds % 60;
}

function render() {
  timeDisplay.textContent = formatTime(remainingSeconds);
  updateDial();
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  targetTimestamp = null;
}

function setStatus(message) {
  statusLabel.textContent = message;
}

function stopAlert() {
  if (alertIntervalId) {
    window.clearInterval(alertIntervalId);
    alertIntervalId = null;
  }
  dial.classList.remove("finished");
}

function playBeep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  oscillator.start(now);
  oscillator.stop(now + 0.36);
}

function triggerAlert() {
  stopAlert();
  dial.classList.add("finished");
  playBeep();
  alertIntervalId = window.setInterval(playBeep, 900);
}

function finishTimer() {
  stopTimer();
  remainingSeconds = 0;
  render();
  setStatus("Temps écoulé");
  startPauseButton.textContent = "Relancer";
  triggerAlert();
}

function tick() {
  if (!targetTimestamp) {
    return;
  }

  const secondsLeft = Math.max(
    0,
    Math.ceil((targetTimestamp - Date.now()) / 1000)
  );

  remainingSeconds = secondsLeft;
  render();

  if (secondsLeft === 0) {
    finishTimer();
  }
}

function startTimer() {
  if (remainingSeconds === 0) {
    remainingSeconds = totalSeconds;
    render();
  }

  if (remainingSeconds === 0) {
    setStatus("Choisissez une durée supérieure à 0 seconde");
    return;
  }

  stopAlert();
  targetTimestamp = Date.now() + remainingSeconds * 1000;
  tick();
  timerId = window.setInterval(tick, 250);
  startPauseButton.textContent = "Pause";
  setStatus("Cuisson en cours");
}

function pauseTimer() {
  stopTimer();
  startPauseButton.textContent = "Reprendre";
  setStatus("En pause");
}

function setTimer(seconds, statusText = "Prêt à démarrer") {
  stopTimer();
  stopAlert();

  totalSeconds = Math.max(0, seconds);
  remainingSeconds = totalSeconds;
  syncInputs();
  render();
  setStatus(statusText);
  startPauseButton.textContent = "Démarrer";
}

function sanitizeField(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) {
    return 0;
  }
  return Math.max(0, Math.min(59, number));
}

customTimeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const minutes = sanitizeField(minutesInput.value);
  const seconds = sanitizeField(secondsInput.value);
  setTimer(minutes * 60 + seconds, "Durée personnalisée prête");
});

startPauseButton.addEventListener("click", () => {
  if (timerId) {
    pauseTimer();
    return;
  }
  startTimer();
});

resetButton.addEventListener("click", () => {
  setTimer(totalSeconds, "Minuteur réinitialisé");
});

stopAlertButton.addEventListener("click", () => {
  stopAlert();
  setStatus(remainingSeconds === 0 ? "Alerte coupée" : "Prêt à démarrer");
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const seconds = Number.parseInt(button.dataset.seconds || "0", 10);
    setTimer(seconds, `${button.firstChild.textContent.trim()} prêt`);
  });
});

render();
