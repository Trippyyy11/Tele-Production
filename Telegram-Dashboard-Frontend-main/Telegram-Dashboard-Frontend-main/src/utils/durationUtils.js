/**
 * Converts a total number of hours into DD:HH:MM:SS format
 * @param {number|string} hours 
 * @returns {string} format: DD:HH:MM:SS
 */
export const hoursToDuration = (hours) => {
    if (!hours || isNaN(hours)) return '00:00:00:00';
    
    let totalSeconds = Math.floor(parseFloat(hours) * 3600);
    
    const days = Math.floor(totalSeconds / (24 * 3600));
    totalSeconds %= (24 * 3600);
    
    const hrs = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    return [
        String(days).padStart(2, '0'),
        String(hrs).padStart(2, '0'),
        String(mins).padStart(2, '0'),
        String(secs).padStart(2, '0')
    ].join(':');
};

/**
 * Converts a DD:HH:MM:SS duration string into total hours
 * @param {string} duration format: DD:HH:MM:SS
 * @returns {number} total hours
 */
export const durationToHours = (duration) => {
    if (!duration) return 0;
    
    const parts = duration.split(':').map(Number);
    if (parts.length !== 4) return 0;
    
    const [days, hrs, mins, secs] = parts;
    const totalSeconds = (days * 24 * 3600) + (hrs * 3600) + (mins * 60) + secs;
    
    return totalSeconds / 3600;
};

/**
 * Validates and formats partial input for DD:HH:MM:SS
 * @param {string} value 
 * @returns {string}
 */
export const formatDurationInput = (value) => {
    // Remove non-digits
    const cleanValue = value.replace(/\D/g, '');
    
    // Pad with zeros up to 8 digits
    const padded = cleanValue.padStart(8, '0').slice(-8);
    
    // Group into chunks of 2
    const parts = padded.match(/.{1,2}/g);
    
    // Return formatted string
    return parts.join(':');
};
