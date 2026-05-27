const { execSync } = require('child_process');

try {
  // Query all node processes using tasklist or wmic on Windows
  const output = execSync('wmic process where "name=\'node.exe\'" get processid,commandline', { encoding: 'utf8' });
  const lines = output.split('\n');
  const currentPid = process.pid;
  
  console.log(`Current process PID: ${currentPid}`);
  
  for (let line of lines) {
    if (!line.trim()) continue;
    if (line.includes('CommandLine')) continue;
    
    // Find the PID at the end of the line
    const match = line.match(/(\d+)\s*$/);
    if (match) {
      const pid = parseInt(match[1]);
      const cmd = line.substring(0, line.length - match[0].length).trim();
      
      if (pid !== currentPid && (cmd.includes('next-dev') || cmd.includes('next') || cmd.includes('next dev') || cmd.includes('turbopack') || cmd.includes('dev'))) {
        console.log(`Killing process ${pid}: ${cmd}`);
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e) {
          // If node process.kill fails, try taskkill
          try {
            execSync(`taskkill /F /PID ${pid}`);
          } catch (err) {
            console.error(`Failed to kill PID ${pid}:`, err.message);
          }
        }
      }
    }
  }
} catch (e) {
  console.error('Error running script:', e);
}
