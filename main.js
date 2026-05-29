// main.js - Core application controller for Image Converter Pro
// Coordinates file loaders, WebAssembly HEIC decoders, canvas processors, and file downloaders.

// -------------------------------------------------------------
// DOM Selection
// -------------------------------------------------------------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const fileDetails = document.getElementById('file-details');
const detailFilename = document.getElementById('detail-filename');
const detailSize = document.getElementById('detail-size');
const detailDims = document.getElementById('detail-dims');

const progressCard = document.getElementById('progress-card');
const statusLabel = document.getElementById('status-label');
const statusPercentage = document.getElementById('status-percentage');
const progressBar = document.getElementById('progress-bar');
const progressSpeed = document.getElementById('progress-speed');

const targetFormatSelect = document.getElementById('target-format');
const qualityRange = document.getElementById('quality-range');
const qualityDisplay = document.getElementById('quality-display');

const transcribeBtn = document.getElementById('transcribe-btn');
const btnSpinner = document.getElementById('btn-spinner');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');

const downloadBtn = document.getElementById('download-btn');
const clearEditorBtn = document.getElementById('clear-editor-btn');
const placeholderScreen = document.getElementById('placeholder-screen');
const editorStatus = document.getElementById('editor-status');

const conversionMetadata = document.getElementById('conversion-metadata');
const metaRatio = document.getElementById('meta-ratio');

// Slider Elements
const comparisonSlider = document.getElementById('comparison-slider');
const imgBefore = document.getElementById('img-before');
const imgAfter = document.getElementById('img-after');
const afterWrapper = document.getElementById('after-wrapper');
const sliderInput = document.getElementById('slider-input');
const afterFormatLabel = document.getElementById('after-format-label');

// -------------------------------------------------------------
// Application State
// -------------------------------------------------------------
let originalFile = null;      // Stores uploaded File object
let originalImage = null;     // HTML Image element
let originalImageUrl = null;  // Blob URL for original (or decoded JPEG)
let convertedBlob = null;     // Converted Image Blob
let convertedImageUrl = null; // Blob URL for converted image

// -------------------------------------------------------------
// Interactive Configuration Handlers
// -------------------------------------------------------------
qualityRange.addEventListener('input', (e) => {
  qualityDisplay.textContent = `${e.target.value}%`;
});

// -------------------------------------------------------------
// File Selection & Drag-and-Drop Handlers
// -------------------------------------------------------------
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleLoadedFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleLoadedFile(e.target.files[0]);
  }
});

clearEditorBtn.addEventListener('click', () => {
  clearWorkspace();
});

// -------------------------------------------------------------
// Core File & HEIC Decoder Orchestration
// -------------------------------------------------------------
async function handleLoadedFile(file) {
  if (!file) return;
  
  // File size checks (15MB limits)
  if (file.size > 15 * 1024 * 1024) {
    alert('File size exceeds the 15MB browser allocation limit. Please supply a standard image.');
    return;
  }
  
  clearWorkspace();
  originalFile = file;
  
  detailFilename.textContent = file.name;
  detailSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  fileDetails.style.display = 'flex';
  
  const ext = file.name.split('.').pop().toLowerCase();
  
  // WebAssembly HEIC/HEIF Decoder Trigger
  if (ext === 'heic' || ext === 'heif') {
    progressCard.style.display = 'block';
    statusLabel.innerHTML = `<i class="fa-solid fa-gear fa-spin"></i> WebAssembly Initializing...`;
    progressSpeed.textContent = 'Loading iPhone HEIC decoders...';
    transcribeBtn.setAttribute('disabled', 'true');
    btnText.textContent = 'Decoding HEIC...';
    
    // Check if heic2any is imported successfully
    if (typeof heic2any === 'undefined') {
      alert('WASM HEIC converter library failed to load. Please verify your internet connection.');
      clearWorkspace();
      return;
    }
    
    try {
      console.log('Decoding iPhone HEIC image via WebAssembly...');
      
      const convertedJpgBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });
      
      // Load converted JPEG into memory
      originalImageUrl = URL.createObjectURL(convertedJpgBlob);
      loadImageIntoMemory(originalImageUrl);
      
      progressCard.style.display = 'none';
      console.log('HEIC successfully decoded to browser-readable JPEG blob.');
      
    } catch (error) {
      console.error('HEIC decoding failed:', error);
      alert(`HEIC WASM Decoding Failed: ${error.message || 'Corrupted file.'}`);
      clearWorkspace();
    }
  } 
  
  // Standard Browser Images (PNG, JPEG, WebP, SVG)
  else {
    originalImageUrl = URL.createObjectURL(file);
    loadImageIntoMemory(originalImageUrl);
  }
}

function loadImageIntoMemory(url) {
  originalImage = new Image();
  originalImage.onload = () => {
    detailDims.textContent = `${originalImage.naturalWidth} x ${originalImage.naturalHeight}px`;
    
    transcribeBtn.removeAttribute('disabled');
    btnText.textContent = 'Convert Image';
    console.log(`Reference image loaded: ${originalImage.naturalWidth}x${originalImage.naturalHeight}`);
  };
  originalImage.onerror = () => {
    alert('Failed to load image file. Ensure file is not corrupted.');
    clearWorkspace();
  };
  originalImage.src = url;
}

function clearWorkspace() {
  originalFile = null;
  originalImage = null;
  convertedBlob = null;
  
  if (originalImageUrl) {
    URL.revokeObjectURL(originalImageUrl);
    originalImageUrl = null;
  }
  if (convertedImageUrl) {
    URL.revokeObjectURL(convertedImageUrl);
    convertedImageUrl = null;
  }
  
  imgBefore.src = '';
  imgAfter.src = '';
  
  fileDetails.style.display = 'none';
  progressCard.style.display = 'none';
  comparisonSlider.style.display = 'none';
  placeholderScreen.style.display = 'flex';
  placeholderScreen.style.opacity = '1';
  
  transcribeBtn.setAttribute('disabled', 'true');
  btnText.textContent = 'Load File & Convert';
  
  downloadBtn.setAttribute('disabled', 'true');
  clearEditorBtn.setAttribute('disabled', 'true');
  conversionMetadata.style.display = 'none';
  
  fileInput.value = '';
  editorStatus.textContent = 'Offline Sandbox Enabled';
}

// -------------------------------------------------------------
// Canvas Multi-Format Converter Pipeline
// -------------------------------------------------------------
transcribeBtn.addEventListener('click', () => {
  if (!originalImage) return;
  
  // Set conversion progress
  transcribeBtn.setAttribute('disabled', 'true');
  btnSpinner.style.display = 'inline-block';
  btnIcon.style.display = 'none';
  btnText.textContent = 'Converting...';
  
  const targetMime = targetFormatSelect.value;
  const quality = parseInt(qualityRange.value) / 100;
  
  setTimeout(() => {
    try {
      const width = originalImage.naturalWidth;
      const height = originalImage.naturalHeight;
      
      // Setup offscreen canvas matching 100% natural resolution (zero blurriness)
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw image
      ctx.drawImage(originalImage, 0, 0);
      
      // Call hardware-accelerated canvas exporter
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Image compression failed.');
        }
        
        convertedBlob = blob;
        
        // Calculate file-size difference metrics
        const savedBytes = originalFile.size - blob.size;
        const ratio = ((savedBytes / originalFile.size) * 100).toFixed(0);
        
        conversionMetadata.style.display = 'flex';
        if (ratio > 0) {
          metaRatio.innerHTML = `Saved <strong style="color: var(--success);">${ratio}%</strong> (${(blob.size / 1024 / 1024).toFixed(2)} MB vs ${(originalFile.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
          metaRatio.innerHTML = `Overhead <strong style="color: var(--warning);">${-ratio}%</strong> (${(blob.size / 1024 / 1024).toFixed(2)} MB vs ${(originalFile.size / 1024 / 1024).toFixed(2)} MB)`;
        }
        
        // Renders Before vs After preview slider
        imgBefore.src = originalImageUrl;
        
        if (convertedImageUrl) {
          URL.revokeObjectURL(convertedImageUrl);
        }
        convertedImageUrl = URL.createObjectURL(blob);
        imgAfter.src = convertedImageUrl;
        
        // Update slider formats
        const formatExt = targetMime.split('/').pop().toUpperCase();
        afterFormatLabel.textContent = formatExt;
        
        // Reveal slider workspace
        placeholderScreen.style.opacity = '0';
        setTimeout(() => {
          placeholderScreen.style.display = 'none';
          comparisonSlider.style.display = 'block';
          updateSliderWidths();
        }, 300);
        
        downloadBtn.removeAttribute('disabled');
        clearEditorBtn.removeAttribute('disabled');
        
        editorStatus.textContent = 'Conversion successfully completed!';
        resetTranscribeButton();
        
      }, targetMime, quality);
      
    } catch (error) {
      console.error('Error during canvas conversion:', error);
      resetTranscribeButton();
      alert(`Conversion Failed: ${error.message}`);
    }
  }, 100);
});

function resetTranscribeButton() {
  transcribeBtn.removeAttribute('disabled');
  btnSpinner.style.display = 'none';
  btnIcon.style.display = 'inline-block';
  btnText.textContent = originalFile ? 'Convert Image' : 'Load File & Convert';
}

// -------------------------------------------------------------
// Before/After Drag Slider Coordinates
// -------------------------------------------------------------
sliderInput.addEventListener('input', (e) => {
  const value = e.target.value;
  comparisonSlider.style.setProperty('--slider-pos', `${value}%`);
});

function updateSliderWidths() {
  if (comparisonSlider.style.display !== 'none') {
    const sliderWidth = comparisonSlider.clientWidth;
    comparisonSlider.style.setProperty('--slider-width', `${sliderWidth}px`);
  }
}

window.addEventListener('resize', updateSliderWidths);

// -------------------------------------------------------------
// Image File Exporter
// -------------------------------------------------------------
downloadBtn.addEventListener('click', () => {
  if (!convertedBlob || !originalFile) return;
  
  const targetMime = targetFormatSelect.value;
  const ext = targetMime.split('/').pop();
  const rawName = originalFile.name.split('.')[0] || 'converted';
  
  const tempLink = document.createElement('a');
  tempLink.href = convertedImageUrl;
  tempLink.download = `${rawName}-converted.${ext === 'jpeg' ? 'jpg' : ext}`;
  
  document.body.appendChild(tempLink);
  tempLink.click();
  
  document.body.removeChild(tempLink);
  editorStatus.textContent = 'Converted image file downloaded!';
});
