import "dotenv/config"
import app from "./src/app.js"







app.listen(3000,()=>{
    console.log(`Ai Orchestration server is running on port 3000`)
})




/*
 * Create an AI agent that can plan and execute tasks in a sandboxed environment.
 * 
 * The agent should be able to:
 * 1. Read files in the sandbox
 * 2. Update files in the sandbox
 * 3. Create new files in the sandbox
 * 
 * API:
 * - POST /generate-task: Generates a task for a given problem description
 * - POST /execute-task: Executes a given task
 * 
 * The agent should maintain a history of tasks and their status.
 */