import * as readline from 'readline';

/**
 * Ask a confirmation question
 *
 * @unreleased
 * @param question the question to ask
 * @returns true if the user answered "y" or "Y", false otherwise
 */
export async function confirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`${question} (y/N) `, (answer) => {
            restoreConsole();
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
        const restoreConsole = patchConsole();
    });
}

function patchConsole() {
    const originalWrite = process.stdout.write;
    const logs: string[] = [];

    process.stdout.write = (string: string) => {
        if (isFromReadlineInterface()) {
            return originalWrite.apply(process.stdout, [string]);
        }

        logs.push(string);
        return true;
    };

    return () => {
        process.stdout.write = originalWrite;
        logs.forEach(log => process.stdout.write(log));
    };
}

function isFromReadlineInterface() {
    const stack = new Error().stack || '';
    const isFromReadline = (
        stack.includes('Interface._onLine') ||        // Node.js < 12
        stack.includes('onLine') ||                   // Node.js 12+
        stack.includes('readline/interface') ||
        stack.includes('readline.js') ||
        stack.includes('readline/promises') ||
        stack.includes('node:readline')
    );
    return isFromReadline;
}