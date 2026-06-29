/**
 * preAlertaPdfGenerator.js
 * Genera el PDF de Pre-Alerta de Recepción de Mercancía para un embarque.
 * Usa jsPDF + jspdf-autotable. No requiere React.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImage, resizeImage, compressImageFile } from '../../utils/imageHelpers';

const formatNumber = (n, decimals = 2) => {
    if (n === null || n === undefined || n === '') return '';
    const val = parseFloat(n);
    if (isNaN(val)) return '';
    return val.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const kgToLb = (kg) => {
    if (!kg && kg !== 0) return '';
    const val = parseFloat(kg) * 2.20462;
    return `${formatNumber(kg)} kg / ${formatNumber(val)} lb`;
};

const cbmToCf = (cbm) => {
    if (!cbm && cbm !== 0) return '';
    const val = parseFloat(cbm) * 35.3147;
    return `${formatNumber(cbm)} m³ / ${formatNumber(val)} CF`;
};

const getInstruction = (shipment) => {
    if (shipment.airLineId || shipment.airLine) return 'Aéreo';
    if (shipment.shippingLineId || shipment.shippingLineRel) return 'Marítimo';
    return '';
};

const getAllyCode = (shipment) => {
    if (shipment.type === 'FCL') {
        return shipment.aliado?.internalCode || shipment.aliado?.code || '';
    }
    if (shipment.type === 'D2D') {
        return shipment.d2dAliado?.internalCode || shipment.d2dAliado?.code || '';
    }
    return '';
};

const getClientName = (shipment) => {
    return shipment.clientName || shipment.clientRel?.name || 'N/A';
};

const getWarehouseNumber = (shipment) => {
    return shipment.whNumber || '—';
};

const getTypeLabel = (shipment) => {
    if (shipment.type === 'FCL') return 'FCL';
    if (shipment.type === 'D2D') return 'Door to Door';
    return 'Consolidado';
};

/**
 * Genera el PDF de pre-alerta.
 * @param {Object} shipment - Objeto embarque completo
 * @param {Array<string>} [images=[]] - Array de base64 comprimidos
 * @param {Object} currentUser - Usuario autenticado (debe tener email)
 * @param {Object} settings - Configuración de la empresa
 */
export const generatePreAlertaPdf = async (shipment, images = [], currentUser, settings) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 12;

    // ── Logo ──
    try {
        const logoUrl = settings?.logoUrl || '/1.png';
        const logoImg = await loadImage(logoUrl);
        const logoBase64 = await resizeImage(logoImg, { maxWidth: 1200, maxHeight: 600, format: 'png' });
        const logoWidthMm = 45;
        const logoHeightMm = logoWidthMm * (logoImg.height / logoImg.width);
        doc.addImage(logoBase64, 'PNG', margin, y, logoWidthMm, logoHeightMm);
    } catch (e) {
        console.warn('No se pudo cargar el logo:', e);
    }

    // ── Encabezado derecho ──
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const today = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const instruction = getInstruction(shipment);
    const allyCode = getAllyCode(shipment);
    const rightText = [
        `Warehouse TRACK: ${getWarehouseNumber(shipment)}`,
        `Fecha: ${today}`,
        instruction ? `Instrucción: ${instruction}` : '',
        allyCode ? `A: ${allyCode}` : '',
    ].filter(Boolean);

    let rightY = y + 4;
    rightText.forEach(line => {
        doc.text(line, pageWidth - margin, rightY, { align: 'right' });
        rightY += 5;
    });

    y = Math.max(y + 22, rightY + 4);

    // ── Info de empresa (izquierda) ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Import Services, C.A.', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 5;
    doc.text('NAGUANAGUA, Edo. Carabobo.', margin, y);
    y += 5;
    doc.text('Ph +584120691515 / +584123334117', margin, y);
    y += 5;
    if (currentUser?.email) {
        doc.text(currentUser.email, margin, y);
        y += 5;
    }
    y += 6;

    // ── Título ──
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 49, 66);
    const title = 'PREALERTA DE RECEPCION DE MERCANCIA EN ALMACEN (CHINA)';
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 8;

    // ── Cliente ──
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Datos del Cliente:', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`${getClientName(shipment)}`, margin, y);
    y += 8;

    // ── Determinar columnas dinámicas ──
    const rows = [];
    const s = shipment;

    // Para D2D con items, crear una fila por ítem
    if (s.type === 'D2D' && s.d2dShipmentItems && s.d2dShipmentItems.length > 0) {
        s.d2dShipmentItems.forEach((item) => {
            rows.push({
                number: getWarehouseNumber(s),
                type: item.d2dItem?.description || item.description || getTypeLabel(s),
                dimensions: s.dimensions || '',
                tracking: s.tracking || '',
                consol: s.consolidadoManual || '',
                description: s.cst || '',
                value: s.value,
                kgLb: kgToLb(s.weight),
                mt3Cf: cbmToCf(s.cbm),
                pVol: s.pVol,
                pMax: s.pMax,
                quantity: s.quantity || 1,
            });
        });
    } else {
        // Una sola fila para FCL o CONSOLIDADO
        const typeLabel = s.type === 'FCL'
            ? (s.containers || []).map(c => `${c.quantity}x ${c.containerType}`).join(', ') || getTypeLabel(s)
            : getTypeLabel(s);

        rows.push({
            number: getWarehouseNumber(s),
            type: typeLabel,
            dimensions: s.dimensions || '',
            tracking: s.tracking || '',
            consol: s.consolidadoManual || '',
            description: s.cst || '',
            value: s.value,
            kgLb: kgToLb(s.weight),
            mt3Cf: cbmToCf(s.cbm),
            pVol: s.pVol,
            pMax: s.pMax,
            quantity: s.quantity || (s.containers ? s.containers.reduce((acc, c) => acc + (c.quantity || 0), 0) : ''),
        });
    }

    // Definir columnas base
    const allColumns = [
        { key: 'number', label: 'Nro.', width: 10 },
        { key: 'type', label: 'Tipo', width: 18 },
        { key: 'dimensions', label: 'Dim.', width: 15 },
        { key: 'tracking', label: 'Tracking', width: 18 },
        { key: 'consol', label: 'Consol.', width: 15 },
        { key: 'description', label: 'Desc.', width: 18 },
        { key: 'value', label: 'Valor', width: 13 },
        { key: 'kgLb', label: 'Kg/Lb', width: 18 },
        { key: 'mt3Cf', label: 'Mt3/CF', width: 18 },
        { key: 'pVol', label: 'pVol', width: 11 },
        { key: 'pMax', label: 'pMax', width: 11 },
        { key: 'quantity', label: 'Cant.', width: 9.5 },
    ];

    // Filtrar columnas vacías: si ninguna fila tiene valor para esa columna, se oculta
    const activeColumns = allColumns.filter(col =>
        rows.some(row => row[col.key] !== '' && row[col.key] !== null && row[col.key] !== undefined)
    );

    // Si se oculta alguna columna, asegurar que siempre se muestre 'Nro' y 'Cant'
    if (!activeColumns.find(c => c.key === 'number')) activeColumns.unshift(allColumns.find(c => c.key === 'number'));
    if (!activeColumns.find(c => c.key === 'quantity')) activeColumns.push(allColumns.find(c => c.key === 'quantity'));

    // Preparar cabeceras y cuerpo para autotable
    const head = [activeColumns.map(c => c.label)];
    const body = rows.map(row => activeColumns.map(col => {
        if (col.key === 'value') return `$${formatNumber(row[col.key])}`;
        if (col.key === 'pVol' || col.key === 'pMax') return formatNumber(row[col.key]);
        return row[col.key] || '—';
    }));

    // ── Tabla ──
    autoTable(doc, {
        startY: y,
        head,
        body,
        theme: 'grid',
        tableWidth: pageWidth - margin * 2,
        headStyles: {
            fillColor: [30, 64, 175],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            valign: 'middle',
        },
        bodyStyles: {
            fontSize: 7,
            textColor: 60,
            halign: 'center',
            valign: 'middle',
        },
        styles: {
            cellPadding: 2,
            overflow: 'linebreak',
            valign: 'middle',
        },
        margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 10;

    // ── Imágenes ──
    if (images && images.length > 0) {
        const imgPerRow = 3;
        const gap = 5;
        const availableWidth = pageWidth - margin * 2;
        const slotWidth = (availableWidth - gap * (imgPerRow - 1)) / imgPerRow;
        const maxImgHeight = 90;

        let x = margin;
        let rowCount = 0;
        let currentRowHeight = 0;

        for (const imgBase64 of images) {
            try {
                const img = await loadImage(imgBase64);
                const aspectRatio = img.height / img.width;
                let imgWidth = slotWidth;
                let imgHeight = slotWidth * aspectRatio;

                if (imgHeight > maxImgHeight) {
                    imgHeight = maxImgHeight;
                    imgWidth = imgHeight / aspectRatio;
                }

                if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    y = margin;
                    x = margin;
                    rowCount = 0;
                    currentRowHeight = 0;
                }

                const xCentered = x + (slotWidth - imgWidth) / 2;
                doc.addImage(imgBase64, 'JPEG', xCentered, y, imgWidth, imgHeight);

                currentRowHeight = Math.max(currentRowHeight, imgHeight);
                x += slotWidth + gap;
                rowCount++;
                if (rowCount === imgPerRow) {
                    x = margin;
                    y += currentRowHeight + gap;
                    rowCount = 0;
                    currentRowHeight = 0;
                }
            } catch (e) {
                console.warn('No se pudo insertar imagen:', e);
            }
        }
    }

    // Guardar PDF
    const fileName = `PREALERTA_WH${getWarehouseNumber(shipment)}_${today.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    return fileName;
};

export { compressImageFile };
