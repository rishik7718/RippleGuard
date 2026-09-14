const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = 3000;


// ============================================================
// DIRECTORIES
// ============================================================

const uploadDirectory = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadDirectory)) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );

}


// ============================================================
// MULTER
// ============================================================

const upload = multer({
    storage: multer.memoryStorage()
});


app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));


// ============================================================
// TEST ROUTE
// ============================================================

app.get("/api/test", (req, res) => {

    res.json({

        status: "success",

        message:
            "RippleGuard backend is running!"

    });

});


// ============================================================
// ANALYZE ROUTE
// ============================================================

app.post(
    "/api/analyze",
    upload.single("file"),
    (req, res) => {

        // ----------------------------------------------------
        // CHECK FILE
        // ----------------------------------------------------

        if (!req.file) {

            return res.status(400).json({

                status: "error",

                message:
                    "No file uploaded."

            });

        }


        console.log(
            "Uploaded file:",
            req.file.originalname
        );


        // ----------------------------------------------------
        // CREATE TEMPORARY FILE
        // ----------------------------------------------------

        const tempFileName =
            Date.now() +
            "-" +
            req.file.originalname;

        const tempFilePath =
            path.join(
                uploadDirectory,
                tempFileName
            );


        try {

            fs.writeFileSync(
                tempFilePath,
                req.file.buffer
            );

        }

        catch (writeError) {

            console.error(
                "Could not save uploaded file:",
                writeError
            );

            return res.status(500).json({

                status: "error",

                message:
                    "Could not save uploaded file."

            });

        }


        console.log(
            "Temporary file:",
            tempFilePath
        );


        // ----------------------------------------------------
        // PYTHON ANALYZER
        // ----------------------------------------------------

        const analyzerPath = path.join(

            __dirname,

            "..",

            "analyzer",

            "analyzer.py"

        );


        const resultPath = path.join(

            __dirname,

            "..",

            "analyzer",

            "analysis_result.json"

        );


        console.log(
            "Starting Python analyzer..."
        );


        execFile(

            "python",

            [
                analyzerPath,
                tempFilePath
            ],

            (error, stdout, stderr) => {


                // ------------------------------------------------
                // PRINT PYTHON OUTPUT
                // ------------------------------------------------

                if (stdout) {

                    console.log(
                        "\nPython analyzer output:"
                    );

                    console.log(stdout);

                }


                // ------------------------------------------------
                // PYTHON ERROR
                // ------------------------------------------------

                if (error) {

                    console.error(
                        "\nPython analyzer error:",
                        error
                    );

                    console.error(
                        "Python stderr:",
                        stderr
                    );


                    // Delete temporary file
                    fs.unlink(
                        tempFilePath,
                        () => { }
                    );


                    return res.status(500).json({

                        status: "error",

                        message:
                            "Python analyzer failed.",

                        details:
                            stderr

                    });

                }


                // ------------------------------------------------
                // CHECK JSON RESULT
                // ------------------------------------------------

                if (
                    !fs.existsSync(resultPath)
                ) {

                    fs.unlink(
                        tempFilePath,
                        () => { }
                    );


                    return res.status(500).json({

                        status: "error",

                        message:
                            "Analysis completed, but analysis_result.json was not found."

                    });

                }


                // ------------------------------------------------
                // READ JSON RESULT
                // ------------------------------------------------

                fs.readFile(

                    resultPath,

                    "utf8",

                    (readError, data) => {


                        // Delete temporary uploaded file
                        fs.unlink(
                            tempFilePath,
                            () => { }
                        );


                        if (readError) {

                            console.error(
                                "Could not read result:",
                                readError
                            );


                            return res.status(500).json({

                                status: "error",

                                message:
                                    "Could not read analysis result."

                            });

                        }


                        // ------------------------------------------------
                        // PARSE RESULT
                        // ------------------------------------------------

                        try {

                            const result =
                                JSON.parse(data);


                            console.log(
                                "Analysis completed successfully."
                            );


                            return res.json({

                                status:
                                    "success",

                                analysis:
                                    result

                            });

                        }

                        catch (parseError) {

                            console.error(
                                "JSON parse error:",
                                parseError
                            );


                            return res.status(500).json({

                                status:
                                    "error",

                                message:
                                    "Analysis result contains invalid JSON."

                            });

                        }

                    }

                );

            }

        );

    }

);


// ============================================================
// START SERVER
// ============================================================

app.listen(

    PORT,

    () => {

        console.log(
            "==================================="
        );

        console.log(
            "       RIPPLEGUARD BACKEND"
        );

        console.log(
            "==================================="
        );

        console.log(
            `Server running on http://localhost:${PORT}`
        );

    }

);