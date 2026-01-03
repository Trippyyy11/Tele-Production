import { parseAndConvertDate } from '../utils/dateTimeFormatter';

/**
 * Robust Word File Quiz Parser
 * Supports:
 * - Standard Q/A formats
 * - Bilingual text (Hindi/English)
 * - Math symbols (Unicode: ², ³, ½, ∑, etc.) due to non-aggressive cleaning
 * - Date/Time metadata extraction
 */

const wordFileParser = (rawText) => {
    if (!rawText) return [];

    // Normalize line endings but PRESERVE Unicode characters (Math, Hindi, etc.)
    // Only remove carriage returns
    rawText = rawText.replace(/\r/g, '').trim();

    // Extract optional metadata
    const channelMatch = rawText.match(/Channel\s*:\s*(.+)/i);
    const examMatch = rawText.match(/Exam\s*:\s*(.+)/i);

    const channel = channelMatch ? channelMatch[1].trim() : null;
    const exam = examMatch ? examMatch[1].trim() : null;

    // Split Question Blocks
    // Look for "Q1.", "Q 1.", "1." at start of lines
    // Using positive lookahead to split without consuming the number
    const questionBlocks = rawText
        .split(/(?=^Q?\s*\d+\s*\.)/gim)
        .map(q => q.trim())
        .filter(q => q.length > 0);

    const parsed = [];

    questionBlocks.forEach((block) => {
        // === Question ===
        // Match everything until the first Option (A-J followed by dot)
        // using 's' flag for dotAll to ensure newlines in question are captured
        const qMatch =
            block.match(/^Q?\s*\d+\s*\.\s*(.+?)(?=\n[A-J]\s*\.)/is);

        const question = qMatch
            ? qMatch[1].trim()
            : null;

        // === Options (A–J supported) ===
        // Global match for options
        const optionMatches = [...block.matchAll(
            /^([A-J])\s*\.\s*(.+)$/gim
        )];

        const options = {};
        optionMatches.forEach(([, letter, text]) => {
            const value = text.trim();
            // Basic validation to avoid capturing metadata keys as options if formatting is loose
            if (value.length > 0 && !value.match(/^(Answer|Solution|Date|Time):/i)) {
                options[letter.toUpperCase()] = value;
            }
        });

        // === Answer ===
        // Supports: "Answer D", "Answer: D", "Ans: D"
        const answerMatch =
            block.match(/(?:Answer|Ans)\s*:?\s*([A-J])/i);

        const answerLetter = answerMatch
            ? answerMatch[1].toUpperCase()
            : null;

        const optionsArray = Object.values(options);

        // Find index of the correct letter in the *extracted* options keys
        // (to handle cases where options might be B, C, D but A is missing - rare but possible)
        const optionKeys = Object.keys(options);
        const correctOptionIndex =
            answerLetter && options[answerLetter]
                ? optionKeys.indexOf(answerLetter)
                : 0;

        // === Solution (optional) ===
        // Capture everything after "Solution:" until end of block or next metadata
        const solutionMatch =
            block.match(/(?:Solution|Sol)\s*:?\s*(.*?)(?=\n(?:Date|Time|Channel|Exam):|$)/is);

        const explanation = solutionMatch
            ? solutionMatch[1].trim()
            : '';

        // === Optional Date / Time Support ===
        // Formats: DD/MM/YYYY or DD-MM-YYYY
        const dateMatch =
            block.match(/Date\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);

        // Formats: HH:MM AM/PM
        const timeMatch =
            block.match(/Time\s*:\s*([0-9: ]+(?:AM|PM)?)/i);

        const date = dateMatch ? dateMatch[1].replace(/-/g, '/') : null;
        const time = timeMatch ? timeMatch[1].trim().toUpperCase() : null;

        let scheduledAt = null;
        if (date && time) {
            const dt = parseAndConvertDate(date, time);
            scheduledAt = dt.UTC;
        }

        // === Final Validation ===
        // Telegram requires at least 2 options
        if (question && optionsArray.length >= 2) {
            parsed.push({
                channel,
                exam,
                question,
                options: optionsArray,
                correctOption: Math.max(0, correctOptionIndex),
                explanation,
                date,
                time,
                scheduledAt
            });
        }
    });

    return parsed;
};

export { wordFileParser };
