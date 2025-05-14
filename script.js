let layerCount = 0;
const generatedHashes = new Set();
const nfts = [];

function addLayer() {
  layerCount++;
  const container = document.getElementById('layers-container');
  const layerDiv = document.createElement('div');
  layerDiv.className = 'bg-white p-4 rounded shadow';
  layerDiv.setAttribute('data-layer', layerCount);
  layerDiv.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div class="flex gap-2 items-center">
        <h2 class="text-xl font-bold">Layer ${layerCount}</h2>
        <button onclick="moveLayer(this, -1)" class="text-blue-500">Up</button>
        <button onclick="moveLayer(this, 1)" class="text-blue-500">Down</button>
      </div>
      <button onclick="this.closest('[data-layer]').remove()" class="text-red-500">Remove</button>
    </div>
    <input type="file" multiple accept="image/*" onchange="storeTraits(event, ${layerCount})" />
  `;
  container.appendChild(layerDiv);
}

function moveLayer(button, direction) {
  const layerDiv = button.closest('[data-layer]');
  const container = document.getElementById('layers-container');
  if (direction === -1 && layerDiv.previousElementSibling) {
    container.insertBefore(layerDiv, layerDiv.previousElementSibling);
  } else if (direction === 1 && layerDiv.nextElementSibling) {
    container.insertBefore(layerDiv.nextElementSibling, layerDiv);
  }
}

function storeTraits(event, layerIndex) {
  const files = Array.from(event.target.files);
  const storageKey = `layer_${layerIndex}`;
  const traitData = [];
  let filesProcessed = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      traitData.push({ name: file.name, dataUrl: e.target.result });
      filesProcessed++;
      if (filesProcessed === files.length) {
        localStorage.setItem(storageKey, JSON.stringify(traitData));
      }
    };
    reader.readAsDataURL(file);
  });
}

async function generateNFTs() {
  const canvasSize = parseInt(document.getElementById('image-size').value);
  const batchSize = Math.min(parseInt(document.getElementById('batch-size').value), 500);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  const container = document.getElementById('layers-container');
  const layerDivs = container.querySelectorAll('[data-layer]');
  const layers = [];

  layerDivs.forEach(div => {
    const layerIndex = div.getAttribute('data-layer');
    const layer = JSON.parse(localStorage.getItem(`layer_${layerIndex}`) || '[]');
    if (layer.length) layers.push(layer);
  });

  for (let i = 0; i < batchSize; i++) {
    const traits = layers.map(layer => layer[Math.floor(Math.random() * layer.length)]);
    const hash = traits.map(t => t.name).join('-');
    if (generatedHashes.has(hash)) {
      i--;
      continue;
    }

    generatedHashes.add(hash);
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    for (const trait of traits) {
      await new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          resolve();
        };
        img.src = trait.dataUrl;
      });
    }

    const dataUrl = canvas.toDataURL();
    const metadata = { id: nfts.length + 1, traits: traits.map(t => t.name), image: dataUrl };
    nfts.push(metadata);
    localStorage.setItem(`nft_${metadata.id}`, JSON.stringify(metadata));
  }

  alert(`${nfts.length} NFTs generated.`);
}

function downloadZIP() {
  const zip = new JSZip();
  nfts.forEach(nft => {
    const imgData = nft.image.split(',')[1];
    zip.file(`nft_${nft.id}.png`, imgData, { base64: true });
  });
  zip.generateAsync({ type: 'blob' }).then(content => saveAs(content, 'nfts.zip'));
}

function downloadCSV() {
  const csv = ["id,traits"].concat(nfts.map(nft => \`\${nft.id},"\${nft.traits.join('|')}"\`)).join("\n");
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'metadata.csv');
}
