import pandas as pd
import re

def parse_jules_sessions(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    # Find the header line
    header_line_idx = -1
    for i, line in enumerate(lines):
        if 'Session Name' in line and 'State' in line and 'Title' in line and 'PR Link' in line:
            header_line_idx = i
            break

    if header_line_idx == -1:
        print("Could not find header line in the file.")
        return pd.DataFrame()

    data = []
    # Start parsing data from the line after the separator
    for line in lines[header_line_idx + 2:]:
        if not line.strip() or '---' in line: # Skip empty lines and separators
            continue
        
        # Use regex to split the line by multiple spaces
        parts = re.split(r'\s{2,}', line.strip())
        if len(parts) == 5:
            data.append(parts)
        elif len(parts) == 4:
            # Handle case where PR Link is empty
            data.append(parts + [''])

    df = pd.DataFrame(data, columns=['ID', 'Session Name', 'State', 'Title', 'PR Link'])
    return df

if __name__ == "__main__":
    df = parse_jules_sessions('jules_sessions_summary.md')
    
    print(df.to_csv(index=False))