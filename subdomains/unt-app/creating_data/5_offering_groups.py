import csv
import re
from tqdm import tqdm
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Callable
from collections import defaultdict

# ======================================================================================
#                            METHOD DESCRIPTIONS
# ======================================================================================
# This script matches course offerings from '0_merged_offerings.csv' to the grouped
# catalog entries in 'all_catalog_2.csv'.
#
# Its primary output is 'all_offerings_2.csv', which is a copy of the input
# offerings file with two new columns:
#   - "Catalog ID": The ID of the catalog course it was matched to.
#   - "Match Number": The method number that successfully made the match.
#
# --- PRIORITIZED YEAR MATCHING ---
# ALL methods (except filters) now prioritize matches that align with the offering's
# academic year. A catalog year "2024-2025" matches offerings from
# Fall 2024, Spring 2025, and Summer 2025. If no year-aligned match is found,
# the method falls back to the first available non-year-aligned match.
#
# --- Matching Methods ---
# METHOD 1: Exact Course Code AND Exact Course Name
# METHOD 2: Exact Course Code AND Normalized Course Name
# METHOD 3: Exact Course Code (This now incorporates the year logic prioritization)
# METHOD 4: Department, Normalized Name, & Grade Level
# METHOD 5: Filter "special problems", "dissertation", etc. (No year logic)
# METHOD 6: Normalized Name, Course Number (Year logic prioritized)
# METHOD 7: Normalized Name, Grade Level (Year logic prioritized)
# METHOD 8: Exact Course Code ONLY (Fallback)
# METHOD 9: Normalized Name AND Course Number (Fallback)
# METHOD 10: Normalized Name & Grade Level (Fallback)
# METHOD 11: Normalized Course Name ONLY (Fallback)
# METHOD 12: Filter "experiment(al) course" (No year logic)
# METHOD 13: Filter pre-2012 courses (No year logic)
# METHOD 14: Filter courses with invalid Department Codes (No year logic)
# ======================================================================================


# --- Configuration ---
@dataclass
class Config:
    """Holds all configuration for the script."""
    offerings_input_file: str = "0_merged_offerings.csv" # all snapshots merged by step 2b
    catalog_input_file: str = "0_all_catalog2.csv"
    final_output_file: str = "all_offerings.csv"

    # --- Optional Intermediate File Generation ---
    output_intermediate_files: bool = False # Set to True to get detailed match files

    # --- Intermediate File Paths (used if output_intermediate_files is True) ---
    summary_output_file: str = "matched_courses_summary.csv"
    remaining_courses_file: str = "remaining.csv"
    matched_method_files: Dict[str, str] = field(default_factory=lambda: {
        "1": "matched_1.csv", "2": "matched_2.csv", "3": "matched_3.csv", "4": "matched_4.csv",
        "5": "matched_5.csv", "6": "matched_6.csv", "7": "matched_7.csv", "8": "matched_8.csv",
        "9": "matched_9.csv", "10": "matched_10.csv", "11": "matched_11.csv", "12": "matched_12.csv",
        "13": "matched_13.csv", "14": "matched_14.csv"
    })

    # --- Column Headers ---
    OFR_ID = "Offering ID"
    OFR_CRS_CODE = "Course Code"
    OFR_CRS_NAME = "Course Name"
    OFR_CRS_YEAR = "Year"
    OFR_BROAD_SEMESTER = "Broad Semester"
    OFR_CRS_FULL_NAME = "Full Course Name"
    CAT_ID = "Catalog ID"
    CAT_CRS_CODE = "Course Code"
    CAT_CRS_NAME = "Course Name"
    CAT_CRS_YEAR = "Year"
    CAT_CRS_LINK = "Course Link"

# --- Utility Functions ---
def normalize_string_alphanumeric_lowercase(text: str) -> str:
    """Normalizes string: lowercase, alphanumeric only."""
    if not isinstance(text, str): return ""
    return "".join(char for char in text.lower() if char.isalnum())

def extract_department_code(course_code_str: str) -> str:
    """Extracts first standalone 3-4 capital letters."""
    if not isinstance(course_code_str, str): return ""
    match = re.search(r"\b([A-Z]{3,4})\b", course_code_str.strip())
    return match.group(1) if match else ""

def extract_grade_level(course_code_str: str) -> int:
    """Extracts first numeric digit. Int or -1."""
    if not isinstance(course_code_str, str): return -1
    match = re.search(r"(\d)", course_code_str.strip())
    return int(match.group(1)) if match else -1

def extract_course_number(course_code_str: str) -> str:
    """Extracts the first sequence of 3 or 4 contiguous digits."""
    if not isinstance(course_code_str, str): return ""
    match = re.search(r"(\d{3,4})", course_code_str.strip())
    return match.group(1) if match else ""

def get_grade_match_priority(target_gl: int) -> List[int]:
    """Generates grade level match priority."""
    if target_gl == -1: return []
    U_LEVELS, G_LEVELS, priority = [1, 2, 3, 4], [5, 6], []
    if target_gl in U_LEVELS:
        priority.extend([target_gl] + sorted([ul for ul in U_LEVELS if ul > target_gl]) + \
                         sorted([ul for ul in U_LEVELS if ul < target_gl], reverse=True) + sorted(G_LEVELS))
    elif target_gl in G_LEVELS:
        priority.extend([target_gl] + sorted([gl for gl in G_LEVELS if gl != target_gl]) + \
                         sorted(U_LEVELS, reverse=True))
    else:
        priority.extend([target_gl] + sorted(U_LEVELS, reverse=True) + sorted(G_LEVELS))
    return priority

def parse_offering_year(year_str) -> int:
    """Parses year from offerings file. Returns int or -1."""
    if isinstance(year_str, int): return year_str
    if not isinstance(year_str, str): return -1
    try: return int(year_str.strip())
    except (ValueError, TypeError): return -1

def extract_catalog_start_year(year_str_catalog: str) -> int:
    """Extracts the start year from catalog's 'YYYY-YYYY' format. Int or -1."""
    if not isinstance(year_str_catalog, str): return -1
    match = re.match(r"(\d{4})", year_str_catalog.strip())
    return int(match.group(1)) if match else -1

def load_csv_as_list_of_dicts(filepath: str) -> Tuple[Optional[List[Dict]], List[str]]:
    """Loads CSV to list of dicts, returns (data, fieldnames)."""
    try:
        with open(filepath, mode='r', encoding='utf-8', newline='') as infile:
            reader = csv.DictReader(infile)
            fieldnames = reader.fieldnames or []
            data = list(tqdm(reader, desc=f"Loading {filepath.split('/')[-1]}"))
        return data, fieldnames
    except FileNotFoundError:
        print(f"Error: File not found - {filepath}")
        return None, []
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None, []

def write_list_of_dicts_to_csv(filepath: str, data: List[Dict], fieldnames: List[str]):
    """Writes list of dicts to CSV."""
    if not data and not fieldnames: return True # Nothing to write
    
    try:
        with open(filepath, mode='w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(data)
        print(f"Successfully wrote {len(data)} rows to {filepath}")
        return True
    except Exception as e:
        print(f"Error writing to {filepath}: {e}")
        return False

# --- Core Matching Engine ---
_lookups = {}

def is_year_match(offering: Dict, catalog_row: Dict) -> bool:
    """Checks if the offering's academic year aligns with the catalog entry's year."""
    ofr_y = parse_offering_year(offering.get(Config.OFR_CRS_YEAR,""))
    ofr_s = offering.get(Config.OFR_BROAD_SEMESTER,"").strip().lower()
    cat_start_y = extract_catalog_start_year(catalog_row.get(Config.CAT_CRS_YEAR,""))

    if ofr_y == -1 or cat_start_y == -1:
        return False

    if ofr_s == "fall":
        return ofr_y == cat_start_y
    else: # Spring, Summer
        return ofr_y == (cat_start_y + 1)

def find_best_match_from_candidates(offering: Dict, candidates: List[Dict]) -> Optional[Dict]:
    """
    Finds the best match from a list of candidates.
    1. Prioritizes matches where the academic year aligns.
    2. Falls back to the first available candidate if no year-aligned match is found.
    """
    if not candidates:
        return None
    
    year_aligned_matches = [cand for cand in candidates if is_year_match(offering, cand)]
    
    if year_aligned_matches:
        return year_aligned_matches[0]
    
    # Fallback to the first non-year-aligned match
    return candidates[0]

def build_lookups(catalog_data: List[Dict]):
    """Builds all lookup tables for different matching methods."""
    print("Building lookup tables for matching...")
    # Initialize all lookups
    for i in range(1, 15):
        _lookups[f'm{i}'] = defaultdict(list)
    _lookups['m14_depts'] = set()

    for r in tqdm(catalog_data, desc="Building Lookups"):
        code = r.get(Config.CAT_CRS_CODE,"").strip()
        name = r.get(Config.CAT_CRS_NAME,"").strip()
        norm_name = normalize_string_alphanumeric_lowercase(name)
        dept = extract_department_code(code)
        gl = extract_grade_level(code)
        course_num = extract_course_number(code)
        
        # Build lookups for each method
        if code and name: _lookups['m1'][(code, name)].append(r)
        if code and norm_name: _lookups['m2'][(code, norm_name)].append(r)
        if code: _lookups['m3'][code].append(r)
        if dept and norm_name: _lookups['m4'][(dept, norm_name)].append(r)
        if norm_name and course_num: _lookups['m6'][(norm_name, course_num)].append(r)
        if norm_name: _lookups['m7'][norm_name].append(r)
        if code: _lookups['m8'][code].append(r)
        if norm_name and course_num: _lookups['m9'][(norm_name, course_num)].append(r)
        if norm_name: _lookups['m10'][norm_name].append(r)
        if norm_name: _lookups['m11'][norm_name].append(r)
        if dept: _lookups['m14_depts'].add(dept)
    print("Lookups built.")

# --- Matcher Functions ---
def matcher_m1(offering: Dict) -> Optional[Dict]:
    candidates = _lookups['m1'].get((offering.get(Config.OFR_CRS_CODE,"").strip(), offering.get(Config.OFR_CRS_NAME,"").strip()), [])
    return find_best_match_from_candidates(offering, candidates)

def matcher_m2(offering: Dict) -> Optional[Dict]:
    candidates = _lookups['m2'].get((offering.get(Config.OFR_CRS_CODE,"").strip(), normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME,""))), [])
    return find_best_match_from_candidates(offering, candidates)

def matcher_m3(offering: Dict) -> Optional[Dict]:
    candidates = _lookups['m3'].get(offering.get(Config.OFR_CRS_CODE,"").strip(), [])
    return find_best_match_from_candidates(offering, candidates)

def grade_priority_matcher(candidates: List[Dict], offering_gl: int) -> List[Dict]:
    """Sorts a list of candidates based on grade level priority."""
    if not candidates or offering_gl == -1: return candidates
    
    priority_order = get_grade_match_priority(offering_gl)
    sorted_candidates = sorted(candidates, key=lambda c: priority_order.index(extract_grade_level(c.get(Config.CAT_CRS_CODE,""))) if extract_grade_level(c.get(Config.CAT_CRS_CODE,"")) in priority_order else 99)
    return sorted_candidates

def matcher_m4(offering: Dict) -> Optional[Dict]:
    ofr_gl = extract_grade_level(offering.get(Config.OFR_CRS_CODE,""))
    key = (extract_department_code(offering.get(Config.OFR_CRS_CODE,"")), normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME,"")))
    
    candidates = _lookups['m4'].get(key if all(key) else None, [])
    sorted_candidates = grade_priority_matcher(candidates, ofr_gl)
    return find_best_match_from_candidates(offering, sorted_candidates)
    
def matcher_m5(offering: Dict) -> Optional[Dict]:
    phrases = ["special problems", "research problems in lieu of thesis", "honors college mentored research experience", "problem in lieu of thesis", "doctoral dissertation"]
    name = offering.get(Config.OFR_CRS_NAME,"").lower()
    full_name = offering.get(Config.OFR_CRS_FULL_NAME,"").lower()
    if any(p in name for p in phrases) or any(p in full_name for p in phrases):
        return {"FILTER_MATCH": True}
    return None

def matcher_m6(offering: Dict) -> Optional[Dict]:
    key = (normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME, "")), extract_course_number(offering.get(Config.OFR_CRS_CODE, "")))
    candidates = _lookups['m6'].get(key if all(key) else None, [])
    return find_best_match_from_candidates(offering, candidates)

def matcher_m7(offering: Dict) -> Optional[Dict]:
    ofr_gl = extract_grade_level(offering.get(Config.OFR_CRS_CODE,""))
    key = normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME,""))
    candidates = _lookups['m7'].get(key, [])
    sorted_candidates = grade_priority_matcher(candidates, ofr_gl)
    return find_best_match_from_candidates(offering, sorted_candidates)

def matcher_m8(offering: Dict) -> Optional[Dict]:
    candidates = _lookups['m8'].get(offering.get(Config.OFR_CRS_CODE,"").strip(), [])
    return find_best_match_from_candidates(offering, [candidates] if isinstance(candidates, dict) else candidates)

def matcher_m9(offering: Dict) -> Optional[Dict]:
    key = (normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME,"")), extract_course_number(offering.get(Config.OFR_CRS_CODE,"")))
    candidates = _lookups['m9'].get(key, [])
    return find_best_match_from_candidates(offering, [candidates] if isinstance(candidates, dict) else candidates)

def matcher_m10(offering: Dict) -> Optional[Dict]:
    ofr_gl = extract_grade_level(offering.get(Config.OFR_CRS_CODE,""))
    key = normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME,""))
    candidates = _lookups['m10'].get(key, [])
    sorted_candidates = grade_priority_matcher(candidates, ofr_gl)
    return find_best_match_from_candidates(offering, sorted_candidates)

def matcher_m11(offering: Dict) -> Optional[Dict]:
    candidates = _lookups['m11'].get(normalize_string_alphanumeric_lowercase(offering.get(Config.OFR_CRS_NAME, "")), [])
    return find_best_match_from_candidates(offering, [candidates] if isinstance(candidates, dict) else candidates)

def matcher_m12(offering: Dict) -> Optional[Dict]:
    phrases = ["experiment course", "experimental course"]
    name = offering.get(Config.OFR_CRS_NAME,"").lower()
    full_name = offering.get(Config.OFR_CRS_FULL_NAME,"").lower()
    if name in phrases or full_name in phrases: return {"FILTER_MATCH": True}
    return None

def matcher_m13(offering: Dict) -> Optional[Dict]:
    yr = parse_offering_year(offering.get(Config.OFR_CRS_YEAR,""))
    sem = offering.get(Config.OFR_BROAD_SEMESTER,"").strip().lower()
    if yr != -1 and yr < 2012 and not (yr == 2011 and sem == "fall"):
        return {"FILTER_MATCH": True}
    return None

def matcher_m14(offering: Dict) -> Optional[Dict]:
    dept = extract_department_code(offering.get(Config.OFR_CRS_CODE,""))
    if dept and dept not in _lookups['m14_depts']:
        return {"FILTER_MATCH": True}
    return None

# --- Main Orchestration ---
def main():
    """Main execution function."""
    print("Starting sequential offering matching process...")
    config = Config()
    
    offerings, offerings_hdrs = load_csv_as_list_of_dicts(config.offerings_input_file)
    catalog, _ = load_csv_as_list_of_dicts(config.catalog_input_file)

    if offerings is None or catalog is None:
        print("Failed to load required files. Exiting.")
        return

    build_lookups(catalog)

    match_results = {}
    current_offerings = list(enumerate(offerings))

    method_configs = [
        ("1", matcher_m1), ("2", matcher_m2), ("3", matcher_m3), ("4", matcher_m4),
        ("5", matcher_m5), ("6", matcher_m6), ("7", matcher_m7), ("8", matcher_m8),
        ("9", matcher_m9), ("10", matcher_m10), ("11", matcher_m11), ("12", matcher_m12),
        ("13", matcher_m13), ("14", matcher_m14)
    ]

    all_summaries = []

    for num, matcher_func in method_configs:
        print(f"\n--- Applying Method {num} ---")
        unmatched_next = []
        matched_this_method = []
        
        for idx, offering in tqdm(current_offerings, desc=f"Method {num}"):
            match_res = matcher_func(offering)
            if match_res:
                is_filter = match_res.get("FILTER_MATCH", False)
                catalog_id = "" if is_filter else match_res.get(Config.CAT_ID)
                match_results[idx] = {'catalog_id': catalog_id, 'match_method': str(num)}
                matched_this_method.append(offering)
                
                if config.output_intermediate_files:
                    summary_entry = {"Original Course Code": offering.get(Config.OFR_CRS_CODE), "Original Course Name": offering.get(Config.OFR_CRS_NAME), "Original Year": offering.get(Config.OFR_CRS_YEAR), "Matched By Method Number": str(num), "Matched Catalog ID": catalog_id, "Matched Catalog Code": "" if is_filter else match_res.get(Config.CAT_CRS_CODE), "Matched Catalog Course Name": "" if is_filter else match_res.get(Config.CAT_CRS_NAME), "Matched Catalog Link": "N/A" if is_filter else match_res.get(Config.CAT_CRS_LINK)}
                    all_summaries.append(summary_entry)
            else:
                unmatched_next.append((idx, offering))
        
        print(f"Method {num}: Matched/Filtered: {len(matched_this_method)}. Remaining: {len(unmatched_next)}.")
        if config.output_intermediate_files:
            out_file = config.matched_method_files.get(str(num))
            if out_file: write_list_of_dicts_to_csv(out_file, matched_this_method, offerings_hdrs)
        
        current_offerings = unmatched_next

    # --- Final File Generation ---
    final_output_data = []
    for idx, offering in enumerate(offerings):
        new_row = offering.copy()
        result = match_results.get(idx)
        new_row[Config.CAT_ID] = result['catalog_id'] if result else ""
        new_row["Match Number"] = result['match_method'] if result else ""
        final_output_data.append(new_row)
        
    final_headers = list(offerings_hdrs)
    try:
        insert_pos = final_headers.index(Config.OFR_ID) + 1
        final_headers.insert(insert_pos, Config.CAT_ID)
        final_headers.insert(insert_pos + 1, "Match Number")
    except ValueError:
        final_headers = [Config.OFR_ID, Config.CAT_ID, "Match Number"] + [h for h in final_headers if h != Config.OFR_ID]

    write_list_of_dicts_to_csv(config.final_output_file, final_output_data, final_headers)
    
    if config.output_intermediate_files:
        write_list_of_dicts_to_csv(config.summary_output_file, all_summaries, list(all_summaries[0].keys()) if all_summaries else [])
        remaining_data = [offering for _, offering in current_offerings]
        write_list_of_dicts_to_csv(config.remaining_courses_file, remaining_data, offerings_hdrs)

    print(f"\nSequential matching process finished.\nTotal offerings originally: {len(offerings)}")
    print(f"Total matched/filtered: {len(match_results)}")
    print(f"Total remaining unmatched: {len(current_offerings)}")

if __name__ == "__main__":
    main()
