
import os
import sys

def parse_issue_body(issue_body):
    """
    Parses the issue body to extract the task description, target files, and branch name.
    """
    sections = {
        "Refactoring Task": "",
        "Target Files": "",
        "Custom Branch Name (Optional)": ""
    }

    current_section = None
    for line in issue_body.splitlines():
        if line.startswith("### "):
            section_name = line[4:].strip()
            if section_name in sections:
                current_section = section_name
            else:
                current_section = None
        elif current_section:
            sections[current_section] += line + "\n"

    task_description = sections["Refactoring Task"].strip()

    target_files_raw = sections["Target Files"].strip()
    target_files = [line.strip().replace("- ", "").replace("`", "") for line in target_files_raw.splitlines() if line.strip()]

    branch_name_raw = sections["Custom Branch Name (Optional)"].strip()
    branch_name = ""
    if branch_name_raw:
        branch_name_line = [line for line in branch_name_raw.splitlines() if line.strip()]
        if branch_name_line:
            branch_name = branch_name_line[0].replace("`", "").replace("branch-name:", "").strip()

    return task_description, ",".join(target_files), branch_name

def main():
    """
    Main function to read issue body from a file and output parsed data.
    """
    if len(sys.argv) != 2:
        print("Usage: python parse_issue.py <path_to_issue_body_file>")
        sys.exit(1)

    issue_body_file = sys.argv[1]
    if not os.path.exists(issue_body_file):
        print(f"Error: File not found at {issue_body_file}")
        sys.exit(1)

    with open(issue_body_file, "r") as f:
        issue_body = f.read()

    task_description, target_files, branch_name = parse_issue_body(issue_body)

    # Using a unique delimiter to avoid issues with multi-line outputs
    delimiter = "EOF_MARKER_JULES"
    print(f"task_description<<{delimiter}")
    print(task_description)
    print(delimiter)

    print(f"target_files={target_files}")
    print(f"branch_name={branch_name}")


if __name__ == "__main__":
    main()
