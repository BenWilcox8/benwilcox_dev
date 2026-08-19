import csv
import requests
from bs4 import BeautifulSoup
import os
import re
import datetime
from tqdm import tqdm
import urllib.parse

# --- Configuration ---
FACULTY_CSV_FILE = "faculty.csv"
SEMESTER_MAPPING_FILE = "semester_mapping.csv"
ALL_OFFERINGS_OUTPUT_FILE = "0_all_offerings.csv"
ERRORS_OUTPUT_FILE = "errors.csv"

REQUEST_TIMEOUT_SECONDS = 30

# Current semester/year: offerings in this semester use "#current-teaching",
# all others use "#previous-teaching" in the faculty-page highlight link.
CURRENT_SEMESTER = "Fall"
CURRENT_YEAR = "2026"

# --- Output Headers ---
ALL_OFFERINGS_HEADERS = [
    "Offering ID", "Course Code", "Course Name", "Year", "Broad Semester",
    "Specific Semester", "Full Course Name", "Faculty ID", "Link To Highlight"
]
ERRORS_HEADERS = ["Timestamp", "Error Type", "Affected Item", "Message"]

# --- Global list for errors ---
errors_list = []

def log_error(error_type, affected_item, message):
    """Appends an error to the global errors_list."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    errors_list.append({
        "Timestamp": timestamp,
        "Error Type": error_type,
        "Affected Item": affected_item,
        "Message": str(message)
    })

def load_semester_mapping(filename=SEMESTER_MAPPING_FILE):
    """
    Loads semester mapping from a CSV file.
    Returns a dictionary mapping Specific Semester to (Broad Semester, Semester Order).
    Returns None if the file cannot be read.
    """
    if not os.path.exists(filename):
        log_error("File Not Found", filename, f"The semester mapping file '{filename}' was not found.")
        return None
    
    mapping = {}
    try:
        with open(filename, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            if not all(col in reader.fieldnames for col in ["Specific Semester", "Broad Semester", "Semester Order"]):
                log_error("File Format Error", filename, "Semester mapping CSV is missing required columns (Specific Semester, Broad Semester, Semester Order).")
                return None
            for row_num, row in enumerate(reader, 1):
                try:
                    specific = row["Specific Semester"].strip()
                    broad = row["Broad Semester"].strip()
                    order = int(row["Semester Order"])
                    if not specific: 
                        log_error("Data Warning", f"{filename} - Row {row_num}", f"Skipping row with empty 'Specific Semester'.")
                        continue
                    mapping[specific] = (broad, order)
                except ValueError:
                    log_error("Data Error", f"{filename} - Row {row_num}", f"Invalid 'Semester Order' (must be an integer) for '{row.get('Specific Semester', 'N/A')}'. Skipping this mapping entry.")
                except KeyError as e:
                    log_error("Data Error", f"{filename} - Row {row_num}", f"Missing expected column in row: {e}. Ensure all header names are correct. Skipping this mapping entry.")

        print(f"Successfully loaded {len(mapping)} entries from '{filename}'.")
        return mapping
    except Exception as e:
        log_error("File Read Error", filename, f"Could not read semester mapping file: {e}")
        return None

def extract_course_code(full_course_name_raw):
    """Extracts course code like 'MATH 340' from 'MATH 340.002' or 'CSCE 1030' from 'CSCE 1030 LAB.101'."""
    if not full_course_name_raw:
        return ""
    match = re.match(r'([A-Z]{2,6}\s\d{3,4})', full_course_name_raw.strip())
    if match:
        return match.group(1) 
    return ""

def extract_year_specific_semester(semester_string_raw):
    """Extracts Year and Specific Semester from a semester string."""
    year = ""
    specific_semester = semester_string_raw 

    if not semester_string_raw:
        return "", ""

    year_match = re.search(r'\b(\d{4})\b', semester_string_raw)
    if year_match:
        year = year_match.group(1)
        specific_semester = re.sub(r'\s*\b' + re.escape(year) + r'\b\s*', '', semester_string_raw, 1).strip()
    
    return year, specific_semester

def get_broad_semester(specific_semester, semester_string_raw, semester_map):
    """Determines Broad Semester using the mapping or fallback."""
    if semester_map and specific_semester in semester_map:
        return semester_map[specific_semester][0]
    elif specific_semester: 
        return specific_semester.split(' ')[0] 
    elif semester_string_raw: 
        return semester_string_raw.split(' ')[0]
    return ""

def generate_highlight_link(base_faculty_url, text_start, text_end, prefix_text=None, suffix_text=None, is_current_semester=False):
    """
    Generates a deep link with prefix and suffix to highlight a specific course offering.
    Uses #current-teaching for current-semester offerings and #previous-teaching for all others.
    """
    if not base_faculty_url or not text_start:
        return base_faculty_url

    # Strip any existing fragment (e.g., #current-teaching) from the base URL
    base_url_no_fragment = base_faculty_url.split('#')[0]

    # URL-encode all components
    encoded_start = urllib.parse.quote(text_start)
    encoded_end = urllib.parse.quote(text_end) if text_end else None
    
    # Build the fragment part by part
    fragment_parts = []
    
    # 1. Add Prefix
    if prefix_text:
        encoded_prefix = urllib.parse.quote(prefix_text)
        fragment_parts.append(f"{encoded_prefix}-")

    # 2. Add Start Text (Required)
    fragment_parts.append(encoded_start)

    # 3. Add End Text (Optional)
    if encoded_end:
        fragment_parts.append(encoded_end)
        
    # 4. Add Suffix
    if suffix_text:
        encoded_suffix = urllib.parse.quote(suffix_text)
        fragment_parts.append(f"-{encoded_suffix}")

    # Join all parts with commas
    highlight_text = ",".join(fragment_parts)
    
    # Choose the correct anchor based on whether this is a current-semester offering
    anchor = "current-teaching" if is_current_semester else "previous-teaching"
    
    return f"{base_url_no_fragment}#{anchor}:~:text={highlight_text}"


def generate_course_offerings_report():
    """
    Main function to scrape faculty pages, process data, and generate the all_offerings.csv report.
    """
    global errors_list
    errors_list = [] 
    all_offerings_data = []

    print("--- Starting UNT Course Offerings Generation ---")

    print(f"\nStage 1: Loading semester mapping from '{SEMESTER_MAPPING_FILE}'...")
    semester_map = load_semester_mapping()
    if semester_map is None:
        print(f"Warning: Could not load '{SEMESTER_MAPPING_FILE}'. 'Broad Semester' will use fallback logic.")
        semester_map = {} 

    print(f"\nStage 2: Reading faculty data from '{FACULTY_CSV_FILE}' and scraping courses...")
    if not os.path.exists(FACULTY_CSV_FILE):
        log_error("File Not Found", FACULTY_CSV_FILE, f"The input file '{FACULTY_CSV_FILE}' was not found.")
        print(f"Error: The input file '{FACULTY_CSV_FILE}' was not found in the current directory.")
        return

    faculty_data_list = []
    try:
        with open(FACULTY_CSV_FILE, mode='r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            if not all(col in reader.fieldnames for col in ["Faculty ID", "Website Link"]):
                log_error("Input File Error", FACULTY_CSV_FILE, "CSV is missing 'Faculty ID' or 'Website Link' column.")
                print(f"Error: '{FACULTY_CSV_FILE}' must contain 'Faculty ID' and 'Website Link' columns.")
                return
            faculty_data_list = list(reader)
    except Exception as e:
        log_error("File Read Error", FACULTY_CSV_FILE, f"Could not read faculty data: {e}")
        print(f"Error reading '{FACULTY_CSV_FILE}': {e}")
        return

    if not faculty_data_list:
        print(f"No faculty data found in '{FACULTY_CSV_FILE}'. Exiting.")
        return

    for faculty_row in tqdm(faculty_data_list, desc="Processing faculty profiles"):
        faculty_id = faculty_row.get("Faculty ID", "").strip()
        website_link = faculty_row.get("Website Link", "").strip()
        faculty_name = faculty_row.get("Faculty Name", f"Faculty ID {faculty_id}").strip()

        if not faculty_id:
            log_error("Data Warning", f"Row in {FACULTY_CSV_FILE} (Name: {faculty_name})", "Missing 'Faculty ID'. Skipping.")
            continue
        if not website_link:
            log_error("Data Warning", f"Faculty: {faculty_name} (ID: {faculty_id})", "Missing 'Website Link'. Skipping.")
            continue

        try:
            response = requests.get(website_link, timeout=REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            course_tables = soup.find_all('table', class_='profile-courses-table')
            if not course_tables:
                continue

            for table in course_tables:
                all_table_cells = table.find_all('td')
                # Get all rows to easily find previous/next siblings
                all_rows = table.find_all('tr')
                for i, table_row in enumerate(all_rows):
                    cells = table_row.find_all('td')
                    
                    if not cells or len(cells) < 3:
                        continue
                    
                    full_course_name_raw = cells[0].get_text(strip=True)
                    course_name_scraped = cells[1].get_text(strip=True)
                    semester_string_raw = cells[2].get_text(strip=True)

                    if not full_course_name_raw and not course_name_scraped and not semester_string_raw:
                        continue
                    if full_course_name_raw.lower() == "course code" or course_name_scraped.lower() == "course title":
                        continue

                    # --- New Prefix/Suffix Logic ---
                    prefix_text = None
                    suffix_text = None

                    # Get Prefix: text from the last cell of the previous row
                    if i > 0:
                        prev_row_cells = all_rows[i-1].find_all('td')
                        if prev_row_cells:
                            # Use text from the last cell of the previous row
                            prefix_text = prev_row_cells[-1].get_text(strip=True)

                    # Get Suffix: text from the very next cell in the table
                    try:
                        current_cell_index = all_table_cells.index(cells[2])
                        if current_cell_index + 1 < len(all_table_cells):
                            next_cell = all_table_cells[current_cell_index + 1]
                            suffix_text = next_cell.get_text(strip=True)
                    except ValueError:
                        # This can happen if a row has less than 3 cells but wasn't skipped.
                        # As a safeguard, we can log this or just pass.
                        log_error("Processing Warning", f"Faculty: {faculty_name} (ID: {faculty_id})", f"Could not find cell in all_table_cells for row '{full_course_name_raw}'.")
                    # --- End New Logic ---

                    course_code = extract_course_code(full_course_name_raw)
                    year, specific_semester = extract_year_specific_semester(semester_string_raw)
                    broad_semester = get_broad_semester(specific_semester, semester_string_raw, semester_map)
                    
                    # Determine if this offering is from the current semester
                    is_current = (broad_semester == CURRENT_SEMESTER and year == CURRENT_YEAR)
                    
                    # Call the updated function with prefix, suffix, and current-semester flag
                    link_highlight = generate_highlight_link(
                        website_link,
                        text_start=full_course_name_raw,
                        text_end=semester_string_raw,
                        prefix_text=prefix_text,
                        suffix_text=suffix_text,
                        is_current_semester=is_current
                    )

                    all_offerings_data.append({
                        "Full Course Name": full_course_name_raw,
                        "Course Code": course_code,
                        "Course Name": course_name_scraped,
                        "Year": year,
                        "Specific Semester": specific_semester,
                        "Broad Semester": broad_semester,
                        "Faculty ID": faculty_id,
                        "Link To Highlight": link_highlight
                    })

        except requests.exceptions.RequestException as e:
            log_error("Network Error", website_link, f"Could not fetch URL for {faculty_name} (ID: {faculty_id}): {e}")
        except Exception as e:
            log_error("Processing Error", f"Faculty: {faculty_name} (ID: {faculty_id}) at {website_link}", f"Unexpected error: {e}")

    print(f"Stage 2 finished. Processed {len(faculty_data_list)} faculty. Found {len(all_offerings_data)} course offerings.")

    print(f"\nStage 3: Sorting and generating '{ALL_OFFERINGS_OUTPUT_FILE}'...")
    if not all_offerings_data:
        print(f"No course offerings data to generate '{ALL_OFFERINGS_OUTPUT_FILE}'.")
    else:
        print("Sorting all offerings data...")
        all_offerings_data.sort(key=lambda row: (
            row.get('Course Code', ''), 
            row.get('Course Name', ''), 
            row.get('Specific Semester', '')
        ))
        
        try:
            with open(ALL_OFFERINGS_OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=ALL_OFFERINGS_HEADERS)
                writer.writeheader()

                for i, offering_dict in enumerate(tqdm(all_offerings_data, desc="Writing final CSV")):
                    offering_dict['Offering ID'] = i
                    writer.writerow(offering_dict)

            print(f"Successfully wrote {len(all_offerings_data)} course offerings to '{ALL_OFFERINGS_OUTPUT_FILE}'.")
        except Exception as e:
            log_error("File Write Error", ALL_OFFERINGS_OUTPUT_FILE, f"Could not write all_offerings.csv: {e}")
            print(f"Error writing '{ALL_OFFERINGS_OUTPUT_FILE}': {e}")

    if errors_list:
        print(f"\nStage 4: Writing {len(errors_list)} errors to '{ERRORS_OUTPUT_FILE}'...")
        try:
            with open(ERRORS_OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=ERRORS_HEADERS)
                writer.writeheader()
                writer.writerows(errors_list)
            print(f"Successfully wrote errors to '{ERRORS_OUTPUT_FILE}'.")
        except Exception as e:
            print(f"Critical Error: Could not write errors to '{ERRORS_OUTPUT_FILE}': {e}")
    else:
        print(f"\nNo errors reported during the process. '{ERRORS_OUTPUT_FILE}' not created.")
    
    print("\n--- UNT Course Offerings Generation Complete ---")

if __name__ == "__main__":
    if not os.path.exists(FACULTY_CSV_FILE):
        print(f"'{FACULTY_CSV_FILE}' not found. Creating a dummy version for demonstration.")
        # Dummy data generation logic...
    
    if not os.path.exists(SEMESTER_MAPPING_FILE):
        print(f"'{SEMESTER_MAPPING_FILE}' not found. Creating a dummy version for demonstration.")
        # Dummy data generation logic...
        
    generate_course_offerings_report()