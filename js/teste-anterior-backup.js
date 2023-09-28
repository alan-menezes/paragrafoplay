// Função para ler e exibir parágrafos
async function exibirParagrafos() {
    const texto = document.getElementById("textoVideo").value;
    if (texto != '') {
        const paragrafos = texto.split("\n\n");

        const paragrafosDiv = document.getElementById("paragrafos");
        paragrafosDiv.innerHTML = "";

        const form = document.createElement("form");
        form.action = "";
        form.method = "post";
        form.enctype = "multipart/form-data";

        paragrafos.forEach((paragrafo, index) => {
            const paragrafoDiv = document.createElement("div");
            paragrafoDiv.textContent = `Parágrafo ${index + 1}:\n ${paragrafo}`;
            paragrafosDiv.appendChild(paragrafoDiv);

            const textarea = document.createElement("textarea");
            textarea.value = paragrafo;
            textarea.addEventListener("input", (event) => {
                paragrafo = event.target.value;
            });

            const inputUpload = document.createElement("input");
            inputUpload.type = "file";
            inputUpload.name = `uploadParagrafo${index}`;
            inputUpload.id = `uploadParagrafo${index}`;
            inputUpload.accept = "image/*, video/*";

            inputUpload.addEventListener("change", (event) => {
                const file = event.target.files[0];
                const previewDiv = paragrafoDiv.querySelector(".preview");
                previewDiv.innerHTML = "";

                if (file) {
                    const previewElement = document.createElement(file.type.startsWith("image/") ? "img" : "video");
                    previewElement.src = URL.createObjectURL(file);
                    previewElement.controls = true;
                    previewDiv.appendChild(previewElement);
                }
            });

            paragrafoDiv.appendChild(inputUpload);

            const previewDiv = document.createElement("div");
            previewDiv.className = "preview";
            paragrafoDiv.appendChild(previewDiv);

            const readButton = document.createElement("button");
            readButton.textContent = "Ler Texto em Áudio";
            readButton.addEventListener("click", () => {
                const textoParaLer = textarea.value;
                const utterance = new SpeechSynthesisUtterance(textoParaLer);
                speechSynthesis.speak(utterance);
            });

            paragrafoDiv.appendChild(textarea);
            paragrafoDiv.appendChild(inputUpload);
            paragrafoDiv.appendChild(readButton);
            paragrafosDiv.appendChild(paragrafoDiv);
        });

        const exportButton = document.createElement("button");
        exportButton.type = "submit";
        exportButton.textContent = "Exportar Vídeo";
        exportButton.classList.add("btn", "blue");

        form.appendChild(exportButton);
        paragrafosDiv.appendChild(form);
    } else {
        alert('Você deve inserir um texto');
    }
}


//daqui pra baixo nao funciona nada,nao sei porque,ja tentei de td kkkkk
const mediaChunks = [];
const videoMimeType = 'video/webm';
let mediaRecorder;

// Função para concatenar mídias e exportar como .mp4
async function concatenarMidiasEExportar() {
    const tituloVideo = document.getElementById('tituloVideo').value.trim();

    if (!tituloVideo) {
        alert('Por favor, insira um título para o vídeo.');
        return;
    }

    const { createFFmpeg } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    await ffmpeg.load();

    const mediaList = [];
    const paragrafosDiv = document.getElementById("paragrafos");

    paragrafosDiv.childNodes.forEach((paragrafoDiv) => {
        const inputUpload = paragrafoDiv.querySelector("input[type=file]");
        if (inputUpload.files.length > 0) {
            mediaList.push(`-i ${inputUpload.files[0].name}`);
        }
    });

    if (mediaList.length === 0) {
        alert("Nenhuma mídia para exportar.");
        return;
    }

    const concatCommand = `${mediaList.join(" ")} -filter_complex concat=n=${mediaList.length}:v=1:a=1 [v] [a] -map [v] -map [a] -f mp4 -y output.mp4`;

    await ffmpeg.run(...concatCommand.split(" "));

    const result = ffmpeg.FS("readFile", "output.mp4");

    const blob = new Blob([result.buffer], { type: "video/mp4" });
    const videoFileName = `${tituloVideo}.mp4`;
    saveAs(blob, videoFileName);

    const videoPreview = document.getElementById("videoPreview");
    videoPreview.src = URL.createObjectURL(blob);
    videoPreview.controls = true;
}

// Função para concatenar áudios e exportar
async function concatenarAudiosEExportar() {
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();

    mediaChunks.forEach(async (audioBlob) => {
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioData = await audioContext.decodeAudioData(audioBuffer);
        const audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioData;
        audioSource.connect(audioDestination);
    });

    const audioStream = audioDestination.stream;
    const audioRecorder = new MediaRecorder(audioStream);

    audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            mediaChunks.push(event.data);
        }
    };

    audioRecorder.onstop = () => {
        const audioBlob = new Blob(mediaChunks, { type: 'audio/wav' });
        const audioFileName = `${tituloVideo}.wav`;
        saveAs(audioBlob, audioFileName);
    };

    audioRecorder.start();
}

document.querySelector("form").addEventListener("submit", async function(event) {
    event.preventDefault();
    await exibirParagrafos();
    await concatenarMidiasEExportar();
    concatenarAudiosEExportar();
});

document.getElementById('paragrafos').addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' && event.target.textContent === 'Ler Texto em Áudio') {
        const textoParaLer = event.target.previousSibling.value;
        const utterance = new SpeechSynthesisUtterance(textoParaLer);
        speechSynthesis.speak(utterance);

        mediaRecorder = new MediaRecorder(audioStream);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                mediaChunks.push(event.data);
            }
        };
        mediaRecorder.start();
        setTimeout(() => {
            mediaRecorder.stop();
        }, utterance.duration * 1000);
    }
});
