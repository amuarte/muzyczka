const base = 'http://46.225.184.207:8000';
const audioFormats = ['mp3', 'm4a', 'wav', 'opus'];
const videoFormats = ['mp4', 'webm', 'mkv'];
let selected = 'mp3';
let pollTimer = null;
let jobId = null;

function renderFormats() {
  document.getElementById('audio-formats').innerHTML = audioFormats.map(f =>
    `<button class="fmt audio ${f === selected ? 'active' : ''}" onclick="select('${f}')">${f.toUpperCase()}</button>`
  ).join('');
  document.getElementById('video-formats').innerHTML = videoFormats.map(f =>
    `<button class="fmt video ${f === selected ? 'active' : ''}" onclick="select('${f}')">${f.toUpperCase()}</button>`
  ).join('');
  document.getElementById('btn').textContent = `Download ${selected.toUpperCase()}`;
}

function select(fmt) { selected = fmt; renderFormats(); }

async function paste() {
  const text = await navigator.clipboard.readText();
  document.getElementById('url').value = text;
}

async function startDownload() {
  const url = document.getElementById('url').value;
  if (!url) return;

  document.getElementById('btn').textContent = 'Downloading...';
  document.getElementById('btn').disabled = true;
  document.getElementById('progress-area').style.display = 'block';
  document.getElementById('status').textContent = '';

  const res = await fetch(`${base}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format: selected })
  });
  const data = await res.json();
  jobId = data.job_id;

  document.getElementById('btn').textContent = 'Cancel';
  document.getElementById('btn').classList.add('cancel');
  document.getElementById('btn').disabled = false;
  document.getElementById('btn').onclick = cancelDownload;

  pollTimer = setInterval(poll, 500);
}

async function poll() {
  const res = await fetch(`${base}/status/${jobId}`);
  const data = await res.json();

  document.getElementById('bar').value = data.progress;
  document.getElementById('status').textContent = data.converting
    ? 'Converting...'
    : `${Math.round(data.progress)}%${data.eta ? ' — ETA: ' + data.eta : ''}${data.total_items > 1 ? ' — Track ' + data.current_item + ' of ' + data.total_items : ''}`;

  if (data.status === 'done') {
    clearInterval(pollTimer);
    fetchResult();
  } else if (data.status === 'error' || data.status === 'cancelled') {
    clearInterval(pollTimer);
    reset();
  }
}

async function fetchResult() {
  const res = await fetch(`${base}/result/${jobId}`);
  const data = await res.json();

  if (data.status === 'single') {
    const a = document.createElement('a');
    a.href = `${base}${data.url}`;
    a.download = data.filename;
    a.click();
  } else if (data.status === 'playlist') {
    for (const filePath of data.files) {
      const a = document.createElement('a');
      a.href = `${base}${filePath}`;
      a.download = filePath.split('/').pop();
      a.click();
      await new Promise(r => setTimeout(r, 500));
    }
  }
  reset();
}

async function cancelDownload() {
  await fetch(`${base}/cancel/${jobId}`, { method: 'POST' });
  clearInterval(pollTimer);
  reset();
}

function reset() {
  document.getElementById('btn').textContent = `Download ${selected.toUpperCase()}`;
  document.getElementById('btn').classList.remove('cancel');
  document.getElementById('btn').disabled = false;
  document.getElementById('btn').onclick = startDownload;
  document.getElementById('progress-area').style.display = 'none';
  document.getElementById('bar').value = 0;
}

renderFormats();