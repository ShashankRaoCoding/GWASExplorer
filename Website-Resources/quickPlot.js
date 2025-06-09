const selectorDivs = Array.from(document.getElementsByClassName("attributeselectorhidden"));
const viewport = document.getElementById('viewport');
const contextmenu = document.getElementById('contextmenu');
const fileInput = document.getElementById('file-input');
const fileContentDisplay = document.getElementById('file-content');
const messageDisplay = document.getElementById('message');
const xAttrSelect = document.getElementById('x-attr');
const yAttrSelect = document.getElementById('y-attr');
const idAttrSelect = document.getElementById('id-attr');

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

        populateAttributeSelectors(Array.from(allAttributes));
        renderChart(allData);
    });
}

function populateAttributeSelectors(attributes) {
    const createOptions = (select) => {
        select.innerHTML = '';
        attributes.forEach(attr => {
            const option = new Option(attr, attr);
            select.add(option);
        });
        select.value = attributes[0] || '';
    };
    [xAttrSelect, yAttrSelect, idAttrSelect].forEach(createOptions);

    xAttrSelect.addEventListener('change', () => renderChart(allData));
    yAttrSelect.addEventListener('change', () => renderChart(allData));
    idAttrSelect.addEventListener('change', () => renderChart(allData));
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
                    
                    openInNewTab(`https://www.genecards.org/Search/Keyword?queryString=${dataPoint.id}`)

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

