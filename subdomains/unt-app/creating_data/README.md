# General Information
This folder contains all scripts I used to gather data for [unt.benwilcox.dev](https://unt.benwilcox.dev/). Many of the python files were created in collaboration [Google's Gemini](https://gemini.google.com/app) LLM, but were designed, modified, and executed by me. [Here](https://g.co/gemini/share/adb420b44797) is an example dialogue between me and the Gemini LLM to make an early version of "catalog_groups", and "offering_groups."

Files with a "0_" before them are used as input or intermediate files for the scripts. All python files are prepended with a number that represents the order they are meant to be executed in. Running each file sequentially will result in all data being collected and output successfully.

There are 4 output files (all_catalog.csv, all_offerings.csv, faculty.csv, courses.db), and 3 input files (semester_mapping.csv, 0_catalog_mapping.csv, 0_faculty_search_links.csv). **You must provide/generate the input files yourself for the code to work**; I have included the 3 that I generated in the folder.
The "snapshots" folder holds every scrape of facultyinfo.unt.edu since June 2025 (see [Former professors](#former-professors)).
# Recreating/editing data
I have included a requirements.txt file with all necessary libraries for execution within a virtual environment. After downloading and navigating to the "creating_data" folder, create and activate the venv with the following console commands (mac):
```zsh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
After you have done this, simply execute the python files.

Before each refresh, add the new catalog IDs to "0_catalog_mapping.csv" and set the current semester in two places: `CURRENT_SEMESTER`/`CURRENT_YEAR` in "2_generate_all_offerings.py", and the constants in "../src/config.js".

Each refresh adds one snapshot of facultyinfo.unt.edu:
1. Run "1_generate_faculty.py" and "2_generate_all_offerings.py". They write "0_faculty.csv" and "0_all_offerings.csv".
2. Run `python 2b_merge_scrapes.py --add-snapshot YYYY-MM-DD` with the date of the scrape. This saves the two files as "snapshots/YYYY-MM-DD_faculty.csv.gz" and "snapshots/YYYY-MM-DD_offerings.csv.gz", then merges all snapshots.
3. Run the other scripts in order. Then copy "courses.db" to "../public/courses.db".
4. Commit the two new snapshot files. Git does not keep "0_faculty.csv" and "0_all_offerings.csv", because the snapshot holds the same data.

To run the tests of the merge step, run `python -m unittest discover -s tests` in this folder.

Below are descriptions of each python file. More information and config options can be found in the header of each file.
## 1_generate_faculty.py
Generates "0_faculty.csv" (intermediate file) using the following logic:
* Looks up all 26^2 two letter combinations of professor names on [facultyinfo.unt.edu](https://facultyinfo.unt.edu), according to 0_faculty_search_links.csv.
* Creates a CSV file with all unique faculty members that are found on the resulting webpage.
* Each entry contains information about the faculty member that is found on the page. This includes their name, unique faculty page link, and college information.
## 2_generate_all_offerings.py
Generates "0_all_offerings.csv" (intermediate file) from "0_faculty.csv" using the following logic:
* Retrieves the HTML of every webpage listed in the "Website Link" column of "0_faculty.csv".
* Uses Regular Expressions and the "BeautifulSoup" library to "scrape" every single Course Offering from the "Previous Scheduled Teaching" and "Current Scheduled Teaching" portion of every faculty webpage. [Here](https://facultyinfo.unt.edu/faculty-profile?profile=kk0014#previous-teaching) is an example faculty webpage with 154+ Course Offerings.
* Creates a massive CSV file (185k+ lines) with every single Course Offering.
* Each line contains the course's name, Faculty's ID, the semester it was offered, and a link to the highlighted text on the original page (among other information).
* facultyinfo.unt.edu usually drops one profile per full pass with a connect timeout. The script writes these misses to "errors.csv". A new pass loses a different profile, thus I accept the logged miss instead of a second full scrape.
## 2b_merge_scrapes.py
Merges all snapshots in "snapshots/" into "faculty.csv" (output file) and "0_merged_offerings.csv" (intermediate file). See [Former professors](#former-professors) for the rules.
* With `--add-snapshot YYYY-MM-DD`, the script first saves "0_faculty.csv" and "0_all_offerings.csv" as the snapshot of that date. It does not replace a snapshot that exists.
* "faculty.csv" gets two more columns: "Former" (TRUE when the newest snapshot does not list the professor) and "Last Seen" (the date of the newest snapshot that lists the professor).
* The professors and sections of the newest snapshot keep their IDs and their order. All other rows get new IDs after them.
* The script uses only the Python standard library.
## 3_generate_all_catalog.py
Generates "0_all_catalog1.csv" (intermediate file) from "0_catalog_mapping.csv" using the following logic
* Searches through every course catalog listed in "0_catalog_mapping.csv" to find every course listing going back to 2011. Specifically, it uses a modified search query in the "Catalog Search" feature included in catalog.unt.edu to search for every single course. [Here](https://catalog.unt.edu/search_advanced.php?cur_cat_oid=35&cpage=1&search_database=Search&filter%5Bkeyword%5D=&filter%5B3%5D=1) is page 1 of the "All Courses" search result for the 2024-2025 Undergraduate Course Catalog.
* Scrapes data from all (200+) pages in each catalog.
* Uses the "asyncio" and "aiohttp" libraries to concurrently get each webpage, SIGNIFICANTLY speeding up the search from multiple hours to just a few minutes.
* Creates a CSV file with a line for every single Course Listing on every page of every course catalog going back to 2011.
* Each line contains the Course Code/Name, the Catalog ID/Year, and a link to the Unique Course Page (among other information). [Here](https://catalog.unt.edu/preview_course_nopop.php?catoid=37&coid=171665) is an example of a Unique Course Page.
* catalog.unt.edu is now behind AWS WAF. It answers the search URL above with an empty HTTP 202 for plain HTTP clients, so this script can no longer collect those pages on its own. Open the same pages in a real browser and parse the DOM with the logic of this script, or keep the rows of a previous run for the older catalogs, because archived catalog pages do not change.
## 4_catalog_groups.py
Creates Course Groups based on a 8-part grouping algorithm; "updates" the file "0_all_catalog1.csv" to "0_all_catalog2.csv" to simply contain the grouping information. The groups are created by successively applying 8 "methods" to "0_all_catalog1.csv" that group courses and merge intermediate groups using different logic to create cohesive Course Groups.

For clarity, I have attached an image of an early set of grouping methods I used to create Course Groups:

<div align="center">
  <img src="https://github.com/user-attachments/assets/8b7fcc97-d063-4a46-9594-0a9b67f13e80" width="300" alt="Group Catalog Listings">
</div>

Explanation:
* The script first groups together all Catalog Listings that have the exact same Name and Course Code. This forms the first set of groups.
* It then appends to/creates groups that have the same course code and "Normalized Name" (removes special characters and spaces)
* The 3rd+ method merges groups, whereas the 1st and 2nd method created the first groups.
* Method 3 merges any groups with a similar name and roman numerals.
* This goes on in the same fashion for all 8 methods.

I encourage you to run this file with "output_intermediate_files: True" and try different grouping methods. If you are not proficient in Python, use an LLM to help you update them.
## 5_offering_groups.py
Pairs every Course Offering in "0_merged_offerings.csv" to a Course Listing in "0_all_catalog2.csv". This essentially updates the file "0_merged_offerings.csv" with pairing IDs to become "all_offerings.csv" (output file).

The methodology for pairing Course Offerings to Course Listings is largely the same as creating course Groups in "4_catalog_groups.py". I use a 14-part pairing algorithm that successively matches Course Offerings to Course Listings using broader constraints each time.

For clarity, I have attached an image of an early set of methods I used to create Course Pairings:

<div align="center">
  <img src="https://github.com/user-attachments/assets/00ec2c8b-01aa-4d46-b124-467556fad98b" width="300" alt="Group Catalog Listings">
</div>

Explanation:
* The script first pairs Offerings and Listings that have the exact same Course Code + Course Name.
* It then pairs courses that have the same Course Code + Normalized Name.
* Then it pairs courses with the same Course Code and offered during the same year.
* This goes on in the same fashion for all 14 methods.

Note that this image is of an early version of the Methods I use; I have since updated the specific methods to be more robust.
## 6_scrape_course_info.py
Gathers specific course info about every Catalog Listing in "0_all_catalog2.csv" to generate "all_catalog.csv" (output file). Data from this step includes anything listed on the [unique course page](https://catalog.unt.edu/preview_course_nopop.php?catoid=37&coid=171665), including the course's "Description", "Hours", "Prerequisite(s)", etc.

The script accomplishes this by HTML of the "Course Link" column from every entry in "0_all_catalog2.csv". It then uses Regular Expressions to extract the data and generate the updated "all_catalog.csv".

The WAF note for "3_generate_all_catalog.py" also applies here: the course pages start to answer with an empty HTTP 202 when the request volume goes up. Get the blocked pages with a browser, or copy their rows from the previous "all_catalog.csv" by "Course Link".
## 7_generate_db.py
Generates "courses.db" (output file). This is a 4-table SQLite database file which is essentially a reformatted version of the data already collected. There is one table for each output CSV file (faculty.csv, all_offerings.csv, all_catalog.csv). The only nontrivial Table is the "MainCourses" table which contains an entry for each unique Course Group present in all_catalog.csv
The "Faculty" table has two columns for former professors: "faculty_former" (1 for a former professor) and "faculty_last_seen" (the date of the newest snapshot that lists the professor).
# Former professors
facultyinfo.unt.edu only lists the professors who are at UNT now.
When a professor leaves, the site removes the profile and all the sections that the professor taught.
To keep these sections, each scrape is saved as a dated snapshot in "snapshots/", and "2b_merge_scrapes.py" merges all snapshots on every run.
The snapshots start with the scrape of June 2025.

The merge uses these rules:
* A professor is identified by the euid in the profile link (`profile=<euid>`). The "Faculty ID" column changes on every scrape, and 77 professors changed their displayed name between scrapes, so neither can identify a professor.
* A professor is a "former professor" when the newest snapshot does not list the euid.
* The name, title, department, and college come from the newest snapshot that lists the professor.
* The sections of a professor come from the newest snapshot that has sections for that professor. Sections are never combined across snapshots. Thus a professor whose page timed out in the newest scrape keeps the sections of the scrape before.
* Old sections of a current professor that the newest scrape no longer shows are not kept.
* If an old snapshot gives a section to a former professor and the newest snapshot gives it to another professor, both rows stay.

The 4 snapshots of June 2025, February 2026, March 2026, and August 2026 give 883 former professors and 18,909 of their sections.
Step 5 pairs these sections to Catalog Listings with the same logic as all other sections.
On the website, the "Include Former Professors" setting shows or hides these sections.
In Course Display 2, the name of a former professor has a line through it and has no link, because the profile page no longer exists.

The data has these limits:
* The data covers Fall 2004 onward.
* The data only has the professors who were on facultyinfo.unt.edu in at least one scrape since June 2025. Professors who left UNT before June 2025 are missing, so older semesters have gaps.
* A section with no listed professor shows "Staff" on the website.
