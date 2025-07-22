import ChildProcess from 'node:child_process';

export function subprocessStdout (subprocess: ChildProcess.ChildProcess): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!subprocess.stdout) return reject(new Error('No stdout'));
        let buffer = '';
        subprocess.stdout.on('data', chunk => { buffer = buffer + chunk.toString(); });
        subprocess.on('close', () => resolve(buffer));
        subprocess.on('error', error => reject(error));
    });
}