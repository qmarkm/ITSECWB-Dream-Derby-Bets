from django.core.management.base import BaseCommand
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from apps.umamusume.models import Umas, Skill


class Command(BaseCommand):
    help = 'Scrape Uma Musume characters from gametora.com'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Uma Musume scraper...'))

        # TODO: Initialize Selenium WebDriver
        driver = webdriver.Chrome()

        try:
            # Navigate to the characters page
            driver.get('https://gametora.com/umamusume/characters')

            # Wait for page to load
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, 'a[href*="/umamusume/characters/"]')))

            # Find character elements
            characters = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/umamusume/characters/"]')

            # PASS 1: Collect all character data from the list page
            character_data = []

            for character in characters:
                try:
                    # Extract profile URL
                    profile_url = character.get_attribute('href')
                    if not profile_url.startswith('http'):
                        profile_url = 'https://gametora.com' + profile_url

                    # Extract name with fallback
                    try:
                        name = character.find_element(By.CSS_SELECTOR, '.sc-73e3e686-4.gefniT').text
                    except:
                        try:
                            name_divs = character.find_elements(By.TAG_NAME, 'div')
                            name = name_divs[-1].text if name_divs else None
                        except:
                            name = None

                    # Skip if no name found
                    if not name or name.strip() == '':
                        continue

                    # Extract image URL
                    img = character.find_element(By.TAG_NAME, 'img')
                    image_url = img.get_attribute('src')
                    if not image_url.startswith('http'):
                        image_url = 'https://gametora.com' + image_url

                    # Store the data
                    character_data.append({
                        'name': name,
                        'profile_url': profile_url,
                        'image_url': image_url
                    })

                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Error collecting character data: {str(e)}"))
                    continue

            self.stdout.write(f"Found {len(character_data)} characters to scrape")

            # PASS 2: Visit each profile page and scrape skills
            for index, char_data in enumerate(character_data, 1):
                try:
                    name = char_data['name']
                    profile_url = char_data['profile_url']
                    image_url = char_data['image_url']

                    self.stdout.write(f"[{index}/{len(character_data)}] Scraping {name}...")

                    # Navigate to profile page
                    driver.get(profile_url)
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, "//div[contains(text(), 'Unique skills')]"))
                    )

                    # Find the "Unique skills" section specifically
                    unique_skills_section = driver.find_element(
                        By.XPATH,
                        "//div[contains(text(), 'Unique skills')]/parent::div"
                    )

                    # Extract ALL unique skills (only from the Unique skills section)
                    skill_containers = unique_skills_section.find_elements(
                        By.CSS_SELECTOR,
                        '.sc-46273122-0.iyMAxW'
                    )

                    skills_data = []
                    for skill_container in skill_containers:
                        try:
                            # Extract skill name
                            skill_name = skill_container.find_element(By.TAG_NAME, 'b').text

                            # Extract skill description (the div after the one with <b>)
                            skill_divs = skill_container.find_elements(By.CSS_SELECTOR, '.sc-46273122-4.iudrjg > div')
                            skill_description = skill_divs[-1].text if len(skill_divs) > 1 else ""

                            skills_data.append({
                                'name': skill_name,
                                'description': skill_description
                            })

                            self.stdout.write(f"  Skill: {skill_name}")
                            self.stdout.write(f"  Description: {skill_description}")

                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"    Error extracting skill: {str(e)}"))
                            continue

                    # Save to database
                    
                    # First, create the Uma
                    uma, created = Umas.objects.get_or_create(
                        name=name,
                        defaults={
                            'avatar_url': image_url,
                        }
                    )

                    if created:
                        self.stdout.write(f"  Created Uma: {name}")
                    else:
                        # Update avatar_url if Uma already exists
                        uma.avatar_url = image_url
                        uma.save()
                        self.stdout.write(f"  Updated Uma: {name}")

                    # Then, create and associate all skills
                    for skill_data in skills_data:
                        skill, created = Skill.objects.get_or_create(
                            name=skill_data['name'],
                            uma=uma,  # Associate with the Uma
                            defaults={
                                'description': skill_data['description'],
                                'is_unique': True
                            }
                        )

                        if created:
                            self.stdout.write(f"    Created Skill: {skill_data['name']}")
                        else:
                            self.stdout.write(f"    Skill already exists: {skill_data['name']}")
                    

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  Error scraping {name}: {str(e)}"))
                    continue

            self.stdout.write(self.style.SUCCESS('Successfully scraped Uma Musume characters!'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during scraping: {str(e)}'))

        finally:
            # TODO: Close the browser
            # driver.quit()
            pass
