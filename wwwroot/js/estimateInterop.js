window.estimateInterop = {
    canvas: null,
    ctx: null,
    isDrawing: false,

    initSignaturePad: function (canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas with id ${canvasId} not found.`);
            return;
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Handle display scaling
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = '#000';

        const startDrawing = (e) => {
            this.isDrawing = true;
            this.draw(e);
        };

        const stopDrawing = () => {
            this.isDrawing = false;
            this.ctx.beginPath();
        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.draw(e);
        });
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch support for mobile devices
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
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
    },

    draw: function (e) {
        if (!this.isDrawing || !this.canvas || !this.ctx) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    },

    clearSignaturePad: function () {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    getSignatureImage: function () {
        if (this.canvas && this.isSignatureProvided()) {
            return this.canvas.toDataURL("image/png");
        }
        return null;
    },

    isSignatureProvided: function () {
        if (!this.canvas || !this.ctx) return false;
        
        // Check if any pixels are drawn (not fully transparent)
        const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 3; i < pixelData.length; i += 4) {
            if (pixelData[i] !== 0) return true;
        }
        return false;
    },

    generateAndSharePdf: async function (estimateData) {
        // Assume jsPDF is loaded globally via CDN or script tag
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error("jsPDF library not found. Ensure it is loaded.");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        
        // 1. Header (Branded for Anytime Animal Control)
        doc.setFontSize(22);
        doc.setTextColor(41, 128, 185); // Brand Blue
        doc.text("Anytime Animal Control", pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text("Estimate / Invoice", pageWidth / 2, 28, { align: 'center' });
        
        // Auto-timestamp
        const dateStr = new Date().toLocaleString();
        doc.setFontSize(10);
        doc.text(`Generated: ${dateStr}`, pageWidth - 15, 20, { align: 'right' });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 35, pageWidth - 15, 35);
        
        // 2. Client Details
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Client Details:", 15, 45);
        doc.setFontSize(10);
        doc.text(`Name: ${estimateData.clientName || 'N/A'}`, 15, 52);
        doc.text(`Address: ${estimateData.clientAddress || 'N/A'}`, 15, 58);
        doc.text(`Phone: ${estimateData.clientPhone || 'N/A'}`, 15, 64);
        
        // 3. Estimate Table
        let yPos = 80;
        doc.setFontSize(12);
        doc.text("Services / Items:", 15, yPos);
        yPos += 10;
        
        if (estimateData.items && estimateData.items.length > 0) {
            // Using autoTable if available, otherwise manual text lines
            if (doc.autoTable) {
                doc.autoTable({
                    startY: yPos,
                    head: [['Description', 'Quantity', 'Price', 'Total']],
                    body: estimateData.items.map(item => [
                        item.description, 
                        item.quantity, 
                        `$${Number(item.price).toFixed(2)}`, 
                        `$${(item.quantity * item.price).toFixed(2)}`
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185] }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            } else {
                estimateData.items.forEach(item => {
                    const total = (item.quantity * item.price).toFixed(2);
                    doc.text(`${item.description} (Qty: ${item.quantity}) - $${Number(item.price).toFixed(2)} | Total: $${total}`, 15, yPos);
                    yPos += 7;
                });
                yPos += 10;
            }
        }
        
        // Total
        doc.setFontSize(14);
        const grandTotal = estimateData.total ? Number(estimateData.total).toFixed(2) : '0.00';
        doc.text(`Total: $${grandTotal}`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 15;
        
        // 4. Project Notes
        if (estimateData.notes) {
            doc.setFontSize(12);
            doc.text("Notes:", 15, yPos);
            yPos += 7;
            doc.setFontSize(10);
            
            const splitNotes = doc.splitTextToSize(estimateData.notes, pageWidth - 30);
            doc.text(splitNotes, 15, yPos);
            yPos += (splitNotes.length * 5) + 10;
        }
        
        // 5. Signature Image
        const signatureImg = this.getSignatureImage();
        if (signatureImg) {
            doc.setFontSize(12);
            doc.text("Client Signature:", 15, yPos);
            yPos += 5;
            doc.addImage(signatureImg, 'PNG', 15, yPos, 80, 30);
            doc.rect(15, yPos, 80, 30); // signature border
        }

        // Generate PDF Blob
        const pdfBlob = doc.output('blob');
        const filename = `Estimate_${estimateData.clientName ? estimateData.clientName.replace(/\s+/g, '_') : 'Client'}_${Date.now()}.pdf`;
        
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });

        // 6. Share via Web Share API, fallback to Download
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'Anytime Animal Control Estimate',
                    text: 'Please find your service estimate attached.',
                    files: [file]
                });
                console.log('PDF shared successfully via Web Share API');
            } catch (error) {
                console.warn('Error sharing PDF (user might have cancelled), falling back to download:', error);
                this.downloadPdf(pdfBlob, filename);
            }
        } else {
            console.log('Web Share API not supported or file not shareable. Falling back to direct download.');
            this.downloadPdf(pdfBlob, filename);
        }
    },

    downloadPdf: function (blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
