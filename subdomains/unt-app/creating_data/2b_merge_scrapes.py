import argparse
import csv
import gzip
import io
import os
import re
import sys
from datetime import date

# ======================================================================================
#                            METHOD DESCRIPTIONS
# ======================================================================================
# This script keeps the courses of professors who are no longer at UNT.
#
# facultyinfo.unt.edu only lists the professors who are at UNT now. When a
# professor leaves, their profile and all their sections leave with them. Each
# scrape (steps 1 and 2) is therefore kept as a dated snapshot in "snapshots/":
#   - "<YYYY-MM-DD>_faculty.csv.gz":   the faculty list of that scrape (step 1).
#   - "<YYYY-MM-DD>_offerings.csv.gz": the raw offerings of that scrape (step 2),
#                                      before the pairing of step 5.
#
# This script merges all snapshots into one faculty list and one offerings list.
#
# --- MATCHING ---
# A professor is identified by the euid in the profile link ("profile=<euid>").
# The "Faculty ID" column is a sequence number that each scrape assigns again,
# and names change between scrapes, so neither can link two scrapes.
#
# --- MERGE RULE ---
#   1. Name, title, department, college and link come from the newest snapshot
#      that lists the professor.
#   2. A professor is "former" when the newest snapshot does not list them.
#      "Last Seen" is the date of the newest snapshot that lists them.
#   3. The sections of a professor come from the newest snapshot that has
#      sections for that professor. Sections are never combined across
#      snapshots for one professor. (A profile page that timed out in the newest
#      scrape thus keeps its sections from the scrape before.)
#   4. Sections of different professors are never merged. A section that an old
#      snapshot gives to a former professor and the newest snapshot gives to
#      another professor stays in the data two times, one for each professor.
#
# --- IDS ---
# The professors and sections of the newest snapshot keep their IDs and their
# order, so the output for current data is the same as the output of step 2.
# All other professors and sections get new IDs after the highest ID of the
# newest snapshot.
#
# --- USAGE ---
#   python 2b_merge_scrapes.py                         merge the snapshots
#   python 2b_merge_scrapes.py --add-snapshot 2026-08-19
#       first save "0_faculty.csv" and "0_all_offerings.csv" (the output of
#       steps 1 and 2) as the snapshot of that date, then merge.
# ======================================================================================


# --- Configuration ---
SNAPSHOT_DIR = "snapshots"
SCRAPE_FACULTY_FILE = "0_faculty.csv"            # output of step 1
SCRAPE_OFFERINGS_FILE = "0_all_offerings.csv"    # output of step 2
MERGED_FACULTY_FILE = "faculty.csv"              # read by step 7
MERGED_OFFERINGS_FILE = "0_merged_offerings.csv" # read by step 5

FACULTY_SUFFIX = "_faculty.csv.gz"
OFFERINGS_SUFFIX = "_offerings.csv.gz"

FACULTY_HEADERS = ["Faculty Name", "Faculty Title", "Faculty ID", "Department", "College", "Website Link"]
MERGED_FACULTY_HEADERS = FACULTY_HEADERS + ["Former", "Last Seen"]
OFFERINGS_HEADERS = [
    "Offering ID", "Course Code", "Course Name", "Year", "Broad Semester",
    "Specific Semester", "Full Course Name", "Faculty ID", "Link To Highlight"
]

EUID_PATTERN = re.compile(r"[?&]profile=([^#&]+)")


class MergeError(Exception):
    """A snapshot is missing, incomplete or not consistent."""


# --- Utility Functions ---
def euid_of(link):
    """Returns the lowercase euid in a facultyinfo link, or "" if there is none."""
    match = EUID_PATTERN.search(link or "")
    return match.group(1).strip().lower() if match else ""


def read_csv(path):
    """Reads a CSV file, gzip-compressed if the name ends in ".gz"."""
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, mode="rt", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)
        return reader.fieldnames or [], list(reader)


def write_csv(path, headers, rows, compress=False):
    """Writes a CSV file with LF line endings, like the scrape steps do."""
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    data = buffer.getvalue().encode("utf-8")
    if compress:
        # mtime=0 and no file name keep the bytes the same for the same data.
        with open(path, "wb") as outfile:
            with gzip.GzipFile(filename="", mode="wb", fileobj=outfile, compresslevel=9, mtime=0) as gz:
                gz.write(data)
    else:
        with open(path, "wb") as outfile:
            outfile.write(data)


def require_headers(path, headers, required):
    missing = [h for h in required if h not in headers]
    if missing:
        raise MergeError(f"'{path}' does not have the column(s) {missing}.")


# --- Snapshots ---
def list_snapshots(snapshot_dir):
    """Returns the snapshot dates in "snapshot_dir", oldest first."""
    if not os.path.isdir(snapshot_dir):
        raise MergeError(f"The snapshot folder '{snapshot_dir}' does not exist.")
    dates = set()
    for name in os.listdir(snapshot_dir):
        for suffix in (FACULTY_SUFFIX, OFFERINGS_SUFFIX):
            if name.endswith(suffix):
                dates.add(name[:-len(suffix)])
    for snapshot_date in dates:
        try:
            date.fromisoformat(snapshot_date)
        except ValueError:
            raise MergeError(f"'{snapshot_date}' in '{snapshot_dir}' is not a YYYY-MM-DD date.")
        for suffix in (FACULTY_SUFFIX, OFFERINGS_SUFFIX):
            path = os.path.join(snapshot_dir, snapshot_date + suffix)
            if not os.path.exists(path):
                raise MergeError(f"The snapshot {snapshot_date} has no '{os.path.basename(path)}'.")
    if not dates:
        raise MergeError(f"There are no snapshots in '{snapshot_dir}'.")
    return sorted(dates)


def load_snapshot(snapshot_dir, snapshot_date):
    """Loads one snapshot as (faculty rows, offering rows)."""
    faculty_path = os.path.join(snapshot_dir, snapshot_date + FACULTY_SUFFIX)
    offerings_path = os.path.join(snapshot_dir, snapshot_date + OFFERINGS_SUFFIX)
    faculty_headers, faculty = read_csv(faculty_path)
    offerings_headers, offerings = read_csv(offerings_path)
    require_headers(faculty_path, faculty_headers, FACULTY_HEADERS)
    require_headers(offerings_path, offerings_headers, OFFERINGS_HEADERS)
    return faculty, offerings


def add_snapshot(snapshot_date):
    """Saves the output of steps 1 and 2 as the snapshot of "snapshot_date"."""
    date.fromisoformat(snapshot_date)
    files = []
    for source, suffix, required in (
        (SCRAPE_FACULTY_FILE, FACULTY_SUFFIX, FACULTY_HEADERS),
        (SCRAPE_OFFERINGS_FILE, OFFERINGS_SUFFIX, OFFERINGS_HEADERS),
    ):
        if not os.path.exists(source):
            raise MergeError(f"'{source}' does not exist. Run steps 1 and 2 first.")
        target = os.path.join(SNAPSHOT_DIR, snapshot_date + suffix)
        if os.path.exists(target):
            raise MergeError(f"'{target}' already exists. Delete it first to replace it.")
        headers, rows = read_csv(source)
        require_headers(source, headers, required)
        files.append((source, target, headers, rows))
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    for source, target, headers, rows in files:
        write_csv(target, headers, rows, compress=True)
        print(f"Saved {len(rows)} rows of '{source}' to '{target}'.")


# --- Merge ---
def merge_snapshots(snapshots):
    """
    Merges the snapshots by euid.

    "snapshots" is a list of (date, faculty rows, offering rows), oldest first.
    Returns (merged faculty rows, merged offering rows, statistics).
    """
    if not snapshots:
        raise MergeError("There are no snapshots to merge.")

    # The details of each professor from the newest snapshot that lists them,
    # and their sections from the newest snapshot that has sections for them.
    details = {}   # euid -> (date, faculty row)
    sections = {}  # euid -> (date, offering rows)
    for snapshot_date, faculty, offerings in snapshots:
        euid_by_faculty_id = {}
        seen = set()
        for row in faculty:
            euid = euid_of(row["Website Link"])
            if not euid:
                raise MergeError(f"Snapshot {snapshot_date}: no euid in the link of '{row['Faculty Name']}'.")
            euid_by_faculty_id[row["Faculty ID"]] = euid
            if euid in seen:
                continue
            seen.add(euid)
            details[euid] = (snapshot_date, row)

        grouped = {}
        for row in offerings:
            euid = euid_of(row["Link To Highlight"]) or euid_by_faculty_id.get(row["Faculty ID"], "")
            if not euid:
                raise MergeError(f"Snapshot {snapshot_date}: offering {row['Offering ID']} has no professor.")
            grouped.setdefault(euid, []).append(row)
        for euid, rows in grouped.items():
            sections[euid] = (snapshot_date, rows)

    newest_date, newest_faculty, newest_offerings = snapshots[-1]

    # --- Faculty ---
    # The newest snapshot first, with its own IDs and order. Then the former
    # professors, most recently seen first, each in the order of that snapshot.
    merged_faculty = []
    merged_id = {}  # euid -> Faculty ID in the output
    for row in newest_faculty:
        euid = euid_of(row["Website Link"])
        if euid in merged_id:
            continue
        merged_id[euid] = row["Faculty ID"]
        merged_faculty.append({**row, "Former": "FALSE", "Last Seen": newest_date})

    next_faculty_id = 1 + max((int(r["Faculty ID"]) for r in newest_faculty), default=-1)
    order = {}
    for index, (snapshot_date, faculty, _) in enumerate(snapshots):
        for position, row in enumerate(faculty):
            order.setdefault((snapshot_date, euid_of(row["Website Link"])), (index, position))
    former = [euid for euid in details if euid not in merged_id]
    def former_order(euid):
        index, position = order[(details[euid][0], euid)]
        return (-index, position)
    former.sort(key=former_order)
    for euid in former:
        last_seen, row = details[euid]
        merged_id[euid] = str(next_faculty_id)
        next_faculty_id += 1
        merged_faculty.append({**row, "Faculty ID": merged_id[euid], "Former": "TRUE", "Last Seen": last_seen})

    # --- Offerings ---
    # The sections of the newest snapshot keep their IDs and order. Then every
    # professor whose sections come from an older snapshot, in faculty order.
    merged_offerings = [dict(row) for row in newest_offerings]

    next_offering_id = 1 + max((int(r["Offering ID"]) for r in newest_offerings), default=-1)
    older_sections = 0
    unlisted = 0
    for row in merged_faculty:
        euid = euid_of(row["Website Link"])
        source = sections.get(euid)
        if source is None or source[0] == newest_date:
            continue
        for offering in source[1]:
            merged_offerings.append({
                **offering,
                "Offering ID": str(next_offering_id),
                "Faculty ID": merged_id[euid],
            })
            next_offering_id += 1
            older_sections += 1
    for euid, (_, rows) in sections.items():
        if euid not in merged_id:
            unlisted += len(rows)

    stats = {
        "snapshots": len(snapshots),
        "current_faculty": len(merged_faculty) - len(former),
        "former_faculty": len(former),
        "newest_sections": len(merged_offerings) - older_sections,
        "older_sections": older_sections,
        "former_sections": sum(len(sections[e][1]) for e in former if e in sections),
        "former_without_sections": sum(1 for e in former if e not in sections),
        "unlisted_sections": unlisted,
    }
    return merged_faculty, merged_offerings, stats


def run():
    dates = list_snapshots(SNAPSHOT_DIR)
    print(f"Merging {len(dates)} snapshots: {', '.join(dates)}")
    snapshots = [(d, *load_snapshot(SNAPSHOT_DIR, d)) for d in dates]
    faculty, offerings, stats = merge_snapshots(snapshots)
    write_csv(MERGED_FACULTY_FILE, MERGED_FACULTY_HEADERS, faculty)
    write_csv(MERGED_OFFERINGS_FILE, OFFERINGS_HEADERS, offerings)
    print(f"Professors in the newest snapshot: {stats['current_faculty']}")
    print(f"Former professors: {stats['former_faculty']} "
          f"({stats['former_without_sections']} of them have no sections)")
    print(f"Sections from the newest snapshot: {stats['newest_sections']}")
    print(f"Sections from older snapshots: {stats['older_sections']} "
          f"({stats['former_sections']} of them of former professors)")
    if stats["unlisted_sections"]:
        print(f"Warning: skipped {stats['unlisted_sections']} sections of professors that no faculty list has.")
    print(f"Wrote {len(faculty)} professors to '{MERGED_FACULTY_FILE}' and {len(offerings)} sections to '{MERGED_OFFERINGS_FILE}'.")
    return stats


def main(argv=None):
    parser = argparse.ArgumentParser(description="Merge the dated scrape snapshots by euid.")
    parser.add_argument("--add-snapshot", metavar="YYYY-MM-DD",
                        help=f"first save '{SCRAPE_FACULTY_FILE}' and '{SCRAPE_OFFERINGS_FILE}' as the snapshot of this date")
    args = parser.parse_args(argv)
    try:
        if args.add_snapshot:
            add_snapshot(args.add_snapshot)
        run()
    except (MergeError, ValueError) as error:
        print(f"Error: {error}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
