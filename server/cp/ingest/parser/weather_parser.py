from superdesk.io.feed_parsers.__init__ import FeedParser
from superdesk.io.registry import register_feed_parser
import logging

SOURCE = 'Weather Parser' 
logger = logging.getLogger(__name__)

class WeatherParser(FeedParser):
    label = 'Weather Parser' 
    NAME = label.lower() # Unique name under which to register the class.

    def __init__(self):
        try:
            super().__init__()
        except Exception as err:
            logger.exception(err)
            logger.error("Failed to initialize parser")
            
        
    def can_parse(self, article):
        # Assuming all files coming from FTP are valid
        return True
        
    def parse(self, article, provider=None):
        
        try:
            item = {}
            '''
            if self.can_parse(article):
                
                paragraphs = article.split('\n\n')
                # Extract the slugline and the description
                first_paragraph = paragraphs[0].split('\n')
                slugline = first_paragraph[0]
                description = '\n'.join(first_paragraph[1:])
                # Isolate the body 
                body = '\n\n'.join(paragraphs[1:])
                body = body.replace('\n','\\n') # Adjust for html formatting 
                
                # Populate item dictionary
                item['slugline'] = slugline
                item['description_text'] = description
                item['body_html'] = f"<p>{body}</p>"
                item["source"] =  'Environment Canada'
            '''
            item['slugline'] = 'Test Slugline3'
            item['description_text'] =  'Test Description3'
            item['body_html'] =  'Test Body3'
            item["source"] =  'Environment Canada'
            item["guid"] =  '123456789'
       
        except Exception as err:
            logger.exception(err)
            logger.error("Failed to form output")
            

        return item 


register_feed_parser(WeatherParser.NAME, WeatherParser())

    
