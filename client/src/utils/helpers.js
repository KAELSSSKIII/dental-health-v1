import { format, parseISO, differenceInYears, isValid } from 'date-fns';

export function formatDate(date, fmt = 'MMM d, yyyy') {
    if (!date) return '—';
    try {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return isValid(d) ? format(d, fmt) : '—';
    } catch { return '—'; }
}

export function formatDateTime(date) {
    return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function calcAge(dob) {
    if (!dob) return '—';
    try {
        const d = typeof dob === 'string' ? parseISO(dob) : dob;
        return isValid(d) ? differenceInYears(new Date(), d) : '—';
    } catch { return '—'; }
}

export function formatName(p, style = 'full') {
    if (!p) return '';
    if (style === 'last-first') {
        const mn = p.middle_name ? ` ${p.middle_name[0]}.` : '';
        return `${p.last_name}, ${p.first_name}${mn}`;
    }
    const mn = p.middle_name ? ` ${p.middle_name}` : '';
    return `${p.first_name}${mn} ${p.last_name}`;
}

export function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatCurrency(amount) {
    if (amount == null || amount === '') return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
