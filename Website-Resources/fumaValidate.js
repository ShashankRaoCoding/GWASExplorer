function getTSVHeaders(fileList) {
    const headerSet = new Set();

    const readPromises = Array.from(fileList).map(file => {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.tsv')) return resolve();

            const reader = new FileReader();
            reader.onload = () => {
                const lines = reader.result.split('\n').filter(line => line.trim().length > 0);
                if (lines.length === 0) return resolve();

                const headers = lines[0].split('\t');
                headers.forEach(h => headerSet.add(h));
                resolve();
            };
            reader.onerror = () => reject(`Failed to read file: ${file.name}`);
            reader.readAsText(file);
        });
    });

    return Promise.all(readPromises).then(() => Array.from(headerSet));
}


function parseTSVFiles(fileList) {
    const parsedData = {}; // Will hold { filename: [ { attr1: val1, attr2: val2, ... }, ... ] }

    const readPromises = Array.from(fileList).map(file => {
        return new Promise((resolve, reject) => {
            if (!file.name.endsWith('.tsv')) {
                console.warn(`Skipping unsupported file: ${file.name}`);
                return resolve(); // Skip this file
            }

            const reader = new FileReader();
            reader.onload = () => {
                const lines = reader.result.split('\n').filter(line => line.trim().length > 0);
                if (lines.length === 0) return resolve();

                const header = lines[0].split('\t');
                parsedData[file.name] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split('\t');
                    const entry = {};
                    header.forEach((key, idx) => {
                        entry[key] = values[idx];
                    });
                    parsedData[file.name].push(entry);
                }

                resolve();
            };
            reader.onerror = () => reject(`Failed to read file: ${file.name}`);
            reader.readAsText(file);
        });
    });

    return Promise.all(readPromises).then(() => parsedData);
}

function populateSelector(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`No element found with id "${selectId}"`);
        return;
    }

    select.innerHTML = ''; // Clear existing options

    options.forEach(optionValue => {
        const option = new Option(optionValue, optionValue);
        select.add(option);
    });

    // Optionally set the first value as selected
    if (options.length > 0) {
        select.value = options[0];
    }
}


document.getElementById('file-input').addEventListener('change', async (event) => {
    const files = event.target.files;
    const headers = await getTSVHeaders(files);
    const jsonData = await parseTSVFiles(files);
    headers.push("N/A") 
    populateSelector("pvalue",headers); 
    populateSelector("beta",headers); 
    populateSelector("or",headers); 
    populateSelector("se",headers); 
    populateSelector("ea",headers); 
    populateSelector("nea",headers); 
    populateSelector("chrom",headers); 
    populateSelector("pos",headers); 
});

const checkFunctions = {
    pvalue: pvalueCheck,
    beta: betaCheck,
    or: orCheck,
    se: seCheck,
    ea: eaCheck,
    nea: neaCheck,
    chrom: chromCheck,
    pos: posCheck
};

function validate(allData) {
		const messages = document.getElementById("validateMessage") 
    const attrs = {
        pvalue: document.getElementById("pvalue").value,
        beta: document.getElementById("beta").value,
        or: document.getElementById("or").value,
        se: document.getElementById("se").value,
        ea: document.getElementById("ea").value,
        nea: document.getElementById("nea").value,
        chrom: document.getElementById("chrom").value,
        pos: document.getElementById("pos").value
    };

		messages.innerHTML = "" 

		if (pvalue === "" && chrom === "" && pos === "") {
      messages.innerHTML = "!!!!!! NO SNP IDENTIFIER!!<br>";
    }

    
    console.log("Selected attributes:", attrs);

    for (const [key, attrName] of Object.entries(attrs)) {
        if (attrName === "") {
            messages.innerHTML += `${key} → !!!!!! skipped <br>`;
            continue;
        }

        const checker = checkFunctions[key];
        if (checker) {
            const valid = checker(allData, attrName);
            console.log(`${key} → ${attrName} is ${valid ? ":D valid" : ":O invalid"}`);
            messages.innerHTML = messages.innerHTML + `${key} → ${attrName} is ${valid ? "valid" : "invalid"}<br>`
        }
    }
}


function isAttributeNumeric(allData, attributeName) {
    for (const file in allData) {
        const entries = allData[file];
        for (const entry of entries) {
            const value = entry[attributeName];
            if (value === undefined) continue; // skip missing values
            if (value.trim() === "") continue; // skip empty strings
            if (isNaN(parseFloat(value))) return false; // non-numeric found
        }
    }
    return true; // all values were numeric (or empty/missing)
}

function betaCheck(allData, name) {
    return isAttributeNumeric(allData, name);
}

function orCheck(allData, name) {
    return isAttributeNumeric(allData, name);
}

function seCheck(allData, name) {
    return isAttributeNumeric(allData, name);
}

function pvalueCheck(allData, name) {
    return isAttributeNumeric(allData, name);
}

function posCheck(allData, name) {
    return isAttributeNumeric(allData, name);
}
function eaCheck(allData, name) {
    return !isAttributeNumeric(allData, name);
}

function neaCheck(allData, name) {
    return !isAttributeNumeric(allData, name);
}

function chromCheck(allData, name) {
    return !isAttributeNumeric(allData, name); // Could also be mixed (e.g. 'X', '1')
}




