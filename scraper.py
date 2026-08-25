import requests
from bs4 import BeautifulSoup
import json

# Target the official NYC rules or council contact directory page
URL = "https://rules.cityofnewyork.us/agency-guidance-documents/city-councilmember-contact-list/"

def scrape_council_contacts():
    print("Fetching council member contact data...")
    response = requests.get(URL)
    
    if response.status_code != 200:
        print(f"Failed to fetch page. Status code: {response.status_code}")
        return
    
    soup = BeautifulSoup(response.content, "html.parser")
    contacts = {}

    # Find email patterns or table rows containing member info
    # The NYC Rules page lists member emails matching pattern *@council.nyc.gov
    email_elements = soup.find_all(string=lambda text: text and "@council.nyc.gov" in text)
    
    extracted_emails = set()
    for el in email_elements:
        extracted_emails.add(el.strip())

    print(f"Found {len(extracted_emails)} council email addresses.")
    
    # Print out a formatted stub you can copy directly into your TypeScript metadata file
    print("\n--- Copy into src/data/councilMetadata.ts ---")
    for email in sorted(extracted_emails):
        handle = email.split("@")[0].lower()
        print(f"  // Email: {email}")

if __name__ == "__main__":
    scrape_council_contacts()