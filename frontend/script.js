const fileInput =
    document.getElementById("fileInput");

const analyzeButton =
    document.getElementById("analyzeButton");

const uploadStatus =
    document.getElementById("uploadStatus");

const dashboard =
    document.getElementById("dashboard");


// ============================================================
// ANALYZE BUTTON
// ============================================================

analyzeButton.addEventListener(
    "click",
    async () => {

        if (!fileInput.files.length) {

            uploadStatus.textContent =
                "Please select a package-lock.json file.";

            return;
        }


        const file =
            fileInput.files[0];


        uploadStatus.textContent =
            "Analyzing dependency ecosystem...";


        analyzeButton.disabled = true;


        // ----------------------------------------------------
        // CREATE FORM DATA
        // ----------------------------------------------------

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );


        try {

            // ------------------------------------------------
            // SEND FILE TO BACKEND
            // ------------------------------------------------

            const response =
                await fetch(
                    "http://localhost:3000/api/analyze",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const data =
                await response.json();


            // ------------------------------------------------
            // CHECK RESPONSE
            // ------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Analysis failed."
                );

            }


            // ------------------------------------------------
            // GET ANALYSIS
            // ------------------------------------------------

            const analysis =
                data.analysis;


            // ------------------------------------------------
            // DISPLAY RESULTS
            // ------------------------------------------------

            document.getElementById(
                "totalComponents"
            ).textContent =
                analysis.total_components;


            document.getElementById(
                "downstreamReach"
            ).textContent =
                analysis.downstream_reach;


            document.getElementById(
                "riskScore"
            ).textContent =
                analysis.risk_score;


            document.getElementById(
                "propagationPaths"
            ).textContent =
                analysis.total_propagation_paths;


            document.getElementById(
                "simulatedDependency"
            ).textContent =
                analysis.simulated_dependency;


            document.getElementById(
                "affectedComponents"
            ).textContent =
                analysis.affected_components.length;


            document.getElementById(
                "recommendedIntervention"
            ).textContent =
                analysis.recommended_intervention;


            document.getElementById(
                "exposureReduction"
            ).textContent =
                analysis.potential_exposure_reduction;


            document.getElementById(
                "riskPriority"
            ).textContent =
                analysis.risk_priority;


            // ------------------------------------------------
            // SHOW DASHBOARD
            // ------------------------------------------------

            dashboard.classList.remove(
                "hidden"
            );


            uploadStatus.textContent =
                "Analysis completed successfully!";


        }

        catch (error) {

            console.error(
                "Analysis error:",
                error
            );


            uploadStatus.textContent =
                "Analysis failed: " +
                error.message;

        }


        finally {

            analyzeButton.disabled =
                false;

        }

    }
);