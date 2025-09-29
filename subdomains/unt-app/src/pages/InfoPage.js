import React from 'react';
import { Link } from 'react-router-dom';
import './InfoPage.css';

const InfoPage = () => {
  return (
    <div className="info-page-container">
      <div className="info-header">
        <Link to="/">Back to Main Page</Link>
      </div>

      <h1 id="information" className="main-title">Information/Data</h1>

      <section id="information-section" className="scrolly-section">
        <div className="text-content info-section-container">
          <p>
            <a href="/">unt.benwilcox.dev</a> is a website that can be used to view the
            previous semesters in which courses were offered. As far as I'm aware,
            there are no public or internal tools for gauging when certain courses
            can be taken; as an incoming sophomore, I made this website out of
            necessity for effectively planning my degree. There are around 8,900
            historical and current courses offered at UNT which can be viewed in
            this website.
          </p>
          <p>Essentially, this site is a synthesis of UNT course history information from two different university resources:</p>
          <ul>
            <li>
              <a href="https://facultyinfo.unt.edu" target="_blank" rel="noopener noreferrer">
                facultyinfo.unt.edu
              </a>{' '}
              contains the previously taught courses of all 3,300+ faculty members
              at UNT. Combined, this is ~180,000 "Course Offerings."
            </li>
            <li>
              <a href="https://catalog.unt.edu" target="_blank" rel="noopener noreferrer">
                catalog.unt.edu
              </a>{' '}
              contains full "graduate" and "undergraduate" course catalogs for the
              past 15 years. Combined, these contain ~99,000 "Catalog Listings."
            </li>
          </ul>
          <p>
            <a href="#data">Click here</a> to read more about the data collected.
          </p>
        </div>
        <div className="sticky-image-container">
          <img src="/images/Full Layout.jpg" alt="Full layout of the main page" />
          <a href="#course-selector" id="overlay-course-selector" className="image-overlay-link" title="Go to Course Selector section"></a>
          <a href="#course-display-1" id="overlay-course-display-1" className="image-overlay-link" title="Go to Course Display 1 section"></a>
          <a href="#course-display-2" id="overlay-course-display-2" className="image-overlay-link" title="Go to Course Display 2 section"></a>
          <a href="#course-info" id="overlay-course-details" className="image-overlay-link" title="Go to Course Info section"></a>
        </div>
      </section>
      
      <section id="course-selector-section" className="scrolly-section">
        <div className="text-content info-section-container">
          <h2 id="course-selector">Course Selector</h2>
          <p>
            The Course Selector section has two purposes: Selecting Courses and
            Selecting Course Groups. You will use this to add and view courses.
          </p>
          <h3 id="course-list">Course List</h3>
          <p className="indent">
            This section allows you to browse and search through all 8,906 courses
            and add them to Course Display 1.
          </p>
          <h4 id="auto-pin-courses">Auto Pin Courses</h4>
          <p className="indent">
            When enabled, this setting pins any courses that you add to the Course
            Display.
          </p>
          <h4 id="search-bar">Search Bar</h4>
          <p className="indent">
            Typing anything into the search bar will filter the visible courses by
            ones that match your text. It searches through every Catalog Listing,
            so any course that's changed name will still appear if you search for
            its previous name. Additionally, the search uses "fuzzy matching" so
            that typos don't affect the search results.
          </p>
          <h4 id="pinning-courses">Pinning Courses</h4>
          <p className="indent">
            You can pin a course by clicking the thumbtack icon to the right of
            it. Pinned courses appear at the top of the Course List for easy
            reference.
          </p>
          <h4 id="course-list-detail">Course List Details</h4>
          <p className="indent">
            The course list contains all Courses filtered by the Search Bar.
            Clicking on a course will add it to Course Display 1.
          </p>
          <h3 id="course-group-selector">Course Group Selector</h3>
          <p className="indent">
            The Course Group Selector is used to specify which group of Catalog
            Listings make up a "Course". The university sometimes changes the
            Course Code or Name of a course, so it is not trivial to track its
            occurrences over many years. Because of this, each "Course" in the
            Course List is actually many Catalog Listings grouped together.
          </p>
          <p className="indent">
            The Course Group Selector lets you choose which Catalog Listings to
            include or exclude from the broader "Course" they represent. I use an
            8-part grouping algorithm that is designed to effectively create
            Courses from all Catalog Listings, but it sometimes includes erroneous
            Listings; I suggest you use the Course Group Selector to check for
            these mistakes before using the site to plan future enrollment.
            <br />
            <a href="#grouping-listings-offerings">Click Here</a> to read more about Course Groupings.
          </p>
          <h4 id="catalog-list">Catalog List</h4>
          <p className="indent">
            Each element contains the Course Code, Course Name, link to the
            relevant catalog.unt.edu entry, and the number of Course Offerings
            linked to that Catalog Listing. Clicking on an element will toggle if
            it is included in the "Course."
          </p>
        </div>
        <div className="sticky-image-container">
          <img src="/images/Course Selector.jpg" alt="The course selector component" />
          <a href="#course-list" id="overlay-cs-course-list" className="image-overlay-link" title="Go to Course List section"></a>
          <a href="#course-group-selector" id="overlay-cs-group-selector" className="image-overlay-link" title="Go to Course Group Selector section"></a>
          <a href="#auto-pin-courses" id="overlay-cs-auto-pin" className="image-overlay-link overlay-level-2" title="Go to Auto Pin Courses section"></a>
          <a href="#search-bar" id="overlay-cs-search-bar" className="image-overlay-link overlay-level-2" title="Go to Search Bar section"></a>
          <a href="#pinning-courses" id="overlay-cs-pinning" className="image-overlay-link overlay-level-2" title="Go to Pinning Courses section"></a>
          <a href="#course-list-detail" id="overlay-cs-list-detail" className="image-overlay-link overlay-level-2" title="Go to Course List Details section"></a>
          <a href="#catalog-list" id="overlay-cs-catalog-list" className="image-overlay-link overlay-level-2" title="Go to Catalog List section"></a>
        </div>
      </section>

      <section id="course-display-1-section" className="scrolly-section">
        <div className="text-content info-section-container">
          <h2 id="course-display-1">Course Display 1</h2>
          <p>
            This section graphically displays the previous semesters in which the
            current courses were offered.
          </p>
          <h4 id="show-all-years">All Years</h4>
          <p className="indent">
            This setting makes the columns of Course Display 1 represent every
            year going back to the earliest instance of a course offering. If it
            is disabled, it only shows years that a course was offered in.
          </p>
          <h4 id="semester-cells">Semester Cells</h4>
          <div className="indent">
            <p>
              The intersection between a course (row) and a year (column) is called
              a "Semester Cell." Each Cell contains four semester bars (described
              later). Each Cell's background can be shaded one of three different
              colors:
            </p>
            <ul>
              <li>Light Gray: There was a course catalog listing for this year.</li>
              <li>Black: There was no course catalog listing for this year.</li>
              <li>
                Dark Gray: All cells prior to 2011; no catalog data, only faculty's
                course offerings.
              </li>
            </ul>
          </div>
          <h4 id="semester-bars">Semester Bars</h4>
          <p className="indent">
            Each "Semester Bar" represents a possible semester a course could be
            offered. There are four Semester Bars in a year: Fall (Orange), Summer
            (Yellow), Spring (Green), Winter (Blue). A lighter shade means the
            course was not taught during that semester, while a darker shade means
            it was. You can click on a Semester Bar to view the courses offered
            during that semester in Course Display 2.
          </p>
          <h4 id="granular-view">Granular View</h4>
          <p className="indent">
            "Granular View" divides each Semester Bar up into "Specific
            Semesters" (e.g., "Summer 3W1" or "Fall 8W2"). There are only four
            "Broad Semesters", but there are 29 unique "Specific Semesters"
            mentioned throughout all Course Offerings. The increased granularity
            is useful for planning Summer classes in particular.
          </p>
        </div>
        <div className="sticky-image-container">
          <img src="/images/Course Display 1.jpg" alt="The first course display component" />
          <a href="#show-all-years" id="overlay-cd1-all-years" className="image-overlay-link overlay-level-2" title="Go to Show All Years section"></a>
          <a href="#semester-cells" id="overlay-cd1-semester-cells" className="image-overlay-link overlay-level-2" title="Go to Semester Cells section"></a>
          <a href="#semester-bars" id="overlay-cd1-semester-bars" className="image-overlay-link overlay-level-2" title="Go to Semester Bars section"></a>
          <a href="#granular-view" id="overlay-cd1-granular-view" className="image-overlay-link overlay-level-2" title="Go to Granular View section"></a>
        </div>
      </section>

      <section id="course-info-section" className="scrolly-section">
        <div className="text-content info-section-container">
          <h2 id="course-info">Course Info</h2>
          <p>
            This section displays basic information about the Active Course (the
            currently selected course in Course Display 1).
          </p>
          <h4 id="links-to-official-sources">Links to Official Sources</h4>
          <div className="indent">
            <p>
              These link to places where you can find information from the original
              sources:
            </p>
            <ul>
              <li>Catalog Entry: Links to the most recent catalog.unt.edu page.</li>
              <li>Code Search: Links to the facultyinfo.unt.edu search for the
                  Active Course's code.</li>
              <li>Name Search: Links to the facultyinfo.unt.edu search for the
                  Active Course's name.</li>
            </ul>
          </div>
          <h4 id="listing-offering-information">Listing/Offering Information</h4>
          <p className="indent">
            Displays general information about the Active Course over all years.
            Note: Catalogs only go back to 2011, so the maximum "Years Listed" is
            15.
          </p>
          <h4 id="description">Description</h4>
          <p className="indent">
            This is the description from the most recent catalog.unt.edu entry for
            the Active Course.
          </p>
        </div>
        <div className="sticky-image-container">
          <img src="/images/Course Details.jpg" alt="The course details component" />
          <a href="#links-to-official-sources" id="overlay-ci-links" className="image-overlay-link overlay-level-2" title="Go to Links to Official Sources section"></a>
          <a href="#listing-offering-information" id="overlay-ci-listing-info" className="image-overlay-link overlay-level-2" title="Go to Listing/Offering Information section"></a>
          <a href="#description" id="overlay-ci-description" className="image-overlay-link overlay-level-2" title="Go to Description section"></a>
        </div>
      </section>
      
      <section id="course-display-2-section" className="scrolly-section">
        <div className="text-content info-section-container">
          <h2 id="course-display-2">Course Display 2</h2>
          <p>
            This section displays Specific Offerings for the Active Course that
            professors have taught. You can select the year(s) and semester(s) to
            search via the specifiers on the left.
          </p>
          <h4 id="year-semester-specifiers">Year/Semester Specifiers</h4>
          <p className="indent">
            These are used to specify which Years/Semesters appear in Course
            Display 2. <br />
          </p>
          <p className="indent">
          <img 
            src="/images/Year Semester Specifiers.gif" 
            alt="Year/Semester Specifiers animation" 
            style={{width: '70%', marginTop: '1rem', borderRadius: '8px'}} 
            />
          </p>
          <h4 id="course-cells">Course Cells</h4>
          <p className="indent">
            Each cell is an instance of a specific class that was taught by a
            professor/faculty member for the Active Course. Each cell contains the
            faculty member's name and link, the specific semester the class was
            taught, the class code and name, and a link to the official source it
            was gathered from.
          </p>
        </div>
        <div className="sticky-image-container">
          <img src="/images/Course Display 2.jpg" alt="The second course display component" />
          <a href="#year-semester-specifiers" id="overlay-cd2-specifiers" className="image-overlay-link overlay-level-2" title="Go to Year/Semester Specifiers section"></a>
          <a href="#course-cells" id="overlay-cd2-course-cells" className="image-overlay-link overlay-level-2" title="Go to Course Cells section"></a>
        </div>
      </section>

      <div className="info-section-container">
        <h2 id="data">Data</h2>
        <p>
          This site is a synthesis of UNT course history information from two different university resources:
        </p>
        <ul>
          <li>
            <a href="https://facultyinfo.unt.edu" target="_blank" rel="noopener noreferrer">
              facultyinfo.unt.edu
            </a>{' '}
            contains the previously taught courses of all 3,300+ faculty members at UNT. Combined, this is ~180,000 "Course Offerings."
          </li>
          <li>
            <a href="https://catalog.unt.edu" target="_blank" rel="noopener noreferrer">
              catalog.unt.edu
            </a>{' '}
            contains full "graduate" and "undergraduate" course catalogs for the past 15 years. Combined, these contain ~99,000 "Catalog Listings."
          </li>
        </ul>
        <p>
          The website uses data stored in an SQLite Database file with 4 tables called "courses.db," but I have included the pre-processed data as CSV files that can be easily downloaded and viewed. Additionally, all code for the collection and processing of data can be found{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data" target="_blank" rel="noopener noreferrer">
            here
          </a>.
        </p>

        <h3 id="grouping-listings-offerings">Grouping Listings/Offerings</h3>
        <p className="indent">
          The university sometimes changes the Course Code or Name of a course, so it is not trivial to track its occurrences over many years. Because of this, each "Course" in the Course List is actually many Catalog Listings grouped together, and each Course Offering is paired with a Catalog Listing.
        </p>
        <p className="indent">
          To define which Listings and Offerings are part of a course, I created an{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data#4_catalog_groupspy" target="_blank" rel="noopener noreferrer">
            8-part grouping algorithm
          </a>{' '}
          for creating Course Groups from Catalog Listings, and a{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data#5_offering_groupspy" target="_blank" rel="noopener noreferrer">
            14-part pairing algorithm
          </a>{' '}
          for linking each Course Offerings to a Course Listings.{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data" target="_blank" rel="noopener noreferrer">
            Here
          </a>{' '}
          you can find the specific python files that contain the code for this.
        </p>
        <p className="indent">
          However, accurate matching is difficult for edge cases and there are still mistakes and oversights in the grouping and pairing of courses; do not trust each course in the Course List to contain a 100% accurate list of all historical course options. Having meticulously combed through my data, I believe my algorithms are about 95% accurate in creating Course Groups. Use the{' '}
          <a href="#course-group-selector">Course Group Selector</a> and{' '}
          <a href="#course-display-2">Course Display 2</a> to manually find errors in the Course Groups, and Course Offerings respectively.
        </p>
        <p className="indent">
          Using these algorithms, every course in the Course List contains an average of 11 catalog listings and 20 course offerings across its history.
        </p>
      </div>

      <div className="info-section-container">
        <h2 id="download">Download</h2>
        <p>There are 3 main files:</p>
        <ul>
          <li>
            <a href="https://github.com/SpecialAgentB3/benwilcox_dev/blob/main/subdomains/unt-app/creating_data/faculty.csv" target="_blank" rel="noopener noreferrer">
              faculty.csv
            </a> (3,327 Entries)
            <p className="indent">Contains information about all 3,327 UNT faculty members including their Name, Unique ID, Faculty Profile Link, and other department information.</p>
          </li>
          <li>
            <a href="https://github.com/SpecialAgentB3/benwilcox_dev/blob/main/subdomains/unt-app/creating_data/all_offerings.csv" target="_blank" rel="noopener noreferrer">
              all_offerings.csv
            </a> (178,467 Entries)
            <p className="indent">Contains information about every course that has ever been taught by a professor in faculty.csv. This includes the Course's Name + Code, the semester it was taught, and the ID of the all_catalog.csv entry that it is paired with (among other information).</p>
          </li>
          <li>
            <a href="https://github.com/SpecialAgentB3/benwilcox_dev/blob/main/subdomains/unt-app/creating_data/all_catalog.csv" target="_blank" rel="noopener noreferrer">
              all_catalog.csv
            </a> (99,134 Entries)
            <p className="indent">Contains every Course Listing in every Course Catalog going back to 2011. Each entry includes the Course's Name + Code, the catalog information, and the ID of the Course Group it belongs to (among other information).</p>
          </li>
        </ul>
        <p>Additionally, the website uses two more important files:</p>
        <ul>
          <li>
            <a href="https://github.com/SpecialAgentB3/benwilcox_dev/blob/main/subdomains/unt-app/creating_data/semester_mapping.csv" target="_blank" rel="noopener noreferrer">
              semester_mapping.csv
            </a> (29 Entries)
            <p className="indent">This contains each unique "Specific Semester", the "Broad Semester" it belongs to, and the order it appears in the year.</p>
          </li>
          <li>
            <a href="https://github.com/SpecialAgentB3/benwilcox_dev/blob/main/subdomains/unt-app/public/courses.db" target="_blank" rel="noopener noreferrer">
              courses.db
            </a>
            <p className="indent">
              This is a SQLite database file that contains 4 Tables: <br />
              <b>Faculty:</b> Exact same as faculty.csv.<br />
              <b>AllCatalog:</b> Exact same as all_catalog.csv.<br />
              <b>AllOfferings:</b> Exact same as all_offerings.csv.<br />
              <b>MainCourses</b> (8,906 Entries): MainCourses contains every unique Course Group that is made up of AllCatalog listings. Each entry contains the ID for that group, and the most recent (representative) catalog listing's Course Name + Code.
            </p>
          </li>
        </ul>
        <p>
          All files and more can additionally be found on my{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
      </div>

      <div className="info-section-container">
        <h2 id="data-gathering">Data Gathering</h2>
        <p>
          As stated previously, all data comes from two sources: <a href="https://facultyinfo.unt.edu" target="_blank" rel="noopener noreferrer">facultyinfo.unt.edu</a>, and{' '}
          <a href="https://catalog.unt.edu" target="_blank" rel="noopener noreferrer">catalog.unt.edu</a>. To collect data from these sources, I use three python scripts with the "requests" library to "scrape" the web pages and synthesize data from the raw HTML of each page. You can read about the specifics on my{' '}
          <a href="https://github.com/SpecialAgentB3/benwilcox_dev/tree/main/subdomains/unt-app/creating_data" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
      </div>
    </div>
  );
};

export default InfoPage; 