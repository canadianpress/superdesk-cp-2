import unittest
import os
from weather_parser import WeatherParser, process_file

class TestWeatherParser(unittest.TestCase):
    def setUp(self):
        self.parser = WeatherParser()
        self.ftpfolder_path = os.path.join(os.path.dirname(__file__), 'ftpfolder')

    def test_can_parse_english(self):
        result = self.parser.can_parse('ABXX06_KWBC_251200___25790')
        self.assertEqual(result, 'en')

    def test_can_parse_french(self):
        result = self.parser.can_parse('FPCN42_CWNT_251024___28278')
        self.assertEqual(result, 'fr')

    def test_parse_english(self):
        result = self.parser.parse('ABXX06_KWBC_251200___25790')
        self.assertEqual(result['language'], 'en-CA')
        self.assertIn('FOREIGN TEMPERATURE AND WEATHER TABLE', result['body_html'])

    def test_parse_french(self):
        result = self.parser.parse('FPCN42_CWNT_251024___28278')
        self.assertEqual(result['language'], 'fr-CA')
        self.assertIn('PREVISIONS A LONG TERME', result['body_html'])

    def test_parse_from_ftpfolder(self):
        for filename in os.listdir(self.ftpfolder_path):
            file_path = os.path.join(self.ftpfolder_path, filename)
            # process_file(file_path)
            result  = self.parser.parse(file_path)
            self.assertIn('language', result)
            self.assertIn('body_html', result)
            
            if filename.startswith('ABXX'):
                self.assertEqual(result['language'], 'en-CA')
            elif filename.startswith('FPCN'):
                self.assertEqual(result['language'], 'fr-CA')
            else:
                self.fail(f"Unexpected file format: {filename}")

if __name__ == '__main__':
    unittest.main()
