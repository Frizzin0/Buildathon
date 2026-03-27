import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
// ─── AUTH ──────────────────────────────────────────────────────────────────────
function getFitService() {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return google.fitness({ version: "v1", auth: oauth2Client });
}
// ─── HELPERS ───────────────────────────────────────────────────────────────────
function msToDate(ms) {
    return new Date(ms).toISOString().split("T")[0];
}
function getTimeRange(days) {
    const end = Date.now();
    const start = end - days * 24 * 60 * 60 * 1000;
    return { startMs: String(start), endMs: String(end) };
}
// ─── SERVER ────────────────────────────────────────────────────────────────────
export const getServer = () => {
    const server = new McpServer({ name: "google-fit-mcp", version: "0.1.0" }, { capabilities: {} });
    // ── get_steps ──────────────────────────────────────────────────────────────
    server.registerTool("get_steps", {
        title: "Passi giornalieri",
        description: "Restituisce il numero di passi giornalieri negli ultimi N giorni",
        inputSchema: {
            days: z.number().int().positive().default(7).describe("Numero di giorni"),
        },
    }, async ({ days }) => {
        const fit = getFitService();
        const { startMs, endMs } = getTimeRange(days);
        const res = await fit.users.dataset.aggregate({
            userId: "me",
            requestBody: {
                aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
                bucketByTime: { durationMillis: "86400000" },
                startTimeMillis: startMs,
                endTimeMillis: endMs,
            },
        });
        const lines = [];
        let total = 0;
        for (const bucket of res.data.bucket ?? []) {
            const date = msToDate(Number(bucket.startTimeMillis));
            let steps = 0;
            for (const ds of bucket.dataset ?? [])
                for (const pt of ds.point ?? [])
                    steps += pt.value?.[0]?.intVal ?? 0;
            total += steps;
            lines.push(`${date}: ${steps.toLocaleString()} passi`);
        }
        lines.push(`\nTotale ${days} giorni: ${total.toLocaleString()} passi`);
        lines.push(`Media giornaliera: ${Math.round(total / days).toLocaleString()} passi`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
    // ── get_heart_rate ─────────────────────────────────────────────────────────
    server.registerTool("get_heart_rate", {
        title: "Frequenza cardiaca",
        description: "Restituisce i dati di frequenza cardiaca negli ultimi N giorni",
        inputSchema: {
            days: z.number().int().positive().default(7).describe("Numero di giorni"),
        },
    }, async ({ days }) => {
        const fit = getFitService();
        const { startMs, endMs } = getTimeRange(days);
        const res = await fit.users.dataset.aggregate({
            userId: "me",
            requestBody: {
                aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
                bucketByTime: { durationMillis: "86400000" },
                startTimeMillis: startMs,
                endTimeMillis: endMs,
            },
        });
        const lines = [];
        for (const bucket of res.data.bucket ?? []) {
            const date = msToDate(Number(bucket.startTimeMillis));
            for (const ds of bucket.dataset ?? [])
                for (const pt of ds.point ?? []) {
                    const avg = pt.value?.[0]?.fpVal?.toFixed(0) ?? "N/A";
                    const max = pt.value?.[1]?.fpVal?.toFixed(0) ?? "N/A";
                    const min = pt.value?.[2]?.fpVal?.toFixed(0) ?? "N/A";
                    lines.push(`${date}: media ${avg} bpm, max ${max} bpm, min ${min} bpm`);
                }
        }
        if (!lines.length)
            return { content: [{ type: "text", text: "Nessun dato di frequenza cardiaca trovato." }] };
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
    // ── get_sleep ──────────────────────────────────────────────────────────────
    server.registerTool("get_sleep", {
        title: "Dati sonno",
        description: "Restituisce i dati del sonno negli ultimi N giorni",
        inputSchema: {
            days: z.number().int().positive().default(7).describe("Numero di giorni"),
        },
    }, async ({ days }) => {
        const fit = getFitService();
        const endNs = String(Date.now() * 1e6);
        const startNs = String((Date.now() - days * 24 * 60 * 60 * 1000) * 1e6);
        const sleepTypes = {
            1: "Sveglio", 2: "Sonno", 3: "Leggero", 4: "Profondo", 5: "REM", 6: "Nap",
        };
        const res = await fit.users.dataSources.datasets.get({
            userId: "me",
            dataSourceId: "derived:com.google.sleep.segment:com.google.android.gms:merged",
            datasetId: `${startNs}-${endNs}`,
        });
        const lines = [];
        let totalMin = 0;
        for (const pt of res.data.point ?? []) {
            const start = new Date(Number(pt.startTimeNanos) / 1e6).toISOString().slice(0, 16).replace("T", " ");
            const end = new Date(Number(pt.endTimeNanos) / 1e6).toISOString().slice(0, 16).replace("T", " ");
            const durMin = Math.round((Number(pt.endTimeNanos) - Number(pt.startTimeNanos)) / 60e9);
            const type = sleepTypes[pt.value?.[0]?.intVal ?? 0] ?? "Sonno";
            if (type !== "Sveglio")
                totalMin += durMin;
            lines.push(`${start} → ${end} | ${type} | ${durMin} min`);
        }
        if (!lines.length)
            return { content: [{ type: "text", text: "Nessun dato del sonno trovato." }] };
        lines.unshift(`🛌 DATI SONNO ULTIMI ${days} GIORNI\n`);
        lines.push(`\nTotale sonno: ${Math.floor(totalMin / 60)}h ${totalMin % 60}min`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
    // ── get_workouts ───────────────────────────────────────────────────────────
    server.registerTool("get_workouts", {
        title: "Allenamenti",
        description: "Restituisce gli allenamenti negli ultimi N giorni",
        inputSchema: {
            days: z.number().int().positive().default(7).describe("Numero di giorni"),
        },
    }, async ({ days }) => {
        const fit = getFitService();
        const { startMs, endMs } = getTimeRange(days);
        const res = await fit.users.dataset.aggregate({
            userId: "me",
            requestBody: {
                aggregateBy: [{ dataTypeName: "com.google.activity.segment" }],
                bucketByTime: { durationMillis: "86400000" },
                startTimeMillis: startMs,
                endTimeMillis: endMs,
            },
        });
        const activityMap = {
            7: "Camminata", 8: "Corsa", 1: "Bicicletta", 17: "Nuoto",
            97: "Yoga", 80: "Forza", 72: "Calcio", 45: "Meditazione",
            108: "In veicolo", 0: "Sconosciuta", 12: "Ciclismo",
        };
        const lines = [];
        for (const bucket of res.data.bucket ?? []) {
            const date = msToDate(Number(bucket.startTimeMillis));
            for (const ds of bucket.dataset ?? [])
                for (const pt of ds.point ?? []) {
                    const actId = pt.value?.[0]?.intVal ?? 0;
                    const activity = activityMap[actId] ?? `Attività #${actId}`;
                    const durMin = Math.round((Number(pt.endTimeNanos) - Number(pt.startTimeNanos)) / 60e9);
                    // Filtra attività troppo corte o passive
                    if (durMin >= 10 && actId !== 108 && actId !== 0)
                        lines.push(`${date}: ${activity} — ${durMin} minuti`);
                }
        }
        if (!lines.length)
            return { content: [{ type: "text", text: "Nessun allenamento trovato." }] };
        return { content: [{ type: "text", text: lines.join("\n") }] };
    });
    // ── get_summary ────────────────────────────────────────────────────────────
    server.registerTool("get_summary", {
        title: "Riepilogo salute",
        description: "Restituisce un riepilogo generale della salute negli ultimi N giorni",
        inputSchema: {
            days: z.number().int().positive().default(7).describe("Numero di giorni"),
        },
    }, async ({ days }) => {
        const fit = getFitService();
        const { startMs, endMs } = getTimeRange(days);
        // Steps
        const stepsRes = await fit.users.dataset.aggregate({
            userId: "me",
            requestBody: {
                aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
                bucketByTime: { durationMillis: "86400000" },
                startTimeMillis: startMs,
                endTimeMillis: endMs,
            },
        });
        let totalSteps = 0;
        for (const bucket of stepsRes.data.bucket ?? [])
            for (const ds of bucket.dataset ?? [])
                for (const pt of ds.point ?? [])
                    totalSteps += pt.value?.[0]?.intVal ?? 0;
        // Heart rate
        const hrRes = await fit.users.dataset.aggregate({
            userId: "me",
            requestBody: {
                aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
                bucketByTime: { durationMillis: String(days * 86400000) },
                startTimeMillis: startMs,
                endTimeMillis: endMs,
            },
        });
        let avgHr = 0;
        for (const bucket of hrRes.data.bucket ?? [])
            for (const ds of bucket.dataset ?? [])
                for (const pt of ds.point ?? [])
                    avgHr = pt.value?.[0]?.fpVal ?? 0;
        const summary = [
            `📊 RIEPILOGO ULTIMI ${days} GIORNI`,
            "=".repeat(40),
            `👟 Passi totali: ${totalSteps.toLocaleString()}`,
            `   Media giornaliera: ${Math.round(totalSteps / days).toLocaleString()} passi`,
            avgHr ? `❤️  Frequenza cardiaca media: ${avgHr.toFixed(0)} bpm` : "",
        ].filter(Boolean).join("\n");
        return { content: [{ type: "text", text: summary }] };
    });
    return server;
};
//# sourceMappingURL=server.js.map