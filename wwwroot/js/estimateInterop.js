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
    if (quoteData.discountAmount > 0) {
        tableBody.push([
            quoteData.adjustmentReason || "Package Deal / Single-Setup Location Adjustment",
            "Special Credit",
            "-",
            `-$${quoteData.discountAmount.toFixed(2)}`
        ]);
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
        yPos = doc.lastAutoTable.finalY + 12;
    } else {
        doc.text("Table rendering error. Missing autoTable dependency.", 15, yPos);
        yPos += 20;
    }
    
    // --- 4. GRAND TOTAL BOX ---
    const boxHeight = quoteData.discountAmount > 0 ? 30 : 20;
    doc.setFillColor(245, 245, 245);
    doc.rect(pageWidth - 95, yPos, 80, boxHeight, 'F');
    doc.setDrawColor(255, 95, 21); // Orange border
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - 95, yPos, 80, boxHeight, 'S');
    
    if (quoteData.discountAmount > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Subtotal: $${(quoteData.linearSubtotal || quoteData.grandTotal + quoteData.discountAmount).toFixed(2)}`, pageWidth - 90, yPos + 8);
        doc.setTextColor(40, 160, 60);
        doc.text(`Savings Deal: -$${quoteData.discountAmount.toFixed(2)}`, pageWidth - 90, yPos + 15);
        
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Total:", pageWidth - 90, yPos + 24);
        doc.setTextColor(255, 95, 21);
        doc.text(`$${quoteData.grandTotal.toFixed(2)}`, pageWidth - 20, yPos + 24, { align: 'right' });
        yPos += boxHeight + 15;
    } else {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Grand Total:", pageWidth - 90, yPos + 13);
        doc.setTextColor(255, 95, 21);
        doc.text(`$${quoteData.grandTotal.toFixed(2)}`, pageWidth - 20, yPos + 13, { align: 'right' });
        yPos += boxHeight + 15;
    }
    
    // --- 5. WARRANTY GUARANTEE BANNER ---
    if (quoteData.customerWarranty) {
        doc.setFillColor(255, 248, 243);
        doc.rect(15, yPos, pageWidth - 30, 16, 'F');
        doc.setDrawColor(255, 95, 21);
        doc.setLineWidth(0.5);
        doc.rect(15, yPos, pageWidth - 30, 16, 'S');
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 95, 21);
        doc.text("WARRANTY GUARANTEE:", 20, yPos + 6);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(quoteData.customerWarranty, 20, yPos + 12);
        yPos += 22;
    }

    // --- 6. PROPOSAL & SCOPE NOTES (STRUCTURED BULLET LIST) ---
    if (quoteData.projectNotes) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(45, 45, 45);
        doc.text("Scope & Proposal Notes:", 15, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        
        const bulletLines = quoteData.projectNotes.split('\n').filter(l => l.trim().length > 0);
        for (const line of bulletLines) {
            const formattedLine = line.trim().startsWith('•') ? line.trim() : `• ${line.trim()}`;
            const splitBullet = doc.splitTextToSize(formattedLine, pageWidth - 35);
            doc.text(splitBullet, 18, yPos);
            yPos += (splitBullet.length * 4.5) + 2;
        }
        yPos += 6;
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
    doc.text(`VERIFICATION & INTEGRITY - G: #${globalTracker} | DU: #${dailyTracker}`, 20, yPos + 6);
    
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

    // --- 7. SITE INSPECTION & SCOPE PHOTOS (PHOTO NOTES) ---
    if (quoteData.photoNotes && quoteData.photoNotes.length > 0) {
        doc.addPage();

        // Header Banner (Charcoal + Orange)
        doc.setFillColor(45, 45, 45);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 95, 21);
        doc.text("SITE INSPECTION & SCOPE PHOTOS", pageWidth / 2, 13, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(220, 220, 220);
        doc.text("Field documentation of wildlife entry points, structural conditions, and exclusion scope.", pageWidth / 2, 20, { align: 'center' });

        // Grid Layout: 2 photos per row, up to 4 photos per page
        const photoWidth = 85;
        const photoHeight = 62;
        const leftColX = 15;
        const rightColX = 110;
        let startY = 36;
        let photosOnCurrentPage = 0;

        for (let i = 0; i < quoteData.photoNotes.length; i++) {
            const photo = quoteData.photoNotes[i];

            if (photosOnCurrentPage >= 4) {
                doc.addPage();
                doc.setFillColor(45, 45, 45);
                doc.rect(0, 0, pageWidth, 18, 'F');
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(255, 95, 21);
                doc.text("SITE INSPECTION PHOTOS (CONTINUED)", pageWidth / 2, 12, { align: 'center' });
                startY = 26;
                photosOnCurrentPage = 0;
            }

            const isLeft = (photosOnCurrentPage % 2 === 0);
            const x = isLeft ? leftColX : rightColX;
            const rowIndex = Math.floor(photosOnCurrentPage / 2);
            const y = startY + (rowIndex * (photoHeight + 25));

            // Photo card background & border
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(x, y, photoWidth, photoHeight + 17, 2, 2, 'F');
            doc.setDrawColor(210, 210, 210);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, photoWidth, photoHeight + 17, 2, 2, 'S');

            // Render image inside card
            try {
                doc.addImage(photo.dataUrl, 'JPEG', x + 2, y + 2, photoWidth - 4, photoHeight - 4);
            } catch (err) {
                console.error("Failed to embed photo into PDF:", err);
            }

            // Photo Number Badge
            doc.setFillColor(255, 95, 21);
            doc.rect(x + 2, y + 2, 20, 6, 'F');
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(`Photo #${i + 1}`, x + 12, y + 6.2, { align: 'center' });

            // Caption text underneath
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            const captionText = photo.caption || `Inspection Area #${i + 1}`;
            const splitCap = doc.splitTextToSize(captionText, photoWidth - 6);
            doc.text(splitCap, x + 3, y + photoHeight + 3);

            photosOnCurrentPage++;
        }
    }

    const pdfBlob = doc.output('blob');
    const filename = `Estimate_${quoteData.clientName ? quoteData.clientName.replace(/\s+/g, '_') : 'Client'}_${Date.now()}.pdf`;
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    // Background auto-save to D1 vault (non-blocking)
    window.saveEstimateToD1(quoteData);


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

window.saveEstimateToD1 = async function (quoteData) {
    try {
        const estItem = {
            id: 'est_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
            quoteNumber: quoteData.quoteNumber || null,
            clientName: quoteData.clientName || 'Client',
            clientPhone: quoteData.clientPhone || '',
            clientAddress: quoteData.clientAddress || '',
            clientEmail: quoteData.clientEmail || '',
            linearSubtotal: quoteData.linearSubtotal || (quoteData.grandTotal + (quoteData.discountAmount || 0)),
            discountAmount: quoteData.discountAmount || 0,
            adjustmentReason: quoteData.adjustmentReason || '',
            grandTotal: quoteData.grandTotal || 0,
            customerWarranty: quoteData.customerWarranty || '',
            projectNotes: quoteData.projectNotes || '',
            photoCount: (quoteData.photoNotes || []).length,
            quotePayload: JSON.stringify(quoteData),
            createdAt: new Date().toISOString()
        };

        // 1. Always persist to localStorage for instant offline & local availability
        let savedList = [];
        try {
            savedList = JSON.parse(localStorage.getItem('aac_saved_estimates') || '[]');
        } catch (e) {
            savedList = [];
        }
        savedList.unshift(estItem);
        if (savedList.length > 100) savedList = savedList.slice(0, 100);
        localStorage.setItem('aac_saved_estimates', JSON.stringify(savedList));

        // 2. Also save to legacy offline storage
        if (typeof window.saveEstimateOffline === 'function') {
            window.saveEstimateOffline(quoteData);
        }

        // 3. Attempt background Cloudflare D1 sync when online
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            fetch('/api/save-estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData)
            }).catch(e => console.warn("Cloudflare D1 background sync failed:", e));
        }
    } catch (e) {
        console.warn("Save estimate error:", e);
    }
};

window.authPinApi = async function (pin) {
    const localPin = localStorage.getItem('aac_field_pin') || '521121';
    
    // In production, try Cloudflare D1 first with immediate graceful fallback
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch('/api/auth-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await res.json();
                if (data.success) {
                    return data;
                }
            }
        } catch (e) {
            console.warn("Remote PIN auth unavailable, falling back to local verification:", e.message);
        }
    }

    // Local / Standalone WASM verification
    if (pin === localPin) {
        return { success: true, token: 'local_auth_' + Date.now() };
    } else {
        return { success: false, error: 'Incorrect PIN. Try again.' };
    }
};

window.updatePinApi = async function (currentPin, newPin) {
    const localPin = localStorage.getItem('aac_field_pin') || '521121';
    
    if (currentPin !== localPin) {
        return { success: false, error: 'Current PIN is incorrect.' };
    }

    if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
        return { success: false, error: 'New PIN must be exactly 6 digits.' };
    }

    localStorage.setItem('aac_field_pin', newPin);

    // Sync to Cloudflare D1 if online
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        try {
            fetch('/api/update-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPin, newPin })
            }).catch(e => console.warn("Remote PIN update sync deferred:", e));
        } catch (e) {
            console.warn("Background PIN sync skipped:", e);
        }
    }

    return { success: true, message: 'PIN updated successfully.' };
};

window.getEstimatesApi = async function () {
    let localEstimates = [];
    try {
        localEstimates = JSON.parse(localStorage.getItem('aac_saved_estimates') || '[]');
    } catch (e) {
        localEstimates = [];
    }

    // Try remote Cloudflare D1 if online
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const res = await fetch('/api/estimates', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await res.json();
                if (data.success && Array.isArray(data.estimates) && data.estimates.length > 0) {
                    // Merge remote with local (remote takes precedence, deduplicated by id)
                    const map = new Map();
                    for (const est of localEstimates) {
                        if (est.id) map.set(est.id, est);
                    }
                    for (const est of data.estimates) {
                        if (est.id) map.set(est.id, est);
                    }
                    const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                    return { success: true, estimates: merged };
                }
            }
        } catch (e) {
            console.warn("Remote estimates fetch skipped or offline:", e.message);
        }
    }

    return { success: true, estimates: localEstimates };
};

window.reopenEstimatePdf = async function (payloadJson) {
    try {
        const data = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
        await window.generateQuotePdf(data);
    } catch (e) {
        alert("Failed to re-issue past estimate: " + e.message);
    }
};
