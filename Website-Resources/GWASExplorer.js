window.onload = function () {
    let link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://www.gwasexplorer.com/Website-Resources/CSS/wandermeadow.css";
    document.head.appendChild(link);
};

// Function to dynamically add Chart.js via CDN
function loadChartJS() {
    let script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.type = "text/javascript";
    script.onload = function () {
        console.log("Chart.js has been loaded!");
        renderChart();
    };
    document.head.appendChild(script);
}
loadChartJS();


function loadZoomPlugin() {
    let zoomScript = document.createElement("script");
    zoomScript.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom";
    zoomScript.type = "text/javascript";
    zoomScript.onload = function () {
        console.log("Chartjs Zoom plugin loaded!");
    };
    document.head.appendChild(zoomScript);
}

loadZoomPlugin();

const readerModeButton = document.getElementsByClassName("readermode")[0];
if (readerModeButton) {
    readerModeButton.click();
}

const fileInput = document.getElementById('file-input');
const fileContentDisplay = document.getElementById('file-content');
const messageDisplay = document.getElementById('message');
const xAttrSelect = document.getElementById('x-attr');
const yAttrSelect = document.getElementById('y-attr');
const idAttrSelect = document.getElementById('id-attr');
let chart = null;
let allSNPData = [];
let allAttributes = [];
let colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFA1', '#FFA133'];

fileInput.addEventListener('change', plotChart);
xAttrSelect.addEventListener('change', renderChart);
yAttrSelect.addEventListener('change', renderChart);
idAttrSelect.addEventListener('change', renderChart);

function showMessage(message, type = 'info') {
    messageDisplay.textContent = message;
    messageDisplay.style.color = type === 'error' ? 'red' : 'green';
}

function populateAttributeSelectors(attributes) {
    const createOptions = (select) => {
        select.innerHTML = '';
        attributes.forEach(attr => {
            const option = new Option(attr, attr);
            select.add(option);
        });
        select.value = attributes[0];
    };
    [xAttrSelect, yAttrSelect, idAttrSelect].forEach(createOptions);
}

function plotChart(event) {
    const files = event.target.files;
    fileContentDisplay.textContent = '';
    messageDisplay.textContent = '';

    if (!files.length) {
        showMessage('No files selected. Please choose at least one TSV file.', 'error');
        return;
    }

    // Reset global state
    allSNPData = [];
    allAttributes = [];

    let expectedHeader = null;
    let loadedFiles = 0;

    Array.from(files).forEach((file, index) => {
        if (!file.name.endsWith('.tsv')) {
            showMessage(`Unsupported file type: ${file.name}. Please select TSV files only.`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const datatext = reader.result;
            const lines = datatext.split('\n').filter(line => line.trim().length > 0);
            const header = lines[0].split('\t');

            // First file sets expected header
            if (expectedHeader === null) {
                expectedHeader = header;
            } 

            const data = readData(lines, header);
            allSNPData.push(data);
            allAttributes = [...new Set([...allAttributes, ...header])];

            loadedFiles++;
            if (loadedFiles === files.length) {
                populateAttributeSelectors(expectedHeader);
                renderChart();
            }
        };

        reader.onerror = () => showMessage(`Error reading file: ${file.name}`, 'error');
        reader.readAsText(file);
    });
}

function readData(lines, attributes) {
    return lines.slice(1).map(line => {
        const parts = line.split('\t');
        return Object.fromEntries(attributes.map((attr, i) => [attr, parts[i]]));
    });
}

function renderChart() {
    if (!xAttrSelect.value || !yAttrSelect.value || !idAttrSelect.value) return;

    const xAttr = xAttrSelect.value;
    const yAttr = yAttrSelect.value;
    const idAttr = idAttrSelect.value;

    if (chart) {
        chart.destroy();
    }

    const datasets = [];
    let hasValidData = false;

    allSNPData.forEach((dataset, idx) => {
        const formatted = {
            label: `Dataset ${idx + 1}`,
            data: [],
            backgroundColor: colors[idx % colors.length],
            borderColor: colors[idx % colors.length],
            pointRadius: 5,
            pointHoverRadius: 7
        };

        dataset.forEach(entry => {
            const x = parseFloat(entry[xAttr]);
            const y = parseFloat(entry[yAttr]);
            const id = entry[idAttr] || '';

            if (!isNaN(x) && !isNaN(y)) {
                formatted.data.push({ x, y, id });
                hasValidData = true;
            }
        });

        datasets.push(formatted);
    });

    if (!hasValidData) {
        showMessage("No valid numeric data found for the selected attributes.", 'error');
        return;
    } else {
        showMessage("Chart rendered successfully.", 'success');
    }

    const ctx = document.getElementById('scatterplot').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            scales: {
                x: { type: 'linear', title: { display: true, text: xAttr } },
                y: { type: 'linear', title: { display: true, text: yAttr } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (tooltipItem) => `${xAttr}: ${tooltipItem.raw.x}, ${yAttr}: ${tooltipItem.raw.y}, ${idAttr}: ${tooltipItem.raw.id}`
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy', // Allow panning in both x and y directions
                        speed: 10
                    },
                    zoom: {
                        enabled: true,
                        mode: 'xy', // Allow zooming in both x and y directions
                        speed: 0.1
                    }
                }
            }
        }
    });
}
