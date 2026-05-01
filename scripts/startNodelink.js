const { spawn } = require('child_process');
const path = require('path');

const cwd = path.join(__dirname, '..', 'nodelink-server');
const proc = spawn('node', ['--dns-result-order=ipv4first', '--import', 'tsx', 'src/index.ts'], {
  cwd,
  stdio: ['inherit', 'pipe', 'pipe'],
});

const important = /error|fail|uncaught|\[STARTED\]|Successfully listening/i;

proc.stdout.on('data', (chunk) => {
  for (const line of chunk.toString().split(/(?<=\n)/)) {
    if (important.test(line)) {
      process.stdout.write(line);
    }
  }
});

proc.stderr.on('data', (chunk) => {
  process.stderr.write(chunk.toString());
});

proc.on('exit', (code) => {
  process.exit(code ?? 1);
});
