window.estimateInteropCanvas = null;
window.estimateInteropCtx = null;
window.estimateInteropIsDrawing = false;

window.initSignaturePad = function (canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with id ${canvasId} not found.`);
        return;
    }

    window.estimateInteropCanvas = canvas;
    window.estimateInteropCtx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    window.estimateInteropCtx.lineWidth = 2;
    window.estimateInteropCtx.lineCap = 'round';
    window.estimateInteropCtx.strokeStyle = '#000';

    const startDrawing = (e) => {
        window.estimateInteropIsDrawing = true;
        window.drawSignature(e);
    };

    const stopDrawing = () => {
        window.estimateInteropIsDrawing = false;
        window.estimateInteropCtx.beginPath();
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', (e) => {
        if (window.estimateInteropIsDrawing) window.drawSignature(e);
    });
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    });
};

window.drawSignature = function (e) {
    if (!window.estimateInteropIsDrawing || !window.estimateInteropCanvas || !window.estimateInteropCtx) return;

    const rect = window.estimateInteropCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    window.estimateInteropCtx.lineTo(x, y);
    window.estimateInteropCtx.stroke();
    window.estimateInteropCtx.beginPath();
    window.estimateInteropCtx.moveTo(x, y);
};

window.clearSignaturePad = function (canvasId) {
    if (window.estimateInteropCtx && window.estimateInteropCanvas) {
        window.estimateInteropCtx.clearRect(0, 0, window.estimateInteropCanvas.width, window.estimateInteropCanvas.height);
    }
};

window.getSignatureData = function (canvasId) {
    if (window.estimateInteropCanvas) {
        const pixelData = window.estimateInteropCtx.getImageData(0, 0, window.estimateInteropCanvas.width, window.estimateInteropCanvas.height).data;
        let isDrawn = false;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] !== 0) {
                isDrawn = true;
                break;
            }
        }
        if (isDrawn) {
            return window.estimateInteropCanvas.toDataURL("image/png");
        }
    }
    return null;
};

window.getGeolocation = function () {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ error: "Geolocation is not supported by your browser." });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    error: null
                });
            },
            (error) => {
                resolve({ error: error.message });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
};

window.saveEstimateOffline = function (estimateData) {
    let estimates = JSON.parse(localStorage.getItem('aac_estimates') || '[]');
    estimates.push({ date: new Date().toISOString(), data: estimateData });
    localStorage.setItem('aac_estimates', JSON.stringify(estimates));
};

window.generateQuotePdf = async function (quoteData) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF library not found.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(22);
    doc.setTextColor(255, 95, 21);
    doc.text("Anytime Animal Control", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Mike | 715-459-7412 | TikTok: @MikeFlick3", pageWidth / 2, 26, { align: 'center' });
    doc.text("Removal of Bats, Squirrels, Raccoons, Skunks, Opossums, & More", pageWidth / 2, 31, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Estimate / Invoice", pageWidth / 2, 38, { align: 'center' });
    
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.text(`Generated: ${dateStr}`, pageWidth - 15, 20, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 42, pageWidth - 15, 42);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Client Details:", 15, 50);
    doc.setFontSize(10);
    doc.text(`Name: ${quoteData.clientName || 'N/A'}`, 15, 56);
    doc.text(`Address: ${quoteData.clientAddress || 'N/A'}`, 15, 61);
    doc.text(`Email: ${quoteData.clientEmail || 'N/A'}`, 15, 66);
    
    let yPos = 80;
    doc.setFontSize(12);
    doc.text("Services / Items:", 15, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    if (quoteData.ridgeVentFt > 0) {
        doc.text(`Ridge Vent Screening (${quoteData.ridgeVentFt} ft) | Total: $${quoteData.ridgeVentTotal.toFixed(2)}`, 15, yPos);
        yPos += 7;
    }
    if (quoteData.soffitReturnsCount > 0) {
        doc.text(`Soffit Returns (${quoteData.soffitReturnsCount} units) | Total: $${quoteData.soffitReturnTotal.toFixed(2)}`, 15, yPos);
        yPos += 7;
    }
    if (quoteData.sealingFt > 0) {
        doc.text(`Curled Wood Trim / Brick Sealing (${quoteData.sealingFt} ft) | Total: $${quoteData.sealingTotal.toFixed(2)}`, 15, yPos);
        yPos += 7;
    }
    yPos += 10;
    
    doc.setFontSize(14);
    doc.text(`Grand Total: $${quoteData.grandTotal.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 15;
    
    if (quoteData.projectNotes) {
        doc.setFontSize(12);
        doc.text("Notes:", 15, yPos);
        yPos += 7;
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(quoteData.projectNotes, pageWidth - 30);
        doc.text(splitNotes, 15, yPos);
        yPos += (splitNotes.length * 5) + 10;
    }
    
    if (quoteData.signatureImage) {
        doc.setFontSize(12);
        doc.text("Client Signature:", 15, yPos);
        yPos += 5;
        doc.addImage(quoteData.signatureImage, 'PNG', 15, yPos, 80, 30);
        doc.rect(15, yPos, 80, 30);
        yPos += 35;
    }
    
    // Legal Verification & Integrity Stamp
    doc.setFontSize(12);
    doc.setTextColor(200, 50, 50);
    doc.text("Verification & Integrity:", 15, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated Timestamp: ${new Date().toISOString()}`, 15, yPos);
    yPos += 5;
    if (quoteData.location && !quoteData.location.error) {
        doc.text(`GPS Coordinates: Lat ${quoteData.location.lat.toFixed(6)}, Long ${quoteData.location.lng.toFixed(6)}`, 15, yPos);
        yPos += 5;
        doc.text(`Accuracy: ±${Math.round(quoteData.location.accuracy)} meters`, 15, yPos);
    } else {
        doc.text(`GPS Coordinates: Unavailable (${quoteData.location ? quoteData.location.error : 'Not requested'})`, 15, yPos);
    }

    const pdfBlob = doc.output('blob');
    const filename = `Estimate_${quoteData.clientName ? quoteData.clientName.replace(/\s+/g, '_') : 'Client'}_${Date.now()}.pdf`;
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: 'Anytime Animal Control Estimate',
                text: 'Please find your service estimate attached.',
                files: [file]
            });
        } catch (error) {
            window.downloadPdf(pdfBlob, filename);
        }
    } else {
        window.downloadPdf(pdfBlob, filename);
    }
};

window.downloadPdf = function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
