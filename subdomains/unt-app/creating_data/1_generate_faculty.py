import csv
import requests
from bs4 import BeautifulSoup
import time
from tqdm import tqdm

# --- Script Overview ---
# This script scrapes faculty information from the UNT faculty information website.
# It uses a list of URLs provided in an input CSV file.
#
# Step-by-step process:
# 1. Configuration: Define input/output file names, base URL, and request parameters.
# 2. Read URLs: Load a list of URLs to scrape from the INPUT_CSV_FILE.
# 3. Fetch and Parse: For each URL:
#    a. Fetch the HTML content of the page.
#    b. Parse the HTML to find blocks of faculty data.
#    c. For each faculty member found, extract their name, title, department, college,
#       and a website link (derived from available course links or profile links).
# 4. Collect Data: Store unique faculty members' data in a list of dictionaries.
# 5. Sort Data: Sort the collected list of faculty members primarily by "College",
#    then by "Department", then by "Faculty Title", and finally by "Faculty Name".
# 6. Assign Faculty IDs: Iterate through the sorted list and assign a sequential
#    "Faculty ID" (starting from 0) to each faculty member.
# 7. Write Output: Write the sorted and ID-assigned faculty data to the OUTPUT_CSV_FILE
#    with the headers: Faculty Name, Faculty Title, Faculty ID, Department, College, Website Link.
# --- End Script Overview ---

# --- Configuration ---
INPUT_CSV_FILE = "0_faculty_search_links.csv"      # CSV file containing one URL per line to scrape
OUTPUT_CSV_FILE = "0_faculty.csv"     # Faculty list of this scrape; step 2b merges it into "faculty.csv"
BASE_URL = "https://facultyinfo.unt.edu"         # Base URL for constructing absolute links
REQUEST_TIMEOUT = 20                             # Seconds to wait for the server to send data
DELAY_BETWEEN_REQUESTS = 0.05                     # Seconds to wait between fetching different pages
# --- End Configuration ---

def fetch_html(url):
    """Fetches HTML content from a given URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        return response.text
    except requests.exceptions.Timeout:
        print(f"Timeout error fetching {url} after {REQUEST_TIMEOUT} seconds.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_faculty_data(html_content, base_url):
    """Parses HTML to extract faculty details."""
    soup = BeautifulSoup(html_content, 'html.parser')
    faculty_list = []
    
    results_divs = soup.find_all('div', class_='results-result')
    if not results_divs:
        pass # No 'results-result' divs found

    for result_div in results_divs:
        try:
            name_tag = result_div.find('h1', class_='result-name')
            name = name_tag.get_text(strip=True) if name_tag else "N/A"

            title_tag = result_div.find('span', class_='result-title')
            title = title_tag.get_text(strip=True) if title_tag else "N/A"

            department_tag = result_div.find('span', class_='result-department')
            department = department_tag.get_text(strip=True) if department_tag else "N/A"

            college_tag = result_div.find('span', class_='result-college')
            college = college_tag.get_text(strip=True) if college_tag else "N/A"

            # Determine Website Link: Prioritize current courses, then past courses.
            # You might need to adjust class names if the website structure has changed significantly.
            website_link = "N/A"
            current_courses_link_tag = result_div.find('a', class_='fis-link fis-current')
            if current_courses_link_tag and current_courses_link_tag.has_attr('href'):
                href = current_courses_link_tag['href']
                if href.startswith('/'):
                    website_link = base_url + href
                else:
                    website_link = href
            else:
                past_courses_link_tag = result_div.find('a', class_='fis-link fis-previous')
                if past_courses_link_tag and past_courses_link_tag.has_attr('href'):
                    href = past_courses_link_tag['href']
                    if href.startswith('/'):
                        website_link = base_url + href
                    else:
                        website_link = href
                # As a further fallback, check if the name itself is linked (common for profiles)
                elif name_tag and name_tag.find('a') and name_tag.find('a').has_attr('href'):
                    href = name_tag.find('a')['href']
                    if href.startswith('/'):
                         website_link = base_url + href
                    else:
                        website_link = href


            faculty_list.append({
                "Faculty Name": name,
                "Faculty Title": title,
                "Department": department,
                "College": college,
                "Website Link": website_link
            })
        except Exception as e:
            print(f"Error parsing a faculty block: {e}")
            continue
            
    return faculty_list

def main():
    seen_faculty_names = set() # To keep track of unique faculty names
    all_faculty_data = []      # To store all unique faculty data dictionaries
    urls_to_scrape = []

    # Read URLs from the input CSV
    try:
        with open(INPUT_CSV_FILE, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile)
            # next(reader, None) # Uncomment if your CSV has a header row
            for row_number, row in enumerate(reader):
                if row:
                    url = row[0].strip()
                    if url:
                        urls_to_scrape.append(url)
                    else:
                        print(f"Warning: Empty URL string found at row {row_number + 1} in {INPUT_CSV_FILE}.")
                else:
                    print(f"Warning: Empty row found at row {row_number + 1} in {INPUT_CSV_FILE}.")

    except FileNotFoundError:
        print(f"Error: Input file '{INPUT_CSV_FILE}' not found.")
        return
    except Exception as e:
        print(f"Error reading input CSV '{INPUT_CSV_FILE}': {e}")
        return

    if not urls_to_scrape:
        print(f"No URLs found in '{INPUT_CSV_FILE}'. Exiting.")
        return

    print(f"Starting to process {len(urls_to_scrape)} URLs from {INPUT_CSV_FILE}...")

    for url in tqdm(urls_to_scrape, desc="Processing URLs"):
        print(f"\nFetching URL: {url}")
        html_content = fetch_html(url)
        
        if html_content:
            faculty_from_page = parse_faculty_data(html_content, BASE_URL)
            
            new_faculty_on_page = 0
            for faculty_member_data in faculty_from_page:
                if faculty_member_data["Faculty Name"] != "N/A" and faculty_member_data["Faculty Name"] not in seen_faculty_names:
                    all_faculty_data.append(faculty_member_data)
                    seen_faculty_names.add(faculty_member_data["Faculty Name"])
                    new_faculty_on_page +=1

            if new_faculty_on_page > 0:
                print(f"  Added {new_faculty_on_page} new unique faculty member(s) from this page.")
            elif faculty_from_page:
                print(f"  Found {len(faculty_from_page)} faculty member(s), but all were already processed or had N/A names.")
            else:
                print(f"  No faculty data blocks found on this page.")

        if DELAY_BETWEEN_REQUESTS > 0:
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # Sort data before assigning IDs and writing
    if all_faculty_data:
        # Sort by "College", then "Department", then "Faculty Title", then "Faculty Name"
        all_faculty_data.sort(key=lambda x: (
            x.get("College", "").lower(),      # Sort case-insensitively
            x.get("Department", "").lower(),  # Sort case-insensitively
            x.get("Faculty Title", "").lower(),# Sort case-insensitively
            x.get("Faculty Name", "").lower()  # Sort case-insensitively
        ))

        # Generate Faculty ID after sorting
        for i, faculty_member in enumerate(all_faculty_data):
            faculty_member["Faculty ID"] = i

        output_headers = ["Faculty Name", "Faculty Title", "Faculty ID", "Department", "College", "Website Link"]
        try:
            with open(OUTPUT_CSV_FILE, mode='w', newline='', encoding='utf-8') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=output_headers)
                writer.writeheader()
                writer.writerows(all_faculty_data)
            print(f"\nSuccessfully wrote {len(all_faculty_data)} unique faculty profiles to {OUTPUT_CSV_FILE}")
        except Exception as e:
            print(f"Error writing output CSV '{OUTPUT_CSV_FILE}': {e}")
    else:
        print("\nNo faculty data was collected to write to the output file.")

if __name__ == "__main__":
    main()