import csv
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Callable, Set
from tqdm import tqdm

# ======================================================================================
#                            COURSE GROUPING METHODS
# ======================================================================================
#
# This script groups courses by applying a series of methods in a specific order.
# The primary output is all_catalog_2.csv, which is a new version of the input
# file with a "Group ID" and "Match Number" column added for each course.
#
# --- Stage 1: Initial Grouping (Applied to all ungrouped courses) ---
#
#   Method 1: Exact Code & Exact Name
#   - Logic: Groups courses with the *exact* same "Course Code" and "Course Name".
#
#   Method 2: Exact Code & Normalized Name
#   - Logic: Groups courses with the *exact* same "Course Code" but whose names
#     match after being "normalized" (lowercase, alphanumeric only).
#
# --- Stage 2: Iterative Merging (Applied to existing groups) ---
#
#   !!! UNIVERSAL MERGE RULE: For Methods 3-7, two groups will ONLY be
#       merged if there is ZERO year overlap between them.
#
#   Method 3: Sequential Roman Numerals (e.g., "Connections I" -> "Connections II")
#   - Logic: A targeted method that merges sequential courses like "Connections".
#
#   Method 4: Changed Course Codes (Same Attributes)
#   - Logic: Merges groups with the same Dept Code, Normalized Name, & Grade Level.
#
#   Method 5: Successive Broadening (Same SEMANTIC Name)
#   - Logic: For groups with the same Dept and base name, merges them based on
#     progressively looser course number similarities.
#
#   Method 6: Changed Course Names (Same Code)
#   - Logic: Merges groups with the same Dept Code and Course Code.
#
#   Method 7: Cross-Department Merge
#   - Logic: Merges groups with the same Course Name and Number, but different Dept.
#
# --- Stage 3: Finalization ---
#
#   Method 8: Final Conflict Resolution
#   - Logic: Scans all final groups. If a group contains multiple courses from
#     the same year, it KEEPS ONE and removes the others.
#
# ======================================================================================


# --- Configuration ---
@dataclass
class Config:
    """Holds all configuration for file paths and column names."""
    input_file: str = "0_all_catalog1.csv"
    final_output_file: str = "0_all_catalog2.csv"
    conflicts_output_file: str = "conflicts.csv"
    overlap_output_file: str = "overlap.csv"
    old_groups_output_file: str = "old_groups.csv"
    
    # --- Optional Intermediate File Generation ---
    output_intermediate_files: bool = False # Set to True to get detailed match files
    intermediate_groups_output_file: str = "all_groups.csv" # Used if above is True

    # Method-specific output files (used if output_intermediate_files is True)
    matched_method_files: Dict[str, str] = field(default_factory=lambda: {
        "1": "matched_1.csv", "2": "matched_2.csv", "3": "matched_3.csv", "4": "matched_4.csv",
        "5": "matched_5.csv", "6": "matched_6.csv", "7": "matched_7.csv",
        "8": "matched_8.csv", # Log for courses removed by conflict resolution
    })

    # CSV Column Names
    CATALOG_ID_COL: str = "Catalog ID"
    CODE_COL: str = "Course Code"
    NAME_COL: str = "Course Name"
    YEAR_COL: str = "Year"
    LINK_COL: str = "Course Link"

# --- Data Class for a Course ---
@dataclass
class Course:
    """Represents a single course entry, enriched with parsed data."""
    data: Dict[str, Any]
    original_index: int

    # Enriched data, initialized post-load
    parsed_year: int = -1
    dept_code: str = ""
    course_number: str = ""
    grade_level: int = -1
    
    # Semantic name components
    base_name: str = ""
    roman_numeral: str = ""
    subtitle: str = ""

    # Grouping results
    group_id: int = -1
    match_method: str = ""

    def __post_init__(self):
        """Extract additional fields after the object is created."""
        self.parsed_year = self._extract_year()
        self.dept_code = self._extract_dept_code()
        self.course_number, self.grade_level = self._extract_course_number_and_level()
        self.base_name, self.roman_numeral, self.subtitle = self._parse_semantic_name()

    def _extract_year(self) -> int:
        """Extracts the first year from a string like '2024-2025'."""
        year_str = self.data.get(Config.YEAR_COL, "")
        if not isinstance(year_str, str): return -1
        match = re.match(r"(\d{4})", year_str.strip())
        return int(match.group(1)) if match else -1

    def _extract_dept_code(self) -> str:
        """Extracts the department code (e.g., 'ENGL') from the course code."""
        code_str = self.data.get(Config.CODE_COL, "")
        if not isinstance(code_str, str): return ""
        match = re.search(r"\b([A-Z]{3,4})\b", code_str.strip())
        return match.group(1) if match else ""
    
    def _extract_course_number_and_level(self) -> Tuple[str, int]:
        """Extracts the 3-4 digit course number and its first digit (grade level)."""
        code_str = self.data.get(Config.CODE_COL, "")
        if not isinstance(code_str, str): return "", -1
        match = re.search(r'\b(\d{3,4})\b', code_str)
        if not match:
            return "", -1
        
        course_num = match.group(1)
        try:
            grade_lvl = int(course_num[0])
            return course_num, grade_lvl
        except (ValueError, IndexError):
            return course_num, -1

    def _parse_semantic_name(self) -> Tuple[str, str, str]:
        """Parses a course name into its base, Roman numeral, and subtitle."""
        name = self.name
        subtitle = ""
        
        if ':' in name:
            parts = name.split(':', 1)
            name, subtitle = parts[0].strip(), parts[1].strip()
        
        roman_match = re.search(r'\s+(X|IX|VIII|VII|VI|V|IV|III|II|I)$', name)
        if roman_match:
            numeral = roman_match.group(1)
            base = name[:roman_match.start()].strip()
            return base, numeral, subtitle
        
        return name, "", subtitle

    @property
    def code(self) -> str:
        return self.data.get(Config.CODE_COL, "").strip()

    @property
    def name(self) -> str:
        return self.data.get(Config.NAME_COL, "").strip()

    @property
    def normalized_name(self) -> str:
        """Returns the course name as lowercase and alphanumeric only."""
        return "".join(char for char in self.name.lower() if char.isalnum())

    @property
    def normalized_base_name(self) -> str:
        """Returns the base name as lowercase and alphanumeric only."""
        return "".join(char for char in self.base_name.lower() if char.isalnum())


# --- Utility Class for Group Operations & I/O ---
class CourseManager:
    """Handles CSV I/O and group-level operations like finding earliest/latest courses."""
    def __init__(self, original_headers: List[str]):
        internal_fields = ['parsed_year', 'original_index', 'dept_code', 'course_number', 'grade_level', 'base_name', 'roman_numeral', 'subtitle', 'group_id', 'match_method']
        self.original_headers = [h for h in original_headers if h not in internal_fields]
        self.intermediate_headers = ["Group ID", "Match Number"] + ["Representative Course Code", "Representative Course Name"] + self.original_headers
        self.conflict_headers = [
            "Conflict_Method_Number", "Conflicting_Year",
            "Course1_Code", "Course1_Name", "Course1_Link",
            "Course2_Code", "Course2_Name", "Course2_Link"
        ]

    def write_csv(self, filepath: str, data: List[Dict], fieldnames: List[str]):
        """General purpose CSV writer for flat lists of data."""
        try:
            with open(filepath, mode='w', encoding='utf-8', newline='') as outfile:
                if not data and not fieldnames: return
                if not fieldnames and data: fieldnames = list(data[0].keys())

                writer = csv.DictWriter(outfile, fieldnames=fieldnames, extrasaction='ignore')
                writer.writeheader()
                writer.writerows(data)
            print(f"Successfully wrote {len(data)} rows to {filepath}")
        except Exception as e:
            print(f"Error writing to {filepath}: {e}")

    def write_groups_to_csv(self, filepath: str, groups: List[List[Dict]], fieldnames: List[str]):
        """Writes groups to a CSV, separated by an empty row."""
        try:
            with open(filepath, mode='w', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=fieldnames, extrasaction='ignore')
                writer.writeheader()
                for i, group in enumerate(tqdm(groups, desc=f"Writing {filepath}", leave=False)):
                    writer.writerows(group)
                    if i < len(groups) - 1:
                        writer.writerow({field: "" for field in fieldnames})
            print(f"Successfully wrote {len(groups)} groups to {filepath}")
        except Exception as e:
            print(f"Error writing groups to {filepath}: {e}")
    
    def format_groups_for_intermediate_log(self, groups: List[List[Course]]) -> List[List[Dict]]:
        """Formats groups for intermediate log files, including new ID columns."""
        output = []
        for group in groups:
            representative = self.get_most_recent_course(group)
            if not representative: continue
            
            formatted_group = []
            for member in sorted(group, key=lambda c: c.parsed_year, reverse=True):
                row = {
                    "Group ID": member.group_id,
                    "Match Number": member.match_method,
                    "Representative Course Code": representative.code,
                    "Representative Course Name": representative.name
                }
                row.update(member.data)
                formatted_group.append(row)
            output.append(formatted_group)
        return output

    @staticmethod
    def get_most_recent_course(group: List[Course]) -> Optional[Course]:
        """Returns the course with the highest year in a group."""
        if not group: return None
        return max(group, key=lambda c: c.parsed_year)

    @staticmethod
    def get_earliest_course(group: List[Course]) -> Optional[Course]:
        """Returns the course with the lowest year in a group."""
        if not group: return None
        return min(group, key=lambda c: c.parsed_year)


# --- Main Application Class ---
class Grouper:
    """Orchestrates the entire course loading, grouping, and writing process."""
    def __init__(self, config: Config):
        self.config = config
        self.all_courses: List[Course] = []
        self.original_fieldnames: List[str] = []
        self.manager: Optional[CourseManager] = None

    def load_courses(self):
        """Loads courses from the input CSV and initializes the manager."""
        print(f"Loading and preprocessing {self.config.input_file}...")
        try:
            with open(self.config.input_file, mode='r', encoding='utf-8') as f:
                total_lines = sum(1 for line in f) - 1 

            with open(self.config.input_file, mode='r', encoding='utf-8', newline='') as infile:
                reader = csv.DictReader(infile)
                self.original_fieldnames = reader.fieldnames or []
                if not self.original_fieldnames:
                    print(f"Error: No headers found in {self.config.input_file}.")
                    return
                
                for i, row in enumerate(tqdm(reader, total=total_lines, desc="Loading courses")):
                    self.all_courses.append(Course(data=row, original_index=i))

            self.manager = CourseManager(self.original_fieldnames)
            print(f"Loaded {len(self.all_courses)} course entries.")
        except FileNotFoundError:
            print(f"Error: File not found - {self.config.input_file}")
            sys.exit(1)
        except Exception as e:
            print(f"An error occurred: {e}")
            sys.exit(1)

    def find_and_write_overlaps(self):
        """Finds and logs courses with the exact same code and year (pre-analysis)."""
        if not self.all_courses or not self.manager: return
        print("\n--- Finding Year/Code Overlaps ---")
        key_to_courses = defaultdict(list)
        for course in self.all_courses:
            if course.parsed_year != -1 and course.code:
                key_to_courses[(course.code, course.parsed_year)].append(course)

        overlap_rows = [c.data for courses in key_to_courses.values() if len(courses) > 1 for c in courses]
        # self.manager.write_csv(self.config.overlap_output_file, overlap_rows, self.manager.original_headers)

    def run_pipeline(self):
        """Executes the full grouping and merging pipeline."""
        if not self.all_courses or not self.manager:
            print("Cannot run pipeline, courses not loaded.")
            return

        self.find_and_write_overlaps()

        groups, matched_groups_by_method = self._perform_initial_grouping()
        groups = self._perform_merging(groups, matched_groups_by_method)
        final_groups, conflicts, removed_courses = self._perform_finalization_method_8(groups, matched_groups_by_method)
        
        # Assign final Group IDs after all processing is complete
        self.assign_group_ids(final_groups)

        # --- Final Output Generation ---
        if self.config.output_intermediate_files:
            self.write_intermediate_files(final_groups, matched_groups_by_method, conflicts, removed_courses)
        
        self.write_final_catalog(final_groups, removed_courses)
        # self.write_old_groups_catalog(final_groups)

        self._print_summary(len(final_groups), len(conflicts), sum(len(g) for g in final_groups))

    def _perform_initial_grouping(self) -> Tuple[List[List[Course]], Dict[str, List[List[Course]]]]:
        """Runs initial grouping methods."""
        assigned_indices = set()
        groups: List[List[Course]] = []
        matched_groups: Dict[str, List[List[Course]]] = defaultdict(list)

        initial_methods: List[Tuple[str, Callable[[Course], Optional[Tuple]]]] = [
            ("1", lambda c: (c.code, c.name)),
            ("2", lambda c: (c.code, c.normalized_name))
        ]

        for method_num, key_func in initial_methods:
            print(f"\n--- Applying Initial Grouping Method {method_num} ---")
            key_to_candidates = defaultdict(list)
            
            for course in tqdm(self.all_courses, desc=f"Scanning for Method {method_num}"):
                if course.original_index not in assigned_indices:
                    key = key_func(course)
                    if key and all(key):
                        key_to_candidates[key].append(course)

            print(f"Method {method_num}: Found {len(key_to_candidates)} potential groups.")
            for candidates in key_to_candidates.values():
                new_group = [c for c in candidates if c.original_index not in assigned_indices]
                if new_group:
                    groups.append(new_group)
                    matched_groups[method_num].append(new_group)
                    for course in new_group:
                        course.match_method = method_num
                        assigned_indices.add(course.original_index)
        
        return groups, matched_groups

    def _perform_merging(self, groups: List[List[Course]], matched_groups_by_method: Dict) -> List[List[Course]]:
        """Runs all iterative merging methods in sequence."""
        if not self.manager: return groups
        
        def check_overlap(y1: Set[int], y2: Set[int]) -> bool:
            return not y1.intersection(y2)

        # --- Method 3: Sequential Roman Numerals ---
        groups, merged_log_3 = self._merge_sequential_courses(groups)
        if merged_log_3: matched_groups_by_method["3"] = merged_log_3
        
        # --- Method 4 (was 3) ---
        groups, merged_log_4 = self._merge_within_buckets(
            groups, "4",
            bucket_key_generator=lambda g: (self.manager.get_most_recent_course(g).dept_code, self.manager.get_most_recent_course(g).normalized_name, self.manager.get_most_recent_course(g).grade_level),
            can_merge=lambda r_a, e_b, y1, y2: check_overlap(y1, y2)
        )
        if merged_log_4: matched_groups_by_method["4"] = merged_log_4
        
        # --- Method 5 (was 4) ---
        print("\n--- Applying Successive Merging Method 5 ---")
        can_merge_5a = lambda r_a, e_b, y1, y2: r_a.roman_numeral == e_b.roman_numeral and r_a.course_number and r_a.course_number == e_b.course_number and check_overlap(y1, y2)
        can_merge_5b = lambda r_a, e_b, y1, y2: r_a.roman_numeral == e_b.roman_numeral and len(r_a.course_number) >= 4 and len(e_b.course_number) >= 4 and r_a.course_number[:3] == e_b.course_number[:3] and r_a.course_number[3] != e_b.course_number[3] and check_overlap(y1, y2)
        can_merge_5c = lambda r_a, e_b, y1, y2: r_a.roman_numeral == e_b.roman_numeral and len(r_a.course_number) >= 3 and len(e_b.course_number) >= 3 and r_a.course_number[:2] == e_b.course_number[:2] and r_a.course_number[2:] != e_b.course_number[2:] and check_overlap(y1, y2)
        can_merge_5d = lambda r_a, e_b, y1, y2: r_a.roman_numeral == e_b.roman_numeral and r_a.grade_level != -1 and r_a.grade_level == e_b.grade_level and r_a.course_number != e_b.course_number and check_overlap(y1, y2)
        can_merge_5e = lambda r_a, e_b, y1, y2: r_a.roman_numeral != e_b.roman_numeral and check_overlap(y1, y2)
        
        method_5_steps = [("5a", can_merge_5a), ("5b", can_merge_5b), ("5c", can_merge_5c), ("5d", can_merge_5d), ("5e", can_merge_5e)]
        
        for name, criterion in method_5_steps:
             groups, merged_this_step = self._merge_within_buckets(
                groups, name,
                bucket_key_generator=lambda g: (self.manager.get_most_recent_course(g).dept_code, self.manager.get_most_recent_course(g).normalized_base_name),
                can_merge=criterion
            )
             if merged_this_step: matched_groups_by_method[name] = merged_this_step

        # --- Method 6 (was 5) ---
        groups, merged_log_6 = self._merge_within_buckets(
            groups, "6",
            bucket_key_generator=lambda g: (self.manager.get_most_recent_course(g).code),
            can_merge=lambda r_a, e_b, y1, y2: check_overlap(y1, y2)
        )
        if merged_log_6: matched_groups_by_method["6"] = merged_log_6

        # --- Method 7 (was 6) ---
        groups, merged_log_7 = self._merge_within_buckets(
            groups, "7",
            bucket_key_generator=lambda g: (self.manager.get_most_recent_course(g).normalized_name, self.manager.get_most_recent_course(g).course_number),
            can_merge=lambda r_a, e_b, y1, y2: r_a.dept_code != e_b.dept_code and check_overlap(y1, y2)
        )
        if merged_log_7: matched_groups_by_method["7"] = merged_log_7

        return groups

    def _merge_sequential_courses(self, groups: List[List[Course]]) -> Tuple[List[List[Course]], List[List[Course]]]:
        """New Method 3: Merges courses with sequential Roman numerals."""
        if not self.manager: return groups, []
        print("--- Running Merge Step 3 (Sequential Roman Numerals) ---")
        
        roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}
        
        key_to_groups = defaultdict(list)
        for group in groups:
            rep = self.manager.get_most_recent_course(group)
            if rep and rep.dept_code and rep.normalized_base_name:
                key = (rep.dept_code, rep.normalized_base_name)
                key_to_groups[key].append(group)
        
        final_groups = []
        all_merged_in_step = []

        for key, bucket in tqdm(key_to_groups.items(), desc="Merging Step 3", leave=False):
            if len(bucket) < 2:
                final_groups.extend(bucket)
                continue
            
            while True:
                merged_in_pass = False
                merged_indices = set()
                bucket.sort(key=lambda g: roman_map.get(self.manager.get_most_recent_course(g).roman_numeral, 99))

                for i in range(len(bucket)):
                    if i in merged_indices: continue
                    group_a = bucket[i]
                    rep_a = self.manager.get_most_recent_course(group_a)
                    if not rep_a or not rep_a.roman_numeral: continue

                    for j in range(i + 1, len(bucket)):
                        if j in merged_indices: continue
                        group_b = bucket[j]
                        rep_b = self.manager.get_most_recent_course(group_b)
                        if not rep_b or not rep_b.roman_numeral: continue

                        is_sequential_numeral = roman_map.get(rep_b.roman_numeral, -1) == roman_map.get(rep_a.roman_numeral, -2) + 1
                        is_sequential_year = rep_b.parsed_year - rep_a.parsed_year <= 1 and rep_b.parsed_year > rep_a.parsed_year

                        if is_sequential_numeral and is_sequential_year:
                            for course in group_a: course.match_method = "3"
                            for course in group_b: course.match_method = "3"
                            group_a.extend(group_b)
                            merged_indices.add(j)
                            all_merged_in_step.append(group_a)
                            merged_in_pass = True
                            break
                
                if merged_in_pass:
                    bucket = [group for idx, group in enumerate(bucket) if idx not in merged_indices]
                else:
                    break
            
            final_groups.extend(bucket)

        return final_groups, all_merged_in_step

    def _merge_within_buckets(self, groups: List[List[Course]], step_name: str, bucket_key_generator: Callable, can_merge: Callable) -> Tuple[List[List[Course]], List[List[Course]]]:
        """A generic merging engine that buckets groups by a key and merges them based on a rule."""
        if not self.manager: return groups, []
        print(f"--- Running Merge Step {step_name} ---")
        
        key_to_groups = defaultdict(list)
        for group in groups:
            rep = self.manager.get_most_recent_course(group)
            if rep:
                key = bucket_key_generator(group)
                if isinstance(key, tuple):
                    if all(str(k) != '' and k is not None and k != -1 for k in key):
                        key_to_groups[key].append(group)
                elif key:
                    key_to_groups[key].append(group)

        final_groups = []
        all_merged_in_step = []

        for key, bucket in tqdm(key_to_groups.items(), desc=f"Merging Step {step_name}", leave=False):
            if len(bucket) < 2:
                final_groups.extend(bucket)
                continue
            
            while True:
                merged_in_pass = False
                merged_indices = set()
                
                for i in range(len(bucket)):
                    if i in merged_indices: continue
                    group_a = bucket[i]
                    years_a = {c.parsed_year for c in group_a if c.parsed_year != -1}
                    rep_a = self.manager.get_most_recent_course(group_a)

                    for j in range(i + 1, len(bucket)):
                        if j in merged_indices: continue
                        group_b = bucket[j]
                        years_b = {c.parsed_year for c in group_b if c.parsed_year != -1}
                        rep_b = self.manager.get_earliest_course(group_b)
                        
                        if not rep_a or not rep_b: continue
                        
                        if can_merge(rep_a, rep_b, years_a, years_b):
                            for course in group_a: course.match_method = step_name
                            for course in group_b: course.match_method = step_name
                            group_a.extend(group_b)
                            years_a.update(years_b)
                            rep_a = self.manager.get_most_recent_course(group_a)
                            
                            merged_indices.add(j)
                            merged_in_pass = True
                            all_merged_in_step.append(group_a)
                
                if merged_in_pass:
                    bucket = [bucket[i] for i in range(len(bucket)) if i not in merged_indices]
                else:
                    break
            
            final_groups.extend(bucket)

        return final_groups, all_merged_in_step
    
    def _perform_finalization_method_8(self, groups: List[List[Course]], matched_groups_by_method: Dict) -> Tuple[List[List[Course]], List[Dict], List[Course]]:
        """Method 8: Scans groups for year conflicts, keeps one, removes others, and logs them."""
        if not self.manager: return [], [], []
        print("\n--- Applying Method 8: Final Conflict Resolution ---")
        
        final_groups = []
        conflict_log_rows = []
        removed_courses = []

        for group in tqdm(groups, desc="Resolving Conflicts"):
            courses_by_year = defaultdict(list)
            for course in group:
                if course.parsed_year != -1:
                    courses_by_year[course.parsed_year].append(course)

            valid_courses_in_group = []
            for year, courses_in_year in courses_by_year.items():
                if len(courses_in_year) > 1:
                    courses_in_year.sort(key=lambda c: c.original_index)
                    kept_course = courses_in_year[0]
                    courses_to_remove = courses_in_year[1:]
                    
                    valid_courses_in_group.append(kept_course)
                    # Keep removed courses in the group so they receive the
                    # correct Group ID from assign_group_ids.
                    valid_courses_in_group.extend(courses_to_remove)
                    removed_courses.extend(courses_to_remove)
                    
                    for removed_course in courses_to_remove:
                        removed_course.match_method = "8"
                        conflict_log_rows.append({
                            "Conflict_Method_Number": "8", "Conflicting_Year": year,
                            "Course1_Code": kept_course.code, "Course1_Name": kept_course.name, "Course1_Link": kept_course.data.get(self.config.LINK_COL),
                            "Course2_Code": removed_course.code, "Course2_Name": removed_course.name, "Course2_Link": removed_course.data.get(self.config.LINK_COL)
                        })
                else:
                    valid_courses_in_group.extend(courses_in_year)
            
            if valid_courses_in_group:
                valid_courses_in_group.sort(key=lambda c: c.parsed_year, reverse=True)
                final_groups.append(valid_courses_in_group)
        
        if removed_courses:
            matched_groups_by_method["8"] = [[c] for c in removed_courses]

        return final_groups, conflict_log_rows, removed_courses

    def assign_group_ids(self, final_groups: List[List[Course]]):
        """Sorts final groups and assigns a unique Group ID to each course."""
        if not self.manager: return
        print("Assigning final Group IDs...")
        final_groups.sort(key=lambda g: (self.manager.get_most_recent_course(g).code, self.manager.get_most_recent_course(g).name) if g else ("", ""))
        for i, group in enumerate(tqdm(final_groups, desc="Assigning IDs")):
            for course in group:
                course.group_id = i

    def write_intermediate_files(self, final_groups: List[List[Course]], matched_groups_by_method: Dict, conflicts: List[Dict], removed_courses: List[Course]):
        """Writes all intermediate matched_#.csv files and the classic all_groups.csv."""
        if not self.manager: return
        print("\n--- Writing Intermediate Log Files ---")
        
        # Write matched files for each method
        for method, groups in matched_groups_by_method.items():
            filepath = f"matched_{method}.csv"
            log_data = self.manager.format_groups_for_intermediate_log(groups)
            self.manager.write_groups_to_csv(filepath, log_data, self.manager.intermediate_headers)

        # Write the classic all_groups.csv with separators
        all_groups_data = self.manager.format_groups_for_intermediate_log(final_groups)
        self.manager.write_groups_to_csv(self.config.intermediate_groups_output_file, all_groups_data, self.manager.intermediate_headers)
        
    def write_final_catalog(self, final_groups: List[List[Course]], removed_courses: List[Course]):
        """Writes the primary output file (e.g., all_catalog_2.csv)."""
        if not self.manager: return
        print(f"\n--- Writing Final Output File: {self.config.final_output_file} ---")
        
        # Combine all courses that will be in the final file
        # (removed_courses are already inside their groups with correct Group IDs)
        all_output_courses = [c for g in final_groups for c in g]
        all_output_courses.sort(key=lambda c: c.original_index)

        output_data = []
        for course in all_output_courses:
            row = course.data.copy()
            row["Group ID"] = course.group_id
            row["Match Number"] = course.match_method
            output_data.append(row)

        # Ensure correct column order
        final_headers = list(self.original_fieldnames)
        if "Group ID" in final_headers: final_headers.remove("Group ID")
        if "Match Number" in final_headers: final_headers.remove("Match Number")

        try:
            insert_pos = final_headers.index(self.config.CATALOG_ID_COL) + 1
            final_headers.insert(insert_pos, "Group ID")
            final_headers.insert(insert_pos + 1, "Match Number")
        except ValueError: # Fallback if Catalog ID is not found
            final_headers = ["Group ID", "Match Number"] + final_headers

        self.manager.write_csv(self.config.final_output_file, output_data, final_headers)
        
    def write_old_groups_catalog(self, final_groups: List[List[Course]]):
        """Writes a separate file for groups whose most recent course is before 2025."""
        if not self.manager: return
        old_groups = [g for g in final_groups if self.manager.get_most_recent_course(g).parsed_year < 2025]
        if old_groups:
            old_groups_as_dicts = [[c.data for c in group] for group in old_groups]
            self.manager.write_groups_to_csv(self.config.old_groups_output_file, old_groups_as_dicts, self.manager.original_headers)

    def _print_summary(self, num_groups: int, num_conflicts: int, num_courses_in_groups: int):
        """Prints a final summary of the process."""
        print("\n✅ Catalog course grouping process finished.")
        print(f"Total courses loaded: {len(self.all_courses)}")
        print(f"Total final groups formed: {num_groups}")
        print(f"Total year conflict pairs found by Method 8: {num_conflicts}")
        print(f"Total courses included in final groups: {num_courses_in_groups}")

def main():
    """Main execution function."""
    config = Config()
    grouper = Grouper(config)
    
    grouper.load_courses()
    grouper.run_pipeline()

if __name__ == "__main__":
    main()
