import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// ─── Constantes ───────────────────────────────────────────────────────────────
export const MONTHS_ES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export const CONTAINER_TYPES = ['20ft', '40ft', '40HC'];

export const CHART_COLORS = ['#0ea5e9','#f97316','#10b981','#8b5cf6','#f43f5e','#eab308','#06b6d4'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return r
        ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
        : { r: 14, g: 165, b: 233 };
};

export const getInitials = (name = '') =>
    name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('.');

export const getMonthLabel = (monthStr) => {
    const [yr, mn] = monthStr.split('-').map(Number);
    return `${MONTHS_ES[mn - 1]} ${yr}`;
};

const getFullAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

const loadLogoAsPngDataUrl = async (url) => {
    if (!url) return null;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                const aspect = h / w;
                const MAX_W = 500;
                const MAX_H = 250;
                const scale = Math.min(MAX_W / w, MAX_H / h, 1);
                const outW = Math.max(1, Math.floor(w * scale));
                const outH = Math.max(1, Math.floor(h * scale));
                const canvas = document.createElement('canvas');
                canvas.width = outW;
                canvas.height = outH;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clearRect(0, 0, outW, outH);
                ctx.drawImage(img, 0, 0, outW, outH);
                resolve({ dataUrl: canvas.toDataURL('image/png'), aspect });
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = getFullAssetUrl(url);
    });
};

// ─── PDF: header por página ───────────────────────────────────────────────────
const addPageHeader = (doc, logoData, companyName, title, rgb, pageW) => {
    if (logoData?.dataUrl) {
        const logoWidth = 35;
        const logoHeight = Math.max(8, Math.min(16, logoWidth * (logoData.aspect || 0.4)));
        doc.addImage(logoData.dataUrl, 'PNG', 12, 7, logoWidth, logoHeight);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text(title, pageW / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(companyName, pageW / 2, 22, { align: 'center' });
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(0.4);
    doc.line(12, 26, pageW - 12, 26);
};

// ─── PDF: generador principal ─────────────────────────────────────────────────
export const generateMonthlyClosePDF = async ({ data, settings, chartsRef }) => {
    const companyName = settings?.companyName || 'ERP Logística';
    const primaryColor = settings?.primaryColor || '#0ea5e9';
    const logoUrl = settings?.logoUrl || '/1.png';
    const rgb = hexToRgb(primaryColor);
    const monthLabel = getMonthLabel(data.month);

    let logoData = null;
    try { logoData = await loadLogoAsPngDataUrl(logoUrl); } catch { logoData = null; }

    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── Página 1: D2D ──
    addPageHeader(doc, logoData, companyName, `Cierre Mensual D2D — ${monthLabel}`, rgb, pageW);

    if (data.d2d.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(140, 140, 140);
        doc.text('No hay embarques D2D registrados en este período.', pageW / 2, 50, { align: 'center' });
    } else {
        const userInitials = data.users.map(u => getInitials(u.name));
        const d2dHead = [['Cliente', ...userInitials, 'Total CBM']];

        const d2dBody = data.d2d.map(row => {
            const rowTotal = data.users.reduce((s, u) => s + parseFloat(row.cbmByUser[u.id] || 0), 0);
            return [
                row.clientName,
                ...data.users.map(u => {
                    const v = parseFloat(row.cbmByUser[u.id] || 0);
                    return v > 0 ? v.toFixed(2) : '—';
                }),
                rowTotal.toFixed(2)
            ];
        });

        const d2dFoot = [[
            'TOTAL',
            ...data.users.map(u => {
                const v = parseFloat(data.d2dTotals[u.id] || 0);
                return v > 0 ? v.toFixed(2) : '—';
            }),
            parseFloat(data.d2dGrand).toFixed(2)
        ]];

        autoTable(doc, {
            startY: 30,
            margin: { left: 12, right: 12 },
            head: d2dHead,
            body: d2dBody,
            foot: d2dFoot,
            showFoot: 'lastPage',
            theme: 'grid',
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center'
            },
            bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
            footStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 48, fontStyle: 'bold', halign: 'left' },
            },
            didParseCell: (hookData) => {
                if (hookData.section === 'body') {
                    const lastIdx = hookData.table.columns.length - 1;
                    const col = hookData.column.index;
                    if (col > 0 && col < lastIdx) {
                        const D2D_COL_COLORS = [[236, 246, 255], [255, 244, 252]];
                        hookData.cell.styles.fillColor = D2D_COL_COLORS[(col - 1) % 2];
                    } else if (col === lastIdx) {
                        hookData.cell.styles.fillColor = [232, 250, 241];
                    }
                }
            }
        });
    }

    // ── Página 2: FCL ──
    doc.addPage();
    addPageHeader(doc, logoData, companyName, `Cierre Mensual FCL — ${monthLabel}`, rgb, pageW);

    if (data.fcl.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(140, 140, 140);
        doc.text('No hay embarques FCL registrados en este período.', pageW / 2, 50, { align: 'center' });
    } else {
        const subHdrUser = [
            Math.round(rgb.r * 0.80),
            Math.round(rgb.g * 0.80),
            Math.round(rgb.b * 0.80)
        ];
        const totHdrDark = [
            Math.round(rgb.r * 0.70),
            Math.round(rgb.g * 0.70),
            Math.round(rgb.b * 0.70)
        ];
        const subHdrTot = [
            Math.round(rgb.r * 0.60),
            Math.round(rgb.g * 0.60),
            Math.round(rgb.b * 0.60)
        ];
        const fclHead = [
            [
                { content: 'Cliente', rowSpan: 2, styles: { valign: 'middle', halign: 'left', fontStyle: 'bold' } },
                ...data.users.map(u => ({
                    content: getInitials(u.name),
                    colSpan: 3,
                    styles: { halign: 'center', fontStyle: 'bold' }
                })),
                { content: 'TOTALES', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: totHdrDark } }
            ],
            [
                ...data.users.flatMap(() => CONTAINER_TYPES.map(t => ({
                    content: t,
                    styles: { halign: 'center', fontSize: 6.5, fillColor: subHdrUser, textColor: [255, 255, 255] }
                }))),
                ...CONTAINER_TYPES.map(t => ({
                    content: t,
                    styles: { halign: 'center', fontSize: 6.5, fillColor: subHdrTot, textColor: [255, 255, 255] }
                }))
            ]
        ];

        const fclBody = data.fcl.map(row => {
            const clientTotals = { '20ft': 0, '40ft': 0, '40HC': 0 };
            const userCells = data.users.flatMap(u => {
                const c = row.containersByUser[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                CONTAINER_TYPES.forEach(t => { clientTotals[t] += c[t] || 0; });
                return [
                    c['20ft'] > 0 ? c['20ft'] : '—',
                    c['40ft'] > 0 ? c['40ft'] : '—',
                    c['40HC'] > 0 ? c['40HC'] : '—'
                ];
            });
            return [
                row.clientName,
                ...userCells,
                clientTotals['20ft'] > 0 ? clientTotals['20ft'] : '—',
                clientTotals['40ft'] > 0 ? clientTotals['40ft'] : '—',
                clientTotals['40HC'] > 0 ? clientTotals['40HC'] : '—'
            ];
        });

        const fclFoot = [[
            'TOTAL',
            ...data.users.flatMap(u => {
                const t = data.fclTotals[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                return [
                    t['20ft'] > 0 ? t['20ft'] : '—',
                    t['40ft'] > 0 ? t['40ft'] : '—',
                    t['40HC'] > 0 ? t['40HC'] : '—'
                ];
            }),
            data.fclGrand['20ft'] > 0 ? data.fclGrand['20ft'] : '—',
            data.fclGrand['40ft'] > 0 ? data.fclGrand['40ft'] : '—',
            data.fclGrand['40HC'] > 0 ? data.fclGrand['40HC'] : '—'
        ]];

        autoTable(doc, {
            startY: 30,
            margin: { left: 12, right: 12 },
            head: fclHead,
            body: fclBody,
            foot: fclFoot,
            showFoot: 'lastPage',
            theme: 'grid',
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [40, 40, 40], halign: 'center' },
            footStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 42, fontStyle: 'bold', halign: 'left' }
            },
            didParseCell: (hookData) => {
                if (hookData.section === 'body') {
                    const col = hookData.column.index;
                    const FCL_BODY_COLORS = [
                        [236, 246, 255],
                        [255, 244, 252],
                        [236, 255, 244],
                        [255, 250, 235],
                        [245, 236, 255]
                    ];
                    const totalStart = 1 + data.users.length * 3;
                    if (col >= 1 && col < totalStart) {
                        const groupIdx = Math.floor((col - 1) / 3);
                        hookData.cell.styles.fillColor = FCL_BODY_COLORS[groupIdx % FCL_BODY_COLORS.length];
                    } else if (col >= totalStart) {
                        hookData.cell.styles.fillColor = [232, 250, 241];
                    }
                }
            }
        });
    }

    // ── Página 3: Gráficas ──
    doc.addPage();
    addPageHeader(doc, logoData, companyName, `Gráficas — ${monthLabel}`, rgb, pageW);

    if (chartsRef?.current) {
        try {
            const canvas = await html2canvas(chartsRef.current, {
                scale: 1.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/jpeg', 1);
            const imgW = pageW - 24;
            const imgH = (canvas.height / canvas.width) * imgW;
            doc.addImage(imgData, 'JPEG', 12, 32, imgW, Math.min(imgH, pageH - 48));
        } catch (err) {
            console.warn('No se pudieron capturar las gráficas:', err);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(140, 140, 140);
            doc.text('Las gráficas no pudieron ser generadas.', pageW / 2, 50, { align: 'center' });
        }
    }

    // Footer en todas las páginas
    const today = new Date().toLocaleDateString('es-VE');
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(`${companyName} — ${today}`, pageW / 2, pageH - 6, { align: 'center' });
        doc.text(`${page} / ${totalPages}`, pageW - 12, pageH - 6, { align: 'right' });
    }

    doc.save(`Cierre_Mensual_${data.month}.pdf`);
};
