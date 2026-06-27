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

    // --- TRACKER PRE-FETCH ---
    let globalTracker = "0000";
    let dailyTracker = "00";
    try {
        let userId = localStorage.getItem('aac_anon_user_id');
        if (!userId) {
            userId = 'usr_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('aac_anon_user_id', userId);
        }
        const res = await fetch(`/api/track-pdf?userId=${userId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            globalTracker = String(data.globalCount).padStart(4, '0');
            dailyTracker = String(data.dailyCount).padStart(2, '0');
        }
    } catch (e) {
        console.error('Failed to get tracker', e);
    }

    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // --- 1. PREMIUM HEADER BLOCK ---
    // Dark Charcoal Background
    doc.setFillColor(45, 45, 45);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Title (Safety Orange)
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 95, 21);
    doc.text("ANYTIME ANIMAL CONTROL", pageWidth / 2, 16, { align: 'center' });
    
    // Contact Info (White/Light Grey)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 220, 220);
    doc.text("Mike | 715-459-7412 | TikTok: @@MikeFlick3", pageWidth / 2, 23, { align: 'center' });
    doc.setTextColor(180, 180, 180);
    doc.text("Specialists in Removal of Bats, Squirrels, Raccoons, Skunks, Opossums & More", pageWidth / 2, 28, { align: 'center' });
    
    // --- 2. INVOICE META DETAILS ---
    let yPos = 55;
    doc.setTextColor(0, 0, 0);
    
    // Left side: Client Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PREPARED FOR:", 15, yPos);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(quoteData.clientName || 'N/A', 15, yPos + 6);
    doc.text(quoteData.clientAddress || 'N/A', 15, yPos + 11);
    doc.text(quoteData.clientEmail || 'N/A', 15, yPos + 16);
    doc.text(quoteData.clientPhone || 'N/A', 15, yPos + 21);
    
    // Right side: Document Info
    const dateStr = new Date().toLocaleDateString();
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ESTIMATE DETAILS", pageWidth - 15, yPos, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${dateStr}`, pageWidth - 15, yPos + 6, { align: 'right' });
    doc.text(`Valid For: 30 Days`, pageWidth - 15, yPos + 11, { align: 'right' });
    
    yPos += 30;
    
    // --- 3. SERVICES TABLE ---
    const tableBody = [];
    if (quoteData.ridgeVentFt > 0) {
        tableBody.push(["Ridge Vent Screening", `${quoteData.ridgeVentFt} linear ft`, `$23.00/ft`, `$${quoteData.ridgeVentTotal.toFixed(2)}`]);
    }
    if (quoteData.soffitReturnsCount > 0) {
        tableBody.push(["Soffit Returns", `${quoteData.soffitReturnsCount} units`, `$150.00/ea`, `$${quoteData.soffitReturnTotal.toFixed(2)}`]);
    }
    if (quoteData.sealingFt > 0) {
        tableBody.push(["Curled Wood Trim / Brick Sealing", `${quoteData.sealingFt} linear ft`, `$20.00/ft`, `$${quoteData.sealingTotal.toFixed(2)}`]);
    }

    if (doc.autoTable) {
        doc.autoTable({
            startY: yPos,
            head: [['Service Description', 'Quantity', 'Rate', 'Total']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [45, 45, 45], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { textColor: [50, 50, 50] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 80 },
                3: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 }
        });
        yPos = doc.lastAutoTable.finalY + 15;
    } else {
        doc.text("Table rendering error. Missing autoTable dependency.", 15, yPos);
        yPos += 20;
    }
    
    // --- 4. GRAND TOTAL BOX ---
    doc.setFillColor(245, 245, 245);
    doc.rect(pageWidth - 85, yPos, 70, 20, 'F');
    doc.setDrawColor(255, 95, 21); // Orange border
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - 85, yPos, 70, 20, 'S');
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Grand Total:", pageWidth - 80, yPos + 13);
    doc.setTextColor(255, 95, 21);
    doc.text(`$${quoteData.grandTotal.toFixed(2)}`, pageWidth - 20, yPos + 13, { align: 'right' });
    
    yPos += 40;
    
    // --- 5. PROJECT NOTES ---
    if (quoteData.projectNotes) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Notes / Observations:", 15, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const splitNotes = doc.splitTextToSize(quoteData.projectNotes, pageWidth - 30);
        doc.text(splitNotes, 15, yPos);
        yPos += (splitNotes.length * 5) + 15;
    }
    
    // --- 6. SIGNATURE & INTEGRITY BLOCK ---
    // Ensure we have room on the page, otherwise add page
    if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 30;
    }
    
    if (quoteData.signatureImage) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Client Authorization:", 15, yPos);
        yPos += 5;
        
        // Draw sig box
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.rect(15, yPos, 80, 30);
        doc.addImage(quoteData.signatureImage, 'PNG', 15, yPos, 80, 30);
        yPos += 40;
    }
    
    // Legal Verification Stamp Box
    doc.setFillColor(252, 240, 240); // very faint red bg
    doc.rect(15, yPos, 100, 25, 'F');
    doc.setDrawColor(200, 50, 50);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, 100, 25, 'S');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    doc.text(`VERIFICATION & INTEGRITY - Global: #${globalTracker} | Daily User: #${dailyTracker}`, 20, yPos + 6);
    
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Timestamp: ${new Date().toISOString()}`, 20, yPos + 13);
    
    if (quoteData.location && !quoteData.location.error) {
        doc.text(`GPS: Lat ${quoteData.location.lat.toFixed(6)}, Lng ${quoteData.location.lng.toFixed(6)}`, 20, yPos + 18);
        doc.text(`Accuracy: ±${Math.round(quoteData.location.accuracy)}m`, 20, yPos + 23);
    } else {
        doc.text(`GPS: Unavailable (${quoteData.location ? quoteData.location.error : 'Denied'})`, 20, yPos + 18);
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
