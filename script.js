const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');
const zoomSlider = document.getElementById('zoomSlider');
const rotateSlider = document.getElementById('rotateSlider'); 
const previewOverlay = document.getElementById('previewOverlay');
const mobilePreviewImg = document.getElementById('mobilePreviewImg');

let userImage = new Image();
let frameImage = new Image();
let hasUserImage = false;
let imgScale = 1;
let imgOffsetX = 0;
let imgOffsetY = 0;
let imgAngle = 0; 
let currentBlobUrl = null;
let isDragging = false;
let startX = 0, startY = 0;

// โหลดกรอบเริ่มต้น
frameImage.crossOrigin = "anonymous";
frameImage.src = 'img/frame1.png'; 
frameImage.onload = function() { drawCanvasPlaceholder(); };

function drawCanvasPlaceholder() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (hasUserImage) {
        renderCombinedImage();
    } else {
        ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#64748b";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("กรุณากดเลือกรูปภาพ ⏫", canvas.width / 2, canvas.height / 2 + 10);
    }
}

function changeFrame(frameSrc, element) {
    frameImage.crossOrigin = "anonymous";
    frameImage.src = frameSrc;
    document.querySelectorAll('.frame-option').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    frameImage.onload = function() {
        if(hasUserImage) renderCombinedImage();
        else drawCanvasPlaceholder();
    };
}

// แยกคำสั่งฝั่ง iOS ออกมา เพื่อป้องกันเมนูเด้งสองรอบซ้อน
function handleUploadButtonClick() {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
        document.getElementById('galleryInput').click();
    } else {
        openActionSheet();
    }
}

function openActionSheet() {
    const overlay = document.getElementById('actionSheetOverlay');
    const sheet = document.getElementById('actionSheet');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
        overlay.classList.add('fade-in');
        sheet.classList.add('show');
    });
}

function closeActionSheet(e) {
    if(e) e.preventDefault();
    const overlay = document.getElementById('actionSheetOverlay');
    const sheet = document.getElementById('actionSheet');
    
    sheet.classList.remove('show');
    overlay.classList.remove('fade-in');
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

function triggerInput(id) {
    document.getElementById(id).click();
    closeActionSheet();
}

document.getElementById('galleryInput').addEventListener('change', handleImage, false);
document.getElementById('cameraInput').addEventListener('change', handleImage, false);

function handleImage(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        userImage.crossOrigin = "anonymous";
        userImage.onload = function() {
            hasUserImage = true;
            let baseScale = Math.max(canvas.width / userImage.width, canvas.height / userImage.height);
            
            let zoomRange = baseScale * 0.8; 
            zoomSlider.min = (baseScale - zoomRange).toFixed(4);
            zoomSlider.max = (baseScale + zoomRange).toFixed(4);
            zoomSlider.step = "0.01";
            zoomSlider.value = baseScale; 
            
            imgScale = baseScale;
            imgOffsetX = 0; 
            imgOffsetY = 0;
            imgAngle = 0;
            
            rotateSlider.value = 0; 
            
            zoomSlider.disabled = false;
            rotateSlider.disabled = false;
            downloadBtn.disabled = false;
            
            renderCombinedImage();
        }
        userImage.src = event.target.result;
    }
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    e.target.value = ''; 
}

function renderCombinedImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (hasUserImage) {
        let baseWidth = userImage.width * imgScale;
        let baseHeight = userImage.height * imgScale;
        let cx = (canvas.width / 2) + imgOffsetX;
        let cy = (canvas.height / 2) + imgOffsetY;

        ctx.save(); 
        ctx.translate(cx, cy);
        ctx.rotate(imgAngle * Math.PI / 180);
        ctx.drawImage(userImage, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore(); 
    }

    ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
}

zoomSlider.addEventListener('input', function() {
    imgScale = parseFloat(this.value);
    renderCombinedImage();
});

rotateSlider.addEventListener('input', function() {
    imgAngle = parseFloat(this.value);
    renderCombinedImage();
});

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrag(e) {
    if (!hasUserImage) return;
    isDragging = true;
    const pos = getMousePos(e);
    startX = pos.x - imgOffsetX;
    startY = pos.y - imgOffsetY;
    if(e.cancelable) e.preventDefault();
}

function dragMove(e) {
    if (!isDragging || !hasUserImage) return;
    const pos = getMousePos(e);
    imgOffsetX = pos.x - startX;
    imgOffsetY = pos.y - startY;
    renderCombinedImage();
    if(e.cancelable) e.preventDefault();
}

function stopDrag() { isDragging = false; }

// ผูกอีเวนต์เมาส์และทัชสกรีนสำหรับการลากย้ายรูปภาพ
canvas.addEventListener('mousedown', startDrag);
window.addEventListener('mousemove', dragMove);
window.addEventListener('mouseup', stopDrag);
canvas.addEventListener('touchstart', startDrag, { passive: false });
canvas.addEventListener('touchmove', dragMove, { passive: false });
canvas.addEventListener('touchend', stopDrag);

downloadBtn.addEventListener('click', function() {
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            const base64Image = canvas.toDataURL('image/png');
            mobilePreviewImg.src = base64Image;
            previewOverlay.style.display = 'flex';
        } else {
            canvas.toBlob(function(blob) {
                if (!blob) return;
                if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
                currentBlobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = 'custom-framed-image.png';
                link.href = currentBlobUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 'image/png');
        }
    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองแคปหน้าจอแทนนะครับ");
    }
});

function closePreview() { previewOverlay.style.display = 'none'; }