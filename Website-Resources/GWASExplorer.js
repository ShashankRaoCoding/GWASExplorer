const selectorDivs = Array.from(document.getElementsByClassName("attributeselectorhidden"));
const viewport = document.getElementById('viewport');
const contextmenu = document.getElementById('contextmenu');
const fileInput = document.getElementById('file-input');
const fileContentDisplay = document.getElementById('file-content');
const messageDisplay = document.getElementById('message');
const xAttrSelect = document.getElementById('x-attr');
const yAttrSelect = document.getElementById('y-attr');
const idAttrSelect = document.getElementById('id-attr');
const posSelector = document.getElementById("pos-attr") ; 
const chromSelector = document.getElementById("chrom-attr") 
const yAxisSelector = document.getElementById("yAxis-attr") 
let chart = null;
const allData = {}; 
const allAttributes = new Set(); 
const fileNames = [];
const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1', '#FFA133'];

fileInput.addEventListener('change', plotChart);

function showMessage(message, type = 'info') {
    messageDisplay.textContent = message;
    messageDisplay.style.color = type === 'error' ? 'red' : 'white';
}

function plotChart(event) {
    const files = event.target.files;

    if (!files.length) {
        showMessage('No files selected.', 'error');
        return;
    }

    // Reset state
    Object.keys(allData).forEach(k => delete allData[k]);
    allAttributes.clear();
    fileNames.length = 0;

    const readPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.tsv')) {
                showMessage(`Unsupported file type: ${file.name}.`, 'error');
                return resolve(); // skip this file
            }

            const reader = new FileReader();
            reader.onload = () => {
                const lines = reader.result.split('\n').filter(line => line.trim().length > 0);
                if (lines.length === 0) return resolve();

                const header = lines[0].split('\t');
                fileNames.push(file.name);
                allData[file.name] = [];

                // Update unique attributes
                header.forEach(attr => allAttributes.add(attr));

                // Parse SNPs
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split('\t');
                    const SNP = {};
                    header.forEach((attr, idx) => SNP[attr] = values[idx]);
                    allData[file.name].push(SNP);
                }

                resolve();
            };
            reader.onerror = () => reject(`Failed to read ${file.name}`);
            reader.readAsText(file);
        });
    });

    Promise.all(readPromises).then(() => {
        if (fileNames.length === 0) {
            showMessage('No valid TSV files loaded.', 'error');
            return;
        }

        [...selectorDivs].forEach(x => x.className = "attributeselectorshown");
        viewport.className = "viewportshown";
        contextmenu.className = "contextmenuunfocussed";

        populateAttributeSelectors(allAttributes);
        addListeners(); 
        renderChart(allData);
    });
}

function addListeners() { 
  xAttrSelect.addEventListener('change', () => renderChart(allData));
  yAttrSelect.addEventListener('change', () => renderChart(allData));
  idAttrSelect.addEventListener('change', () => renderChart(allData));
}

function populateAttributeSelectors(attributes) {
    attributes = Array.from(allAttributes) 
    const createOptions = (select) => {
        select.innerHTML = '';
        attributes.forEach(attr => {
            const option = new Option(attr, attr);
            select.add(option);
        });
        select.value = attributes[0] || '';
    };
    [xAttrSelect, yAttrSelect, idAttrSelect, posSelector, chromSelector, yAxisSelector].forEach(createOptions);
}

function renderChart(dataMap) {
    const xAttr = xAttrSelect.value;
    const yAttr = yAttrSelect.value;
    const idAttr = idAttrSelect.value;

    if (!xAttr || !yAttr || !idAttr) return;

    if (chart) chart.destroy();

    const datasets = [];
    let hasValidData = false;

    fileNames.forEach((file, idx) => {
        const entries = dataMap[file];
        const dataset = {
            label: file,
            data: [],
            backgroundColor: colors[idx % colors.length],
            borderColor: colors[idx % colors.length],
            pointRadius: 5,
            pointHoverRadius: 7
        };

        entries.forEach(entry => {
            const x = parseFloat(entry[xAttr]);
            const y = parseFloat(entry[yAttr]);
            const id = entry[idAttr] || '';

            if (!isNaN(x) && !isNaN(y)) {
                dataset.data.push({ x, y, id });
                hasValidData = true;
            }
        });

        datasets.push(dataset);
    });

    if (!hasValidData) {
        showMessage("Please select numeric attributes to plot.", 'error');
        return;
    }

    showMessage("Chart rendered successfully.", 'success');

    const ctx = document.getElementById('scatterplot').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;

                    const dataset = chart.data.datasets[datasetIndex];
                    const dataPoint = dataset.data[index];

                    query(dataPoint.id) 
                    
                    //openInNewTab(`https://www.genecards.org/Search/Keyword?queryString=${dataPoint.id}`)

                }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: xAttr } },
                y: { type: 'linear', title: { display: true, text: yAttr } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem) =>
                            `${xAttr}: ${tooltipItem.raw.x}, ${yAttr}: ${tooltipItem.raw.y}, ${idAttr}: ${tooltipItem.raw.id}`
                    }
                },
                zoom: {
                    pan: { enabled: true, mode: 'xy', speed: 10 },
                    zoom: { enabled: true, mode: 'xy', speed: 0.1 }
                }
            }
        }
    });
}

function openInNewTab(url) {
    window.open(url, '_blank');
}

const box = document.getElementById("box");

function query(rsid) {
  const query = `
    query VariantByRSID {
      variant(dataset: gnomad_r4, rsid: "${rsid}") {
        variant_id
        pos
        ref
        alt
        exome {
          ac
          an
        }
      }
    }
  `;

  fetch("https://gnomad.broadinstitute.org/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  })
    .then((response) => response.json())
    .then((data) => {
      const variant = data?.data?.variant;

      if (!variant) {
        box.className = "boxshown";
        box.innerHTML = `<div>Variant not found for <b>${rsid}</b>.</div>`;
        return;
      }

      const { variant_id, pos, ref, alt, exome } = variant;

      let resultHTML = `
        <div><strong>Variant ID:</strong> ${variant_id}</div>
        <div><strong>Position:</strong> ${pos}</div>
        <div><strong>Ref/Alt:</strong> ${ref} / ${alt}</div>
      `;

      if (exome) {
        const { ac, an } = exome;
        const af = an ? (ac / an).toFixed(5) : "N/A";
        resultHTML += `
          <div><strong>AC:</strong> ${ac}</div>
          <div><strong>AN:</strong> ${an}</div>
          <div><strong>Allele Frequency:</strong> ${af}</div>
        `;
      } else {
        resultHTML += `
          <div style="color: gray;">No exome data available for this variant.</div>
        `;
      }

      box.innerHTML = resultHTML;
    })
    .catch((error) => {
      console.error("Error fetching GNOMAD data:", error);
      box.innerHTML = `<div>Error: ${error.message}</div>`;
    });
}

function mergeForManhattan() { 
  const pos = posSelector.value; 
  const chromosome = chromSelector.value; 
  const yAxis = yAxisSelector.value; 
  const fileNames = Object.keys(allData);
  const maxLengths = {};  // e.g., { "1": 8, "2": 7, "X": 9 }

  // Step 1: Find max position string length per chromosome
  fileNames.forEach(filename => { 
    const snps = allData[filename];
    snps.forEach(data => { 
      const chrom = data[chromosome];
      const posLength = data[pos].toString().length;
      if (!maxLengths[chrom] || posLength > maxLengths[chrom]) {
        maxLengths[chrom] = posLength;
      }
    });
  });

  // Step 2: Construct manhattanised string using max pad
  fileNames.forEach(filename => { 
    const snps = allData[filename];
    for (let i = 0; i < snps.length; i++) { 
      const chrom = snps[i][chromosome];
      const paddedPos = snps[i][pos].toString().padStart(maxLengths[chrom], "0");
      snps[i]["manhattanised"] = `${chrom}.${paddedPos}`;
      console.log(snps[i]["manhattanised"]);
      showMessage(snps[i]["manhattanised"]);
    }
  });

  allAttributes.add("manhattanised"); 
  populateAttributeSelectors(allAttributes); 

  xAttrSelect.value = "manhattanised"; 
  yAttrSelect.value = yAxis; 
  renderChart(allData); 
}

