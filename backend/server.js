const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;

const upload = multer({
    storage: multer.memoryStorage()
});

const uploadsDir = path.join(__dirname, "uploads");
const analyzerDir = path.join(__dirname, "..", "analyzer");
const analyzerPath = path.join(analyzerDir, "analyzer.py");
const resultPath = path.join(analyzerDir, "analysis_result.json");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, "..", "frontend")));

function enrichResult(result) {
    const nodes = result.graph_nodes || [];
    const edges = result.graph_edges || [];
    const target = result.simulated_dependency;

    const children = {};

    nodes.forEach(node => {
        children[node] = [];
    });

    edges.forEach(edge => {
        if (!children[edge.source]) {
            children[edge.source] = [];
        }

        children[edge.source].push(edge.target);
    });

    const affected = new Set();
    const queue = [];

    if (target && children[target]) {
        children[target].forEach(child => {
            queue.push(child);
        });
    }

    while (queue.length > 0) {
        const current = queue.shift();

        if (affected.has(current)) {
            continue;
        }

        affected.add(current);

        if (children[current]) {
            children[current].forEach(child => {
                if (!affected.has(child)) {
                    queue.push(child);
                }
            });
        }
    }

    result.affected_components =
        result.affected_components ||
        Array.from(affected);

    result.downstream_reach =
        result.downstream_reach ??
        affected.size;

    result.propagation_paths =
        result.propagation_paths ||
        [];

    result.total_propagation_paths =
        result.total_propagation_paths ??
        result.propagation_paths.length;

    result.risk_score =
        result.risk_score ??
        (
            result.downstream_reach * 10 +
            result.total_propagation_paths * 10
        );

    result.risk_priority =
        result.risk_priority ||
        (
            result.risk_score >= 70
                ? "HIGH"
                : result.risk_score >= 40
                    ? "MEDIUM"
                    : "LOW"
        );

    if (!result.mitigation_ranking) {
        result.mitigation_ranking = [];
    }

    if (!result.recommended_intervention) {
        if (result.mitigation_ranking.length > 0) {
            const first = result.mitigation_ranking[0];

            result.recommended_intervention =
                first.dependency ||
                first.name ||
                "Review highest-impact dependency";
        } else {
            result.recommended_intervention =
                "Review highest-impact dependency";
        }
    }

    result.potential_exposure_reduction =
        result.potential_exposure_reduction ??
        result.downstream_reach;

    return result;
}

app.post("/api/analyze", upload.single("file"), (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            error: "No file uploaded"
        });
    }

    const uploadedFilePath = path.join(
        uploadsDir,
        req.file.originalname
    );

    try {

        fs.writeFileSync(
            uploadedFilePath,
            req.file.buffer
        );

        execFile(
            "python",
            [
                analyzerPath,
                uploadedFilePath
            ],
            {
                cwd: analyzerDir
            },
            (error, stdout, stderr) => {

                if (error) {
                    console.error(stderr);

                    return res.status(500).json({
                        error: "Analysis failed",
                        details: stderr || error.message
                    });
                }

                console.log(stdout);

                if (!fs.existsSync(resultPath)) {
                    return res.status(500).json({
                        error: "Analysis result not found"
                    });
                }

                try {

                    let result = JSON.parse(
                        fs.readFileSync(
                            resultPath,
                            "utf8"
                        )
                    );

                    result = enrichResult(result);

                    console.log(
                        "FINAL RESULT KEYS:",
                        Object.keys(result)
                    );

                    console.log(
                        "DOWNSTREAM:",
                        result.downstream_reach
                    );

                    console.log(
                        "RISK:",
                        result.risk_score
                    );

                    return res.json({
                        success: true,
                        analysis: result
                    });

                } catch (parseError) {

                    return res.status(500).json({
                        error: "Invalid analysis result",
                        details: parseError.message
                    });
                }
            }
        );

    } catch (error) {

        return res.status(500).json({
            error: "Server error",
            details: error.message
        });
    }
});

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "..",
            "frontend",
            "index.html"
        )
    );
});

app.listen(PORT, () => {
    console.log(
        `RippleGuard backend running at http://localhost:${PORT}`
    );
});