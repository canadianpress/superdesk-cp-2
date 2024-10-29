import uuid
import json
import re
import logging
import os

class WeatherParser():
    """
    Feed Parser for Environment Canada weather reports (EN and FR)
    """

    # Initialize class variables
    label = 'Weather Parser'
    NAME = label.lower()
    filenames_path = os.path.join(os.path.dirname(__file__), 'weather_filenames.json')
    english_filenames = []
    french_filenames = []
    logger = None

    @classmethod
    def setup_logger(cls):
        if cls.logger is None:
            cls.logger = logging.getLogger(__name__)
            cls.logger.setLevel(logging.DEBUG)
            log_file_path = os.path.join(os.path.dirname(__file__), 'weather_parser.log')
            fh = logging.FileHandler(log_file_path)
            fh.setLevel(logging.DEBUG)
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            fh.setFormatter(formatter)
            cls.logger.addHandler(fh)

    def __init__(self):
        super().__init__()
        self.__class__.setup_logger()
        self.__class__.load_filenames()

    def can_parse(self, file_path):
        filename = os.path.basename(file_path)[:11]
        self.logger.debug(f"Checking if can parse: {filename}")
        if filename.replace('_', ' ') in self.english_filenames:
            self.logger.debug("Can parse: True (English)")
            return 'en'
        elif filename.replace('_', ' ') in self.french_filenames:
            self.logger.debug("Can parse: True (French)")
            return 'fr'
        else:
            self.logger.debug("Can parse: False")
            return False

    def parse(self, file_path, provider=None):
        self.logger.debug(f"Parsing file: {file_path}")
        item = {}
        language = self.can_parse(file_path)
        if not language:
            self.logger.error(f"File not found in filenames: {file_path}")
            return item
        with open(file_path, "r", encoding='utf-8') as file:
            article = file.read()
            paragraphs = article.split('\n\n')
            slugline = paragraphs[0].split('\n')[0]

            if 'Tabular' in article:
                body = self.format_tabular_data(article)
            elif 'PREVISIONS' in article or 'PREVISIONS MISES A JOUR' in article:
                body = self.format_prevision_data(article)
            elif len(paragraphs) == 1:
                lines = article.split('\n')
                lines.pop(0)
                body = '<br>'.join(lines)
            else:
                body = '<br><br>'.join(paragraphs[1:])
                body = body.replace('\n','<br>')

            item['headline'] = 'Test Headline'
            item['slugline'] = f"{slugline} kad"
            item['description_text'] = ''
            item['body_html'] = f"<p>{body}</p>"
            item["source"] = 'Environment Canada' if language == 'en' else 'Environnement Canada'
            item["language"] = 'en-CA' if language == 'en' else 'fr-CA'
            item["guid"] = str(uuid.uuid4())
        self.logger.debug(f"Parsed item: {item}")
        return item

    @classmethod
    def load_filenames(cls):
        cls.setup_logger()
        cls.logger.debug(f"Loading filenames from: {cls.filenames_path}")
        try:
            with open(cls.filenames_path, 'r', encoding='utf-8') as file:
                filenames = json.load(file)
                cls.english_filenames = filenames.get('English', [])
                cls.french_filenames = filenames.get('French', [])
            cls.logger.debug(f"Loaded {len(cls.english_filenames)} English and {len(cls.french_filenames)} French filenames")
        except FileNotFoundError:
            cls.logger.error(f"File not found: {cls.filenames_path}")
            cls.english_filenames = []
            cls.french_filenames = []
        except json.JSONDecodeError:
            cls.logger.error(f"Invalid JSON in file: {cls.filenames_path}")
            cls.english_filenames = []
            cls.french_filenames = []
        except Exception as e:
            cls.logger.error(f"Error loading filenames: {str(e)}")
            cls.english_filenames = []
            cls.french_filenames = []

    @classmethod
    def format_tabular_data(cls, content):
        html = ''
        sections = '\n'.join(content.split('\n')[4:]).split('\n\n\n')
        html += f'<p>{sections[0]}</p>\n'
        for section in sections[1:-1]:
            section = section.replace('$$', '').strip()
            tables = section.split('\n\n')
            for table_index, table in enumerate(tables):
                lines = [line for line in table.split('\n') if line.strip()]
                html += '<table>\n'
                if table_index == 0 and '...' in lines[0]:
                    html += f"<p>{lines.pop(0)}</p>\n"
                if 'FCST' not in lines[0]:
                    html += f"<p>{lines.pop(0).strip()}</p>\n"
                for row in lines:
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
            lines = paragraph.split('\n')
            lines[0] = f'<b>{lines[0]}</b>'
            joined_lines = '\n'.join(lines)
            updated_paragraphs.append(f'<p>{joined_lines}</p>')
        all_paragraphs = [original_paragraphs[0]] + updated_paragraphs + original_paragraphs[-2:]
        result = '<br><br>'.join(all_paragraphs)
        return f'<p>{result}</p>'

def process_file(file_path):
    parser = WeatherParser()
    result = parser.parse(file_path)
    output_file = f"{os.path.splitext(file_path)[0]}_result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
    print(f"Result saved to {output_file}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        process_file(file_path)
    else:
        print("Please provide a file path as an argument.")