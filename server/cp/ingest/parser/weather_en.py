from superdesk.io.feed_parsers.__init__ import FeedParser
import uuid
import json
import re
import uuid

SOURCE = 'Weather Parser (EN)' 

class WeatherParserEN(FeedParser):
    """
    Feed Parser for Environement Canada weather reports (EN)
    """

    # Initialize class variables
    label = 'Weather Parser (EN)' 
    NAME = label.lower() # Unique name under which to register the class.
    filenames_path = '/opt/superdesk/server/cp/ingest/parser/data/weather_filenames.json'
    english_filenames = []
    french_filenames = []
    


    def __init__(self):
        super().__init__()
        self.load_filenames()
    
            
    def can_parse(self, file_path):
        filename = file_path.split('.')[0].split('/')[-1]
        
        if filename in self.english_filenames:
            return True
        elif filename in self.french_filenames:
            False

        # Filename does not exist in weather_filenames.json. Must detect language using keywords.
        with open(file_path, "r", encoding='windows-1252') as file: # Read the file and check for English keywords
            article = file.read()
            is_english = any(keyword in article for keyword in ['\nEND', 'FORECAST','==DISCUSSION==', 'PRELIMINARY DATA','Tabular State Forecast'])
    
            # Append filename to appropriate language's list 
            (self.english_filenames if is_english else self.french_filenames).append(filename)
            # Save filenames
            self.save_filenames()
        
        return is_english


        
    def parse(self, file_path, provider=None):
        item = {}     
        with open(file_path, "r", encoding='windows-1252') as file:

            article = file.read()
            paragraphs = article.split('\n\n')
            # Extract the slugline from first paragraph
            slugline = paragraphs[0].split('\n')[0]

            if 'Tabular' in article:
                body = self.format_tabular_data(article)
            elif 'PREVISIONS' in article:
                body = self.format_prevision_data(article)
                
            else:
                # Isolate the body, by joining all paragraphs after the first
                body = '<br><br>'.join(paragraphs[1:]) 
                body = body.replace('\n','<br>')

            #body = body.replace('\n','<br>') 
            description = ''
            # Extract description of non-tabular data
            if 'END' in article:
                description = '\n'.join(paragraphs[0][1:]) 
            

            # Populate item dictionary
            item['headline'] =  'Test headline'
            item['slugline'] = f"{slugline} kad"
            item['description_text'] = description
            item['body_html'] = f"<p>{body}</p>"
            item["source"] =  'Environment Canada'
            item["language"] = 'en-CA'
            item["guid"] =  str(uuid.uuid4())
        
        return item 
    
    @classmethod
    def load_filenames(cls):
        """Load filenames from JSON file."""
        try:
            with open(cls.filenames_path, 'r', encoding='windows-1252') as file:
                filenames = json.load(file)
                cls.english_filenames = filenames.get('English', [])
                cls.french_filenames = filenames.get('French', [])
        except FileNotFoundError:
            cls.english_filenames = []
            cls.french_filenames = []
    
    @classmethod
    def save_filenames(cls):
        """Save updated filenames to a JSON file."""
        data = {
            'English': cls.english_filenames,
            'French': cls.french_filenames
        }
        with open(cls.filenames_path, 'w', encoding='windows-1252') as file:
            json.dump(data, file, indent=4)

    @classmethod
    def format_tabular_data(cls,content):
        html = '' 
        # Remove first three lines, then split by triple-newlines to get list of sections
        sections = '\n'.join(content.split('\n')[3:]).split('\n\n\n')
        
        # Append descriptive section to html
        html += f'<p>{sections[0].replace('\n','<br>')}</p>\n'
        for section in sections[1:-1]:
            # Clean up the section
            section = section.replace('$$', '').strip()
            
            # Split section into tables
            tables = section.split('\n\n')
            
            for table_index, table in enumerate(tables):
            
                # Extract all non-empty lines of table
                lines = [line for line in table.split('\n') if line.strip()]

                html += '<table>\n'
                # Handle the state name 
                if table_index == 0 and '...' in lines[0]:
                    html += f"<p>{lines.pop(0)}</p>\n"

                # Handle city name 
                if 'FCST' not in lines[0]:
                    html += f"<p>{lines.pop(0).strip()}</p>\n"
                    
                for row in lines:
                    # Split row based on pattern : any sequence of 2 or more whitespace characters
                    cells = re.split(r'\s{2,}', row.strip())
                    html += '<tr>\n'
                    for cell in cells:
                        html += f"<td>{cell.strip()}</td>\n"
                    html += '</tr>\n'

                html += '</table>\n'
        return html 
    
    @classmethod
    def format_prevision_data(content):
        original_paragraphs = content.split('\n\n') 
        target_paragraphs = original_paragraphs[1:-2]    
        updated_paragraphs = []
        for paragraph in target_paragraphs:
            # Update first line in lines
            lines = paragraph.split('\n')
            lines[0] = f'<b>{lines[0]}<b>'
            # Join updates lines to form updates paragraph
            updated_paragraphs.append('\n'.join(lines))
        all_paragraphs = [original_paragraphs[0]] + updated_paragraphs + original_paragraphs[-2:]
        return ('<br><br>'.join(all_paragraphs))