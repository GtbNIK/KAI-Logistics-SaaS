const sanitize = (value) => {
    if (value == null) return '';
    return String(value).trim();
};

const splitLabelName = (label = '') => {
    if (!label) return '';
    const parts = label.split(' - ');
    if (parts.length <= 1) return label.trim();
    return parts.slice(1).join(' - ').trim();
};

export const buildPortLookup = (ports = []) => {
    const map = new Map();

    ports.forEach((raw) => {
        if (!raw) return;
        const code = sanitize(raw.code ?? raw.value ?? raw.data?.code);
        const nameFromProps = sanitize(raw.name ?? raw.data?.name);
        const label = sanitize(raw.label);
        const name = nameFromProps || splitLabelName(label) || label;
        const entry = {
            code: code ? code.toUpperCase() : '',
            name: name || (code ? code.toUpperCase() : '')
        };

        const candidates = new Set();
        [code, name, label, raw.id, raw.data?.id, raw.value]
            .map(sanitize)
            .filter(Boolean)
            .forEach((token) => candidates.add(token.toLowerCase()));

        if (label?.includes(' - ')) {
            label.split(' - ').forEach((part) => {
                const token = sanitize(part).toLowerCase();
                if (token) candidates.add(token);
            });
        }

        candidates.forEach((token) => {
            if (!token) return;
            if (!map.has(token)) map.set(token, entry);
        });
    });

    return map;
};

export const formatPortValue = (value, lookup, { fallbackToValue = true } = {}) => {
    if (!value) return '';

    if (typeof value === 'object') {
        const objectName = value.name ?? value.label ?? value.data?.name;
        if (objectName) return objectName;
        const objectCode = value.code ?? value.value ?? value.data?.code ?? value.id;
        if (objectCode) return formatPortValue(objectCode, lookup, { fallbackToValue });
        return fallbackToValue ? '' : '';
    }

    const raw = sanitize(value);
    if (!raw) return '';

    const candidates = new Set([raw.toLowerCase()]);
    if (raw.includes(' - ')) {
        raw.split(' - ').forEach((part) => {
            const token = sanitize(part).toLowerCase();
            if (token) candidates.add(token);
        });
    }
    const parenthesis = raw.match(/\((.+?)\)/);
    if (parenthesis?.[1]) {
        candidates.add(parenthesis[1].toLowerCase());
    }

    const lookupRef = lookup instanceof Map ? lookup : null;
    if (lookupRef) {
        for (const token of candidates) {
            if (lookupRef.has(token)) {
                const entry = lookupRef.get(token);
                return entry.name || entry.code || raw;
            }
        }
    }

    return fallbackToValue ? raw : '';
};

export const formatPortList = (values, lookup, { fallback = '' } = {}) => {
    if (!values) return fallback;
    const array = Array.isArray(values) ? values : [values];
    const names = array
        .map((value) => formatPortValue(value, lookup, { fallbackToValue: false }))
        .filter(Boolean);
    if (names.length === 0) {
        const firstRaw = array
            .map((value) => {
                if (!value) return '';
                if (typeof value === 'string') return sanitize(value);
                return value.name || value.code || value.label || '';
            })
            .find(Boolean);
        return firstRaw || fallback;
    }
    const unique = [...new Set(names)];
    return unique.join(', ');
};

export const formatRouteDisplay = ({ origin, destination, lookup, fallback = '-', arrow = '->' }) => {
    const originLabel = formatPortList(origin, lookup, { fallback: '' }) || fallback;
    const destinationLabel = formatPortList(destination, lookup, { fallback: '' }) || fallback;
    if (!originLabel && !destinationLabel) return fallback;
    return `${originLabel || fallback} ${arrow} ${destinationLabel || fallback}`;
};

export const formatZoneLabel = (zone, { includeCode = false, fallback = '-' } = {}) => {
    if (!zone) return fallback;
    if (typeof zone === 'string') {
        return includeCode ? zone : splitLabelName(zone) || zone;
    }

    const label = zone.label || zone.name || zone.data?.name || '';
    const code = sanitize(zone.code ?? zone.data?.code ?? zone.value);
    const cleanName = splitLabelName(label) || zone.name || '';

    if (includeCode && code) {
        return cleanName ? `${cleanName} (${code.toUpperCase()})` : code.toUpperCase();
    }

    return cleanName || code || fallback;
};

export const replaceRouteCodesWithNames = (text, lookup, { arrow = '->' } = {}) => {
    if (!text) return '';
    return text.replace(/Ruta:\s*(.+?)\s*(?:→|->)\s*(.+?)(?=(?:\s*·|$))/g, (_, origin, destination) => {
        const label = formatRouteDisplay({ origin, destination, lookup, arrow });
        return `Ruta: ${label}`;
    });
};
