import axios from 'axios';
import { tool } from "langchain"
import * as z from "zod";

// A sandbox pod takes a few seconds to become routable. Without a timeout the
// agent stream hangs forever and the request appears "stuck" in the UI.
const http = axios.create({ timeout: 30000 });

const sandboxBase = (projectId) => `http://sandbox-service-${projectId}:3000`;

async function withRetry(fn, { attempts = 4, delayMs = 2000 } = {}) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const retryable =
                err.code === 'ECONNREFUSED' ||
                err.code === 'EAI_AGAIN' ||
                err.code === 'ENOTFOUND' ||
                err.code === 'ECONNABORTED';
            if (!retryable || i === attempts - 1) break;
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw lastErr;
}

export const listFiles = tool(
    async ({ }, config) => {

        const writer = config.context?.writer ?? (() => { });

        writer("Listing files in project directory...\n");

        try {
            const response = await withRetry(() =>
                http.get(`${sandboxBase(config.context.projectId)}/list-files`)
            );
            writer("Files listed successfully." + "Files: " + response.data.files.join(",") + "\n");
            return JSON.stringify(response.data.files);
        } catch (err) {
            writer(`Could not list files: ${err.message}\n`);
            return JSON.stringify({ error: `list_files failed: ${err.message}` });
        }
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readFiles = tool(
    async ({ files = [] }, config) => {

        const writer = config.context?.writer ?? (() => { });

        writer("Reading files..." + files.join(",") + "\n");

        try {
            const response = await withRetry(() =>
                http.get(`${sandboxBase(config.context.projectId)}/read-files`, {
                    params: { files: files.join(",") }
                })
            );
            writer("Files read successfully.\n");
            return JSON.stringify(response.data);
        } catch (err) {
            writer(`Could not read files: ${err.message}\n`);
            return JSON.stringify({ error: `read_files failed: ${err.message}` });
        }
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. This is useful for understanding the content of files that are relevant to the task at hand.",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later")
        })
    }
)

export const updateFiles = tool(
    async ({ files }, config) => {
        const writer = config.context?.writer ?? (() => { });

        writer("Updating files..." + files.map(f => f.file).join(",") + "\n");

        try {
            const response = await withRetry(() =>
                http.patch(`${sandboxBase(config.context.projectId)}/update-files`, {
                    updates: files
                })
            );
            writer("Files updated successfully.\n");
            return JSON.stringify(response.data.results);
        } catch (err) {
            writer(`Could not update files: ${err.message}\n`);
            return JSON.stringify({ error: `update_files failed: ${err.message}` });
        }
    },
    {
        name: "update_files",
        description: "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
        schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The absolute path of the file to update"),
                content: z.string().describe("The new content for the file, the content should support json format.")
            })).describe("The list of files to update and their new contents")
        })
    }
)
