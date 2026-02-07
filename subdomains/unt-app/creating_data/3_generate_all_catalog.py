import asyncio
import aiohttp
from bs4 import BeautifulSoup, NavigableString
import csv
from tqdm.asyncio import tqdm as async_tqdm # For asyncio-compatible gather
from tqdm import tqdm as regular_tqdm # For the synchronous outer loop
import re
from urllib.parse import urljoin
import os # For checking file existence

# --- Configuration ---
# Toggle: True = only update the most recent 2 catalogs into the existing output file
#         False = scrape ALL catalogs and generate the full output file from scratch
UPDATE_ONLY = True

BASE_URL = "https://catalog.unt.edu/"
SEARCH_URL_TEMPLATE = "https://catalog.unt.edu/search_advanced.php?cur_cat_oid={catalog_oid}&cpage={page_num}&search_database=Search&filter%5Bkeyword%5D=&filter%5B3%5D=1"
OUTPUT_FILE = "0_all_catalog1.csv"
CATALOG_MAPPING_FILE = "0_catalog_mapping.csv" # New CSV for catalog info

# Global user agent to mimic a browser, can help avoid blocking
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# --- Helper Functions ---

def load_catalog_mapping(filepath):
    """
    Loads catalog information (Year, Catalog Type) from a CSV file.
    The CSV should have headers: Catalog ID,Year,Catalog Type
    Returns a dictionary mapping catalog_oid (str) to its info.
    Example: {"37": {"year": "2025-2026", "type": "Undergraduate"}}
    """
    if not os.path.exists(filepath):
        regular_tqdm.write(f"CRITICAL: Catalog mapping file not found at '{filepath}'. Please create it.")
        return None
        
    mapping = {}
    try:
        with open(filepath, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            if not reader.fieldnames or "Catalog ID" not in reader.fieldnames or \
               "Year" not in reader.fieldnames or "Catalog Type" not in reader.fieldnames:
                regular_tqdm.write(f"CRITICAL: Catalog mapping file '{filepath}' is missing required headers: Catalog ID, Year, Catalog Type.")
                return None

            for row in reader:
                catalog_id = row.get("Catalog ID", "").strip()
                year = row.get("Year", "").strip()
                catalog_type = row.get("Catalog Type", "").strip()
                if catalog_id and year and catalog_type:
                    mapping[catalog_id] = {"year": year, "type": catalog_type}
                else:
                    regular_tqdm.write(f"Warning: Skipping row in '{filepath}' due to missing data: {row}")
    except Exception as e:
        regular_tqdm.write(f"CRITICAL: Error loading catalog mapping file '{filepath}': {e}")
        return None
    
    if not mapping:
        regular_tqdm.write(f"CRITICAL: No valid data loaded from catalog mapping file '{filepath}'.")
        return None
    return mapping

def load_existing_output(filepath):
    """
    Loads existing course data from the output CSV file.
    Returns a list of rows where each row is:
    [Course Code, Course Name, Catalog Code, Year, Catalog Type, Course Link]
    (i.e., everything except the Catalog ID which is re-assigned on write).
    Returns an empty list if the file doesn't exist.
    """
    if not os.path.exists(filepath):
        regular_tqdm.write(f"Info: Existing output file '{filepath}' not found. Starting fresh.")
        return []
    
    existing_data = []
    try:
        with open(filepath, mode='r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            for row in reader:
                existing_data.append([
                    row['Course Code'],
                    row['Course Name'],
                    row['Catalog Code'],
                    row['Year'],
                    row['Catalog Type'],
                    row['Course Link']
                ])
    except Exception as e:
        regular_tqdm.write(f"Error loading existing output file '{filepath}': {e}")
        return []
    
    regular_tqdm.write(f"Loaded {len(existing_data)} existing courses from '{filepath}'.")
    return existing_data

async def fetch_html(session, url):
    """Fetches HTML content from a URL with error handling."""
    try:
        async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=30)) as response:
            response.raise_for_status()
            return await response.text()
    except aiohttp.ClientError as e:
        regular_tqdm.write(f"Network error fetching {url}: {e}")
        await asyncio.sleep(1)
        return None
    except asyncio.TimeoutError:
        regular_tqdm.write(f"Timeout fetching {url}")
        return None
    except Exception as e:
        regular_tqdm.write(f"Unexpected error fetching {url}: {e}")
        await asyncio.sleep(1)
        return None

async def get_pagemax_and_descriptive_title(session, catalog_oid):
    """
    Fetches the first page of a catalog (cpage=1) to:
    1. Determine PAGEMAX (Instruction 2c.2)
    2. Get a descriptive title from the page's <title> tag for logging.
    Returns (pagemax, descriptive_title_string)
    """
    url = SEARCH_URL_TEMPLATE.format(catalog_oid=catalog_oid, page_num=1)
    html = await fetch_html(session, url)
    if not html:
        return None, "Unknown Title (Fetch Error)"

    soup = BeautifulSoup(html, 'html.parser')

    # 1. Get descriptive title from page <title>
    descriptive_title = "Unknown Title"
    page_title_tag = soup.find('title')
    if page_title_tag and page_title_tag.string:
        descriptive_title = page_title_tag.string.strip()

    # 2. Determine PAGEMAX (Instruction 2c.2)
    pagemax = 1 
    pagination_nav = None
    nav_elements = soup.find_all('nav')
    for nav_candidate in nav_elements:
        has_page_text = nav_candidate.find(string=re.compile(r"^\s*Page:"))
        has_cpage_link = nav_candidate.find('a', href=re.compile(r'cpage='))
        has_strong_page_marker = nav_candidate.find('strong') 

        if (has_page_text and (has_cpage_link or has_strong_page_marker)) or \
           (not has_page_text and has_cpage_link and has_strong_page_marker and len(nav_candidate.find_all('a')) > 0):
            pagination_nav = nav_candidate
            break
    
    if pagination_nav:
        pagemax_found_by_arrow = False
        arrow_text_nodes = pagination_nav.find_all(string=lambda t: isinstance(t, NavigableString) and "->" in t)
        for arrow_node in arrow_text_nodes:
            next_a_tag = arrow_node.find_next_sibling('a')
            if next_a_tag and next_a_tag.get('href') and 'cpage=' in next_a_tag['href']:
                page_num_text = next_a_tag.get_text(strip=True)
                if page_num_text.isdigit():
                    try:
                        pagemax = int(page_num_text)
                        pagemax_found_by_arrow = True
                        break 
                    except ValueError:
                        continue
        
        if not pagemax_found_by_arrow:
            page_links = pagination_nav.find_all('a', href=True)
            current_max_page_from_links = 0
            for link_tag in page_links:
                if 'cpage=' in link_tag['href']:
                    page_num_text = link_tag.get_text(strip=True)
                    if page_num_text.isdigit():
                        try:
                            current_max_page_from_links = max(current_max_page_from_links, int(page_num_text))
                        except ValueError:
                            continue
            
            if current_max_page_from_links > 0:
                pagemax = current_max_page_from_links
            elif pagination_nav.find('strong') and not page_links: 
               pagemax = 1 
    else: 
        if soup.find(string=re.compile(r"^\s*Page:")) and \
           soup.find('strong', string='1') and \
           not soup.find('a', href=re.compile(r'cpage=2')):
            pagemax = 1
        else:
            regular_tqdm.write(f"Warning: No clear pagination nav found for OID {catalog_oid} on {url}. Assuming PAGEMAX=1. Check page structure if this is unexpected.")
            pagemax = 1
            
    return pagemax, descriptive_title

async def process_course_page(session, catalog_oid, page_num, catalog_year_type_info):
    """
    Fetches a single page of courses, parses it, and returns a list of course data.
    catalog_year_type_info is a dict like {"year": "YYYY-YYYY", "type": "Type"}
    """
    url = SEARCH_URL_TEMPLATE.format(catalog_oid=catalog_oid, page_num=page_num)
    html = await fetch_html(session, url)
    if not html:
        return []

    soup = BeautifulSoup(html, 'html.parser')
    courses_data = [] # Store this page's courses here

    header_td = soup.find('td', class_='th_lt acalog-highlight-ignore nowrap', string=re.compile(r'Courses - Locations/Keyword/Phrase Matches'))
    
    if not header_td: 
        header_td = soup.find(lambda tag: tag.name == 'td' and 
                              'th_lt' in tag.get('class', []) and
                              'acalog-highlight-ignore' in tag.get('class', []) and
                              tag.string and 'Courses - Locations/Keyword/Phrase Matches' in tag.string.strip())

    if header_td:
        table = header_td.find_parent('table')
        if table:
            all_tds_in_table = table.find_all('td') 
            for cell in all_tds_in_table:
                is_highlight_ignore = 'acalog-highlight-ignore' in cell.get('class', [])
                
                if not is_highlight_ignore:
                    course_link_tag = cell.find('a', href=re.compile(r'preview_course_nopop\.php\?catoid=\d+&coid=\d+'))
                    if course_link_tag:
                        full_course_name_raw = course_link_tag.get_text(separator=' ', strip=True)
                        # Replace non-breaking space hyphen non-breaking space with standard space hyphen space
                        full_course_name = full_course_name_raw.replace('\xa0-\xa0', ' - ')
                        # Consolidate multiple spaces that might arise from get_text or exist in original HTML
                        full_course_name = re.sub(r'\s+', ' ', full_course_name).strip()

                        # Split Full Course Name into Course Code and Course Name
                        parts = full_course_name.split(' - ', 1)
                        if len(parts) == 2:
                            course_code = parts[0].strip()
                            course_name = parts[1].strip()
                        else:
                            # If " - " is not found, assign "N/A" to Course Code and full name to Course Name
                            course_code = "N/A" 
                            course_name = full_course_name
                        
                        relative_link = course_link_tag['href']
                        absolute_link = urljoin(BASE_URL, relative_link)
                        
                        courses_data.append([
                            course_code, 
                            course_name, 
                            str(catalog_oid), 
                            catalog_year_type_info['year'], # From CSV mapping
                            catalog_year_type_info['type'], # From CSV mapping
                            absolute_link
                        ])
        else:
            if page_num == 1: 
                regular_tqdm.write(f"Warning: Found course table header_td but no parent table for OID {catalog_oid}, Page {page_num}. URL: {url}")
    else:
        no_results_msg = soup.find(string=re.compile(r"No courses found matching your criteria|Your search returned no results", re.IGNORECASE))
        if not no_results_msg and page_num == 1: 
             regular_tqdm.write(f"Warning: Course table header not found for OID {catalog_oid}, Page {page_num}. URL: {url}")
    
    return courses_data

async def main_scraper():
    """Main function to orchestrate the scraping process."""
    
    catalog_data_map = load_catalog_mapping(CATALOG_MAPPING_FILE)
    if not catalog_data_map:
        print(f"Failed to load catalog mapping from '{CATALOG_MAPPING_FILE}'. Exiting.")
        return

    # Determine which catalogs to scrape based on the UPDATE_ONLY toggle
    if UPDATE_ONLY:
        # Select only the most recent 2 catalogs (first 2 entries in the ordered mapping)
        all_catalog_ids = list(catalog_data_map.keys())
        recent_catalog_ids = all_catalog_ids[:2]
        catalogs_to_scrape = {k: catalog_data_map[k] for k in recent_catalog_ids}
        regular_tqdm.write(f"UPDATE_ONLY mode: scraping only the {len(catalogs_to_scrape)} most recent catalog(s): {recent_catalog_ids}")
        
        # Load existing data from the output file
        existing_data = load_existing_output(OUTPUT_FILE)
        
        # Remove existing entries for the catalogs we are about to re-scrape
        # so they can be replaced with fresh data
        catalogs_to_refresh = set(recent_catalog_ids)
        existing_data = [
            row for row in existing_data
            if row[2] not in catalogs_to_refresh  # row[2] = Catalog Code (OID)
        ]
        regular_tqdm.write(f"After removing entries for catalogs {recent_catalog_ids}, {len(existing_data)} existing courses remain.")
    else:
        catalogs_to_scrape = catalog_data_map
        existing_data = []

    all_scraped_data = [] # This will hold newly scraped data

    async with aiohttp.ClientSession() as session:
        # Iterate through the selected catalog OIDs
        for catalog_oid_str, catalog_year_type_info in regular_tqdm(catalogs_to_scrape.items(), desc="Overall Catalog Progress", unit="catalog"):
            try:
                catalog_oid_int = int(catalog_oid_str) # Ensure it's an int for URL formatting
            except ValueError:
                regular_tqdm.write(f"Warning: Invalid Catalog ID '{catalog_oid_str}' in mapping file. Skipping.")
                continue

            pagemax, descriptive_title = await get_pagemax_and_descriptive_title(session, catalog_oid_int)

            if pagemax is None: # Indicates an error during fetch for pagemax
                regular_tqdm.write(f"Skipping Catalog OID {catalog_oid_int} due to error fetching page 1 info.")
                continue
            
            # Use descriptive_title for logging, year/type from CSV for data
            log_title = descriptive_title if descriptive_title != "Unknown Title" else f"Catalog OID {catalog_oid_int}"
            regular_tqdm.write(f"Processing Catalog: {log_title} (OID: {catalog_oid_int}), Year: {catalog_year_type_info['year']}, Type: {catalog_year_type_info['type']}, Pages: {pagemax}")

            page_tasks = []
            for page_num in range(1, pagemax + 1):
                page_tasks.append(
                    process_course_page(session, catalog_oid_int, page_num, catalog_year_type_info)
                )
            
            if page_tasks:
                # Gather results from all pages of the current catalog
                results_from_gather = await async_tqdm.gather(*page_tasks, desc=f"Scraping OID {catalog_oid_int} ({catalog_year_type_info['year']})", unit="page", leave=False)
                # Flatten the list of lists and add to our master list
                for page_result in results_from_gather:
                    if page_result: # page_result is a list of courses from one page
                        all_scraped_data.extend(page_result)
            else:
                regular_tqdm.write(f"No pages to process for Catalog OID {catalog_oid_int} (pagemax was {pagemax}).")

    # --- Post-processing after all scraping is done ---
    regular_tqdm.write(f"\nScraping complete. Found {len(all_scraped_data)} newly scraped courses.")

    # Combine existing data with newly scraped data
    combined_data = existing_data + all_scraped_data

    # Deduplicate: remove exact duplicate rows (same Course Code, Course Name,
    # Catalog Code, Year, Catalog Type, and Course Link)
    seen = set()
    deduplicated_data = []
    for row in combined_data:
        row_tuple = tuple(row)
        if row_tuple not in seen:
            seen.add(row_tuple)
            deduplicated_data.append(row)
    
    duplicates_removed = len(combined_data) - len(deduplicated_data)
    if duplicates_removed > 0:
        regular_tqdm.write(f"Removed {duplicates_removed} exact duplicate course(s).")

    regular_tqdm.write(f"Total courses after merge: {len(deduplicated_data)}")
    regular_tqdm.write("Sorting data as per requirements (Course Code, Course Name, Catalog Code)...")

    # Sort the data based on Course Code (index 0), then Course Name (index 1), then Catalog Code (index 2)
    deduplicated_data.sort(key=lambda row: (row[0], row[1], row[2]))

    regular_tqdm.write("Writing sorted data with unique IDs to CSV...")
    
    # Define the final CSV headers including the new "ID" column
    final_csv_headers = ['Catalog ID', 'Course Code', 'Course Name', 'Catalog Code', 'Year', 'Catalog Type', 'Course Link']
    
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(final_csv_headers)
        # Use enumerate to create the unique ID (starting from 0) as we write the sorted rows
        for i, row_data in enumerate(deduplicated_data):
            writer.writerow([i] + row_data)
    
    print(f"\nProcessing complete. Data saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    asyncio.run(main_scraper())
