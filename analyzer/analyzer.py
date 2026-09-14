import json
import sys
from pathlib import Path


def load_dependencies(file_path=None):

    if file_path is None:
        file_path = Path(__file__).parent / "package-lock.json"
    else:
        file_path = Path(file_path)

    with open(file_path, "r") as file:
        data = json.load(file)

    dependencies = {}

    application = "RippleGuard-TestProject"

    # Get root project's direct dependencies
    root_package = data["packages"].get("", {})
    root_dependencies = root_package.get("dependencies", {})

    dependencies[application] = []

    for dependency in root_dependencies:
        dependencies[application].append(
            f"node_modules/{dependency}"
        )

    # Build installed package nodes
    for package_path, package_info in data["packages"].items():

        if package_path == "":
            continue

        if "node_modules/" not in package_path:
            continue

        # Keep the real package location
        package_name = package_path

        dependencies[package_name] = []

        # Convert dependency names into the correct node_modules path
        for dependency in package_info.get("dependencies", {}):

            dependency_path = (
                f"{package_path}/node_modules/{dependency}"
            )

            # If that exact nested package exists
            if dependency_path in data["packages"]:

                dependencies[package_name].append(
                    dependency_path
                )

            else:

                # Otherwise use the top-level package
                top_level_path = f"node_modules/{dependency}"

                if top_level_path in data["packages"]:
                    dependencies[package_name].append(
                        top_level_path
                    )

    return {
        "application": application,
        "dependencies": dependencies
    }


def load_package_lock():

    file_path = Path(__file__).parent / "package-lock.json"

    with open(file_path, "r") as file:
        data = json.load(file)

    return data


def build_reverse_graph(dependencies):

    reverse_graph = {}

    for package, children in dependencies.items():

        if package not in reverse_graph:
            reverse_graph[package] = []

        for child in children:

            if child not in reverse_graph:
                reverse_graph[child] = []

            reverse_graph[child].append(package)

    return reverse_graph


def find_downstream_dependencies(start_node, reverse_graph):

    affected = []

    queue = [start_node]

    visited = {start_node}

    while queue:

        current = queue.pop(0)

        for parent in reverse_graph.get(current, []):

            if parent not in visited:

                visited.add(parent)

                affected.append(parent)

                queue.append(parent)

    return affected


def find_propagation_paths(
    start_node,
    reverse_graph,
    application
):

    paths = []

    queue = [
        (start_node, [start_node])
    ]

    while queue:

        current, path = queue.pop(0)

        if current == application:

            paths.append(path)

            continue

        for parent in reverse_graph.get(current, []):

            if parent not in path:

                new_path = path + [parent]

                queue.append(
                    (parent, new_path)
                )

    # Remove duplicate paths
    unique_paths = []

    for path in paths:

        if path not in unique_paths:

            unique_paths.append(path)

    # Sort by shortest path first
    unique_paths.sort(
        key=len
    )

    # Keep only the 5 shortest propagation paths
    return unique_paths[:5]


def calculate_criticality(
    dependencies,
    reverse_graph
):

    results = []

    for package in reverse_graph:

        affected = find_downstream_dependencies(
            package,
            reverse_graph
        )

        downstream_reach = len(affected)

        if downstream_reach >= 5:

            priority = "HIGH"

        elif downstream_reach >= 2:

            priority = "MEDIUM"

        else:

            priority = "LOW"

        results.append({

            "dependency": package,

            "downstream_reach":
                downstream_reach,

            "priority":
                priority
        })

    results.sort(
        key=lambda item:
            item["downstream_reach"],
        reverse=True
    )

    return results


def calculate_mitigation_impact(
    reverse_graph
):

    results = []

    for package in reverse_graph:

        affected = find_downstream_dependencies(
            package,
            reverse_graph
        )

        exposure_reduction = len(
            affected
        )

        results.append({

            "dependency": package,

            "exposure_reduction":
                exposure_reduction
        })

    results.sort(
        key=lambda item:
            item["exposure_reduction"],
        reverse=True
    )

    return results


def save_analysis_result(result):

    result_path = (
        Path(__file__).parent
        / "analysis_result.json"
    )

    with open(
        result_path,
        "w"
    ) as file:

        json.dump(
            result,
            file,
            indent=4
        )

    print(
        f"\nAnalysis result saved to: "
        f"{result_path}"
    )


def main(file_path=None):

    data = load_dependencies(
        file_path
    )

    application = data["application"]

    dependencies = data["dependencies"]

    reverse_graph = build_reverse_graph(
        dependencies
    )

    print(
        "==================================="
    )

    print(
        "        RIPPLEGUARD ANALYZER"
    )

    print(
        "==================================="
    )

    print(
        f"\nApplication: {application}"
    )

    print(
        f"Total components: "
        f"{len(dependencies)}"
    )

    # --------------------------------
    # CRITICALITY ANALYSIS
    # --------------------------------

    print(
        "\nCRITICAL DEPENDENCY ANALYSIS"
    )

    print(
        "-----------------------------------"
    )

    results = calculate_criticality(
        dependencies,
        reverse_graph
    )

    for result in results:

        print(

            f"{result['dependency']:<15} "

            f"Reach: "
            f"{result['downstream_reach']:<3} "

            f"Priority: "
            f"{result['priority']}"
        )

    # --------------------------------
    # SIMULATED COMPROMISE
    # --------------------------------

    target = results[0]["dependency"]

    print(
        "\n-----------------------------------"
    )

    print(
        f"\nSimulated compromised dependency: "
        f"{target}"
    )

    affected = find_downstream_dependencies(
        target,
        reverse_graph
    )

    print(
        "\nPotentially affected components:"
    )

    for component in affected:

        print(
            f"  - {component}"
        )

    print(
        f"\nPotential propagation reach: "
        f"{len(affected)} components"
    )

    # --------------------------------
    # PROPAGATION PATHS
    # --------------------------------

    paths = find_propagation_paths(

        target,

        reverse_graph,

        application
    )

    print(
        "\nPROPAGATION PATHS"
    )

    print(
        "-----------------------------------"
    )

    for index, path in enumerate(

        paths,

        start=1
    ):

        print(

            f"Path {index}: "

            + " -> ".join(path)
        )

    print(

        f"\nTotal propagation paths: "
        f"{len(paths)}"
    )

    # --------------------------------
    # RISK SCORE
    # --------------------------------

    print(
        "\nRISK SCORE"
    )

    print(
        "-----------------------------------"
    )

    risk_score = (

        len(affected) * 10

        + len(paths) * 10
    )

    print(
        f"Dependency: {target}"
    )

    print(
        f"Downstream reach: "
        f"{len(affected)}"
    )

    print(
        f"Propagation paths: "
        f"{len(paths)}"
    )

    print(
        f"Modeled risk score: "
        f"{risk_score}"
    )

    if risk_score >= 70:

        risk_priority = "HIGH"

    elif risk_score >= 40:

        risk_priority = "MEDIUM"

    else:

        risk_priority = "LOW"

    print(
        f"Risk priority: "
        f"{risk_priority}"
    )

    # --------------------------------
    # MITIGATION RANKING
    # --------------------------------

    mitigation_results = (
        calculate_mitigation_impact(
            reverse_graph
        )
    )

    print(
        "\nMITIGATION IMPACT RANKING"
    )

    print(
        "-----------------------------------"
    )

    for index, result in enumerate(

        mitigation_results,

        start=1
    ):

        print(

            f"{index}. "

            f"{result['dependency']:<15} "

            f"Exposure reduction: "

            f"{result['exposure_reduction']}"
        )

    top_mitigation = (
        mitigation_results[0]
    )

    print(

        f"\nRecommended intervention point: "

        f"{top_mitigation['dependency']}"
    )

    print(

        f"Potential exposure reduction: "

        f"{top_mitigation['exposure_reduction']} "

        f"components"
    )

    # --------------------------------
    # BUILD JSON RESULT
    # --------------------------------

    analysis_result = {

        "application":
            application,

        "total_components":
            len(dependencies),

        "critical_dependencies":
            results,

        "simulated_dependency":
            target,

        "affected_components":
            affected,

        "downstream_reach":
            len(affected),

        "propagation_paths":
            paths,

        "total_propagation_paths":
            len(paths),

        "risk_score":
            risk_score,

        "risk_priority":
            risk_priority,

        "mitigation_ranking":
            mitigation_results,

        "recommended_intervention":
            top_mitigation["dependency"],

        "potential_exposure_reduction":
            top_mitigation[
                "exposure_reduction"
            ]
    }

    # --------------------------------
    # SAVE RESULT
    # --------------------------------

    save_analysis_result(
        analysis_result
    )


if __name__ == "__main__":

    file_path = None

    if len(sys.argv) > 1:

        file_path = sys.argv[1]

    main(file_path)