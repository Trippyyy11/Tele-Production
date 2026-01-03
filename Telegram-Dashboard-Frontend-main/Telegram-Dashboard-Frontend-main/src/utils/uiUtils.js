/**
 * Returns a CSS class for character counter based on limit reach
 * @param {number} current 
 * @param {number} limit 
 * @returns {string} Tailwind color class
 */
export const getCounterColor = (current, limit) => {
    const ratio = current / limit;
    if (ratio >= 1) return 'text-red-600 font-bold';
    if (ratio >= 0.8) return 'text-orange-500 font-medium';
    return 'text-gray-400';
};
