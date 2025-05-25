let mode = "encode";
        
function toggleMode() {
    const modeSwitch = document.getElementById("modeSwitch");
    const modeLabel = document.getElementById("modeLabel");
    const body = document.body;
    const container = document.querySelector(".container");
    const fileInput = document.getElementById("fileInput");
    const fileName = document.getElementById("fileName");
    const downloadLink = document.getElementById("downloadLink");
    const fileLabel = document.getElementById("fileLabel");

   
    if (modeSwitch.checked) {
        mode = "decode";
        fileInput.accept = ".json";
        fileLabel.textContent = "Chọn file JSON";
        modeLabel.textContent = "Decode";
        body.classList.remove("encode-mode");
        body.classList.add("decode-mode");
        container.classList.remove("encode-mode");
        container.classList.add("decode-mode");
    } else {
        mode = "encode";
        fileInput.accept = ".txt";
        fileLabel.textContent = "Chọn file text (TXT)";
        modeLabel.textContent = "Encode";
        body.classList.remove("decode-mode");
        body.classList.add("encode-mode");
        container.classList.remove("decode-mode");
        container.classList.add("encode-mode");
    }

    // Reset input file và ẩn thông tin file khi đổi chế độ
    fileInput.value = "";
    fileName.textContent = "Chưa có file nào được chọn";
    downloadLink.style.display = "none";
    // Reset nội dung hiển thị
    document.getElementById("originalContent").textContent = "Nội dung file sẽ hiển thị ở đây...";
    const resultOutput = document.getElementById("resultOutput");
    resultOutput.textContent = "Chưa có kết quả";
    resultOutput.style.display = "none";

}


function setMode(selectedMode) {
    mode = selectedMode;
    alert(`Chế độ hiện tại: ${mode}`);
}

function displayFileName() {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileName.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            console.log("File content loaded:", fileContent);
            document.getElementById("originalContent").textContent = fileContent;
        };
        reader.readAsText(fileInput.files[0]);
    } else {
        fileName.textContent = "Chưa có file nào được chọn";
        document.getElementById("originalContent").textContent = "Nội dung file...";
    }
}

function validateJSON(jsonData) {
    if (mode === "encode") {
        // Kiểm tra cấu trúc file Encode
        return Array.isArray(jsonData) && jsonData.every(item => 
            item.hasOwnProperty("word") && 
            item.hasOwnProperty("tag") && 
            Array.isArray(item.word) && 
            Array.isArray(item.tag) && 
            item.word.length === item.tag.length
        );
    } else {
        // Kiểm tra cấu trúc file Decode
        return jsonData.hasOwnProperty("classes") &&
            jsonData.hasOwnProperty("annotations") &&
            Array.isArray(jsonData.classes) &&
            Array.isArray(jsonData.annotations) &&
            jsonData.annotations.every(item => 
                Array.isArray(item) && 
                item.length === 2 && 
                typeof item[0] === "string" && 
                item[1].hasOwnProperty("entities") &&
                Array.isArray(item[1].entities)
            );
    }
}

function convertFile() {
    const fileInput = document.getElementById('fileInput');
    const resultOutput = document.getElementById('resultOutput');
    const downloadLink = document.getElementById('downloadLink');
    const isEncode = document.body.classList.contains("encode-mode");

    // Reset hiển thị
    resultOutput.textContent = "";
    downloadLink.style.display = "none";

    if (fileInput.files.length === 0) {
        alert(`⚠ Vui lòng chọn file ${isEncode ? "text (TXT)" : "JSON"}!`);
        return;
    }

    const file = fileInput.files[0];
    
    if (mode === "encode") {
        // Gửi file text lên server để predict
        senToServer(file);
    } else {
        // Decode
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const jsonData = JSON.parse(event.target.result);
                if (!validateJSON(jsonData)) {
                    alert("⚠ File JSON không hợp lệ hoặc không đúng định dạng!");
                    return;
                }

                const output = decodeData(jsonData);
                const jsonStr = JSON.stringify(output, null, 4);
                resultOutput.textContent = jsonStr;
                resultOutput.style.display = "block"; // 👈 show ô kết quả
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);

                const downloadLink = document.getElementById('downloadLink');
                downloadLink.href = url;
                downloadLink.download = `decode_result.json`;
                downloadLink.style.display = "block";
                downloadLink.innerText = "Tải xuống kết quả";

            } catch (err) {
                alert("❌ File không phải JSON hợp lệ!");
            }
        };
    reader.readAsText(file);
    }
}


function encodeData(jsonData) {
    const classes = [
        "GENDER", "NAME", "PATIENT_ID", "JOB", "LOCATION",
        "DATE", "ORGANIZATION","SYMPTOM_AND_DISEASE", "TRANSPORTATION","AGE"]
    const convertedAnnotations = { "classes": classes, "annotations": [] };

    jsonData.forEach(item => {
        const words = item.word;
        const tags = item.tag;
        let text = words.join(" ");
        let entities = [];
        let index = 0;

        words.forEach((word, i) => {
            if (tags[i] === "O") return;
            let start = text.indexOf(word, index);
            let end = start + word.length;
            entities.push([start, end, tags[i]]);
            index = end + 1;
        });

        convertedAnnotations.annotations.push([text, { "entities": entities }]);
    });

    return convertedAnnotations;
}

function decodeData(annotations) {
    
    let predictions = [];

    annotations.annotations.forEach(entry => {
        if (!entry) return; // Bỏ qua các entry null
        
        let text = entry[0];
        let words = text.split(/\s+/);
        let entities = entry[1].entities;
        
        let groupedWords = [];
        let groupedTags = [];
        let currentEntity = "";
        let currentLabel = "O";
        
        words.forEach((word, index) => {
            let wordStart = text.indexOf(word, index > 0 ? text.indexOf(words[index - 1]) + words[index - 1].length : 0);
            let wordEnd = wordStart + word.length;
            let entity = entities.find(([start, end]) => start <= wordStart && end >= wordEnd);
            let label = entity ? entity[2] : "O";
            alert
            if (label !== "O") {
                if (label === currentLabel) {
                    currentEntity += " " + word;
                } else {
                    if (currentEntity) {
                        groupedWords.push(currentEntity);
                        groupedTags.push(currentLabel);
                    }
                    currentEntity = word;
                    currentLabel = label;
                }
            } else {
                if (currentEntity) {
                    groupedWords.push(currentEntity);
                    groupedTags.push(currentLabel);
                    currentEntity = "";
                    currentLabel = "O";
                }
                groupedWords.push(word);
                groupedTags.push("O");
            }
        });
        
        if (currentEntity) {
            groupedWords.push(currentEntity);
            groupedTags.push(currentLabel);
        }
        
        predictions.push({ words: groupedWords, tags: groupedTags });
    });
    
    return predictions;
}


document.addEventListener("DOMContentLoaded", function () {
const modeSwitch = document.getElementById("modeSwitch"); // Nút switch
const downloadLink = document.getElementById("downloadLink"); // Dòng kết quả tải xuống
const convertButton = document.getElementById("convertButton"); // Nút chuyển đổi

});

async function senToServer(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("http://localhost:8000/predict/", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const result = await response.json();
        console.log("Server response:", result);
        
        // Hiển thị kết quả
        // ✅ Hiển thị kết quả JSON dạng đẹp trong khung phải
        const resultOutput = document.getElementById('resultOutput');
        resultOutput.textContent = JSON.stringify(result, null, 4);  // format đẹp
        resultOutput.style.display = "block"; 

        //Dùng hàm encodeData để chuyển đổi dữ liệu
        const output = encodeData(result);
        const jsonStr = JSON.stringify(output, null, 4);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = url;
        downloadLink.download = `encode_predicted_annotation.json`;
        downloadLink.style.display = "block";
        downloadLink.innerText = "Tải xuống kết quả";
    }
    catch (error) {
        console.error("Error:", error);
        alert("❌ Lỗi khi gửi dữ liệu lên server! " + error.message);
    }

}

// Ẩn kết quả khi đổi chế độ
modeSwitch.addEventListener("change", function () {
    // outputContent.style.display = "none";
    downloadLink.style.display = "none";
});

// Gán vào window để gọi được từ HTML
window.toggleMode = toggleMode;
window.displayFileName = displayFileName;
window.convertFile = convertFile;