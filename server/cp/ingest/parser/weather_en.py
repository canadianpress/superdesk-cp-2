from superdesk.io.feed_parsers.__init__ import FeedParser
import uuid
import json
import re
import logging

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
    
    logger = None

    @classmethod
    def setup_logger(cls):
        if cls.logger is None:
            cls.logger = logging.getLogger(__name__)
            cls.logger.setLevel(logging.DEBUG)
            fh = logging.FileHandler('/tmp/weather_parser_en.log')
            fh.setLevel(logging.DEBUG)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            fh.setFormatter(formatter)
            cls.logger.addHandler(fh)

    def __init__(self):
        super().__init__()
        self.load_filenames()

    def can_parse(self, file_path):
        filename = file_path.replace('/tmp/', '')[:11]
        self.logger.debug(f"Checking if can parse: {filename}")
        self.logger.debug(f"English filenames: {self.english_filenames}")
        if filename in self.english_filenames:
            self.logger.debug("Can parse: True")
            return True
        else:
            self.logger.debug("Can parse: False")
            return False


        
    def parse(self, file_path, provider=None):
        self.logger.debug(f"Parsing file: {file_path}")
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
            
            # Article does not contain paragraphs
            elif len(paragraphs) ==1:
                lines = article.split('\n')
                lines.pop(0)
                body = '<br>'.join(lines)
            
            else:
                # Isolate the body, by joining all paragraphs after the first
                body = '<br><br>'.join(paragraphs[1:]) 
                body = body.replace('\n','<br>')
            
            # Populate item dictionary
            item['headline'] =  'Test Headline'
            item['slugline'] = f"{slugline} kad"
            item['description_text'] = ''
            item['body_html'] = f"<p>{body}</p>"
            item["source"] =  'Environement Canada'
            item["language"] = 'en-CA'
            item["guid"] =   str(uuid.uuid4())
            
        return item 
    
    @classmethod
    def load_filenames(cls):
        cls.setup_logger()  # Ensure logger is set up before using it
        cls.logger.debug(f"Loading filenames from: {cls.filenames_path}")
        try:
            with open(cls.filenames_path, 'r', encoding='windows-1252') as file:
                filenames = json.load(file)
                cls.english_filenames = filenames['English']
        except FileNotFoundError:
            cls.english_filenames = []
    
    @classmethod
    def save_filenames(cls):
        """Save updated filenames to a JSON file."""
        data = {
            'English': cls.english_filenames
        }
        with open(cls.filenames_path, 'w', encoding='windows-1252') as file:
            json.dump(data, file, indent=4)
            
    @classmethod
    def format_tabular_data(cls,content):
        html = '' 
        # Remove first four lines, then split by triple-newlines to get list of sections
        sections = '\n'.join(content.split('\n')[4:]).split('\n\n\n')
        
        # Append descriptive section to html
        html += f'<p>{sections[0]}</p>\n'
        for section in sections[1:-1]:
            # Clean up the section
            section = section.replace('$$', '').strip()
            
            # Split section into tables
            tables = section.split('\n\n')
            
            for table_index, table in enumerate(tables):
            
                # Extract all non-empty lines of table
                lines = [line for line in table.split('\n') if line.strip()]

                html += '<table>\n'
                # Handle the state label 
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
    def format_prevision_data(cls, content):
        original_paragraphs = content.split('\n\n') 
        target_paragraphs = original_paragraphs[1:-2]    
        updated_paragraphs = []
        for paragraph in target_paragraphs:
            # Update first line in lines
            lines = paragraph.split('\n')
            lines[0] = f'<b>{lines[0]}<b>'
            # Join updates lines to form updates paragraph
            joined_lines = '\n'.join(lines)
            updated_paragraphs.append(f'<p>{joined_lines}</p>')
        all_paragraphs = [original_paragraphs[0]] + updated_paragraphs + original_paragraphs[-2:]
        result = '<br><br>'.join(all_paragraphs)
        return f'<p>{result}</p>'