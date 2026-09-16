const fileInput = document.getElementById("fileInput");
const analyzeButton = document.getElementById("analyzeButton");

const dashboard = document.getElementById("dashboard");

const riskPriorityEl = document.getElementById("riskPriority");
const totalComponentsEl = document.getElementById("totalComponents");
const downstreamReachEl = document.getElementById("downstreamReach");
const riskScoreEl = document.getElementById("riskScore");
const propagationPathsEl = document.getElementById("propagationPaths");
const simulatedDependencyEl =
    document.getElementById("simulatedDependency");
const affectedComponentsEl =
    document.getElementById("affectedComponents");
const recommendedInterventionEl =
    document.getElementById("recommendedIntervention");
const exposureReductionEl =
    document.getElementById("exposureReduction");


// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function cleanNodeName(name) {

    if (!name) {
        return "Unknown";
    }

    let cleaned = String(name);

    cleaned = cleaned.replace(/^node_modules\//, "");

    return cleaned;
}


function normalizeName(name) {

    return String(name || "").trim();

}


// ==========================================================
// ANALYZE DEPENDENCY FILE
// ==========================================================

analyzeButton.addEventListener("click", async () => {

    const file = fileInput.files[0];


    if (!file) {

        alert(
            "Please select a dependency file first."
        );

        return;

    }


    const formData = new FormData();

    formData.append(
        "file",
        file
    );


    analyzeButton.disabled = true;

    analyzeButton.textContent =
        "Analyzing...";


    try {

        // --------------------------------------------------
        // SEND FILE TO BACKEND
        // --------------------------------------------------

        const response = await fetch(
            "http://localhost:3000/api/analyze",
            {
                method: "POST",
                body: formData
            }
        );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Analysis failed."
            );

        }


        const analysis =
            data.analysis;


        console.log(
            "Analysis result:",
            analysis
        );


        // --------------------------------------------------
        // SHOW DASHBOARD
        // --------------------------------------------------

        dashboard.style.display =
            "block";


        // --------------------------------------------------
        // BASIC DATA
        // --------------------------------------------------

        const totalComponents =
            Number(
                analysis.total_components || 0
            );


        const simulatedDependency =
            normalizeName(
                analysis.simulated_dependency
            );


        // ==================================================
        // BUILD REVERSE DEPENDENCY MAP
        // ==================================================
        //
        // If:
        //
        // A -> B
        //
        // A depends on B.
        //
        // Therefore if B is compromised,
        // A can potentially be affected.
        //
        // So we reverse the relationship:
        //
        // B -> A
        //
        // ==================================================

        const dependents =
            new Map();


        if (
            Array.isArray(
                analysis.graph_edges
            )
        ) {

            analysis.graph_edges.forEach(
                edge => {

                    const source =
                        normalizeName(
                            edge.source
                        );


                    const target =
                        normalizeName(
                            edge.target
                        );


                    if (
                        !source ||
                        !target
                    ) {

                        return;

                    }


                    if (
                        !dependents.has(
                            target
                        )
                    ) {

                        dependents.set(
                            target,
                            []
                        );

                    }


                    dependents
                        .get(target)
                        .push(source);

                }
            );

        }


        // ==================================================
        // FIND DOWNSTREAM AFFECTED COMPONENTS
        // ==================================================

        const affected =
            new Set();


        const queue = [
            simulatedDependency
        ];


        while (
            queue.length > 0
        ) {

            const current =
                queue.shift();


            const children =
                dependents.get(
                    current
                ) || [];


            for (
                const child
                of children
            ) {

                if (
                    !affected.has(
                        child
                    )
                ) {

                    affected.add(
                        child
                    );

                    queue.push(
                        child
                    );

                }

            }

        }


        // The compromised dependency itself
        // is not counted as downstream impact.

        affected.delete(
            simulatedDependency
        );


        const downstreamReach =
            affected.size;


        // ==================================================
        // RISK SCORE
        // ==================================================

        const riskScore =
            Math.min(
                100,
                downstreamReach * 10
            );


        let riskPriority =
            "LOW";


        if (
            riskScore >= 70
        ) {

            riskPriority =
                "HIGH";

        }
        else if (
            riskScore >= 40
        ) {

            riskPriority =
                "MEDIUM";

        }


        // ==================================================
        // PROPAGATION PATHS
        // ==================================================

        const propagationPaths =
            downstreamReach;


        // ==================================================
        // RECOMMENDED INTERVENTION
        // ==================================================
        //
        // Backend may return:
        //
        // "Review highest-impact dependency"
        //
        // or:
        //
        // 0
        //
        // or:
        //
        // null
        //
        // Those are placeholders, NOT actual
        // dependency names.
        //
        // In that situation, use the actual
        // highest-impact dependency.
        //
        // For the current analysis this is es-errors.
        // ==================================================

        let recommendedIntervention =
            normalizeName(
                analysis.recommended_intervention
            );


        const placeholderInterventions = [

            "",
            "0",
            "null",
            "undefined",
            "unknown",
            "review highest-impact dependency",
            "review highest impact dependency",
            "highest-impact dependency",
            "highest impact dependency"

        ];


        const normalizedRecommendation =
            recommendedIntervention
                .toLowerCase()
                .trim();


        if (
            placeholderInterventions.includes(
                normalizedRecommendation
            )
        ) {

            // First preference:
            // Use the simulated dependency because
            // it is the dependency currently being
            // evaluated for ripple impact.

            recommendedIntervention =
                simulatedDependency;

        }


        // ==================================================
        // POTENTIAL EXPOSURE REDUCTION
        // ==================================================

        let exposureReduction =
            Number(
                analysis.potential_exposure_reduction
            );


        if (
            !Number.isFinite(
                exposureReduction
            ) ||
            exposureReduction <= 0
        ) {

            exposureReduction =
                downstreamReach;

        }


        // ==================================================
        // UPDATE DASHBOARD
        // ==================================================

        totalComponentsEl.textContent =
            totalComponents;


        downstreamReachEl.textContent =
            downstreamReach;


        riskScoreEl.textContent =
            riskScore;


        propagationPathsEl.textContent =
            propagationPaths;


        simulatedDependencyEl.textContent =
            cleanNodeName(
                simulatedDependency
            );


        riskPriorityEl.textContent =
            riskPriority;


        // ==================================================
        // AFFECTED COMPONENTS
        // ==================================================

        if (
            affected.size > 0
        ) {

            affectedComponentsEl.textContent =
                Array.from(
                    affected
                )
                    .map(
                        cleanNodeName
                    )
                    .join(
                        ", "
                    );

        }
        else {

            affectedComponentsEl.textContent =
                "No downstream components affected";

        }


        // ==================================================
        // RECOMMENDED INTERVENTION
        // ==================================================

        recommendedInterventionEl.textContent =
            cleanNodeName(
                recommendedIntervention
            );


        // ==================================================
        // POTENTIAL EXPOSURE REDUCTION
        // ==================================================

        exposureReductionEl.textContent =
            `${exposureReduction} components`;


        // ==================================================
        // RENDER DEPENDENCY GRAPH
        // ==================================================

        renderDependencyGraph(
            analysis,
            simulatedDependency,
            affected,
            dependents
        );


    }
    catch (error) {

        console.error(
            "Analysis error:",
            error
        );


        alert(
            "Analysis failed. Check the browser console for details."
        );

    }
    finally {

        analyzeButton.disabled =
            false;


        analyzeButton.textContent =
            "Analyze";

    }

});


// ==========================================================
// DEPENDENCY GRAPH
// ==========================================================

function renderDependencyGraph(
    analysis,
    simulatedDependency,
    affected,
    dependents
) {

    const graphContainer =
        document.getElementById(
            "dependencyGraph"
        );


    if (!graphContainer) {

        console.error(
            "dependencyGraph element not found."
        );

        return;

    }


    // --------------------------------------------------
    // CLEAR OLD GRAPH
    // --------------------------------------------------

    graphContainer.innerHTML =
        "";


    // ==================================================
    // BUILD RIPPLE TREE
    // ==================================================

    const treeChildren =
        new Map();


    const visited =
        new Set();


    visited.add(
        simulatedDependency
    );


    const bfsQueue = [
        simulatedDependency
    ];


    while (
        bfsQueue.length > 0
    ) {

        const current =
            bfsQueue.shift();


        const children =
            dependents.get(
                current
            ) || [];


        for (
            const child
            of children
        ) {

            if (
                !affected.has(
                    child
                )
            ) {

                continue;

            }


            if (
                visited.has(
                    child
                )
            ) {

                continue;

            }


            visited.add(
                child
            );


            if (
                !treeChildren.has(
                    current
                )
            ) {

                treeChildren.set(
                    current,
                    []
                );

            }


            treeChildren
                .get(current)
                .push(child);


            bfsQueue.push(
                child
            );

        }

    }


    // --------------------------------------------------
    // ADD ANY REMAINING AFFECTED COMPONENTS
    // --------------------------------------------------

    for (
        const node
        of affected
    ) {

        if (
            !visited.has(
                node
            )
        ) {

            if (
                !treeChildren.has(
                    simulatedDependency
                )
            ) {

                treeChildren.set(
                    simulatedDependency,
                    []
                );

            }


            treeChildren
                .get(
                    simulatedDependency
                )
                .push(
                    node
                );


            visited.add(
                node
            );

        }

    }


    // ==================================================
    // CALCULATE DEPTH LEVELS
    // ==================================================

    const levels =
        new Map();


    levels.set(
        simulatedDependency,
        0
    );


    const levelQueue = [
        simulatedDependency
    ];


    while (
        levelQueue.length > 0
    ) {

        const current =
            levelQueue.shift();


        const currentLevel =
            levels.get(
                current
            );


        const children =
            treeChildren.get(
                current
            ) || [];


        children.forEach(
            child => {

                if (
                    !levels.has(
                        child
                    )
                ) {

                    levels.set(
                        child,
                        currentLevel + 1
                    );

                    levelQueue.push(
                        child
                    );

                }

            }
        );

    }


    // ==================================================
    // CREATE SAFE CYTOSCAPE IDS
    // ==================================================

    const nodeIdMap =
        new Map();


    let nodeCounter =
        0;


    levels.forEach(
        (level, name) => {

            nodeIdMap.set(
                name,
                `node_${nodeCounter++}`
            );

        }
    );


    // ==================================================
    // GRAPH ELEMENTS
    // ==================================================

    const elements = [];


    // --------------------------------------------------
    // NODES
    // --------------------------------------------------

    levels.forEach(
        (level, name) => {

            elements.push({

                data: {

                    id:
                        nodeIdMap.get(
                            name
                        ),

                    label:
                        cleanNodeName(
                            name
                        ),

                    level:
                        level,

                    isTarget:
                        name ===
                        simulatedDependency

                }

            });

        }
    );


    // --------------------------------------------------
    // EDGES
    // --------------------------------------------------

    let edgeCounter =
        0;


    treeChildren.forEach(
        (children, parent) => {

            children.forEach(
                child => {

                    elements.push({

                        data: {

                            id:
                                `ripple_${edgeCounter++}`,

                            source:
                                nodeIdMap.get(
                                    parent
                                ),

                            target:
                                nodeIdMap.get(
                                    child
                                )

                        }

                    });

                }
            );

        }
    );


    // ==================================================
    // GRAPH SIZE
    // ==================================================

    const graphWidth =
        graphContainer.clientWidth ||
        1000;


    const graphHeight =
        graphContainer.clientHeight ||
        650;


    const horizontalSpacing =
        185;


    const verticalSpacing =
        125;


    const topPadding =
        80;


    // ==================================================
    // CALCULATE NODE POSITIONS
    // ==================================================

    const positions =
        new Map();


    // --------------------------------------------------
    // FIND LEAF NODES
    // --------------------------------------------------

    const leafNodes =
        [];


    levels.forEach(
        (level, node) => {

            const children =
                treeChildren.get(
                    node
                ) || [];


            if (
                children.length === 0
            ) {

                leafNodes.push(
                    node
                );

            }

        }
    );


    // --------------------------------------------------
    // SORT LEAVES
    // --------------------------------------------------

    leafNodes.sort(
        (a, b) => {

            const levelA =
                levels.get(a) || 0;


            const levelB =
                levels.get(b) || 0;


            return levelA - levelB;

        }
    );


    // --------------------------------------------------
    // PLACE LEAVES
    // --------------------------------------------------

    const requiredWidth =
        Math.max(
            graphWidth - 120,
            leafNodes.length *
            horizontalSpacing
        );


    const leafStartX =
        (
            graphWidth -
            requiredWidth
        ) / 2;


    leafNodes.forEach(
        (node, index) => {

            positions.set(
                node,
                {

                    x:
                        leafStartX +
                        (
                            index +
                            0.5
                        ) *
                        horizontalSpacing,

                    y:
                        topPadding +
                        (
                            levels.get(
                                node
                            ) || 0
                        ) *
                        verticalSpacing

                }
            );

        }
    );


    // ==================================================
    // PLACE PARENT NODES
    // ==================================================

    const nodesByDepth =
        Array.from(
            levels.entries()
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    nodesByDepth.forEach(
        ([node, depth]) => {

            if (
                positions.has(
                    node
                )
            ) {

                return;

            }


            const children =
                treeChildren.get(
                    node
                ) || [];


            const childPositions =
                children
                    .map(
                        child =>
                            positions.get(
                                child
                            )
                    )
                    .filter(
                        Boolean
                    );


            if (
                childPositions.length > 0
            ) {

                const averageX =
                    childPositions.reduce(
                        (
                            total,
                            position
                        ) =>
                            total +
                            position.x,
                        0
                    ) /
                    childPositions.length;


                positions.set(
                    node,
                    {

                        x:
                            averageX,

                        y:
                            topPadding +
                            depth *
                            verticalSpacing

                    }
                );

            }
            else {

                positions.set(
                    node,
                    {

                        x:
                            graphWidth / 2,

                        y:
                            topPadding +
                            depth *
                            verticalSpacing

                    }
                );

            }

        }
    );


    // ==================================================
    // CREATE CYTOSCAPE GRAPH
    // ==================================================

    const cy =
        cytoscape({

            container:
                graphContainer,

            elements:
                elements,


            style: [

                // ------------------------------------------
                // NORMAL DEPENDENCY BOX
                // ------------------------------------------

                {

                    selector:
                        "node",

                    style: {

                        "shape":
                            "round-rectangle",

                        "background-color":
                            "#050505",

                        "border-color":
                            "#dc2626",

                        "border-width":
                            2,

                        "width":
                            145,

                        "height":
                            68,

                        "label":
                            "data(label)",

                        "color":
                            "#ff3b3b",

                        "font-size":
                            13,

                        "font-weight":
                            "bold",

                        "text-wrap":
                            "wrap",

                        "text-max-width":
                            "125px",

                        "text-valign":
                            "center",

                        "text-halign":
                            "center",

                        "text-margin-x":
                            0,

                        "text-margin-y":
                            0,

                        "text-outline-width":
                            0,

                        "overlay-opacity":
                            0,

                        "padding":
                            "8px"

                    }

                },


                // ------------------------------------------
                // COMPROMISED DEPENDENCY
                // ------------------------------------------

                {

                    selector:
                        "node[isTarget = 'true']",

                    style: {

                        "shape":
                            "round-rectangle",

                        "background-color":
                            "#0a0000",

                        "border-color":
                            "#ff0000",

                        "border-width":
                            4,

                        "width":
                            165,

                        "height":
                            78,

                        "color":
                            "#ff3030",

                        "font-size":
                            15,

                        "font-weight":
                            "bold",

                        "text-max-width":
                            "140px"

                    }

                },


                // ------------------------------------------
                // RIPPLE EDGES
                // ------------------------------------------

                {

                    selector:
                        "edge",

                    style: {

                        "width":
                            2,

                        "line-color":
                            "#991b1b",

                        "target-arrow-color":
                            "#ef4444",

                        "target-arrow-shape":
                            "triangle",

                        "target-arrow-fill":
                            "filled",

                        "arrow-scale":
                            1.15,

                        "curve-style":
                            "bezier",

                        "control-point-step-size":
                            45,

                        "opacity":
                            0.9

                    }

                }

            ],


            // ==================================================
            // MANUAL POSITIONS
            // ==================================================

            layout: {

                name:
                    "preset",

                positions:
                    function (node) {

                        const entry =
                            Array.from(
                                nodeIdMap.entries()
                            )
                                .find(
                                    ([name, id]) =>
                                        id ===
                                        node.id()
                                );


                        if (
                            entry
                        ) {

                            const name =
                                entry[0];


                            return (
                                positions.get(
                                    name
                                ) ||
                                {

                                    x:
                                        graphWidth / 2,

                                    y:
                                        graphHeight / 2

                                }
                            );

                        }


                        return {

                            x:
                                graphWidth / 2,

                            y:
                                graphHeight / 2

                        };

                    },

                fit:
                    true,

                padding:
                    75

            }

        });


    // ==================================================
    // FINAL GRAPH FIT
    // ==================================================

    cy.ready(
        () => {

            cy.fit(
                cy.elements(),
                75
            );

            cy.center();

        }
    );


    // ==================================================
    // NODE CLICK
    // ==================================================

    cy.on(
        "tap",
        "node",
        function (event) {

            const node =
                event.target;


            console.log(
                "Selected dependency:",
                node.data(
                    "label"
                )
            );

        }
    );


    // ==================================================
    // USER PAN + ZOOM
    // ==================================================

    cy.userPanningEnabled(
        true
    );


    cy.userZoomingEnabled(
        true
    );

}