"""Behavior of step 2b, run as the pipeline runs it, on small snapshots.

Run from the "creating_data" folder:
    python -m unittest discover -s tests
"""
import csv
import gzip
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "2b_merge_scrapes.py")

FACULTY_HEADERS = ["Faculty Name", "Faculty Title", "Faculty ID", "Department", "College", "Website Link"]
OFFERINGS_HEADERS = [
    "Offering ID", "Course Code", "Course Name", "Year", "Broad Semester",
    "Specific Semester", "Full Course Name", "Faculty ID", "Link To Highlight"
]


def link(euid):
    return f"https://facultyinfo.unt.edu/faculty-profile?profile={euid}#current-teaching"


def professor(faculty_id, euid, name, title="Lecturer", department="Biology"):
    return {
        "Faculty Name": name, "Faculty Title": title, "Faculty ID": str(faculty_id),
        "Department": department, "College": "College of Science", "Website Link": link(euid),
    }


def section(offering_id, faculty_id, euid, code, year, semester="Fall"):
    full_name = f"{code}.001"
    return {
        "Offering ID": str(offering_id), "Course Code": code, "Course Name": f"Course {code}",
        "Year": str(year), "Broad Semester": semester, "Specific Semester": semester,
        "Full Course Name": full_name, "Faculty ID": str(faculty_id),
        "Link To Highlight": f"https://facultyinfo.unt.edu/faculty-profile?profile={euid}"
                             f"#previous-teaching:~:text={full_name},{semester}%20{year}",
    }


def write_gz(path, headers, rows):
    with gzip.open(path, "wt", encoding="utf-8", newline="") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=headers, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def write_plain(path, headers, rows):
    with open(path, "w", encoding="utf-8", newline="") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=headers, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def read(path):
    with open(path, encoding="utf-8", newline="") as infile:
        return list(csv.DictReader(infile))


class MergeScrapesTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name
        os.makedirs(os.path.join(self.dir, "snapshots"))

    def tearDown(self):
        self._tmp.cleanup()

    def snapshot(self, snapshot_date, faculty, offerings):
        base = os.path.join(self.dir, "snapshots", snapshot_date)
        write_gz(base + "_faculty.csv.gz", FACULTY_HEADERS, faculty)
        write_gz(base + "_offerings.csv.gz", OFFERINGS_HEADERS, offerings)

    def merge(self, *args, expect_ok=True):
        result = subprocess.run(
            [sys.executable, "-I", SCRIPT, *args], cwd=self.dir, capture_output=True, text=True)
        if expect_ok:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def outputs(self):
        faculty = {row["Website Link"].split("profile=")[1].split("#")[0]: row
                   for row in read(os.path.join(self.dir, "faculty.csv"))}
        offerings = read(os.path.join(self.dir, "0_merged_offerings.csv"))
        return faculty, offerings

    def sections_of(self, faculty, offerings, euid):
        faculty_id = faculty[euid]["Faculty ID"]
        return sorted((o["Course Code"], o["Year"]) for o in offerings if o["Faculty ID"] == faculty_id)

    def three_scrapes(self):
        # 2025: ann (left later), bob, cal.
        self.snapshot("2025-06-19",
                      [professor(0, "ann0001", "Ann Old"), professor(1, "bob0002", "Bob Smith"),
                       professor(2, "cal0003", "Cal Jones")],
                      [section(0, 0, "ann0001", "BIOL 1000", 2020),
                       section(1, 1, "bob0002", "BIOL 2000", 2015),
                       section(2, 2, "cal0003", "BIOL 3000", 2016)])
        # 2026-02: ann renamed and retitled, bob, cal, dee (left later).
        self.snapshot("2026-02-06",
                      [professor(0, "dee0004", "Dee Brown"), professor(1, "ann0001", "Ann Newer", "Professor", "Chemistry"),
                       professor(2, "bob0002", "Bob Smith"), professor(3, "cal0003", "Cal Jones")],
                      [section(0, 1, "ann0001", "BIOL 1000", 2020), section(1, 1, "ann0001", "BIOL 1100", 2024),
                       section(2, 0, "dee0004", "BIOL 4000", 2025),
                       section(3, 2, "bob0002", "BIOL 2000", 2015), section(4, 2, "bob0002", "BIOL 2100", 2025),
                       section(5, 3, "cal0003", "BIOL 3000", 2016), section(6, 3, "cal0003", "BIOL 3100", 2025)])
        # 2026-08 (newest): bob renamed, cal timed out (no sections), eve teaches
        # the BIOL 4000 section of Fall 2025 that 2026-02 gave to dee.
        self.snapshot("2026-08-19",
                      [professor(0, "eve0005", "Eve White"), professor(1, "bob0002", "Robert Smith"),
                       professor(2, "cal0003", "Cal Jones")],
                      [section(0, 0, "eve0005", "BIOL 4000", 2025),
                       section(1, 1, "bob0002", "BIOL 2100", 2025), section(2, 1, "bob0002", "BIOL 2200", 2026)])

    def test_former_professors_are_found_by_euid_not_by_name(self):
        self.three_scrapes()
        self.merge()
        faculty, _ = self.outputs()

        self.assertEqual(faculty["ann0001"]["Former"], "TRUE")
        self.assertEqual(faculty["dee0004"]["Former"], "TRUE")
        # Bob changed his displayed name and is still the same professor.
        self.assertEqual(faculty["bob0002"]["Former"], "FALSE")
        self.assertEqual(faculty["bob0002"]["Faculty Name"], "Robert Smith")
        self.assertEqual(len(faculty), 5)

    def test_details_and_last_seen_come_from_the_newest_scrape_that_lists_the_professor(self):
        self.three_scrapes()
        self.merge()
        faculty, _ = self.outputs()

        ann = faculty["ann0001"]
        self.assertEqual((ann["Faculty Name"], ann["Faculty Title"], ann["Department"]),
                         ("Ann Newer", "Professor", "Chemistry"))
        self.assertEqual(ann["Last Seen"], "2026-02-06")
        self.assertEqual(faculty["dee0004"]["Last Seen"], "2026-02-06")
        self.assertEqual(faculty["eve0005"]["Last Seen"], "2026-08-19")

    def test_sections_come_from_the_newest_scrape_that_has_sections_and_are_never_combined(self):
        self.three_scrapes()
        self.merge()
        faculty, offerings = self.outputs()

        # Ann: only the 2026-02 sections.
        self.assertEqual(self.sections_of(faculty, offerings, "ann0001"),
                         [("BIOL 1000", "2020"), ("BIOL 1100", "2024")])
        # Bob is still listed: only the newest sections. His 2015 section,
        # which the newest scrape no longer shows, is dropped.
        self.assertEqual(self.sections_of(faculty, offerings, "bob0002"),
                         [("BIOL 2100", "2025"), ("BIOL 2200", "2026")])
        # Cal's page timed out in the newest scrape: he keeps his 2026-02
        # sections, and the 2025 copy is not added on top.
        self.assertEqual(faculty["cal0003"]["Former"], "FALSE")
        self.assertEqual(self.sections_of(faculty, offerings, "cal0003"),
                         [("BIOL 3000", "2016"), ("BIOL 3100", "2025")])

    def test_a_section_given_to_another_professor_later_keeps_both_professors(self):
        self.three_scrapes()
        self.merge()
        faculty, offerings = self.outputs()

        teachers = sorted(o["Faculty ID"] for o in offerings
                          if (o["Course Code"], o["Year"]) == ("BIOL 4000", "2025"))
        self.assertEqual(teachers, sorted([faculty["dee0004"]["Faculty ID"], faculty["eve0005"]["Faculty ID"]]))

    def test_the_newest_scrape_keeps_its_ids_and_order(self):
        self.three_scrapes()
        self.merge()
        faculty_rows = read(os.path.join(self.dir, "faculty.csv"))
        _, offerings = self.outputs()

        self.assertEqual([r["Faculty ID"] for r in faculty_rows[:3]], ["0", "1", "2"])
        self.assertEqual([r["Faculty Name"] for r in faculty_rows[:3]], ["Eve White", "Robert Smith", "Cal Jones"])
        self.assertEqual([(o["Offering ID"], o["Faculty ID"]) for o in offerings[:3]],
                         [("0", "0"), ("1", "1"), ("2", "1")])
        # Every other row gets a new ID after the newest ones, and every
        # section points at a professor of the merged list.
        ids = [int(r["Faculty ID"]) for r in faculty_rows]
        self.assertEqual(ids, list(range(len(ids))))
        self.assertEqual([int(o["Offering ID"]) for o in offerings], list(range(len(offerings))))
        self.assertTrue({o["Faculty ID"] for o in offerings} <= {r["Faculty ID"] for r in faculty_rows})

    def test_one_snapshot_gives_the_scrape_unchanged(self):
        faculty = [professor(0, "bob0002", "Bob Smith"), professor(1, "cal0003", "Cal Jones")]
        offerings = [section(0, 1, "cal0003", "BIOL 3000", 2016), section(1, 0, "bob0002", "BIOL 2000", 2015)]
        self.snapshot("2026-08-19", faculty, offerings)
        self.merge()

        merged_faculty = read(os.path.join(self.dir, "faculty.csv"))
        self.assertEqual([{k: r[k] for k in FACULTY_HEADERS} for r in merged_faculty], faculty)
        self.assertEqual({r["Former"] for r in merged_faculty}, {"FALSE"})
        self.assertEqual(read(os.path.join(self.dir, "0_merged_offerings.csv")), offerings)

    def test_add_snapshot_saves_the_scrape_and_merges_it_as_the_newest(self):
        self.three_scrapes()
        write_plain(os.path.join(self.dir, "0_faculty.csv"), FACULTY_HEADERS,
                    [professor(0, "eve0005", "Eve White")])
        write_plain(os.path.join(self.dir, "0_all_offerings.csv"), OFFERINGS_HEADERS,
                    [section(0, 0, "eve0005", "BIOL 4000", 2026)])
        self.merge("--add-snapshot", "2027-01-15")

        self.assertTrue(os.path.exists(os.path.join(self.dir, "snapshots", "2027-01-15_faculty.csv.gz")))
        faculty, _ = self.outputs()
        self.assertEqual(faculty["bob0002"]["Former"], "TRUE")
        self.assertEqual(faculty["bob0002"]["Last Seen"], "2026-08-19")
        self.assertEqual(faculty["eve0005"]["Former"], "FALSE")

        # A snapshot is never overwritten.
        result = self.merge("--add-snapshot", "2027-01-15", expect_ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("already exists", result.stdout)

    def test_add_snapshot_writes_nothing_when_the_offerings_of_the_scrape_are_missing(self):
        self.three_scrapes()
        write_plain(os.path.join(self.dir, "0_faculty.csv"), FACULTY_HEADERS,
                    [professor(0, "eve0005", "Eve White")])
        result = self.merge("--add-snapshot", "2027-01-15", expect_ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("0_all_offerings.csv", result.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "snapshots", "2027-01-15_faculty.csv.gz")))

        # The snapshots are as they were, so the merge still runs.
        self.merge()
        faculty, _ = self.outputs()
        self.assertEqual(faculty["bob0002"]["Former"], "FALSE")

    def test_add_snapshot_refuses_a_date_that_is_not_yyyy_mm_dd_and_writes_nothing(self):
        self.three_scrapes()
        write_plain(os.path.join(self.dir, "0_faculty.csv"), FACULTY_HEADERS,
                    [professor(0, "eve0005", "Eve White")])
        write_plain(os.path.join(self.dir, "0_all_offerings.csv"), OFFERINGS_HEADERS,
                    [section(0, 0, "eve0005", "BIOL 4000", 2026)])
        before = sorted(os.listdir(os.path.join(self.dir, "snapshots")))

        result = self.merge("--add-snapshot", "20270115", expect_ok=False)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("20270115", result.stdout)
        self.assertEqual(sorted(os.listdir(os.path.join(self.dir, "snapshots"))), before)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "faculty.csv")))

    def test_a_snapshot_named_with_a_date_that_is_not_yyyy_mm_dd_stops_the_merge(self):
        self.three_scrapes()
        self.snapshot("20270115", [professor(0, "eve0005", "Eve White")],
                      [section(0, 0, "eve0005", "BIOL 4000", 2026)])

        result = self.merge(expect_ok=False)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("20270115", result.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "faculty.csv")))

    def test_a_snapshot_without_its_offerings_file_stops_the_merge(self):
        self.three_scrapes()
        os.remove(os.path.join(self.dir, "snapshots", "2026-02-06_offerings.csv.gz"))
        result = self.merge(expect_ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("2026-02-06", result.stdout)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "faculty.csv")))


if __name__ == "__main__":
    unittest.main()
