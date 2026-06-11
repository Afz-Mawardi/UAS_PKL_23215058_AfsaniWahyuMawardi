const fs = require('fs');

const logFile = "C:\\Users\\S A N M\\.gemini\\antigravity-ide\\brain\\2082c80f-c2e5-4307-9f56-a8be07f96426\\.system_generated\\logs\\transcript.jsonl";
const data = fs.readFileSync(logFile, 'utf-8');
const lines = data.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === "run_command") {
          console.log(`Step ${obj.step_index}: run_command: ${call.args.CommandLine}`);
        }
      }
    }
  } catch (e) {
  }
}
